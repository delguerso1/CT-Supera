"""Processamento de check-in Wellhub (webhook → Access Validate)."""

from __future__ import annotations

import logging
from typing import Optional, Tuple

from django.db import transaction
from django.utils import timezone

from wellhub.client import WellhubAPIError, WellhubClient
from wellhub.models import WellhubBooking
from wellhub.services.bookings import get_or_create_cadastro
from wellhub.webhooks import extract_booking_number, extract_gym_id, extract_gympass_id, extract_user_data

logger = logging.getLogger(__name__)


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
    cadastro = get_or_create_cadastro(user_data)

    booking = _resolve_booking(payload)
    if booking:
        booking.cadastro = booking.cadastro or cadastro
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
