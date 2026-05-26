"""Filtros compartilhados (mês / semana / turma) para listagem Wellhub."""

from __future__ import annotations

import calendar
from datetime import date, timedelta
from typing import Optional, Tuple

from django.db import models

MesAno = Tuple[int, int]
SemanaIntervalo = Tuple[date, date]


def parse_mes_param(value: Optional[str]) -> Optional[MesAno]:
    """Converte ``YYYY-MM`` em (ano, mês). Retorna None se vazio ou inválido."""
    value = (value or "").strip()
    if not value:
        return None
    parts = value.split("-", 1)
    if len(parts) != 2:
        return None
    try:
        year = int(parts[0])
        month = int(parts[1])
    except ValueError:
        return None
    if month < 1 or month > 12 or year < 2000 or year > 2100:
        return None
    return year, month


def parse_turma_id_param(value: Optional[str]) -> Optional[int]:
    value = (value or "").strip()
    if value.isdigit():
        return int(value)
    return None


def parse_semana_inicio_param(value: Optional[str]) -> Optional[date]:
    """Converte ``YYYY-MM-DD`` (segunda-feira da semana) em date."""
    value = (value or "").strip()
    if not value:
        return None
    parts = value.split("-")
    if len(parts) != 3:
        return None
    try:
        return date(int(parts[0]), int(parts[1]), int(parts[2]))
    except ValueError:
        return None


def mes_primeiro_ultimo_dia(mes: MesAno) -> Tuple[date, date]:
    year, month = mes
    ultimo = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, ultimo)


def monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def semana_intervalo(inicio: date) -> SemanaIntervalo:
    return inicio, inicio + timedelta(days=6)


def semana_intersecta_mes(inicio: date, mes: MesAno) -> bool:
    fim = inicio + timedelta(days=6)
    primeiro, ultimo = mes_primeiro_ultimo_dia(mes)
    return fim >= primeiro and inicio <= ultimo


def semana_inicio_default(mes: MesAno, hoje: Optional[date] = None) -> date:
    """Segunda-feira da semana padrão: semana atual se no mês, senão 1ª semana do mês."""
    hoje = hoje or date.today()
    primeiro, ultimo = mes_primeiro_ultimo_dia(mes)
    if hoje.year == mes[0] and hoje.month == mes[1]:
        ref = hoje
    else:
        ref = primeiro
    inicio = monday_of(ref)
    while inicio + timedelta(days=6) < primeiro:
        inicio += timedelta(days=7)
    while inicio > ultimo:
        inicio -= timedelta(days=7)
    return inicio


def resolve_semana_filtro(
    mes: Optional[MesAno],
    semana_inicio_raw: Optional[str],
    hoje: Optional[date] = None,
) -> Optional[SemanaIntervalo]:
    """
    Define o intervalo semanal da listagem.
    Exige ``mes``; ``semana_inicio`` opcional (normalizado para segunda).
    """
    if not mes:
        return None
    hoje = hoje or date.today()
    parsed = parse_semana_inicio_param(semana_inicio_raw)
    if parsed:
        inicio = monday_of(parsed)
    else:
        inicio = semana_inicio_default(mes, hoje)
    if not semana_intersecta_mes(inicio, mes):
        inicio = semana_inicio_default(mes, hoje)
    return semana_intervalo(inicio)


def reservas_filter_q(
    turma_id: Optional[int] = None,
    mes: Optional[MesAno] = None,
    semana: Optional[SemanaIntervalo] = None,
) -> models.Q:
    """Q para cadastros com ao menos uma reserva no recorte."""
    q = models.Q()
    if turma_id:
        q &= models.Q(reservas__slot__turma_id=turma_id)
    if semana:
        inicio, fim = semana
        q &= models.Q(
            reservas__slot__data_aula__gte=inicio,
            reservas__slot__data_aula__lte=fim,
        )
    elif mes:
        year, month = mes
        q &= models.Q(
            reservas__slot__data_aula__year=year,
            reservas__slot__data_aula__month=month,
        )
    return q


def filter_reservas_queryset(
    queryset,
    turma_id: Optional[int],
    mes: Optional[MesAno],
    semana: Optional[SemanaIntervalo] = None,
):
    if turma_id:
        queryset = queryset.filter(slot__turma_id=turma_id)
    if semana:
        inicio, fim = semana
        queryset = queryset.filter(
            slot__data_aula__gte=inicio,
            slot__data_aula__lte=fim,
        )
    elif mes:
        queryset = queryset.filter(
            slot__data_aula__year=mes[0],
            slot__data_aula__month=mes[1],
        )
    return queryset
