"""Processamento de reservas Wellhub (webhook → confirm/reject)."""

from __future__ import annotations

import logging
from typing import Optional, Tuple

from django.db import transaction
from django.utils import timezone

from usuarios.utils import normalizar_telefone_br_para_precadastro
from wellhub.client import WellhubClient, WellhubAPIError
from wellhub.constants import (
    BOOKING_STATUS_CANCELLED,
    BOOKING_STATUS_CONFIRMED,
    BOOKING_STATUS_LATE_CANCELLED,
    BOOKING_STATUS_REJECTED,
    BOOKING_STATUS_REJECTED_LOCAL,
    BOOKING_STATUS_REQUESTED,
    BOOKING_STATUS_RESERVED,
)
from wellhub.models import CadastroWellhub, WellhubBooking, WellhubSlot, WellhubTurmaConfig
from wellhub.services.sync_slots import (
    build_slot_payload,
    count_confirmed_bookings,
    find_slot_by_wellhub_id,
    is_slot_eligible,
)
from wellhub.webhooks import extract_booking_number, extract_slot_id, extract_user_data

logger = logging.getLogger(__name__)


def get_or_create_cadastro(user_data: dict) -> CadastroWellhub:
    wellhub_user_id = user_data.get("wellhub_user_id") or ""
    telefone = normalizar_telefone_br_para_precadastro(user_data.get("telefone"))

    if wellhub_user_id:
        cadastro, created = CadastroWellhub.objects.get_or_create(
            wellhub_user_id=wellhub_user_id,
            defaults={
                "first_name": user_data.get("first_name") or "Wellhub",
                "last_name": user_data.get("last_name") or "",
                "email": user_data.get("email") or "",
                "telefone": telefone,
            },
        )
        if not created:
            updated = False
            if user_data.get("first_name") and cadastro.first_name != user_data["first_name"]:
                cadastro.first_name = user_data["first_name"]
                updated = True
            if user_data.get("last_name") and cadastro.last_name != user_data["last_name"]:
                cadastro.last_name = user_data["last_name"]
                updated = True
            if user_data.get("email") and cadastro.email != user_data["email"]:
                cadastro.email = user_data["email"]
                updated = True
            if telefone and cadastro.telefone != telefone:
                cadastro.telefone = telefone
                updated = True
            if updated:
                cadastro.save()
        return cadastro

    email = (user_data.get("email") or "").strip().lower()
    qs = CadastroWellhub.objects.all()
    if email and telefone:
        cadastro = qs.filter(email__iexact=email, telefone=telefone).first()
        if cadastro:
            return cadastro
    if email:
        cadastro = qs.filter(email__iexact=email).first()
        if cadastro:
            return cadastro

    return CadastroWellhub.objects.create(
        wellhub_user_id="",
        first_name=user_data.get("first_name") or "Wellhub",
        last_name=user_data.get("last_name") or "",
        email=user_data.get("email") or "",
        telefone=telefone,
    )


def _resolve_slot(payload: dict) -> Optional[WellhubSlot]:
    from wellhub.webhooks import normalize_webhook_payload

    payload = normalize_webhook_payload(payload)
    slot_id = extract_slot_id(payload)
    if slot_id:
        slot = find_slot_by_wellhub_id(slot_id)
        if slot:
            return slot

    occur = payload.get("occur_date") or payload.get("slot_date")
    class_id = payload.get("class_id")
    if occur and class_id:
        turma_config = WellhubTurmaConfig.objects.filter(
            wellhub_class_id=str(class_id)
        ).select_related("turma").first()
        if turma_config:
            from django.utils.dateparse import parse_datetime

            dt = parse_datetime(str(occur))
            if dt:
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt, timezone.get_current_timezone())
                local_date = timezone.localtime(dt).date()
                return WellhubSlot.objects.filter(
                    turma=turma_config.turma,
                    data_aula=local_date,
                ).first()
    return None


def _patch_booking_remote(
    client: WellhubClient,
    booking_number: str,
    status: int,
    reason: str = "",
) -> None:
    if not client.configured:
        return
    body = {"status": status}
    if reason:
        body["reason"] = reason
    client.patch_booking(booking_number, body)


def _push_slot_counts(slot: WellhubSlot, client: WellhubClient) -> None:
    if not client.configured:
        return
    turma_config = WellhubTurmaConfig.objects.filter(turma=slot.turma).first()
    if not turma_config or not turma_config.wellhub_class_id or not slot.wellhub_slot_id:
        return
    slot.total_booked = count_confirmed_bookings(slot)
    slot.save(update_fields=["total_booked"])
    payload = build_slot_payload(slot, client.product_id)
    try:
        client.patch_slot(
            turma_config.wellhub_class_id,
            slot.wellhub_slot_id,
            payload,
        )
    except WellhubAPIError as exc:
        logger.error("Falha PATCH slot após booking: %s", exc)


@transaction.atomic
def handle_booking_requested(payload: dict) -> Tuple[str, str]:
    booking_number = extract_booking_number(payload)
    if not booking_number:
        raise ValueError("booking_number ausente no payload")

    existing = WellhubBooking.objects.filter(wellhub_booking_id=booking_number).first()
    if existing and existing.status == BOOKING_STATUS_CONFIRMED:
        return "already_confirmed", booking_number

    slot = _resolve_slot(payload)
    if not slot:
        raise ValueError("Slot não encontrado para a reserva.")

    user_data = extract_user_data(payload)
    cadastro = get_or_create_cadastro(user_data)
    client = WellhubClient()

    slot.total_booked = count_confirmed_bookings(slot)
    eligible, motivo = is_slot_eligible(slot)
    booking, _ = WellhubBooking.objects.update_or_create(
        wellhub_booking_id=booking_number,
        defaults={
            "slot": slot,
            "cadastro": cadastro,
            "payload": payload,
            "status": BOOKING_STATUS_REQUESTED,
        },
    )

    if not eligible:
        booking.status = BOOKING_STATUS_REJECTED_LOCAL
        booking.save(update_fields=["status", "atualizado_em"])
        try:
            _patch_booking_remote(client, booking_number, BOOKING_STATUS_REJECTED, motivo)
        except WellhubAPIError as exc:
            logger.error("Rejeição remota falhou: %s", exc)
        return "rejected", motivo

    booking.status = BOOKING_STATUS_CONFIRMED
    booking.save(update_fields=["status", "atualizado_em"])
    slot.total_booked = count_confirmed_bookings(slot)
    slot.save(update_fields=["total_booked"])

    try:
        _patch_booking_remote(client, booking_number, BOOKING_STATUS_RESERVED)
        _push_slot_counts(slot, client)
    except WellhubAPIError as exc:
        logger.error("Confirmação remota falhou: %s", exc)

    return "confirmed", booking_number


@transaction.atomic
def handle_booking_cancel(payload: dict, *, late: bool = False) -> Tuple[str, str]:
    booking_number = extract_booking_number(payload)
    if not booking_number:
        raise ValueError("booking_number ausente no payload")

    booking = WellhubBooking.objects.filter(wellhub_booking_id=booking_number).select_related("slot").first()
    if not booking:
        slot = _resolve_slot(payload)
        if not slot:
            raise ValueError("Reserva/slot não encontrados para cancelamento.")
        user_data = extract_user_data(payload)
        cadastro = get_or_create_cadastro(user_data)
        booking = WellhubBooking.objects.create(
            wellhub_booking_id=booking_number,
            slot=slot,
            cadastro=cadastro,
            status=BOOKING_STATUS_CANCELLED,
            late_cancel=late,
            payload=payload,
        )
    else:
        booking.status = BOOKING_STATUS_LATE_CANCELLED if late else BOOKING_STATUS_CANCELLED
        booking.late_cancel = late
        booking.payload = payload
        booking.save(update_fields=["status", "late_cancel", "payload", "atualizado_em"])

    slot = booking.slot
    slot.total_booked = count_confirmed_bookings(slot)
    slot.save(update_fields=["total_booked"])

    client = WellhubClient()
    try:
        _push_slot_counts(slot, client)
    except WellhubAPIError as exc:
        logger.error("PATCH slot após cancelamento falhou: %s", exc)

    return "cancelled", booking_number
