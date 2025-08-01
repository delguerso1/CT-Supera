from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from django.utils import timezone
from .models import Mensalidade, Despesa, Salario, TransacaoPix, TransacaoBancaria
from .serializers import MensalidadeSerializer, DespesaSerializer, SalarioSerializer, TransacaoPixSerializer, TransacaoBancariaSerializer
from django.shortcuts import get_object_or_404
from django.conf import settings
from datetime import timedelta
import mercadopago
# 

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
    Gera cobrança Pix para uma mensalidade.
    """
    def post(self, request, pk):
        mensalidade = get_object_or_404(Mensalidade, pk=pk)
        # Exemplo fictício de integração Pix:
        # Aqui você chamaria a API do seu banco/PSP para gerar o QR Code Pix
        # Exemplo de resposta simulada:
        pix_payload = f"00020126360014BR.GOV.BCB.PIX0114+5581999999995204000053039865407{mensalidade.valor:.2f}5802BR5920Nome do Recebedor6009SAO PAULO62070503***6304ABCD"
        qr_code_url = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + pix_payload

        return Response({
            "mensalidade_id": mensalidade.id,
            "valor": mensalidade.valor,
            "pix_payload": pix_payload,
            "qr_code_url": qr_code_url,
        }, status=status.HTTP_200_OK)

class ConsultarStatusPixAPIView(APIView):
    def get(self, request, pk):
        mensalidade = get_object_or_404(Mensalidade, pk=pk)
        # Aqui você consultaria a API do banco/PSP para saber se foi paga
        # Exemplo fictício:
        status_pix = mensalidade.status  # Supondo que você atualiza o status via webhook
        return Response({"status": status_pix})

class GerarPagamentoPixAPIView(APIView):
    """API para gerar um pagamento PIX."""
    permission_classes = [IsAuthenticated]

    def post(self, request, mensalidade_id):
        try:
            mensalidade = Mensalidade.objects.get(id=mensalidade_id, aluno=request.user)
            
            # Verifica se já existe uma transação PIX pendente
            if TransacaoPix.objects.filter(
                mensalidade=mensalidade,
                status='pendente',
                data_expiracao__gt=timezone.now()
            ).exists():
                return Response({
                    "error": "Já existe um pagamento PIX pendente para esta mensalidade."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Inicializa o SDK do Mercado Pago
            sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)

            # Cria o pagamento PIX
            payment_data = {
                "transaction_amount": float(mensalidade.valor),
                "description": f"Mensalidade {mensalidade.data_vencimento.strftime('%m/%Y')}",
                "payment_method_id": "pix",
                "payer": {
                    "email": request.user.email,
                    "first_name": request.user.first_name,
                    "last_name": request.user.last_name
                }
            }

            payment_response = sdk.payment().create(payment_data)
            payment = payment_response["response"]

            if payment["status"] == "approved":
                # Se o pagamento for aprovado imediatamente
                mensalidade.status = "pago"
                mensalidade.save()
                return Response({
                    "message": "Pagamento aprovado com sucesso!",
                    "mensalidade": MensalidadeSerializer(mensalidade).data
                })

            # Cria a transação PIX
            transacao = TransacaoPix.objects.create(
                mensalidade=mensalidade,
                codigo_pix=payment["point_of_interaction"]["transaction_data"]["qr_code"],
                qr_code=payment["point_of_interaction"]["transaction_data"]["qr_code_base64"],
                valor=mensalidade.valor,
                data_expiracao=timezone.now() + timedelta(minutes=30),
                identificador_externo=payment["id"]
            )

            return Response({
                "message": "Pagamento PIX gerado com sucesso!",
                "transacao": TransacaoPixSerializer(transacao).data
            })

        except Mensalidade.DoesNotExist:
            return Response({
                "error": "Mensalidade não encontrada."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "error": f"Erro ao gerar pagamento: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerificarStatusPixAPIView(APIView):
    """API para verificar o status de um pagamento PIX."""
    permission_classes = [IsAuthenticated]

    def get(self, request, transacao_id):
        try:
            transacao = TransacaoPix.objects.get(
                id=transacao_id,
                mensalidade__aluno=request.user
            )

            # Verifica se a transação expirou
            if transacao.status == 'pendente' and timezone.now() > transacao.data_expiracao:
                transacao.status = 'expirado'
                transacao.save()
                return Response({
                    "message": "Pagamento PIX expirado.",
                    "transacao": TransacaoPixSerializer(transacao).data
                })

            # Consulta o status no Mercado Pago
            sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)
            payment_response = sdk.payment().get(transacao.identificador_externo)
            payment = payment_response["response"]

            if payment["status"] == "approved" and transacao.status != "aprovado":
                transacao.status = "aprovado"
                transacao.data_aprovacao = timezone.now()
                transacao.save()

                # Atualiza o status da mensalidade
                mensalidade = transacao.mensalidade
                mensalidade.status = "pago"
                mensalidade.save()

            return Response({
                "transacao": TransacaoPixSerializer(transacao).data
            })

        except TransacaoPix.DoesNotExist:
            return Response({
                "error": "Transação não encontrada."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "error": f"Erro ao verificar status: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GerarPagamentoBancarioAPIView(APIView):
    """API para gerar um pagamento bancário (cartão de crédito/débito)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, mensalidade_id):
        try:
            mensalidade = Mensalidade.objects.get(id=mensalidade_id, aluno=request.user)
            
            # Verifica se a mensalidade já foi paga
            if mensalidade.status == "pago":
                return Response({
                    "error": "Esta mensalidade já foi paga."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Inicializa o SDK do Mercado Pago
            sdk = mercadopago.SDK(settings.MERCADO_PAGO_ACCESS_TOKEN)

            # Cria o pagamento com cartão de crédito/débito
            payment_data = {
                "transaction_amount": float(mensalidade.valor),
                "description": f"Mensalidade {mensalidade.data_vencimento.strftime('%m/%Y')} - {mensalidade.aluno.get_full_name()}",
                "payment_method_id": "master",  # Pode ser alterado para outros métodos
                "payer": {
                    "email": request.user.email,
                    "first_name": request.user.first_name,
                    "last_name": request.user.last_name,
                    "identification": {
                        "type": "CPF",
                        "number": request.user.cpf
                    }
                },
                "external_reference": f"mensalidade_{mensalidade.id}",
                "notification_url": f"{settings.FRONTEND_URL}/api/financeiro/webhook/",
                "back_urls": {
                    "success": f"{settings.FRONTEND_URL}/dashboard/aluno?payment=success",
                    "failure": f"{settings.FRONTEND_URL}/dashboard/aluno?payment=failure",
                    "pending": f"{settings.FRONTEND_URL}/dashboard/aluno?payment=pending"
                }
            }

            # Cria a preferência de pagamento
            preference_data = {
                "items": [
                    {
                        "title": f"Mensalidade {mensalidade.data_vencimento.strftime('%m/%Y')}",
                        "quantity": 1,
                        "unit_price": float(mensalidade.valor),
                        "currency_id": "BRL"
                    }
                ],
                "payer": {
                    "email": request.user.email,
                    "name": request.user.first_name,
                    "surname": request.user.last_name
                },
                "external_reference": f"mensalidade_{mensalidade.id}",
                "notification_url": f"{settings.FRONTEND_URL}/api/financeiro/webhook/",
                "back_urls": {
                    "success": f"{settings.FRONTEND_URL}/dashboard/aluno?payment=success",
                    "failure": f"{settings.FRONTEND_URL}/dashboard/aluno?payment=failure",
                    "pending": f"{settings.FRONTEND_URL}/dashboard/aluno?payment=pending"
                },
                "auto_return": "approved",
                "expires": True,
                "expiration_date_to": (timezone.now() + timedelta(hours=24)).isoformat()
            }

            preference_response = sdk.preference().create(preference_data)
            preference = preference_response["response"]

            # Cria a transação bancária
            transacao = TransacaoBancaria.objects.create(
                mensalidade=mensalidade,
                valor=mensalidade.valor,
                data_expiracao=timezone.now() + timedelta(hours=24),
                identificador_externo=preference["id"],
                preference_id=preference["id"],
                payment_url=preference["init_point"]
            )

            return Response({
                "message": "Link de pagamento bancário gerado com sucesso!",
                "payment_url": preference["init_point"],
                "preference_id": preference["id"],
                "mensalidade_id": mensalidade.id,
                "transacao": TransacaoBancariaSerializer(transacao).data
            })

        except Mensalidade.DoesNotExist:
            return Response({
                "error": "Mensalidade não encontrada."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "error": f"Erro ao gerar pagamento bancário: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)