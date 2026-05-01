"""Regras de datas para aula experimental: mês atual + próximo; exclusão de feriados nacionais BR."""

from __future__ import annotations

from calendar import monthrange
from datetime import date

import holidays


def eh_feriado_nacional_br(d: date) -> bool:
    """Retorna True se a data for feriado nacional no Brasil."""
    cal = holidays.country_holidays("BR", years=d.year)
    return d in cal


def meses_janela_agendamento(ref: date) -> tuple[tuple[int, int], tuple[int, int]]:
    """((ano, mês), (ano, mês)) para o mês de referência e o seguinte (mês 1–12)."""
    y, m = ref.year, ref.month
    first = (y, m)
    if m == 12:
        second = (y + 1, 1)
    else:
        second = (y, m + 1)
    return first, second


def data_no_janela_agendamento(d: date, ref: date | None = None) -> bool:
    """True se a data cair no mês de ref ou no mês seguinte."""
    ref = ref or date.today()
    return (d.year, d.month) in meses_janela_agendamento(ref)


def _iter_dias_mes(year: int, month: int):
    _, ultimo = monthrange(year, month)
    for day in range(1, ultimo + 1):
        yield date(year, month, day)


def listar_datas_aula_experimental(weekdays_validos: set[int], *, min_data_inclusive: date) -> list[date]:
    """
    Dias de aula da turma na janela (mês atual + próximo), a partir de min_data_inclusive,
    excluindo feriados nacionais brasileiros.
    """
    hoje = date.today()
    out: list[date] = []
    for y, m in meses_janela_agendamento(hoje):
        for d in _iter_dias_mes(y, m):
            if d < min_data_inclusive:
                continue
            if d.weekday() not in weekdays_validos:
                continue
            if eh_feriado_nacional_br(d):
                continue
            out.append(d)
    return sorted(out)
