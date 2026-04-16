"""
Dias úteis para vencimento de mensalidades (Brasil).

Se o vencimento cair em sábado, domingo ou feriado nacional, usa o próximo dia útil.
"""
from __future__ import annotations

from datetime import date, timedelta

import holidays


def proximo_dia_util_br(data: date) -> date:
    """
    Retorna `data` se for dia útil (segunda a sexta e fora de feriados nacionais BR).
    Caso contrário, a primeira data em diante que seja dia útil (próximo dia útil).
    """
    d = data
    anos = range(data.year - 1, data.year + 4)
    br = holidays.country_holidays("BR", years=anos)
    while d.weekday() >= 5 or d in br:
        d += timedelta(days=1)
    return d
