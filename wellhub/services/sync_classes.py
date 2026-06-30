"""Sincronização de turmas CT Supera → Classes Wellhub."""

from __future__ import annotations

import logging

from django.db import transaction

from turmas.models import Turma
from wellhub.client import WellhubClient, WellhubAPIError
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


def _class_id_from_item(item: dict) -> str | None:
    class_id = item.get("id") or item.get("class_id")
    return str(class_id) if class_id is not None else None


def find_class_id_by_reference(client: WellhubClient, reference: str) -> str | None:
    if not reference:
        return None
    try:
        for item in client.list_classes():
            if str(item.get("reference", "")) == reference:
                return _class_id_from_item(item)
    except WellhubAPIError as exc:
        logger.warning("Não foi possível listar classes Wellhub: %s", exc)
    return None


def _create_or_update_class(
    client: WellhubClient,
    turma_config: WellhubTurmaConfig,
    payload: dict,
) -> None:
    if turma_config.wellhub_class_id:
        client.update_class(turma_config.wellhub_class_id, payload)
        return

    try:
        resp = client.create_class(payload)
    except WellhubAPIError as exc:
        if exc.status_code == 400:
            existing_id = find_class_id_by_reference(client, payload.get("reference", ""))
            if existing_id:
                logger.info(
                    "Classe já existe na Wellhub (reference=%s), id=%s — atualizando.",
                    payload.get("reference"),
                    existing_id,
                )
                turma_config.wellhub_class_id = existing_id
                turma_config.save(update_fields=["wellhub_class_id"])
                client.update_class(existing_id, payload)
                return
        raise

    class_id = _class_id_from_item(resp) if isinstance(resp, dict) else None
    if class_id:
        turma_config.wellhub_class_id = class_id
        turma_config.save(update_fields=["wellhub_class_id"])
    else:
        logger.warning("Resposta create_class sem id: %s", resp)


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
        _create_or_update_class(client, turma_config, payload)

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
