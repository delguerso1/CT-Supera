"""
Formato de data na API para o cliente: DD-MM-AAAA (com hífens).

Mantém compatibilidade de leitura com AAAA-MM-DD (legado).
Integrações externas que exijam ISO (ex.: banco C6) continuam usando strftime próprio.
"""
from __future__ import annotations

from datetime import date, datetime

from django.utils import timezone
from django.utils.dateparse import parse_date as django_parse_date

DATA_API_FMT = "%d-%m-%Y"
DATA_HORA_API_FMT = "%d-%m-%Y %H:%M"

DATE_INPUT_FORMATS = [DATA_API_FMT, "%Y-%m-%d", "%d/%m/%Y"]
DATETIME_INPUT_FORMATS = [
    DATA_HORA_API_FMT,
    "%Y-%m-%dT%H:%M:%S%z",
    "%Y-%m-%dT%H:%M:%S.%f%z",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
]


def parse_data_api(valor) -> date | None:
    """
    Converte string em date: aceita DD-MM-AAAA, AAAA-MM-DD ou DD/MM/AAAA.
    """
    if valor is None:
        return None
    s = str(valor).strip()
    if not s:
        return None
    # Só a parte da data se vier datetime ISO
    if "T" in s:
        s = s.split("T", 1)[0].strip()
    for fmt in (DATA_API_FMT, "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(s[:10], fmt).date()
        except (ValueError, TypeError):
            continue
    return django_parse_date(s)


def format_data_api(d) -> str | None:
    if d is None:
        return None
    return d.strftime(DATA_API_FMT)


def format_datetime_api(dt) -> str | None:
    """Data/hora em fuso local para exibição na API."""
    if dt is None:
        return None
    if timezone.is_aware(dt):
        dt = timezone.localtime(dt)
    return dt.strftime(DATA_HORA_API_FMT)
