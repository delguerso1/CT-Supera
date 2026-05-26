"""Sincronização de turmas CT Supera → Classes Wellhub."""

from __future__ import annotations

import logging

from django.db import transaction

from turmas.models import Turma
from wellhub.client import WellhubClient
from wellhub.constants import CT_NOME_PILOTO, DIAS_WELLHUB, HORARIOS_PILOTO
from wellhub.models import WellhubGymConfig, WellhubTurmaConfig

logger = logging.getLogger(__name__)


def _class_name(turma: Turma) -> str:
    dias = ", ".join(
        d.nome for d in turma.dias_semana.filter(nome__in=DIAS_WELLHUB).order_by("id")
    )
    horario = turma.horario.strftime("%H:%M")
    return f"Praia Itaipuaçu — {horario}"


def _class_description(turma: Turma) -> str:
    dias_wellhub = ", ".join(DIAS_WELLHUB)
    return (
        f"Vôlei de praia — CT Supera Praia de Itaipuaçu às {turma.horario.strftime('%H:%M')}. "
        f"Aulas disponíveis para Wellhub: {dias_wellhub}. "
        f"Sextas exclusivas para alunos matriculados do CT Supera."
    )


def build_class_payload(turma: Turma, product_id: int) -> dict:
    return {
        "name": _class_name(turma),
        "description": _class_description(turma),
        "notes": "Integração CT Supera — Booking API",
        "bookable": True,
        "visible": True,
        "reference": f"ct-supera-turma-{turma.id}",
        "product_id": product_id,
    }


def get_turmas_piloto():
    return (
        Turma.objects.filter(
            ct__nome=CT_NOME_PILOTO,
            horario__in=HORARIOS_PILOTO,
            ativo=True,
        )
        .select_related("ct")
        .prefetch_related("dias_semana")
    )


def ensure_gym_config(gym_id: int, product_id: int = 1) -> WellhubGymConfig:
    from ct.models import CentroDeTreinamento

    ct = CentroDeTreinamento.objects.get(nome=CT_NOME_PILOTO)
    config, _ = WellhubGymConfig.objects.update_or_create(
        ct=ct,
        defaults={"gym_id": gym_id, "product_id": product_id, "ativo": True},
    )
    return config


@transaction.atomic
def sync_class_for_turma(
    turma: Turma,
    *,
    client: WellhubClient | None = None,
    product_id: int = 1,
    call_api: bool = True,
) -> WellhubTurmaConfig:
    turma_config, _ = WellhubTurmaConfig.objects.get_or_create(
        turma=turma,
        defaults={"publicar_wellhub": True, "cota_wellhub": 5},
    )
    turma_config.publicar_wellhub = True
    turma_config.save(update_fields=["publicar_wellhub"])

    payload = build_class_payload(turma, product_id)

    if call_api and client and client.configured:
        if turma_config.wellhub_class_id:
            client.update_class(turma_config.wellhub_class_id, payload)
        else:
            resp = client.create_class(payload)
            class_id = resp.get("id") or resp.get("class_id")
            if class_id is not None:
                turma_config.wellhub_class_id = str(class_id)
                turma_config.save(update_fields=["wellhub_class_id"])
            else:
                logger.warning("Resposta create_class sem id: %s", resp)

    return turma_config


def setup_piloto_classes(
    *,
    client: WellhubClient | None = None,
    call_api: bool = True,
) -> list[WellhubTurmaConfig]:
    turmas = list(get_turmas_piloto())
    if len(turmas) != 3:
        raise ValueError(
            f"Esperadas 3 turmas ativas em {CT_NOME_PILOTO} (07h, 08h, 19h); "
            f"encontradas {len(turmas)}."
        )
    product_id = getattr(client, "product_id", 1) if client else 1
    return [
        sync_class_for_turma(t, client=client, product_id=product_id, call_api=call_api)
        for t in turmas
    ]
