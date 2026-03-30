"""Lógica de salários de professores (competência mensal e geração de parcelas)."""

from __future__ import annotations

from datetime import date

from django.db.models import Q

from usuarios.models import Usuario

from .models import Salario


def competencia_primeiro_dia(mes: int, ano: int) -> date:
    return date(ano, mes, 1)


def ensure_salarios_competencia(mes: int, ano: int) -> None:
    """
    Garante um registro de salário pendente por professor ativo para o mês/ano informados.
    Chamado ao listar salários filtrados por competência (ex.: painel financeiro do gerente).
    """
    if not (1 <= mes <= 12 and ano >= 2000):
        return
    competencia = competencia_primeiro_dia(mes, ano)
    professores = Usuario.objects.filter(tipo="professor", ativo=True).filter(
        Q(salario_professor__isnull=False) & ~Q(salario_professor=0)
    )
    existentes = set(
        Salario.objects.filter(competencia=competencia).values_list("professor_id", flat=True)
    )
    criar = []
    for prof in professores:
        if prof.id in existentes:
            continue
        criar.append(
            Salario(
                professor=prof,
                valor=prof.salario_professor,
                competencia=competencia,
                status="pendente",
                data_pagamento=None,
            )
        )
    if criar:
        Salario.objects.bulk_create(criar)
