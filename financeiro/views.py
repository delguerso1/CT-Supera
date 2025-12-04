from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from django.utils import timezone
from .models import Mensalidade, Despesa, Salario, TransacaoC6Bank
from .serializers import MensalidadeSerializer, DespesaSerializer, SalarioSerializer, TransacaoC6BankSerializer
from .c6_client import c6_client, C6BankError, C6BankMethodNotAllowedError, C6BankInvalidRequestError
from django.shortcuts import get_object_or_404
from django.conf import settings
from datetime import timedelta
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from decimal import Decimal
import json
import logging
import re

logger = logging.getLogger(__name__)


# ========================================
# FUNÇÕES AUXILIARES PARA MULTA E MORA
# ========================================

def calcular_multa_mora(mensalidade):
    """
    Calcula multa (2%) e mora (1% ao mês) para mensalidade atrasada.
    
    Args:
        mensalidade: Objeto Mensalidade
        
    Returns:
        dict com:
            - dias_atraso: número de dias em atraso (0 se não estiver atrasada)
            - valor_multa: valor da multa (2% do valor original)
            - valor_mora: valor da mora (1% ao mês proporcional aos dias)
            - valor_total: valor original + multa + mora
            - esta_atrasada: boolean indicando se está atrasada
    """
    hoje = timezone.now().date()
    data_vencimento = mensalidade.data_vencimento
    
    # Se não está atrasada, retorna valores zerados
    if hoje <= data_vencimento:
        return {
            'dias_atraso': 0,
            'valor_multa': 0,
            'valor_mora': 0,
            'valor_total': float(mensalidade.valor),
            'esta_atrasada': False
        }
    
    # Calcula dias de atraso
    dias_atraso = (hoje - data_vencimento).days
    
    # Valor original da mensalidade
    valor_original = float(mensalidade.valor)
    
    # Multa: 2% do valor original (cobrada uma única vez)
    valor_multa = valor_original * 0.02
    
    # Mora: 1% ao mês (proporcional aos dias)
    # 1% ao mês = 1% / 30 dias = 0.0333% ao dia
    percentual_mora_diario = 0.01 / 30
    valor_mora = valor_original * percentual_mora_diario * dias_atraso
    
    # Valor total
    valor_total = valor_original + valor_multa + valor_mora
    
    return {
        'dias_atraso': dias_atraso,
        'valor_multa': round(valor_multa, 2),
        'valor_mora': round(valor_mora, 2),
        'valor_total': round(valor_total, 2),
        'esta_atrasada': True
    }


# Mensalidades API
class MensalidadeListCreateView(ListCreateAPIView):
    serializer_class = MensalidadeSerializer

    def get_queryset(self):
        queryset = Mensalidade.objects.all()
        aluno_id = self.request.query_params.get('aluno')
        if aluno_id:
            queryset = queryset.filter(aluno_id=aluno_id)
        mes = self.request.query_params.get('mes')
        ano = self.request.query_params.get('ano')
        if mes and ano:
            queryset = queryset.filter(data_vencimento__month=mes, data_vencimento__year=ano)
        return queryset.order_by('-data_vencimento', '-id')

class MensalidadeRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset = Mensalidade.objects.all()
    serializer_class = MensalidadeSerializer

# Despesas API
class DespesaListCreateView(ListCreateAPIView):
    serializer_class = DespesaSerializer

    def get_queryset(self):
        queryset = Despesa.objects.all()
        mes = self.request.query_params.get('mes')
        ano = self.request.query_params.get('ano')
        if mes and ano:
            queryset = queryset.filter(data__month=mes, data__year=ano)
        return queryset.order_by('-data', '-id')

class DespesaRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset = Despesa.objects.all()
    serializer_class = DespesaSerializer

# Salários API
class SalarioListCreateView(ListCreateAPIView):
    serializer_class = SalarioSerializer

    def get_queryset(self):
        queryset = Salario.objects.all()
        mes = self.request.query_params.get('mes')
        ano = self.request.query_params.get('ano')
        if mes and ano:
            queryset = queryset.filter(data_pagamento__month=mes, data_pagamento__year=ano)
        return queryset.order_by('-data_pagamento', '-id')

class SalarioRetrieveUpdateDestroyView(RetrieveUpdateDestroyAPIView):
    queryset = Salario.objects.all()
    serializer_class = SalarioSerializer

class PagarSalarioAPIView(APIView):
    """API para realizar o pagamento de salários dos professores."""

    def post(self, request):
        try:
            salario_id = request.data.get('salario_id')
            salario = get_object_or_404(Salario, id=salario_id)

            # Atualiza o status do salário
            salario.status = 'pago'
            salario.save()

            serializer = SalarioSerializer(salario)
            return Response({'message': 'Salário pago com sucesso!', 'salario': serializer.data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DashboardFinanceiroAPIView(APIView):
    """API para o painel financeiro com totais do mês."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.tipo != "gerente":
            return Response({"error": "Permissão negada."}, status=403)

        try:
            mes = int(request.GET.get("mes", timezone.now().month))
            ano = int(request.GET.get("ano", timezone.now().year))
        except ValueError:
            mes = timezone.now().month
            ano = timezone.now().year

        mensalidades = Mensalidade.objects.filter(data_vencimento__month=mes, data_vencimento__year=ano)
        despesas = Despesa.objects.filter(data__month=mes, data__year=ano)
        salarios = Salario.objects.filter(data_pagamento__month=mes, data_pagamento__year=ano)

        total_pago = mensalidades.filter(status="pago").aggregate(Sum("valor"))["valor__sum"] or 0
        total_despesas = despesas.aggregate(Sum("valor"))["valor__sum"] or 0
        total_salarios = salarios.aggregate(Sum("valor"))["valor__sum"] or 0
        total_salarios_pagos = salarios.filter(status="pago").aggregate(Sum("valor"))["valor__sum"] or 0
        saldo_final = total_pago - total_despesas - total_salarios

        return Response({
            "total_pago": total_pago,
            "total_despesas": total_despesas,
            "total_salarios": total_salarios,
            "total_salarios_pagos": total_salarios_pagos,
            "saldo_final": saldo_final,
            "mes_atual": mes,
            "ano_atual": ano,
            "meses": list(range(1, 13)),
        })


class RelatorioFinanceiroAPIView(APIView):
    """API para gerar relatório financeiro com mensalidades e despesas."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.tipo != "gerente":
            return Response({"error": "Permissão negada."}, status=403)

        mensalidades = Mensalidade.objects.all()
        despesas = Despesa.objects.all()

        return Response({
            "mensalidades": MensalidadeSerializer(mensalidades, many=True).data,
            "despesas": DespesaSerializer(despesas, many=True).data,
        })
    

class GerarPixAPIView(APIView):
    """
    Gera cobrança Pix para uma mensalidade usando C6 Bank
    URLs suportadas:
    - /api/financeiro/mensalidades/<pk>/gerar-pix/
    - /api/financeiro/pix/gerar/<mensalidade_id>/ (compatibilidade com frontend)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk=None, mensalidade_id=None):
        try:
            # Suporta tanto pk quanto mensalidade_id para compatibilidade
            mensalidade_pk = pk or mensalidade_id
            mensalidade = get_object_or_404(Mensalidade, pk=mensalidade_pk)
            
            # Verifica se o usuário tem permissão (aluno só pode gerar PIX de suas próprias mensalidades)
            if request.user.tipo == 'aluno' and mensalidade.aluno != request.user:
                return Response({
                    'error': 'Você não tem permissão para gerar PIX desta mensalidade.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Verifica se já existe uma transação C6 Bank pendente
            transacao_existente = TransacaoC6Bank.objects.filter(
                mensalidade=mensalidade,
                status='pendente',
                data_expiracao__gt=timezone.now(),
                tipo='pix'
            ).first()
            
            if transacao_existente:
                # Se já existe transação pendente válida, retorna ela
                return Response({
                    'message': 'Já existe um pagamento PIX pendente para esta mensalidade.',
                    'transacao': TransacaoC6BankSerializer(transacao_existente).data
                })
            
            # Valida se a chave PIX está configurada
            if not settings.C6_BANK_CHAVE_PIX:
                logger.error("Chave PIX não configurada (C6_BANK_CHAVE_PIX)")
                return Response({
                    'error': 'Chave PIX não configurada no servidor. Entre em contato com o suporte.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Calcula multa e mora se a mensalidade estiver atrasada
            calculo_multa_mora = calcular_multa_mora(mensalidade)
            valor_mensalidade = calculo_multa_mora['valor_total']
            
            if valor_mensalidade <= 0:
                logger.error(f"Valor da mensalidade inválido: {valor_mensalidade}")
                return Response({
                    'error': f'Valor da mensalidade inválido: R$ {valor_mensalidade:.2f}. O valor deve ser maior que zero.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if valor_mensalidade < 0.01:
                logger.error(f"Valor da mensalidade muito pequeno: {valor_mensalidade}")
                return Response({
                    'error': f'Valor da mensalidade muito pequeno: R$ {valor_mensalidade:.2f}. O valor mínimo é R$ 0,01.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Cria o pagamento PIX via C6 Bank
            descricao = f"Mensalidade {mensalidade.data_vencimento.strftime('%m/%Y')} - {mensalidade.aluno.get_full_name()}"
            if calculo_multa_mora['esta_atrasada']:
                descricao += f" (Multa: R$ {calculo_multa_mora['valor_multa']:.2f}, Mora: R$ {calculo_multa_mora['valor_mora']:.2f})"
            
            expiracao_segundos = 1800  # 30 minutos de validade (1800 segundos)
            
            logger.info(f"[DEBUG PIX] Gerando PIX para mensalidade {mensalidade.id}, valor original: R$ {float(mensalidade.valor):.2f}")
            if calculo_multa_mora['esta_atrasada']:
                logger.info(f"[DEBUG PIX] Mensalidade atrasada: {calculo_multa_mora['dias_atraso']} dias")
                logger.info(f"[DEBUG PIX] Multa: R$ {calculo_multa_mora['valor_multa']:.2f}, Mora: R$ {calculo_multa_mora['valor_mora']:.2f}")
            logger.info(f"[DEBUG PIX] Valor total a cobrar: R$ {valor_mensalidade:.2f}")
            logger.info(f"[DEBUG PIX] Descrição: {descricao}")
            logger.info(f"[DEBUG PIX] Chave PIX configurada: {bool(settings.C6_BANK_CHAVE_PIX)}")
            
            try:
                pix_response = c6_client.create_pix_payment(
                    valor=valor_mensalidade,
                    descricao=descricao[:140],  # Limita descrição (algumas APIs têm limite)
                    chave_pix=settings.C6_BANK_CHAVE_PIX,
                    expiracao_segundos=expiracao_segundos
                )
            except Exception as e:
                logger.error(f"[DEBUG PIX] Erro ao criar cobrança PIX: {str(e)}")
                import traceback
                logger.error(f"[DEBUG PIX] Stack trace: {traceback.format_exc()}")
                raise
            
            # Extrai dados da resposta conforme documentação oficial
            txid = pix_response.get('txid')
            calendario = pix_response.get('calendario', {})
            valor_info = pix_response.get('valor', {})
            
            # O código PIX Copia e Cola já vem na resposta (campo pixCopiaECola)
            pix_copia_cola = pix_response.get('pixCopiaECola')
            
            # Calcula data de expiração
            expiracao_segundos = calendario.get('expiracao', 1800)  # Padrão: 1800 segundos (30 minutos)
            data_expiracao = timezone.now() + timedelta(seconds=expiracao_segundos)
            
            # Cria a transação no banco de dados
            # Armazena o valor total (com multa e mora) na transação
            transacao = TransacaoC6Bank.objects.create(
                mensalidade=mensalidade,
                tipo='pix',
                valor=Decimal(str(valor_mensalidade)),  # Valor total com multa e mora
                txid=txid,
                chave_pix=settings.C6_BANK_CHAVE_PIX,
                descricao=descricao,
                data_expiracao=data_expiracao,
                resposta_api=pix_response,
                codigo_pix=pix_copia_cola  # Código PIX Copia e Cola já vem na resposta
            )
            
            # Se não veio o código na resposta, tenta obter consultando a cobrança
            if not pix_copia_cola:
                try:
                    logger.info(f"Código PIX não veio na resposta inicial, consultando cobrança {txid}")
                    pix_copia_cola = c6_client.get_pix_copia_cola(txid)
                    if pix_copia_cola:
                        transacao.codigo_pix = pix_copia_cola
                        transacao.save()
                except Exception as e:
                    logger.warning(f"Erro ao obter código PIX Copia e Cola: {str(e)}")
            
            # Gera QR Code em base64 (opcional, para compatibilidade)
            if pix_copia_cola:
                try:
                    import qrcode  # type: ignore
                    from io import BytesIO
                    import base64
                    
                    qr = qrcode.QRCode(version=1, box_size=10, border=5)
                    qr.add_data(pix_copia_cola)
                    qr.make(fit=True)
                    
                    img = qr.make_image(fill_color="black", back_color="white")
                    buffer = BytesIO()
                    img.save(buffer, format='PNG')
                    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
                    
                    transacao.qr_code = qr_code_base64
                    transacao.save()
                except ImportError:
                    # QRCode library não instalado - não é crítico
                    logger.info("Biblioteca qrcode não instalada. QR Code não será gerado em base64.")
                except Exception as e:
                    logger.warning(f"Erro ao gerar QR Code: {str(e)}")
            
            return Response({
                'message': 'Pagamento PIX criado com sucesso!',
                'transacao': TransacaoC6BankSerializer(transacao).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            error_message = str(e)
            logger.error(f"Erro ao gerar PIX C6 Bank: {error_message}")
            
            # Verifica se é um erro de configuração
            if "Chave PIX não configurada" in error_message:
                return Response({
                    'error': 'Chave PIX não configurada no servidor. Entre em contato com o suporte.',
                    'debug_info': {
                        'configurado': bool(settings.C6_BANK_CHAVE_PIX),
                        'mensalidade_id': mensalidade.id if 'mensalidade' in locals() else None
                    }
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Outros erros
            return Response({
                'error': f'Erro ao gerar pagamento PIX: {error_message}',
                'suggestion': 'Verifique se a chave PIX está configurada corretamente e se o servidor C6 Bank está acessível.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConsultarStatusPixPorTransacaoAPIView(APIView):
    """
    Consulta o status de uma transação PIX por ID da transação
    URL: /api/financeiro/pix/status/<transacao_id>/
    Compatível com frontend que espera esta rota
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, transacao_id):
        try:
            # Busca a transação C6 Bank pelo ID
            transacao = get_object_or_404(TransacaoC6Bank, id=transacao_id, tipo='pix')
            
            # Verifica se o usuário tem permissão
            if request.user.tipo == 'aluno' and transacao.mensalidade.aluno != request.user:
                return Response({
                    'error': 'Você não tem permissão para consultar esta transação.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Verifica se a transação expirou
            if transacao.status == 'pendente' and timezone.now() > transacao.data_expiracao:
                transacao.status = 'expirado'
                transacao.save()
                return Response({
                    'message': 'Pagamento PIX expirado.',
                    'transacao': TransacaoC6BankSerializer(transacao).data
                })
            
            # Se tem TXID, consulta o status no C6 Bank
            if transacao.txid and transacao.status == 'pendente':
                try:
                    status_response = c6_client.get_pix_payment_status(transacao.txid)
                    
                    # Atualiza o status baseado na resposta
                    status_pix = status_response.get('status')
                    
                    if status_pix == 'CONCLUIDA' and transacao.status != 'aprovado':
                        transacao.status = 'aprovado'
                        transacao.data_aprovacao = timezone.now()
                        transacao.resposta_api = status_response
                        transacao.save()
                        
                        # Atualiza o status da mensalidade
                        mensalidade = transacao.mensalidade
                        mensalidade.status = 'pago'
                        mensalidade.save()
                        logger.info(f"Mensalidade {mensalidade.id} marcada como paga após consulta de status")
                        
                    elif status_pix == 'REMOVIDA_PELO_USUARIO_RECEBEDOR':
                        transacao.status = 'cancelado'
                        transacao.data_cancelamento = timezone.now()
                        transacao.resposta_api = status_response
                        transacao.save()
                        
                except Exception as e:
                    logger.warning(f"Erro ao consultar status no C6 Bank: {str(e)}")
                    # Continua e retorna o status atual mesmo sem consultar
            
            return Response({
                'transacao': TransacaoC6BankSerializer(transacao).data,
                'status': transacao.status
            })
            
        except Exception as e:
            logger.error(f"Erro ao consultar status PIX: {str(e)}")
            return Response({
                'error': f'Erro ao consultar status do pagamento: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConsultarStatusPixAPIView(APIView):
    """
    Consulta o status de uma transação PIX via C6 Bank
    URL: /api/financeiro/mensalidades/<pk>/status-pix/
    
    Nota: Esta view recebe o pk da mensalidade e consulta a transação PIX mais recente.
    Para consultar por ID de transação diretamente, use: /api/financeiro/c6/check-payment-status/<transacao_id>/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        try:
            mensalidade = get_object_or_404(Mensalidade, pk=pk)
            
            # Verifica se o usuário tem permissão
            if request.user.tipo == 'aluno' and mensalidade.aluno != request.user:
                return Response({
                    'error': 'Você não tem permissão para consultar esta mensalidade.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Busca a transação C6 Bank PIX mais recente para esta mensalidade
            transacao = TransacaoC6Bank.objects.filter(
                mensalidade=mensalidade,
                tipo='pix'
            ).order_by('-data_criacao').first()
            
            if not transacao:
                return Response({
                    'error': 'Nenhuma transação PIX encontrada para esta mensalidade.',
                    'status': mensalidade.status
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Verifica se a transação expirou
            if transacao.status == 'pendente' and timezone.now() > transacao.data_expiracao:
                transacao.status = 'expirado'
                transacao.save()
                return Response({
                    'message': 'Pagamento PIX expirado.',
                    'transacao': TransacaoC6BankSerializer(transacao).data
                })
            
            # Se tem TXID, consulta o status no C6 Bank
            if transacao.txid and transacao.status == 'pendente':
                try:
                    status_response = c6_client.get_pix_payment_status(transacao.txid)
                    
                    # Atualiza o status baseado na resposta
                    status_pix = status_response.get('status')
                    
                    if status_pix == 'CONCLUIDA' and transacao.status != 'aprovado':
                        transacao.status = 'aprovado'
                        transacao.data_aprovacao = timezone.now()
                        transacao.resposta_api = status_response
                        transacao.save()
                        
                        # Atualiza o status da mensalidade
                        mensalidade.status = 'pago'
                        mensalidade.save()
                        logger.info(f"Mensalidade {mensalidade.id} marcada como paga após consulta de status")
                        
                    elif status_pix == 'REMOVIDA_PELO_USUARIO_RECEBEDOR':
                        transacao.status = 'cancelado'
                        transacao.data_cancelamento = timezone.now()
                        transacao.resposta_api = status_response
                        transacao.save()
                        
                except Exception as e:
                    logger.warning(f"Erro ao consultar status no C6 Bank: {str(e)}")
                    # Continua e retorna o status atual mesmo sem consultar
            
            return Response({
                'transacao': TransacaoC6BankSerializer(transacao).data,
                'status': transacao.status
            })
            
        except Exception as e:
            logger.error(f"Erro ao consultar status PIX: {str(e)}")
            return Response({
                'error': f'Erro ao consultar status do pagamento: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ========================================
# INTEGRAÇÃO C6 BANK
# ========================================

class C6BankTestConnectionAPIView(APIView):
    """
    Testa a conexão com a API do C6 Bank
    URL: /api/financeiro/c6/test-connection/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.tipo != "gerente":
            return Response({"error": "Permissão negada."}, status=403)
        
        try:
            # Testa a conexão com o C6 Bank
            connection_ok = c6_client.test_connection()
            
            if connection_ok:
                return Response({
                    'status': 'success',
                    'message': 'Conexão com C6 Bank estabelecida com sucesso!',
                    'environment': settings.C6_BANK_ENVIRONMENT,
                    'base_url': c6_client.base_url
                })
            else:
                return Response({
                    'status': 'error',
                    'message': 'Falha na conexão com C6 Bank'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Erro ao testar conexão C6 Bank: {str(e)}")
            return Response({
                'status': 'error',
                'message': f'Erro ao testar conexão: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class C6BankCreatePixPaymentAPIView(APIView):
    """
    Cria um pagamento PIX via C6 Bank
    URL: /api/financeiro/c6/create-pix-payment/
    
    Esta view é um alias para GerarPixAPIView, mantida para compatibilidade.
    Reutiliza a lógica consolidada.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Usa a mesma lógica de GerarPixAPIView
        mensalidade_id = request.data.get('mensalidade_id')
        if not mensalidade_id:
            return Response({
                'error': 'ID da mensalidade é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Chama o método post da view consolidada
        return GerarPixAPIView().post(request, mensalidade_id=mensalidade_id)


class C6BankCheckPaymentStatusAPIView(APIView):
    """
    Consulta o status de um pagamento PIX via C6 Bank
    URL: /api/financeiro/c6/check-payment-status/{transacao_id}/
    
    Esta view é um alias para ConsultarStatusPixPorTransacaoAPIView, mantida para compatibilidade.
    Reutiliza a lógica consolidada e adiciona campos extras na resposta.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, transacao_id):
        # Usa a mesma lógica de ConsultarStatusPixPorTransacaoAPIView
        response = ConsultarStatusPixPorTransacaoAPIView().get(request, transacao_id)
        
        # Adiciona campos extras para compatibilidade com resposta anterior
        if response.status_code == 200 and hasattr(response, 'data'):
            try:
                transacao = TransacaoC6Bank.objects.get(id=transacao_id)
                if transacao.txid:
                    status_response = c6_client.get_pix_payment_status(transacao.txid)
                    # Cria uma nova Response com os dados adicionais
                    data = dict(response.data)
                    data['status_pix'] = status_response.get('status')
                    data['api_response'] = status_response
                    return Response(data, status=response.status_code)
            except Exception as e:
                logger.warning(f"Erro ao adicionar campos extras na resposta: {str(e)}")
        
        return response


class C6BankTransactionListAPIView(ListCreateAPIView):
    """
    Lista transações do C6 Bank
    URL: /api/financeiro/c6/transactions/
    """
    serializer_class = TransacaoC6BankSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = TransacaoC6Bank.objects.all()
        
        # Filtros opcionais
        mensalidade_id = self.request.query_params.get('mensalidade_id')
        if mensalidade_id:
            queryset = queryset.filter(mensalidade_id=mensalidade_id)
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        tipo_filter = self.request.query_params.get('tipo')
        if tipo_filter:
            queryset = queryset.filter(tipo=tipo_filter)
        
        return queryset.order_by('-data_criacao')


class C6BankTransactionDetailAPIView(RetrieveUpdateDestroyAPIView):
    """
    Detalhes de uma transação específica do C6 Bank
    URL: /api/financeiro/c6/transactions/{id}/
    """
    queryset = TransacaoC6Bank.objects.all()
    serializer_class = TransacaoC6BankSerializer
    permission_classes = [IsAuthenticated]


class CriarPagamentoBancarioAPIView(APIView):
    """
    Cria checkout de pagamento bancário (cartão) para uma mensalidade
    URL: /api/financeiro/pagamento-bancario/gerar/{mensalidade_id}/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, mensalidade_id):
        try:
            mensalidade = get_object_or_404(Mensalidade, pk=mensalidade_id)
            
            # Verifica se o usuário tem permissão (aluno só pode pagar suas próprias mensalidades)
            if request.user.tipo == 'aluno' and mensalidade.aluno != request.user:
                return Response({
                    'error': 'Você não tem permissão para gerar pagamento desta mensalidade.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Verifica se já existe uma transação pendente
            transacao_existente = TransacaoC6Bank.objects.filter(
                mensalidade=mensalidade,
                status='pendente',
                data_expiracao__gt=timezone.now(),
                tipo='cartao'
            ).first()
            
            if transacao_existente:
                # Se já existe transação pendente válida, retorna ela
                return Response({
                    'message': 'Já existe um pagamento bancário pendente para esta mensalidade.',
                    'payment_url': transacao_existente.payment_url,
                    'transacao': TransacaoC6BankSerializer(transacao_existente).data
                })
            
            # Prepara dados do pagador
            aluno = mensalidade.aluno
            nome_completo = aluno.get_full_name()
            # Limita nome a 40 caracteres conforme checkout.yaml (linha 768)
            nome_completo = nome_completo[:40] if len(nome_completo) > 40 else nome_completo
            
            # Formata telefone: apenas números, conforme checkout.yaml (linha 784-787)
            telefone_limpo = ""
            if aluno.telefone:
                telefone_limpo = ''.join(filter(str.isdigit, aluno.telefone))
            
            payer_info = {
                "name": nome_completo,
                "tax_id": aluno.cpf.replace('.', '').replace('-', ''),  # CPF sem máscara (checkout.yaml linha 771-776)
                "email": aluno.email,
                "phone_number": telefone_limpo
            }
            
            # Configuração de pagamento com cartão
            # Conforme checkout.yaml linha 588-640
            payment_config = {
                "card": {
                    "type": "CREDIT",  # CREDIT ou DEBIT (checkout.yaml linha 636-639)
                    "installments": 1,  # 1-12 (checkout.yaml linha 610-613)
                    "interest_type": "BY_SELLER",  # Requerido se installments > 1 (checkout.yaml linha 614-619)
                    "authenticate": "NOT_REQUIRED",  # checkout.yaml linha 588-591
                    "save_card": False,  # checkout.yaml linha 625-629
                    "capture": True  # Captura automática (checkout.yaml linha 597)
                }
            }
            
            # Calcula multa e mora se a mensalidade estiver atrasada
            calculo_multa_mora = calcular_multa_mora(mensalidade)
            valor_total = calculo_multa_mora['valor_total']
            
            # Cria o checkout via C6 Bank
            descricao = f"Mensalidade {mensalidade.data_vencimento.strftime('%m/%Y')} - {aluno.get_full_name()}"
            if calculo_multa_mora['esta_atrasada']:
                descricao += f" (Multa: R$ {calculo_multa_mora['valor_multa']:.2f}, Mora: R$ {calculo_multa_mora['valor_mora']:.2f})"
            expiracao_horas = 24  # 24 horas de validade
            
            # Formata external_reference_id conforme checkout.yaml linha 732-738
            # Padrão: ^[a-zA-Z0-9]{1,10}$ - apenas letras e números, máximo 10 caracteres
            # Formato: M + ID da mensalidade (máximo 9 dígitos para totalizar 10 caracteres)
            mensalidade_id_str = str(mensalidade.id)[:9]  # Garante máximo 9 dígitos
            external_ref = f"M{mensalidade_id_str.zfill(9)}"  # Preenche com zeros à esquerda até 9 dígitos
            
            logger.info(f"[DEBUG CARTÃO] Gerando checkout para mensalidade {mensalidade.id}")
            logger.info(f"[DEBUG CARTÃO] Valor original: R$ {float(mensalidade.valor):.2f}")
            if calculo_multa_mora['esta_atrasada']:
                logger.info(f"[DEBUG CARTÃO] Mensalidade atrasada: {calculo_multa_mora['dias_atraso']} dias")
                logger.info(f"[DEBUG CARTÃO] Multa: R$ {calculo_multa_mora['valor_multa']:.2f}, Mora: R$ {calculo_multa_mora['valor_mora']:.2f}")
            logger.info(f"[DEBUG CARTÃO] Valor total a cobrar: R$ {valor_total:.2f}")
            
            checkout = c6_client.create_checkout(
                amount=valor_total,
                description=descricao,
                payer=payer_info,
                payment=payment_config,
                expiration_hours=expiracao_horas,
                external_reference_id=external_ref
            )
            
            # Calcula data de expiração
            data_expiracao = timezone.now() + timedelta(hours=expiracao_horas)
            
            # Cria a transação no banco de dados
            # Armazena o valor total (com multa e mora) na transação
            transacao = TransacaoC6Bank.objects.create(
                mensalidade=mensalidade,
                tipo='cartao',
                valor=Decimal(str(valor_total)),  # Valor total com multa e mora
                txid=checkout.get('id'),  # ID do checkout como txid
                payment_url=checkout.get('url'),
                descricao=descricao,
                data_expiracao=data_expiracao,
                resposta_api=checkout
            )
            
            logger.info(f"Checkout criado para mensalidade {mensalidade.id}: {checkout.get('url')}")
            
            return Response({
                'message': 'Pagamento bancário criado com sucesso!',
                'payment_url': checkout.get('url'),
                'transacao': TransacaoC6BankSerializer(transacao).data
            })
            
        except Exception as e:
            logger.error(f"Erro ao criar pagamento bancário: {str(e)}")
            return Response({
                'error': f'Erro ao criar pagamento bancário: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class C6BankWebhookAPIView(APIView):
    """
    Webhook para receber notificações do C6 Bank - PIX
    URL: /api/financeiro/c6/webhook/
    
    Conforme documentação: pix-api.yaml linha 2385-2392
    O webhook PIX recebe um ARRAY de objetos PIX quando um pagamento é recebido.
    """
    permission_classes = []  # Público para receber webhooks
    authentication_classes = []
    
    def post(self, request):
        try:
            # Log do webhook recebido
            logger.info(f"Webhook C6 Bank PIX recebido")
            logger.info(f"Headers: {dict(request.headers)}")
            logger.info(f"Body: {request.data}")
            
            # Conforme documentação oficial, webhook PIX recebe um ARRAY de objetos PIX
            # pix-api.yaml linha 2385: "type: array, items: $ref: '#/components/schemas/Pix'"
            pix_array = request.data
            
            # Verifica se é uma lista (array)
            if not isinstance(pix_array, list):
                # Se não for array, tenta converter ou trata como array com um único item
                if isinstance(pix_array, dict):
                    pix_array = [pix_array]
                else:
                    logger.error(f"Formato inválido de webhook: esperado array, recebido {type(pix_array)}")
                    return JsonResponse({
                        'status': 'error',
                        'message': 'Formato inválido: webhook deve ser um array de objetos PIX'
                    }, status=400)
            
            # Processa cada PIX recebido no array
            pix_processados = 0
            pix_erros = 0
            
            for pix_data in pix_array:
                try:
                    self._process_pix_received(pix_data)
                    pix_processados += 1
                except Exception as e:
                    logger.error(f"Erro ao processar PIX no webhook: {str(e)}")
                    pix_erros += 1
            
            logger.info(f"Webhook processado: {pix_processados} PIX processados, {pix_erros} erros")
            
            return JsonResponse({
                'status': 'received',
                'message': 'Webhook processado com sucesso',
                'pix_processados': pix_processados,
                'pix_erros': pix_erros
            })
            
        except Exception as e:
            logger.error(f"Erro no webhook C6 Bank: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return JsonResponse({
                'status': 'error',
                'message': f'Erro ao processar webhook: {str(e)}'
            }, status=400)
    
    def _process_pix_received(self, pix_data):
        """
        Processa um objeto PIX recebido
        Conforme pix-api.yaml schema Pix (linha 4042-4098):
        - endToEndId (obrigatório)
        - txid (opcional, mas presente quando PIX pagou uma cobrança)
        - valor (obrigatório)
        - horario (obrigatório)
        - infoPagador (opcional)
        """
        try:
            # O txid identifica a cobrança que foi paga
            txid = pix_data.get('txid')
            end_to_end_id = pix_data.get('endToEndId')
            valor = pix_data.get('valor')
            horario = pix_data.get('horario')
            
            logger.info(f"Processando PIX: txid={txid}, endToEndId={end_to_end_id}, valor={valor}")
            
            if not txid:
                logger.warning(f"PIX sem txid (endToEndId: {end_to_end_id}). Pode ser PIX espontâneo (não associado a cobrança).")
                # PIX sem txid pode ser um pagamento espontâneo - não processamos no momento
                return
            
            # Busca a transação pela cobrança (txid)
            transacao = TransacaoC6Bank.objects.filter(txid=txid).first()
            if not transacao:
                logger.warning(f"Transação não encontrada para TXID: {txid}. PIX pode ter sido pago para cobrança não gerenciada por este sistema.")
                return
            
            # Verifica se já foi processado (pode ter múltiplos webhooks para mesma cobrança)
            if transacao.status == 'aprovado':
                logger.info(f"Transação {transacao.id} já estava aprovada. Atualizando dados do PIX recebido.")
            
            # Atualiza o status da transação
            transacao.status = 'aprovado'
            transacao.data_aprovacao = timezone.now()
            
            # Armazena os dados completos do PIX recebido
            if not transacao.resposta_api:
                transacao.resposta_api = {}
            
            # Adiciona/atualiza informações do PIX recebido
            if 'pix_recebidos' not in transacao.resposta_api:
                transacao.resposta_api['pix_recebidos'] = []
            
            pix_info = {
                'endToEndId': end_to_end_id,
                'txid': txid,
                'valor': valor,
                'horario': horario,
                'infoPagador': pix_data.get('infoPagador'),
                'data_recebimento': timezone.now().isoformat()
            }
            
            # Verifica se este PIX já foi registrado (pelo endToEndId)
            pix_existente = False
            for pix_exist in transacao.resposta_api['pix_recebidos']:
                if pix_exist.get('endToEndId') == end_to_end_id:
                    # Atualiza o PIX existente
                    pix_exist.update(pix_info)
                    pix_existente = True
                    break
            
            if not pix_existente:
                transacao.resposta_api['pix_recebidos'].append(pix_info)
            
            transacao.save()
            
            # Atualiza o status da mensalidade
            mensalidade = transacao.mensalidade
            if mensalidade.status != 'pago':
                mensalidade.status = 'pago'
                mensalidade.save()
                logger.info(f"Mensalidade {mensalidade.id} marcada como paga")
            
            logger.info(f"✅ PIX processado com sucesso: Transação {transacao.id}, EndToEndId: {end_to_end_id}, Valor: R$ {valor}")
            
        except Exception as e:
            logger.error(f"Erro ao processar PIX recebido: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())


# ========================================
# API BANK SLIP - BOLETO BANCÁRIO
# ========================================
# Conforme documentação: bankslip-api.yaml

class GerarBoletoAPIView(APIView):
    """
    Gera boleto bancário para uma mensalidade usando C6 Bank
    URL: /api/financeiro/mensalidades/<pk>/gerar-boleto/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk=None, mensalidade_id=None):
        try:
            # Suporta tanto pk quanto mensalidade_id para compatibilidade
            mensalidade_pk = pk or mensalidade_id
            mensalidade = get_object_or_404(Mensalidade, pk=mensalidade_pk)
            
            # Verifica se o usuário tem permissão (aluno só pode gerar boleto de suas próprias mensalidades)
            if request.user.tipo == 'aluno' and mensalidade.aluno != request.user:
                return Response({
                    'error': 'Você não tem permissão para gerar boleto desta mensalidade.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Verifica se já existe uma transação C6 Bank pendente do tipo boleto
            transacao_existente = TransacaoC6Bank.objects.filter(
                mensalidade=mensalidade,
                status='pendente',
                data_expiracao__gt=timezone.now(),
                tipo='boleto'
            ).first()
            
            if transacao_existente:
                # Se já existe transação pendente válida, retorna ela
                return Response({
                    'message': 'Já existe um boleto pendente para esta mensalidade.',
                    'transacao': TransacaoC6BankSerializer(transacao_existente).data
                })
            
            # Prepara dados do pagador (payer) conforme bankslip-api.yaml linha 554-581
            aluno = mensalidade.aluno
            
            # Endereço do pagador (obrigatório)
            # Nota: O modelo Usuario tem apenas campo 'endereco' genérico.
            # Para produção, considerar adicionar campos específicos (rua, número, cidade, estado, CEP)
            # Por enquanto, usa valores padrão para sandbox
            
            # Extrai informações do endereço se disponível
            endereco_completo = aluno.endereco or "Endereço não informado"
            street = endereco_completo[:33] if len(endereco_completo) <= 33 else endereco_completo[:33]
            
            # Tenta extrair número do endereço (procura por padrões comuns)
            number = 1  # Valor padrão mínimo (0 pode ser rejeitado pela API)
            if aluno.endereco:
                # Procura por padrões como "123", "nº 123", etc.
                import re as re_module
                numero_match = re_module.search(r'(\d+)', aluno.endereco)
                if numero_match:
                    try:
                        number = int(numero_match.group(1))
                        if number == 0:
                            number = 1
                    except ValueError:
                        number = 1
            
            address = {
                "street": street,
                "number": number,  # Usa 1 como padrão mínimo (não pode ser 0)
                "complement": "",
                "city": "São Paulo",  # Cidade padrão
                "state": "SP",  # Estado padrão
                "zip_code": "01000000"  # CEP padrão
            }
            
            # Tenta extrair informações do endereço se existir
            # Nota: Isso é uma implementação básica para sandbox
            # Em produção, considere adicionar campos específicos no modelo Usuario
            
            # Valida nome do aluno
            nome_completo = aluno.get_full_name().strip()
            if not nome_completo or len(nome_completo) < 3:
                return Response({
                    'error': 'Nome do aluno inválido. Por favor, complete o cadastro com nome completo.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Valida e formata CPF
            if not aluno.cpf:
                return Response({
                    'error': 'CPF do aluno não cadastrado. Por favor, complete o cadastro com o CPF.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Limpa o CPF (remove pontos e traços) e valida
            cpf_original = str(aluno.cpf)
            cpf_limpo = re.sub(r'\D', '', cpf_original)
            
            # Remove zeros à esquerda para verificar se realmente tem conteúdo
            cpf_sem_zeros = cpf_limpo.lstrip('0')
            
            if len(cpf_limpo) < 11:
                # Preenche com zeros à esquerda se necessário
                cpf_limpo = cpf_limpo.zfill(11)
            
            # Validação do CPF
            # Nota: A API do C6 Bank pode validar os dígitos verificadores do CPF
            # Em sandbox, alguns CPFs de teste podem ser rejeitados
            if len(cpf_limpo) != 11 or not cpf_limpo.isdigit():
                logger.error(f"CPF inválido para aluno {aluno.id}: Original: '{cpf_original}', Limpo: '{cpf_limpo}', Sem zeros: '{cpf_sem_zeros}'")
                return Response({
                    'error': f'CPF inválido. O CPF deve ter 11 dígitos numéricos. CPF cadastrado: {cpf_original}.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validação dos dígitos verificadores do CPF (algoritmo oficial)
            def validar_cpf_dv(cpf):
                """Valida os dígitos verificadores de um CPF"""
                if len(cpf) != 11 or cpf == cpf[0] * 11:
                    return False
                
                # Calcula primeiro dígito verificador
                soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
                digito1 = (soma * 10) % 11
                if digito1 == 10:
                    digito1 = 0
                
                if digito1 != int(cpf[9]):
                    return False
                
                # Calcula segundo dígito verificador
                soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
                digito2 = (soma * 10) % 11
                if digito2 == 10:
                    digito2 = 0
                
                return digito2 == int(cpf[10])
            
            # Se estiver em sandbox e o CPF não passar na validação, avisa mas continua
            if settings.C6_BANK_ENVIRONMENT == 'sandbox':
                if not validar_cpf_dv(cpf_limpo):
                    logger.warning(f"CPF não passa na validação dos dígitos verificadores: {cpf_limpo}. Tentando mesmo assim em sandbox.")
                    # Em sandbox, alguns CPFs podem ser aceitos mesmo sem passar na validação
                    # Mas se a API rejeitar, o erro será claro
            else:
                # Em produção, valida rigorosamente
                if not validar_cpf_dv(cpf_limpo):
                    logger.error(f"CPF inválido (dígitos verificadores): {cpf_limpo}")
                    return Response({
                        'error': f'CPF inválido. Os dígitos verificadores não conferem. Verifique o CPF cadastrado: {cpf_original}.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"CPF validado: Original: '{cpf_original}' -> Limpo: '{cpf_limpo}' (11 dígitos)")
            
            # Formata external_reference_id conforme bankslip-api.yaml linha 460-467
            # Padrão: ^[a-zA-Z0-9]{1,10}$ - apenas letras e números, máximo 10 caracteres
            mensalidade_id_str = str(mensalidade.id)[:9]
            external_ref = f"B{mensalidade_id_str.zfill(9)}"
            
            # Prepara dados do pagador
            payer = {
                "name": nome_completo[:40],  # Máximo 40 caracteres conforme bankslip-api.yaml
                "tax_id": cpf_limpo,  # CPF limpo (11 dígitos)
                "address": address
            }
            
            # Email opcional (só adiciona se for um email válido)
            if aluno.email and aluno.email != 'pendente' and '@' in aluno.email:
                payer["email"] = aluno.email
                logger.info(f"Email do pagador adicionado: {aluno.email}")
            
            # Validação final antes de enviar
            if not payer.get("tax_id") or len(payer.get("tax_id", "")) != 11:
                logger.error(f"Validação final falhou: CPF inválido no payload. tax_id: '{payer.get('tax_id')}'")
                return Response({
                    'error': 'Erro interno: CPF inválido no payload. Por favor, entre em contato com o suporte.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            if not payer.get("name") or len(payer.get("name", "").strip()) < 3:
                logger.error(f"Validação final falhou: Nome inválido no payload. name: '{payer.get('name')}'")
                return Response({
                    'error': 'Erro interno: Nome inválido no payload. Por favor, entre em contato com o suporte.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            logger.info(f"Gerando boleto para aluno: {nome_completo}, CPF: {cpf_limpo} (length: {len(cpf_limpo)}), Mensalidade: {mensalidade.id}")
            logger.info(f"Payload payer validado: name='{payer['name']}', tax_id length={len(payer['tax_id'])}, address={address}")
            
            # Calcula multa e mora se a mensalidade estiver atrasada
            calculo_multa_mora = calcular_multa_mora(mensalidade)
            valor_mensalidade = float(mensalidade.valor)
            
            # Valida o valor da mensalidade conforme limites do C6 Bank
            # C6 Bank: mínimo R$ 5,00 e máximo R$ 500.000,00
            if valor_mensalidade < 5.00:
                logger.error(f"Valor da mensalidade abaixo do mínimo: R$ {valor_mensalidade:.2f}")
                return Response({
                    'error': f'Valor da mensalidade (R$ {valor_mensalidade:.2f}) está abaixo do mínimo permitido para boletos (R$ 5,00). Por favor, entre em contato com o suporte.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if valor_mensalidade > 500000.00:
                logger.error(f"Valor da mensalidade acima do máximo: R$ {valor_mensalidade:.2f}")
                return Response({
                    'error': f'Valor da mensalidade (R$ {valor_mensalidade:.2f}) está acima do máximo permitido para boletos (R$ 500.000,00). Por favor, entre em contato com o suporte.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Data de vencimento
            due_date = mensalidade.data_vencimento.strftime('%Y-%m-%d')
            
            # Instruções opcionais (até 4 instruções)
            instructions = [
                f"Não receber após o vencimento",
                f"Mensalidade {mensalidade.data_vencimento.strftime('%m/%Y')}"
            ]
            
            # Configura multa e mora para boleto (se estiver atrasada)
            fine = None
            interest = None
            if calculo_multa_mora['esta_atrasada']:
                # Multa: 2% (tipo P = percentual, dead_line 0 = começa no dia seguinte ao vencimento)
                fine = {
                    "type": "P",
                    "value": 2.0,
                    "dead_line": 0
                }
                # Mora: 1% ao mês (tipo P = percentual, dead_line 0 = começa no dia seguinte ao vencimento)
                # O C6 Bank calcula automaticamente proporcional aos dias
                interest = {
                    "type": "P",
                    "value": 1.0,
                    "dead_line": 0
                }
                logger.info(f"[DEBUG BOLETO] Mensalidade atrasada: {calculo_multa_mora['dias_atraso']} dias")
                logger.info(f"[DEBUG BOLETO] Multa configurada: 2%")
                logger.info(f"[DEBUG BOLETO] Mora configurada: 1% ao mês")
            
            # Debug: Mostra exatamente o que será enviado
            logger.info(f"[DEBUG BOLETO] External Reference ID: {external_ref}")
            logger.info(f"[DEBUG BOLETO] Amount: {valor_mensalidade}")
            logger.info(f"[DEBUG BOLETO] Due Date: {due_date}")
            logger.info(f"[DEBUG BOLETO] Fine: {fine}")
            logger.info(f"[DEBUG BOLETO] Interest: {interest}")
            logger.info(f"[DEBUG BOLETO] Payer completo: {json.dumps(payer, indent=2, ensure_ascii=False)}")
            
            # Cria o boleto via C6 Bank
            # Carteira sandbox = 21 (conforme bankslip-api.yaml linha 51)
            try:
                boleto_response = c6_client.create_bank_slip(
                    external_reference_id=external_ref,
                    amount=valor_mensalidade,
                    due_date=due_date,
                    payer=payer,
                    instructions=instructions,
                    fine=fine,
                    interest=interest,
                    partner_software_name="CT Supera",
                    partner_software_version="1.0.0"
                )
            except Exception as e:
                logger.error(f"[DEBUG BOLETO] Erro ao criar boleto: {str(e)}")
                logger.error(f"[DEBUG BOLETO] Tipo do erro: {type(e).__name__}")
                import traceback
                logger.error(f"[DEBUG BOLETO] Stack trace: {traceback.format_exc()}")
                raise
            
            # Extrai dados da resposta
            boleto_id = boleto_response.get('id')
            digitable_line = boleto_response.get('digitable_line')
            bar_code = boleto_response.get('bar_code')
            
            # Calcula data de expiração (padrão: 30 dias após vencimento)
            data_expiracao = timezone.now() + timedelta(days=30)
            
            # Cria a transação no banco de dados
            # Armazena o valor original (o C6 Bank calculará multa e mora automaticamente)
            descricao_boleto = f"Boleto - Mensalidade {mensalidade.data_vencimento.strftime('%m/%Y')} - {aluno.get_full_name()}"
            if calculo_multa_mora['esta_atrasada']:
                descricao_boleto += f" (Multa: 2%, Mora: 1% ao mês)"
            
            transacao = TransacaoC6Bank.objects.create(
                mensalidade=mensalidade,
                tipo='boleto',
                valor=mensalidade.valor,  # Valor original (multa e mora calculadas pelo C6 Bank)
                txid=boleto_id,  # ID do boleto como txid
                boleto_codigo=digitable_line,
                descricao=descricao_boleto,
                data_expiracao=data_expiracao,
                resposta_api=boleto_response
            )
            
            logger.info(f"Boleto criado para mensalidade {mensalidade.id}: {boleto_id}")
            
            return Response({
                'message': 'Boleto gerado com sucesso!',
                'transacao': TransacaoC6BankSerializer(transacao).data,
                'boleto': {
                    'id': boleto_id,
                    'digitable_line': digitable_line,
                    'bar_code': bar_code
                }
            }, status=status.HTTP_201_CREATED)
            
        except C6BankMethodNotAllowedError as e:
            # Erro 405 - Método não permitido
            # Retorna 405 ao invés de 500 para indicar erro do cliente (4xx)
            # e evitar retries automáticos que não fazem sentido para este tipo de erro
            logger.error(f"Erro 405 ao gerar boleto: {str(e)}")
            logger.error(f"Detalhes: {e.detail if hasattr(e, 'detail') and e.detail else 'N/A'}")
            logger.error(f"Type: {e.type if hasattr(e, 'type') else 'N/A'}")
            logger.error(f"Correlation ID: {e.correlation_id if hasattr(e, 'correlation_id') and e.correlation_id else 'N/A'}")
            
            return Response({
                'error': f'Erro ao gerar boleto: O método HTTP não é permitido para este endpoint. Verifique a configuração da API do C6 Bank.',
                'error_details': {
                    'status': e.status,
                    'title': e.title,
                    'detail': e.detail if hasattr(e, 'detail') and e.detail else None,
                    'correlation_id': e.correlation_id if hasattr(e, 'correlation_id') and e.correlation_id else None
                }
            }, status=status.HTTP_405_METHOD_NOT_ALLOWED)
        except C6BankInvalidRequestError as e:
            # Erro 400 - Requisição inválida
            # Retorna 400 ao invés de 500 para indicar erro do cliente (4xx)
            logger.error(f"Erro 400 ao gerar boleto: {str(e)}")
            logger.error(f"Detalhes: {e.detail if hasattr(e, 'detail') and e.detail else 'N/A'}")
            logger.error(f"Type: {e.type if hasattr(e, 'type') else 'N/A'}")
            logger.error(f"Correlation ID: {e.correlation_id if hasattr(e, 'correlation_id') and e.correlation_id else 'N/A'}")
            
            # Tenta extrair informações úteis do erro
            error_message = str(e)
            error_detail = e.detail if hasattr(e, 'detail') and e.detail else None
            
            # Verifica se o erro é relacionado ao valor (amount)
            if "amount" in error_message.lower() or (error_detail and "amount" in str(error_detail).lower()):
                # Erro relacionado ao valor
                valor_mensalidade = float(mensalidade.valor)
                return Response({
                    'error': f'Erro ao gerar boleto: O valor da mensalidade (R$ {valor_mensalidade:.2f}) está fora do range permitido. A API do C6 Bank aceita valores entre R$ 5,00 e R$ 500.000,00. Por favor, entre em contato com o suporte.',
                    'error_details': {
                        'status': e.status if hasattr(e, 'status') else 400,
                        'detail': error_detail,
                        'valor_mensalidade': valor_mensalidade,
                        'correlation_id': e.correlation_id if hasattr(e, 'correlation_id') and e.correlation_id else None
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            elif "CPF" in error_message.upper() or "tax_id" in error_message.lower():
                # Erro relacionado ao CPF
                return Response({
                    'error': f'Erro ao validar CPF: {error_message}. Por favor, verifique se o CPF do aluno está correto e tem 11 dígitos numéricos.',
                    'debug_info': {
                        'aluno_id': mensalidade.aluno.id,
                        'cpf_original': getattr(mensalidade.aluno, 'cpf', 'N/A'),
                        'nome': getattr(mensalidade.aluno, 'get_full_name', lambda: 'N/A')()
                    },
                    'error_details': {
                        'status': e.status if hasattr(e, 'status') else 400,
                        'detail': error_detail,
                        'correlation_id': e.correlation_id if hasattr(e, 'correlation_id') and e.correlation_id else None
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Outro tipo de erro 400
                return Response({
                    'error': f'Erro ao gerar boleto: {error_message}',
                    'error_details': {
                        'status': e.status if hasattr(e, 'status') else 400,
                        'title': e.title if hasattr(e, 'title') else None,
                        'detail': error_detail,
                        'correlation_id': e.correlation_id if hasattr(e, 'correlation_id') and e.correlation_id else None
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
        except C6BankError as e:
            # Outros erros C6 Bank
            error_message = str(e)
            error_status = e.status if hasattr(e, 'status') else None
            
            # Tenta extrair o status code da mensagem se não estiver no atributo
            # Formato: "[400] Requisição inválida"
            if error_status is None:
                status_match = re.search(r'\[(\d{3})\]', error_message)
                if status_match:
                    try:
                        error_status = int(status_match.group(1))
                        logger.info(f"Status code extraído da mensagem de erro: {error_status}")
                    except (ValueError, AttributeError):
                        pass
            
            logger.error(f"Erro C6 Bank ao gerar boleto: {error_message}")
            logger.error(f"Status: {error_status}")
            logger.error(f"Type: {e.type if hasattr(e, 'type') else 'N/A'}")
            logger.error(f"Detail: {e.detail if hasattr(e, 'detail') and e.detail else 'N/A'}")
            
            # Tenta extrair informações úteis do erro
            if "CPF" in error_message.upper() or "tax_id" in error_message.lower():
                # Erro relacionado ao CPF
                return Response({
                    'error': f'Erro ao validar CPF: {error_message}. Por favor, verifique se o CPF do aluno está correto e tem 11 dígitos numéricos.',
                    'debug_info': {
                        'aluno_id': mensalidade.aluno.id,
                        'cpf_original': getattr(mensalidade.aluno, 'cpf', 'N/A'),
                        'nome': getattr(mensalidade.aluno, 'get_full_name', lambda: 'N/A')()
                    },
                    'error_details': {
                        'status': error_status,
                        'detail': e.detail if hasattr(e, 'detail') and e.detail else None
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Mapeia o código de status HTTP do erro C6 Bank para o código apropriado
                # Erros 4xx são erros do cliente, 5xx são erros do servidor
                if error_status and 400 <= error_status < 500:
                    # Erro do cliente (4xx) - mapeia para o código HTTP apropriado
                    status_map = {
                        400: status.HTTP_400_BAD_REQUEST,
                        401: status.HTTP_401_UNAUTHORIZED,
                        403: status.HTTP_403_FORBIDDEN,
                        404: status.HTTP_404_NOT_FOUND,
                        405: status.HTTP_405_METHOD_NOT_ALLOWED,
                        422: status.HTTP_422_UNPROCESSABLE_ENTITY,
                        429: status.HTTP_429_TOO_MANY_REQUESTS,
                    }
                    http_status = status_map.get(error_status, status.HTTP_400_BAD_REQUEST)
                elif error_status and 500 <= error_status < 600:
                    # Erro do servidor (5xx)
                    http_status = status.HTTP_500_INTERNAL_SERVER_ERROR
                else:
                    # Status desconhecido ou None - tenta extrair da mensagem
                    if error_status is None:
                        # Tenta extrair código 4xx da mensagem (ex: "[400] Requisição inválida")
                        status_match = re.search(r'\[(4\d{2})\]', error_message)
                        if status_match:
                            try:
                                extracted_status = int(status_match.group(1))
                                status_map = {
                                    400: status.HTTP_400_BAD_REQUEST,
                                    401: status.HTTP_401_UNAUTHORIZED,
                                    403: status.HTTP_403_FORBIDDEN,
                                    404: status.HTTP_404_NOT_FOUND,
                                    422: status.HTTP_422_UNPROCESSABLE_ENTITY,
                                    429: status.HTTP_429_TOO_MANY_REQUESTS,
                                }
                                http_status = status_map.get(extracted_status, status.HTTP_400_BAD_REQUEST)
                                error_status = extracted_status  # Atualiza para usar no response
                                logger.info(f"Status code 4xx extraído da mensagem e mapeado: {extracted_status} -> {http_status}")
                            except (ValueError, AttributeError):
                                http_status = status.HTTP_500_INTERNAL_SERVER_ERROR
                        else:
                            # Não conseguiu extrair código 4xx - assume erro do servidor
                            http_status = status.HTTP_500_INTERNAL_SERVER_ERROR
                    else:
                        # Status conhecido mas fora do range esperado
                        http_status = status.HTTP_500_INTERNAL_SERVER_ERROR
                
                # Outro tipo de erro C6 Bank
                return Response({
                    'error': f'Erro ao gerar boleto: {error_message}',
                    'error_details': {
                        'status': error_status,
                        'title': e.title if hasattr(e, 'title') else None,
                        'detail': e.detail if hasattr(e, 'detail') and e.detail else None,
                        'correlation_id': e.correlation_id if hasattr(e, 'correlation_id') and e.correlation_id else None
                    }
                }, status=http_status)
        except Exception as e:
            error_message = str(e)
            logger.error(f"Erro ao gerar boleto: {error_message}")
            import traceback
            logger.error(f"Traceback completo: {traceback.format_exc()}")
            
            # Tenta extrair informações úteis do erro
            if "CPF" in error_message.upper() or "tax_id" in error_message.lower():
                # Erro relacionado ao CPF
                return Response({
                    'error': f'Erro ao validar CPF: {error_message}. Por favor, verifique se o CPF do aluno está correto e tem 11 dígitos numéricos.',
                    'debug_info': {
                        'aluno_id': mensalidade.aluno.id,
                        'cpf_original': getattr(mensalidade.aluno, 'cpf', 'N/A'),
                        'nome': getattr(mensalidade.aluno, 'get_full_name', lambda: 'N/A')()
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Outro tipo de erro
                return Response({
                    'error': f'Erro ao gerar boleto: {error_message}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConsultarBoletoAPIView(APIView):
    """
    Consulta um boleto bancário via C6 Bank
    URL: /api/financeiro/boletos/<transacao_id>/consultar/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, transacao_id):
        try:
            # Busca a transação C6 Bank pelo ID
            transacao = get_object_or_404(TransacaoC6Bank, id=transacao_id, tipo='boleto')
            
            # Verifica se o usuário tem permissão
            if request.user.tipo == 'aluno' and transacao.mensalidade.aluno != request.user:
                return Response({
                    'error': 'Você não tem permissão para consultar este boleto.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Se tem txid (ID do boleto), consulta o status no C6 Bank
            if transacao.txid:
                try:
                    boleto_data = c6_client.get_bank_slip(
                        transacao.txid,
                        partner_software_name="CT Supera",
                        partner_software_version="1.0.0"
                    )
                    
                    # Atualiza o status baseado na resposta
                    status_boleto = boleto_data.get('status')
                    
                    if status_boleto == 'PAID' and transacao.status != 'aprovado':
                        transacao.status = 'aprovado'
                        transacao.data_aprovacao = timezone.now()
                        transacao.resposta_api = boleto_data
                        transacao.save()
                        
                        # Atualiza o status da mensalidade
                        mensalidade = transacao.mensalidade
                        mensalidade.status = 'pago'
                        mensalidade.save()
                        logger.info(f"Mensalidade {mensalidade.id} marcada como paga após consulta de boleto")
                        
                    elif status_boleto == 'CANCELLED' and transacao.status != 'cancelado':
                        transacao.status = 'cancelado'
                        transacao.data_cancelamento = timezone.now()
                        transacao.resposta_api = boleto_data
                        transacao.save()
                    
                    return Response({
                        'transacao': TransacaoC6BankSerializer(transacao).data,
                        'boleto': boleto_data,
                        'status': transacao.status
                    })
                    
                except Exception as e:
                    logger.warning(f"Erro ao consultar boleto no C6 Bank: {str(e)}")
                    # Continua e retorna o status atual mesmo sem consultar
                    return Response({
                        'transacao': TransacaoC6BankSerializer(transacao).data,
                        'status': transacao.status,
                        'warning': f'Erro ao consultar no C6 Bank: {str(e)}'
                    })
            else:
                return Response({
                    'transacao': TransacaoC6BankSerializer(transacao).data,
                    'status': transacao.status
                })
            
        except Exception as e:
            logger.error(f"Erro ao consultar boleto: {str(e)}")
            return Response({
                'error': f'Erro ao consultar boleto: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AlterarBoletoAPIView(APIView):
    """
    Altera um boleto bancário via C6 Bank
    URL: /api/financeiro/boletos/<transacao_id>/alterar/
    """
    permission_classes = [IsAuthenticated]
    
    def put(self, request, transacao_id):
        try:
            # Apenas gerentes podem alterar boletos
            if request.user.tipo != 'gerente':
                return Response({
                    'error': 'Apenas gerentes podem alterar boletos.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Busca a transação C6 Bank pelo ID
            transacao = get_object_or_404(TransacaoC6Bank, id=transacao_id, tipo='boleto')
            
            # Verifica se o boleto pode ser alterado (não pode estar pago ou cancelado)
            if transacao.status in ['aprovado', 'cancelado']:
                return Response({
                    'error': 'Não é possível alterar um boleto que já foi pago ou cancelado.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not transacao.txid:
                return Response({
                    'error': 'Boleto não possui ID válido.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Prepara dados para alteração
            amount = request.data.get('amount')
            due_date = request.data.get('due_date')
            discount = request.data.get('discount')
            interest = request.data.get('interest')
            fine = request.data.get('fine')
            
            # Altera o boleto via C6 Bank
            boleto_data = c6_client.update_bank_slip(
                transacao.txid,
                amount=float(amount) if amount else None,
                due_date=due_date,
                discount=discount,
                interest=interest,
                fine=fine,
                partner_software_name="CT Supera",
                partner_software_version="1.0.0"
            )
            
            # Atualiza a transação
            transacao.resposta_api = boleto_data
            if amount:
                transacao.valor = amount
            transacao.save()
            
            logger.info(f"Boleto {transacao.txid} alterado com sucesso")
            
            return Response({
                'message': 'Boleto alterado com sucesso!',
                'transacao': TransacaoC6BankSerializer(transacao).data,
                'boleto': boleto_data
            })
            
        except Exception as e:
            logger.error(f"Erro ao alterar boleto: {str(e)}")
            return Response({
                'error': f'Erro ao alterar boleto: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CancelarBoletoAPIView(APIView):
    """
    Cancela um boleto bancário via C6 Bank
    URL: /api/financeiro/boletos/<transacao_id>/cancelar/
    """
    permission_classes = [IsAuthenticated]
    
    def put(self, request, transacao_id):
        try:
            # Apenas gerentes podem cancelar boletos
            if request.user.tipo != 'gerente':
                return Response({
                    'error': 'Apenas gerentes podem cancelar boletos.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Busca a transação C6 Bank pelo ID
            transacao = get_object_or_404(TransacaoC6Bank, id=transacao_id, tipo='boleto')
            
            # Verifica se o boleto pode ser cancelado
            if transacao.status == 'aprovado':
                return Response({
                    'error': 'Não é possível cancelar um boleto que já foi pago.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if transacao.status == 'cancelado':
                return Response({
                    'message': 'Boleto já está cancelado.',
                    'transacao': TransacaoC6BankSerializer(transacao).data
                })
            
            if not transacao.txid:
                return Response({
                    'error': 'Boleto não possui ID válido.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Cancela o boleto via C6 Bank
            c6_client.cancel_bank_slip(
                transacao.txid,
                partner_software_name="CT Supera",
                partner_software_version="1.0.0"
            )
            
            # Atualiza a transação
            transacao.status = 'cancelado'
            transacao.data_cancelamento = timezone.now()
            transacao.save()
            
            logger.info(f"Boleto {transacao.txid} cancelado com sucesso")
            
            return Response({
                'message': 'Boleto cancelado com sucesso!',
                'transacao': TransacaoC6BankSerializer(transacao).data
            })
            
        except Exception as e:
            logger.error(f"Erro ao cancelar boleto: {str(e)}")
            return Response({
                'error': f'Erro ao cancelar boleto: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DownloadBoletoPDFAPIView(APIView):
    """
    Obtém o PDF do boleto bancário via C6 Bank
    URL: /api/financeiro/boletos/<transacao_id>/pdf/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, transacao_id):
        try:
            # Busca a transação C6 Bank pelo ID
            transacao = get_object_or_404(TransacaoC6Bank, id=transacao_id, tipo='boleto')
            
            # Verifica se o usuário tem permissão
            if request.user.tipo == 'aluno' and transacao.mensalidade.aluno != request.user:
                return Response({
                    'error': 'Você não tem permissão para baixar este boleto.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            if not transacao.txid:
                return Response({
                    'error': 'Boleto não possui ID válido.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Obtém o PDF do boleto via C6 Bank
            pdf_content = c6_client.get_bank_slip_pdf(
                transacao.txid,
                partner_software_name="CT Supera",
                partner_software_version="1.0.0"
            )
            
            # Retorna o PDF como resposta HTTP
            from django.http import HttpResponse
            
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="boleto_{transacao.txid}.pdf"'
            
            logger.info(f"PDF do boleto {transacao.txid} enviado")
            
            return response
            
        except Exception as e:
            logger.error(f"Erro ao obter PDF do boleto: {str(e)}")
            return Response({
                'error': f'Erro ao obter PDF do boleto: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)