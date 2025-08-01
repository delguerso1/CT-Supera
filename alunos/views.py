from django.shortcuts import  get_object_or_404
from financeiro.models import Mensalidade
from datetime import date
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
                "pode_fazer_checkin": not Mensalidade.objects.filter(aluno=usuario, status__in=["pendente", "atrasado"]).exists()
            }
        })


class RealizarCheckinAPIView(APIView):
    """API para realizar check-in do aluno."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = request.user
        mensalidades_pendentes = Mensalidade.objects.filter(
            aluno=usuario, 
            status__in=["pendente", "atrasado"]
        ).order_by('data_vencimento')

        if mensalidades_pendentes.exists():
            return Response({
                "error": "Você possui pendências de pagamento!",
                "mensalidades_pendentes": MensalidadeSerializer(mensalidades_pendentes, many=True).data
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