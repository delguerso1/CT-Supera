"""Processamento de check-in Wellhub (webhook → Access Validate)."""

from __future__ import annotations

import logging
from typing import Optional, Tuple

from django.db import transaction
from django.utils import timezone

from wellhub.client import WellhubAPIError, WellhubClient
from wellhub.models import WellhubBooking
from wellhub.services.bookings import (
    NOME_PLACEHOLDER_WELLHUB,
    enrich_cadastro_identity,
    get_or_create_cadastro,
)
from wellhub.webhooks import extract_booking_number, extract_gym_id, extract_gympass_id, extract_user_data

logger = logging.getLogger(__name__)


def _merge_validate_identity(user_data: dict, validate_response: dict) -> None:
    """Completa nome/e-mail a partir da resposta do Access Validate.

    A resposta do POST /access/v1/validate pode trazer os dados do membro que a
    reserva não trouxe. Só preenche quando o payload ainda está sem nome real.
    """
    if not isinstance(validate_response, dict):
        return
    user = {}
    results = validate_response.get("results")
    if isinstance(results, dict) and isinstance(results.get("user"), dict):
        user = results["user"]
    elif isinstance(validate_response.get("user"), dict):
        user = validate_response["user"]
    if not user:
        return

    atual = (user_data.get("first_name") or "").strip()
    if not atual or atual == NOME_PLACEHOLDER_WELLHUB:
        first = user.get("first_name") or user.get("firstName") or user.get("name") or ""
        last = user.get("last_name") or user.get("lastName") or ""
        if first and " " in str(first) and not last:
            parts = str(first).split(" ", 1)
            first, last = parts[0], parts[1]
        if first:
            user_data["first_name"] = str(first).strip()[:100]
            user_data["last_name"] = str(last).strip()[:100]

    if not (user_data.get("email") or "").strip():
        email = user.get("email")
        if email:
            user_data["email"] = str(email).strip()[:255]


def _resolve_booking(payload: dict) -> Optional[WellhubBooking]:
    booking_number = extract_booking_number(payload)
    if not booking_number:
        return None
    return (
        WellhubBooking.objects.filter(wellhub_booking_id=booking_number)
        .select_related("slot", "cadastro")
        .first()
    )


@transaction.atomic
def handle_checkin_occurred(payload: dict) -> Tuple[str, str]:
    """
    Recebe webhook de check-in e confirma na Wellhub via POST /access/v1/validate.
    """
    gympass_id = extract_gympass_id(payload)
    if not gympass_id:
        raise ValueError("gympass_id ausente no payload de check-in.")

    gym_id = extract_gym_id(payload)
    client = WellhubClient()
    if not client.configured:
        raise ValueError("Wellhub API não configurada para Access Validate.")

    try:
        validate_response = client.validate_access(gympass_id, gym_id=gym_id)
    except WellhubAPIError as exc:
        logger.error(
            "Access Validate falhou para gympass_id=%s gym_id=%s: %s",
            gympass_id,
            gym_id or client.gym_id,
            exc,
        )
        raise

    user_data = extract_user_data(payload)
    if not user_data.get("wellhub_user_id"):
        user_data["wellhub_user_id"] = gympass_id
    # Nome/e-mail podem vir só na resposta do Access Validate, não na reserva.
    _merge_validate_identity(user_data, validate_response or {})
    cadastro = get_or_create_cadastro(user_data)

    booking = _resolve_booking(payload)
    if booking:
        booking.cadastro = booking.cadastro or cadastro
        # Enriquece o cadastro efetivo do booking (mesmo se já existia como "Wellhub").
        if booking.cadastro:
            enrich_cadastro_identity(booking.cadastro, user_data)
        booking.checkin_validado = True
        booking.checkin_validado_em = timezone.now()
        booking.checkin_validate_response = validate_response or {}
        booking.payload = payload
        booking.save(
            update_fields=[
                "cadastro",
                "checkin_validado",
                "checkin_validado_em",
                "checkin_validate_response",
                "payload",
                "atualizado_em",
            ]
        )
    else:
        logger.info(
            "Check-in validado na Wellhub (gympass_id=%s) sem booking local vinculado.",
            gympass_id,
        )

    return "validated", gympass_id
