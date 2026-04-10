from django.shortcuts import get_object_or_404
from django.utils import timezone
from financeiro.models import Mensalidade
from datetime import timedelta
from funcionarios.models import Presenca
from turmas.models import Turma

from .checkin_utils import encontrar_data_aula_checkin
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import MensalidadeSerializer, UsuarioSerializer
from rest_framework import status

_DIAS_SEMANA_NOMES = (
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
    "Domingo",
)


def _serialize_presenca_historico_aluno(presenca: Presenca) -> dict:
    """
    Histórico exibido no painel do aluno: inclui rótulos legíveis e dia da semana
    da data (calendário local do servidor), alinhado ao que o app já espera.
    """
    turma = presenca.turma
    prof = turma.professores.first() if turma else None
    if prof:
        professor_nome = (prof.get_full_name() or "").strip() or prof.username
    else:
        professor_nome = "-"
    dias_turma = ", ".join(d.nome for d in turma.dias_semana.all()) if turma else ""
    ausencia = bool(getattr(presenca, "ausencia_registrada", False))
    presente = not ausencia and (
        presenca.presenca_confirmada or presenca.checkin_realizado
    )
    return {
        "id": presenca.id,
        "data": presenca.data.isoformat(),
        "turma_id": turma.id,
        "turma": str(turma),
        "turma_nome": str(turma),
        "dias_semana_turma": dias_turma,
        "professor": professor_nome,
        "professor_nome": professor_nome,
        "checkin_realizado": presenca.checkin_realizado,
        "presenca_confirmada": presenca.presenca_confirmada,
        "ausencia_registrada": ausencia,
        "presente": presente,
        "dia_semana_registro": _DIAS_SEMANA_NOMES[presenca.data.weekday()],
    }


class HistoricoPagamentosAPIView(APIView):
    """API para exibir o histórico de pagamentos do aluno."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        aluno = request.user
        # Calendário do fuso configurado (America/Sao_Paulo), não o relógio UTC do SO
        hoje = timezone.localdate()
        nao_pagas = Mensalidade.objects.filter(aluno=aluno).exclude(status="pago")
        mensalidades_vencidas = nao_pagas.filter(data_vencimento__lt=hoje)
        mensalidades_vincendas = nao_pagas.filter(data_vencimento__gte=hoje)
        mensalidades_pagas = Mensalidade.objects.filter(aluno=aluno, status="pago")

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
        hoje = timezone.localdate()
        # Em dia: não há mensalidade não paga já vencida (atrasada)
        pagamento_ok = not Mensalidade.objects.filter(
            aluno=usuario
        ).exclude(status="pago").filter(data_vencimento__lt=hoje).exists()
        return Response({"pagamento_em_dia": pagamento_ok})


class PainelAlunoAPIView(APIView):
    """API para exibir o painel do aluno."""
    permission_classes = [IsAuthenticated]

    def _dia_semana_nome(self, data):
        return _DIAS_SEMANA_NOMES[data.weekday()]

    def _validar_regras_checkin(self, aluno, turma, data_ref):
        if not aluno.dias_habilitados.exists():
            return False, "Dias habilitados do aluno não configurados."

        dia_nome = self._dia_semana_nome(data_ref)
        if not aluno.dias_habilitados.filter(nome=dia_nome).exists():
            return False, "Este dia não está habilitado para este aluno no plano."

        if turma and not turma.dias_semana.filter(nome=dia_nome).exists():
            return False, "A turma não tem aula neste dia da semana."

        limite = aluno.dias_habilitados.count()
        inicio_semana = data_ref - timedelta(days=data_ref.weekday())
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
        historico_aulas = (
            Presenca.objects.filter(usuario=usuario)
            .select_related("turma", "turma__ct")
            .prefetch_related("turma__professores", "turma__dias_semana")
            .order_by("-data")
        )
        historico_pagamentos = Mensalidade.objects.filter(aluno=usuario).order_by('-data_vencimento')
        turma = Turma.objects.filter(alunos=usuario, ativo=True).prefetch_related("dias_semana").first()
        turma_nome = str(turma) if turma else None

        # Verificar status de hoje (mesmo calendário BR que Mensalidade.status_efetivo)
        hoje = timezone.localdate()
        presenca_hoje = Presenca.objects.filter(usuario=usuario, data=hoje).first()

        aula_checkin = encontrar_data_aula_checkin(usuario, turma) if turma else None
        data_aula_checkin = aula_checkin[0] if aula_checkin else None
        horario_aula_checkin = (
            timezone.localtime(aula_checkin[1]).strftime("%H:%M") if aula_checkin else None
        )

        if data_aula_checkin is not None:
            presenca_alvo = Presenca.objects.filter(
                usuario=usuario, turma=turma, data=data_aula_checkin
            ).first()
            checkin_realizado = presenca_alvo.checkin_realizado if presenca_alvo else False
            presenca_confirmada = presenca_alvo.presenca_confirmada if presenca_alvo else False
            ausencia_registrada = (
                bool(presenca_alvo.ausencia_registrada) if presenca_alvo else False
            )
        else:
            checkin_realizado = presenca_hoje.checkin_realizado if presenca_hoje else False
            presenca_confirmada = presenca_hoje.presenca_confirmada if presenca_hoje else False
            ausencia_registrada = (
                bool(presenca_hoje.ausencia_registrada) if presenca_hoje else False
            )

        # Calcular a idade do aluno
        if usuario.data_nascimento:
            idade = hoje.year - usuario.data_nascimento.year - (
                (hoje.month, hoje.day) < (usuario.data_nascimento.month, usuario.data_nascimento.day)
            )
        else:
            idade = None

        mensalidades_atrasadas = Mensalidade.objects.filter(
            aluno=usuario
        ).exclude(status="pago").filter(data_vencimento__lt=hoje)

        if mensalidades_atrasadas.exists():
            pode_fazer_checkin = False
            motivo_checkin_bloqueado = "Você possui pendências de pagamento."
        elif not turma:
            pode_fazer_checkin = False
            motivo_checkin_bloqueado = "Você não está matriculado em nenhuma turma ativa."
        elif data_aula_checkin is None:
            pode_fazer_checkin = False
            motivo_checkin_bloqueado = (
                "Check-in disponível apenas entre 24 horas antes e até o horário de início da aula."
            )
        else:
            pode_fazer_checkin, motivo_checkin_bloqueado = self._validar_regras_checkin(
                usuario, turma, data_aula_checkin
            )

        return Response({
            "usuario": UsuarioSerializer(usuario).data,
            "historico_aulas": [
                _serialize_presenca_historico_aluno(p) for p in historico_aulas
            ],
            "historico_pagamentos": MensalidadeSerializer(historico_pagamentos, many=True).data,
            "pagamento_ok": not Mensalidade.objects.filter(
                aluno=usuario
            ).exclude(status="pago").filter(data_vencimento__lt=hoje).exists(),
            "idade": idade,
            "turma": turma_nome,
            "status_hoje": {
                "checkin_realizado": checkin_realizado,
                "presenca_confirmada": presenca_confirmada,
                "ausencia_registrada": ausencia_registrada,
                "pode_fazer_checkin": pode_fazer_checkin,
                "motivo_checkin_bloqueado": motivo_checkin_bloqueado,
                "data_aula_checkin": data_aula_checkin.isoformat() if data_aula_checkin else None,
                "horario_aula_checkin": horario_aula_checkin,
            }
        })


class RealizarCheckinAPIView(APIView):
    """API para realizar check-in do aluno."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = request.user
        hoje = timezone.localdate()
        mensalidades_nao_pagas_atrasadas = Mensalidade.objects.filter(
            aluno=usuario
        ).exclude(status="pago").filter(data_vencimento__lt=hoje).order_by('data_vencimento')

        if mensalidades_nao_pagas_atrasadas.exists():
            return Response({
                "error": "Você possui pendências de pagamento!",
                "mensalidades_pendentes": MensalidadeSerializer(
                    list(mensalidades_nao_pagas_atrasadas),
                    many=True
                ).data
            }, status=status.HTTP_403_FORBIDDEN)

        # Busca a turma ativa do aluno
        turma = Turma.objects.filter(alunos=usuario, ativo=True).prefetch_related("dias_semana").first()
        if not turma:
            return Response({
                "error": "Você não está matriculado em nenhuma turma ativa."
            }, status=status.HTTP_400_BAD_REQUEST)

        aula_checkin = encontrar_data_aula_checkin(usuario, turma)
        if not aula_checkin:
            return Response(
                {
                    "error": (
                        "Check-in disponível apenas entre 24 horas antes e até o horário de início da aula."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        data_aula, _ = aula_checkin

        presenca_existente = Presenca.objects.filter(
            usuario=usuario, turma=turma, data=data_aula
        ).first()
        if presenca_existente and presenca_existente.checkin_realizado:
            return Response(
                {"message": "Você já realizou o check-in para esta aula."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Regras de plano e dias habilitados (semana da data da aula)
        painel = PainelAlunoAPIView()
        pode_checkin, motivo = painel._validar_regras_checkin(usuario, turma, data_aula)
        if not pode_checkin:
            return Response({"error": motivo}, status=status.HTTP_403_FORBIDDEN)

        # Cria ou atualiza a presença com check-in realizado
        if presenca_existente:
            presenca_existente.checkin_realizado = True
            presenca_existente.save()
        else:
            Presenca.objects.create(
                usuario=usuario,
                data=data_aula,
                turma=turma,
                checkin_realizado=True
            )

        return Response({"message": "Check-in realizado com sucesso!"}, status=status.HTTP_200_OK)