from django.shortcuts import  get_object_or_404
from financeiro.models import Mensalidade
from datetime import date, timedelta
from funcionarios.models import Presenca
from turmas.models import Turma
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from financeiro.models import Mensalidade
from funcionarios.models import Presenca
from turmas.models import Turma
from datetime import date
from .serializers import MensalidadeSerializer, UsuarioSerializer
from rest_framework import status

class HistoricoPagamentosAPIView(APIView):
    """API para exibir o histórico de pagamentos do aluno."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        aluno = request.user
        mensalidades_vencidas = Mensalidade.objects.filter(
            aluno=aluno, status="pendente", data_vencimento__lt=date.today()
        )
        mensalidades_vincendas = Mensalidade.objects.filter(
            aluno=aluno, status="pendente", data_vencimento__gte=date.today()
        )
        mensalidades_pagas = Mensalidade.objects.filter(
            aluno=aluno, status="pago"
        )

        return Response({
            "mensalidades_vencidas": MensalidadeSerializer(mensalidades_vencidas, many=True).data,
            "mensalidades_vincendas": MensalidadeSerializer(mensalidades_vincendas, many=True).data,
            "mensalidades_pagas": MensalidadeSerializer(mensalidades_pagas, many=True).data,
        })


class RealizarPagamentoAPIView(APIView):
    """API para permitir que o aluno pague uma mensalidade pendente."""
    permission_classes = [IsAuthenticated]

    def post(self, request, mensalidade_id):
        mensalidade = get_object_or_404(Mensalidade, id=mensalidade_id, aluno=request.user)

        if mensalidade.status == "pago":
            return Response({"error": "Esta mensalidade já foi paga!"}, status=status.HTTP_400_BAD_REQUEST)

        mensalidade.status = "pago"
        mensalidade.save()
        Mensalidade.criar_proxima_mensalidade(mensalidade)

        return Response({"message": "Pagamento realizado com sucesso!", "mensalidade": MensalidadeSerializer(mensalidade).data}, status=status.HTTP_200_OK)


class PagamentoEmDiaAPIView(APIView):
    """API para verificar se o aluno está com a mensalidade em dia."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = request.user
        pagamento_ok = not Mensalidade.objects.filter(aluno=usuario, status="pendente").exists()
        return Response({"pagamento_em_dia": pagamento_ok})


class PainelAlunoAPIView(APIView):
    """API para exibir o painel do aluno."""
    permission_classes = [IsAuthenticated]

    def _dia_semana_nome(self, data):
        nomes = [
            "Segunda-feira",
            "Terça-feira",
            "Quarta-feira",
            "Quinta-feira",
            "Sexta-feira",
            "Sábado",
            "Domingo"
        ]
        return nomes[data.weekday()]

    def _validar_regras_checkin(self, aluno, turma, hoje):
        if not aluno.plano:
            return False, "Plano do aluno não configurado."

        limite = aluno.limite_aulas_semanais()
        if not limite:
            return False, "Plano do aluno inválido."

        if not aluno.dias_habilitados.exists():
            return False, "Dias habilitados do aluno não configurados."

        dia_nome = self._dia_semana_nome(hoje)
        if not aluno.dias_habilitados.filter(nome=dia_nome).exists():
            return False, "Hoje não é um dia habilitado para este aluno."

        if turma and not turma.dias_semana.filter(nome=dia_nome).exists():
            return False, "A turma do aluno não ocorre hoje."

        inicio_semana = hoje - timedelta(days=hoje.weekday())
        fim_semana = inicio_semana + timedelta(days=6)
        checkins_semana = Presenca.objects.filter(
            usuario=aluno,
            data__range=(inicio_semana, fim_semana),
            checkin_realizado=True
        ).count()
        if checkins_semana >= limite:
            return False, "Limite semanal de check-ins atingido."

        return True, None

    def get(self, request):
        usuario = request.user
        historico_aulas = Presenca.objects.filter(usuario=usuario).order_by('-data')
        historico_pagamentos = Mensalidade.objects.filter(aluno=usuario).order_by('-data_vencimento')
        turma = Turma.objects.filter(alunos=usuario).first()
        turma_nome = getattr(turma, "nome", None) if turma else None

        # Verificar status de hoje
        hoje = date.today()
        presenca_hoje = Presenca.objects.filter(usuario=usuario, data=hoje).first()
        
        # Calcular a idade do aluno
        if usuario.data_nascimento:
            hoje = date.today()
            idade = hoje.year - usuario.data_nascimento.year - (
                (hoje.month, hoje.day) < (usuario.data_nascimento.month, usuario.data_nascimento.day)
            )
        else:
            idade = None

        mensalidades_em_atraso = Mensalidade.objects.filter(
            aluno=usuario,
            status="atrasado"
        )
        mensalidades_pendentes_vencidas = Mensalidade.objects.filter(
            aluno=usuario,
            status="pendente",
            data_vencimento__lt=hoje
        )
        pode_fazer_checkin = not (mensalidades_em_atraso.exists() or mensalidades_pendentes_vencidas.exists())
        motivo_checkin_bloqueado = None
        if pode_fazer_checkin:
            pode_fazer_checkin, motivo_checkin_bloqueado = self._validar_regras_checkin(usuario, turma, hoje)

        return Response({
            "usuario": UsuarioSerializer(usuario).data,
            "historico_aulas": historico_aulas.values(),
            "historico_pagamentos": MensalidadeSerializer(historico_pagamentos, many=True).data,
            "pagamento_ok": not Mensalidade.objects.filter(aluno=usuario, status="pendente").exists(),
            "idade": idade,
            "turma": turma_nome,
            "status_hoje": {
                "checkin_realizado": presenca_hoje.checkin_realizado if presenca_hoje else False,
                "presenca_confirmada": presenca_hoje.presenca_confirmada if presenca_hoje else False,
                "pode_fazer_checkin": pode_fazer_checkin,
                "motivo_checkin_bloqueado": motivo_checkin_bloqueado
            }
        })


class RealizarCheckinAPIView(APIView):
    """API para realizar check-in do aluno."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = request.user
        hoje = date.today()
        mensalidades_pendentes = Mensalidade.objects.filter(
            aluno=usuario,
            status="atrasado"
        ).order_by('data_vencimento')
        mensalidades_pendentes_vencidas = Mensalidade.objects.filter(
            aluno=usuario,
            status="pendente",
            data_vencimento__lt=hoje
        ).order_by('data_vencimento')

        if mensalidades_pendentes.exists() or mensalidades_pendentes_vencidas.exists():
            return Response({
                "error": "Você possui pendências de pagamento!",
                "mensalidades_pendentes": MensalidadeSerializer(
                    list(mensalidades_pendentes) + list(mensalidades_pendentes_vencidas),
                    many=True
                ).data
            }, status=status.HTTP_403_FORBIDDEN)

        hoje = date.today()

        # Verifica se já fez check-in hoje
        presenca_existente = Presenca.objects.filter(usuario=usuario, data=hoje).first()
        if presenca_existente and presenca_existente.checkin_realizado:
            return Response({"message": "Você já realizou o check-in para hoje."}, status=status.HTTP_400_BAD_REQUEST)

        # Busca a turma ativa do aluno
        turma = Turma.objects.filter(alunos=usuario, ativo=True).first()
        if not turma:
            return Response({
                "error": "Você não está matriculado em nenhuma turma ativa."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Regras de plano e dias habilitados
        painel = PainelAlunoAPIView()
        pode_checkin, motivo = painel._validar_regras_checkin(usuario, turma, hoje)
        if not pode_checkin:
            return Response({"error": motivo}, status=status.HTTP_403_FORBIDDEN)

        # Cria ou atualiza a presença com check-in realizado
        if presenca_existente:
            presenca_existente.checkin_realizado = True
            presenca_existente.save()
        else:
            Presenca.objects.create(
                usuario=usuario, 
                data=hoje, 
                turma=turma,
                checkin_realizado=True
            )
            
        return Response({"message": "Check-in realizado com sucesso!"}, status=status.HTTP_200_OK)