"""Regras de janela de check-in do aluno (antecipação em relação ao horário da turma)."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Optional, Tuple

from django.utils import timezone

# Alinhado a alunos.views._DIAS_SEMANA_NOMES
_DIAS_SEMANA_NOMES = (
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
    "Domingo",
)

CHECKIN_ANTECEDENCIA_HORAS = 24
# Quantos dias à frente procurar ocorrências de aula (semanal + margem)
_DIAS_BUSCA_AULA = 8


def _dia_semana_nome(d: date) -> str:
    return _DIAS_SEMANA_NOMES[d.weekday()]


def _inicio_aula_local(d: date, horario: time, tz) -> datetime:
    naive = datetime.combine(d, horario)
    if timezone.is_naive(naive):
        return timezone.make_aware(naive, tz)
    return naive


def encontrar_data_aula_checkin(
    aluno,
    turma,
    agora: Optional[datetime] = None,
) -> Optional[Tuple[date, datetime]]:
    """
    Se estivermos dentro da janela de check-in para alguma ocorrência da turma,
    retorna (data_da_aula, inicio_aula_aware_local).

    Janela: [início_da_aula - 24h, início_da_aula) — check-in encerra no horário de início da aula.
    Escolhe a primeira data (mais próxima) que satisfaz turma + dias habilitados do aluno.
    """
    if not turma:
        return None

    agora = agora or timezone.localtime()
    tz = timezone.get_current_timezone()

    dias_turma = set(turma.dias_semana.values_list("nome", flat=True))
    dias_aluno = set(aluno.dias_habilitados.values_list("nome", flat=True))

    hoje = agora.date()
    for offset in range(_DIAS_BUSCA_AULA):
        d = hoje + timedelta(days=offset)
        nome = _dia_semana_nome(d)
        if nome not in dias_turma or nome not in dias_aluno:
            continue

        inicio = _inicio_aula_local(d, turma.horario, tz)
        window_start = inicio - timedelta(hours=CHECKIN_ANTECEDENCIA_HORAS)

        if window_start <= agora < inicio:
            return d, inicio

    return None
