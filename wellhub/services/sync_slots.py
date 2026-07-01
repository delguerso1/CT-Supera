"""Geração e sincronização de slots Wellhub (mês corrente, seg/qua)."""

from __future__ import annotations

import calendar
import logging
from datetime import date, datetime, timedelta
from typing import Iterator, Tuple

from django.db import transaction
from django.utils import timezone

from wellhub.client import WellhubClient, WellhubAPIError
from wellhub.constants import (
    COTA_PADRAO,
    DIAS_SEMANA_NOMES,
    DIAS_WELLHUB,
    OPENS_BEFORE,
    CLOSES_BEFORE,
    PRECREATE_NEXT_MONTH_LAST_N_DAYS,
    SLOT_LENGTH_MINUTES,
    SLOT_STATUS_ACTIVE,
)
from wellhub.models import WellhubBooking, WellhubSlot, WellhubTurmaConfig

logger = logging.getLogger(__name__)


def _weekday_nome(d: date) -> str:
    return DIAS_SEMANA_NOMES[d.weekday()]


def _is_wellhub_day(d: date) -> bool:
    return _weekday_nome(d) in DIAS_WELLHUB


def iter_slot_dates(hoje: date) -> Iterator[date]:
    """Datas do mês corrente (>= hoje) em seg/qua; opcional prévia do mês seguinte."""
    year, month = hoje.year, hoje.month
    last_day = calendar.monthrange(year, month)[1]
    end = date(year, month, last_day)

    d = hoje
    while d <= end:
        if _is_wellhub_day(d):
            yield d
        d += timedelta(days=1)

    days_left_in_month = (end - hoje).days
    if days_left_in_month <= PRECREATE_NEXT_MONTH_LAST_N_DAYS:
        if month == 12:
            ny, nm = year + 1, 1
        else:
            ny, nm = year, month + 1
        next_last = calendar.monthrange(ny, nm)[1]
        nd = date(ny, nm, 1)
        next_end = date(ny, nm, min(PRECREATE_NEXT_MONTH_LAST_N_DAYS, next_last))
        while nd <= next_end:
            if _is_wellhub_day(nd):
                yield nd
            nd += timedelta(days=1)


def slot_datetimes(data_aula: date, horario, tz) -> Tuple[datetime, datetime, datetime]:
    naive_start = datetime.combine(data_aula, horario)
    if timezone.is_naive(naive_start):
        occur_date = timezone.make_aware(naive_start, tz)
    else:
        occur_date = naive_start
    opens_at = occur_date - OPENS_BEFORE
    closes_at = occur_date - CLOSES_BEFORE
    return occur_date, opens_at, closes_at


def _format_iso(dt: datetime) -> str:
    return timezone.localtime(dt).isoformat()


def count_confirmed_bookings(slot: WellhubSlot) -> int:
    return slot.bookings.filter(status="confirmed").count()


def build_slot_patch_payload(
    slot: WellhubSlot,
    *,
    total_booked: int | None = None,
) -> dict:
    """PATCH de slot na Wellhub aceita apenas limites (Booking API)."""
    booked = total_booked if total_booked is not None else slot.total_booked
    return {
        "total_capacity": slot.total_capacity,
        "total_booked": booked,
    }


def build_slot_payload(
    slot: WellhubSlot,
    product_id: int,
    *,
    total_booked: int | None = None,
) -> dict:
    booked = total_booked if total_booked is not None else slot.total_booked
    return {
        "occur_date": _format_iso(slot.occur_date),
        "room": "Praia Itaipuaçu",
        "status": SLOT_STATUS_ACTIVE,
        "length_in_minutes": SLOT_LENGTH_MINUTES,
        "total_capacity": slot.total_capacity,
        "total_booked": booked,
        "product_id": product_id,
        "booking_window": {
            "opens_at": _format_iso(slot.opens_at),
            "closes_at": _format_iso(slot.closes_at),
        },
        "cancellable_until": _format_iso(slot.closes_at),
        "instructors": [],
        "rating": 0,
        "virtual": False,
    }


@transaction.atomic
def upsert_local_slot(turma_config: WellhubTurmaConfig, data_aula: date) -> WellhubSlot:
    turma = turma_config.turma
    tz = timezone.get_current_timezone()
    occur_date, opens_at, closes_at = slot_datetimes(data_aula, turma.horario, tz)
    cota = turma_config.cota_wellhub or COTA_PADRAO

    slot, created = WellhubSlot.objects.get_or_create(
        turma=turma,
        data_aula=data_aula,
        defaults={
            "occur_date": occur_date,
            "opens_at": opens_at,
            "closes_at": closes_at,
            "total_capacity": cota,
            "total_booked": 0,
        },
    )
    if not created:
        slot.occur_date = occur_date
        slot.opens_at = opens_at
        slot.closes_at = closes_at
        slot.total_capacity = cota
        slot.total_booked = count_confirmed_bookings(slot)
        slot.save(
            update_fields=[
                "occur_date",
                "opens_at",
                "closes_at",
                "total_capacity",
                "total_booked",
            ]
        )
    return slot


def _slot_id_from_item(item: dict) -> str | None:
    slot_id = item.get("id") or item.get("slot_id")
    return str(slot_id) if slot_id is not None else None


def _slot_id_from_response(resp: object) -> str | None:
    if not isinstance(resp, dict):
        return None
    slots = resp.get("slots")
    if isinstance(slots, list) and slots:
        return _slot_id_from_item(slots[0])
    return _slot_id_from_item(resp)


def _same_occur_instant(api_value: str, local_dt: datetime) -> bool:
    from django.utils.dateparse import parse_datetime

    parsed = parse_datetime(str(api_value))
    if parsed is None:
        return str(api_value).startswith(_format_iso(local_dt)[:16])
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    delta = abs((timezone.localtime(parsed) - timezone.localtime(local_dt)).total_seconds())
    return delta < 60


def find_remote_slot_id(
    client: WellhubClient,
    class_id: str,
    occur_date: datetime,
) -> str | None:
    """Localiza slot existente na Wellhub pela data/hora da aula."""
    local_occur = timezone.localtime(occur_date)
    day_start = local_occur.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    try:
        remote_slots = client.list_slots(
            class_id,
            from_dt=_format_iso(day_start),
            to_dt=_format_iso(day_end),
        )
    except WellhubAPIError as exc:
        logger.warning("Não foi possível listar slots Wellhub: %s", exc)
        return None
    for item in remote_slots:
        remote_occur = item.get("occur_date") or item.get("occurDate")
        if remote_occur and _same_occur_instant(remote_occur, occur_date):
            return _slot_id_from_item(item)
    return None


def _apply_slot_patch(
    slot: WellhubSlot,
    turma_config: WellhubTurmaConfig,
    client: WellhubClient,
    product_id: int,
) -> None:
    patch_payload = build_slot_patch_payload(slot, total_booked=slot.total_booked)
    client.patch_slot(
        turma_config.wellhub_class_id,
        slot.wellhub_slot_id,
        patch_payload,
    )


def sync_slot_to_api(
    slot: WellhubSlot,
    turma_config: WellhubTurmaConfig,
    client: WellhubClient,
    product_id: int,
) -> WellhubSlot:
    if not turma_config.wellhub_class_id:
        slot.sync_status = WellhubSlot.SYNC_ERROR
        slot.sync_error = "wellhub_class_id ausente"
        slot.save(update_fields=["sync_status", "sync_error"])
        return slot

    slot.total_booked = count_confirmed_bookings(slot)
    create_payload = build_slot_payload(slot, product_id, total_booked=slot.total_booked)

    try:
        if slot.wellhub_slot_id:
            _apply_slot_patch(slot, turma_config, client, product_id)
        else:
            try:
                resp = client.create_slot(turma_config.wellhub_class_id, create_payload)
                slot_id = _slot_id_from_response(resp)
                if slot_id:
                    slot.wellhub_slot_id = slot_id
            except WellhubAPIError as exc:
                if exc.status_code != 409:
                    raise
                logger.info(
                    "Slot já existe na Wellhub (turma=%s, %s), vinculando...",
                    slot.turma_id,
                    slot.data_aula,
                )
                slot_id = find_remote_slot_id(
                    client, turma_config.wellhub_class_id, slot.occur_date
                )
                if not slot_id:
                    raise
                slot.wellhub_slot_id = slot_id
                _apply_slot_patch(slot, turma_config, client, product_id)

            if not slot.wellhub_slot_id:
                slot_id = find_remote_slot_id(
                    client, turma_config.wellhub_class_id, slot.occur_date
                )
                if slot_id:
                    slot.wellhub_slot_id = slot_id
                    _apply_slot_patch(slot, turma_config, client, product_id)

        if not slot.wellhub_slot_id:
            raise WellhubAPIError("Slot criado na Wellhub sem id retornado.")

        slot.sync_status = WellhubSlot.SYNC_OK
        slot.sync_error = ""
        slot.save(
            update_fields=["wellhub_slot_id", "total_booked", "sync_status", "sync_error"]
        )
    except WellhubAPIError as exc:
        slot.sync_status = WellhubSlot.SYNC_ERROR
        slot.sync_error = str(exc)[:2000]
        slot.save(update_fields=["sync_status", "sync_error"])
        logger.exception("Erro sync slot %s: %s", slot.pk, exc)

    return slot


def sync_all_published_slots(
    *,
    client: WellhubClient | None = None,
    call_api: bool = True,
    hoje: date | None = None,
) -> dict:
    hoje = hoje or timezone.localdate()
    client = client or WellhubClient()
    product_id = client.product_id

    configs = (
        WellhubTurmaConfig.objects.filter(publicar_wellhub=True)
        .select_related("turma", "turma__ct")
        .prefetch_related("turma__dias_semana")
    )

    stats = {"created": 0, "synced": 0, "errors": 0, "skipped": 0}

    for turma_config in configs:
        turma = turma_config.turma
        if not turma.ativo:
            stats["skipped"] += 1
            continue

        for data_aula in iter_slot_dates(hoje):
            if not _is_wellhub_day(data_aula):
                continue
            slot = upsert_local_slot(turma_config, data_aula)
            stats["created"] += 1
            if call_api and client.configured:
                sync_slot_to_api(slot, turma_config, client, product_id)
                if slot.sync_status == WellhubSlot.SYNC_OK:
                    stats["synced"] += 1
                elif slot.sync_status == WellhubSlot.SYNC_ERROR:
                    stats["errors"] += 1

    return stats


def find_slot_by_wellhub_id(slot_id: str) -> WellhubSlot | None:
    return WellhubSlot.objects.filter(wellhub_slot_id=slot_id).select_related("turma").first()


def is_slot_eligible(slot: WellhubSlot, agora: datetime | None = None) -> Tuple[bool, str]:
    agora = agora or timezone.now()
    if not _is_wellhub_day(slot.data_aula):
        return False, "Aula fora dos dias Wellhub (segunda/quarta)."
    if slot.total_booked >= slot.total_capacity:
        return False, "Cota Wellhub esgotada."
    if agora > slot.closes_at:
        return False, "Fora da janela de reserva (encerrada)."
    if agora < slot.opens_at:
        return False, "Fora da janela de reserva (ainda não aberta)."
    return True, ""
