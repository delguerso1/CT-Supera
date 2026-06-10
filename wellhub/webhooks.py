"""Validação de assinatura e parsing de webhooks Wellhub."""

from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any, Optional, Tuple

from django.conf import settings


def verify_gympass_signature(raw_body: bytes, signature_header: Optional[str]) -> bool:
    """
    Valida X-Gympass-Signature (HMAC-SHA1 do body bruto com secret do portal).
    """
    secret = getattr(settings, "WELLHUB_WEBHOOK_SECRET", "") or ""
    if not secret:
        # Em dev sem secret, permitir (logar aviso no caller).
        return True
    if not signature_header:
        return False
    expected = hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha1,
    ).hexdigest()
    received = signature_header.strip()
    if received.startswith("sha1="):
        received = received[5:]
    return hmac.compare_digest(expected, received)


def _dig(data: dict, *keys: str, default=None):
    cur: Any = data
    for key in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(key)
        if cur is None:
            return default
    return cur


def normalize_webhook_payload(payload: dict) -> dict:
    """Achata event_data (formato Wellhub) para os extractors."""
    if not isinstance(payload, dict):
        return {}
    if "event_data" in payload and isinstance(payload["event_data"], dict):
        merged = dict(payload["event_data"])
        for key in ("event_type", "event_id", "event", "type", "name"):
            if payload.get(key) is not None and key not in merged:
                merged[key] = payload[key]
        return merged
    return payload


def extract_event_type(payload: dict) -> str:
    payload = normalize_webhook_payload(payload)
    for key in ("event", "event_type", "type", "name"):
        val = payload.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip().lower()
    return ""


def extract_event_id(payload: dict, raw_body: bytes) -> str:
    payload = normalize_webhook_payload(payload)
    for key in ("event_id", "message_id", "id", "uuid"):
        val = payload.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return hashlib.sha256(raw_body).hexdigest()


def extract_booking_number(payload: dict) -> Optional[str]:
    payload = normalize_webhook_payload(payload)
    for key in ("booking_number", "bookingNumber", "booking_id", "bookingId"):
        val = payload.get(key)
        if val is None:
            val = _dig(payload, "booking", key)
        if val is None:
            val = _dig(payload, "slot", key)
        if val is not None and str(val).strip():
            return str(val).strip()
    booking = payload.get("booking")
    if isinstance(booking, dict):
        for key in ("booking_number", "number", "id"):
            val = booking.get(key)
            if val is not None and str(val).strip():
                return str(val).strip()
    return None


def extract_slot_id(payload: dict) -> Optional[str]:
    payload = normalize_webhook_payload(payload)
    for path in (
        ("slot_id",),
        ("slot", "id"),
        ("slot", "slot_id"),
        ("class", "slot_id"),
    ):
        if len(path) == 1:
            val = payload.get(path[0])
        else:
            val = _dig(payload, *path)
        if val is not None and str(val).strip():
            return str(val).strip()
    return None


def extract_user_data(payload: dict) -> dict:
    """Extrai dados do usuário Wellhub do payload (estruturas variáveis)."""
    payload = normalize_webhook_payload(payload)
    user = payload.get("user") or payload.get("member") or payload.get("customer") or {}
    if not isinstance(user, dict):
        user = {}

    first_name = (
        user.get("first_name")
        or user.get("firstName")
        or user.get("name")
        or payload.get("first_name")
        or payload.get("firstName")
        or ""
    )
    last_name = (
        user.get("last_name")
        or user.get("lastName")
        or payload.get("last_name")
        or payload.get("lastName")
        or ""
    )
    if first_name and " " in str(first_name) and not last_name:
        parts = str(first_name).split(" ", 1)
        first_name, last_name = parts[0], parts[1]

    email = user.get("email") or payload.get("email") or ""
    telefone = (
        user.get("phone")
        or user.get("phone_number")
        or user.get("telefone")
        or payload.get("phone")
        or payload.get("phone_number")
        or payload.get("telefone")
        or ""
    )
    wellhub_user_id = (
        user.get("unique_token")
        or user.get("gpw-id")
        or user.get("gpw_id")
        or user.get("gympass-id")
        or user.get("gympass_id")
        or user.get("user_id")
        or user.get("id")
        or payload.get("unique_token")
        or payload.get("gpw-id")
        or payload.get("gympass-id")
        or payload.get("user_id")
        or ""
    )
    return {
        "first_name": str(first_name or "Wellhub").strip()[:100],
        "last_name": str(last_name or "").strip()[:100],
        "email": str(email or "").strip()[:255],
        "telefone": str(telefone or "").strip()[:20],
        "wellhub_user_id": str(wellhub_user_id or "").strip()[:128],
    }


def normalize_event_type(event_type: str) -> str:
    return event_type.replace("_", "").replace("-", "").replace(".", "").lower()

def is_requested_event(event_type: str) -> bool:
    n = normalize_event_type(event_type)
    return "bookingrequested" in n or n == "requested"


def is_cancel_event(event_type: str) -> bool:
    n = normalize_event_type(event_type)
    return (
        "bookingcancelation" in n
        or "bookingcancellation" in n
        or "bookingcanceled" in n
    )


def is_late_cancel_event(event_type: str) -> bool:
    n = normalize_event_type(event_type)
    return "bookinglatecancelation" in n or "bookinglatecancellation" in n


def is_checkin_event(event_type: str) -> bool:
    """Check-in físico no app Wellhub (Access Control)."""
    n = normalize_event_type(event_type)
    return (
        n in ("checkin", "checkinoccurred", "checkinbookingoccurred")
        or "checkinoccurred" in n
        or "checkinbookingoccurred" in n
    )


def extract_gympass_id(payload: dict) -> Optional[str]:
    """ID numérico do usuário (13 dígitos) para POST /access/v1/validate."""
    payload = normalize_webhook_payload(payload)
    for key in (
        "gympass_user_id",
        "gympass_id",
        "gympass_userid",
        "gympassid",
        "unique_token",
    ):
        val = payload.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()

    user = payload.get("user") or payload.get("member") or {}
    if isinstance(user, dict):
        for key in (
            "gympass_user_id",
            "gympass_id",
            "unique_token",
            "gympass-id",
            "gympass-user-id",
        ):
            val = user.get(key)
            if val is not None and str(val).strip():
                return str(val).strip()

    user_data = extract_user_data(payload)
    wid = user_data.get("wellhub_user_id") or ""
    if wid:
        return str(wid).strip()
    return None


def extract_gym_id(payload: dict) -> Optional[int]:
    payload = normalize_webhook_payload(payload)
    for key in ("gym_id", "gymId"):
        val = payload.get(key)
        if val is not None and str(val).strip().isdigit():
            return int(val)
    for path in (("gym", "id"), ("slot", "gym_id")):
        val = _dig(payload, *path)
        if val is not None and str(val).strip().isdigit():
            return int(val)
    return None
