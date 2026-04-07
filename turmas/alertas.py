"""
Alertas por turma para o gerente.

Regra (inadimplente + presença do professor):
- Aluno com mensalidade não paga e vencida (mesma base do bloqueio de check-in do aluno).
- Presença confirmada pelo professor nesta turma com data nos últimos DIAS_ALERTA dias.
- Se o aluno quitar as pendências, deixa de ser inadimplente e o alerta some na próxima consulta.
- Cada nova presença confirmada mantém o alerta dentro da janela rolante de DIAS_ALERTA dias.
"""
from __future__ import annotations

from datetime import timedelta

from django.db.models import Prefetch
from django.utils import timezone

from financeiro.models import Mensalidade
from funcionarios.models import Presenca
from turmas.models import Turma
from usuarios.models import Usuario

# Janela exibida na lista do gerente (dias corridos, inclusive hoje)
DIAS_ALERTA_INADIMPLENTE_PRESENCA = 7


def compute_alerta_inadimplente_presenca_por_turma(turma_ids: list[int]) -> dict[int, bool]:
    """
    Retorna mapa turma_id -> True se houver ao menos um aluno inadimplente da turma
    com presença confirmada pelo professor na janela recente.
    """
    if not turma_ids:
        return {}

    hoje = timezone.localdate()
    limite = hoje - timedelta(days=DIAS_ALERTA_INADIMPLENTE_PRESENCA)

    inadimplentes = set(
        Mensalidade.objects.exclude(status="pago")
        .filter(data_vencimento__lt=hoje)
        .values_list("aluno_id", flat=True)
        .distinct()
    )
    if not inadimplentes:
        return {int(tid): False for tid in turma_ids}

    turmas = Turma.objects.filter(id__in=turma_ids).prefetch_related(
        Prefetch("alunos", queryset=Usuario.objects.filter(ativo=True)),
    )
    alunos_por_turma: dict[int, set[int]] = {}
    for t in turmas:
        alunos_por_turma[t.id] = {a.id for a in t.alunos.all()}

    cands = (
        Presenca.objects.filter(
            turma_id__in=turma_ids,
            presenca_confirmada=True,
            data__gte=limite,
            data__lte=hoje,
            usuario_id__in=inadimplentes,
            usuario__ativo=True,
        )
        .values_list("turma_id", "usuario_id")
        .distinct()
    )

    turmas_com_alerta: set[int] = set()
    for tid, uid in cands:
        if uid in alunos_por_turma.get(tid, set()):
            turmas_com_alerta.add(int(tid))

    return {int(tid): (int(tid) in turmas_com_alerta) for tid in turma_ids}
