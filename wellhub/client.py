"""Cliente HTTP para a Booking API Wellhub / Gympass."""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Optional

import requests
from django.conf import settings

from app.env_loader import read_env_file_value

logger = logging.getLogger(__name__)


def _wellhub_setting(name: str, default: Any = "") -> Any:
    """Lê settings → os.environ → linha direta no .env (fallback para JWT)."""
    value = getattr(settings, name, None)
    if value not in (None, ""):
        return value
    value = os.getenv(name)
    if value not in (None, ""):
        return value
    if name in ("WELLHUB_API_KEY", "WELLHUB_WEBHOOK_SECRET"):
        file_value = read_env_file_value(name)
        if file_value:
            return file_value
    return default


class WellhubAPIError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None, body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body


class WellhubClient:
    """Wrapper mínimo da Booking API (partners)."""

    def __init__(self):
        self.base_url = str(
            _wellhub_setting(
                "WELLHUB_API_BASE_URL",
                "https://apitesting.partners.gympass.com",
            )
        ).rstrip("/")
        self.api_key = str(_wellhub_setting("WELLHUB_API_KEY", "") or "")
        raw_gym = _wellhub_setting("WELLHUB_GYM_ID", None)
        self.gym_id = int(raw_gym) if raw_gym not in (None, "") else None
        self.product_id = int(_wellhub_setting("WELLHUB_PRODUCT_ID", 1) or 1)
        self.timeout = int(_wellhub_setting("WELLHUB_HTTP_TIMEOUT", 30) or 30)
        self.max_retries = int(_wellhub_setting("WELLHUB_HTTP_MAX_RETRIES", 2) or 2)

    @property
    def configured(self) -> bool:
        return bool(self.api_key and self.gym_id)

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
        }

    def _request(
        self,
        method: str,
        path: str,
        *,
        json_body: Optional[dict] = None,
        params: Optional[dict] = None,
        extra_headers: Optional[dict] = None,
    ) -> Any:
        if not self.configured:
            raise WellhubAPIError("Wellhub API não configurada (WELLHUB_API_KEY / WELLHUB_GYM_ID).")

        url = f"{self.base_url}{path}"
        headers = self._headers()
        if extra_headers:
            headers.update(extra_headers)
        last_exc: Optional[Exception] = None

        for attempt in range(self.max_retries + 1):
            try:
                response = requests.request(
                    method,
                    url,
                    headers=headers,
                    json=json_body,
                    params=params,
                    timeout=self.timeout,
                )
                if response.status_code >= 500 and attempt < self.max_retries:
                    time.sleep(0.5 * (attempt + 1))
                    continue
                if response.status_code >= 400:
                    try:
                        body = response.json()
                    except ValueError:
                        body = response.text
                    raise WellhubAPIError(
                        f"Wellhub API {method} {path} → HTTP {response.status_code}",
                        status_code=response.status_code,
                        body=body,
                    )
                if response.status_code == 204 or not response.content:
                    return {}
                return response.json()
            except WellhubAPIError:
                raise
            except requests.RequestException as exc:
                last_exc = exc
                if attempt < self.max_retries:
                    time.sleep(0.5 * (attempt + 1))
                    continue
                raise WellhubAPIError(f"Erro de rede Wellhub: {exc}") from exc

        raise WellhubAPIError(f"Erro de rede Wellhub: {last_exc}")

    def create_class(self, payload: dict) -> dict:
        gym_id = self.gym_id
        return self._request(
            "POST",
            f"/booking/v1/gyms/{gym_id}/classes",
            json_body=payload,
        )

    def update_class(self, class_id: str, payload: dict) -> dict:
        gym_id = self.gym_id
        return self._request(
            "PUT",
            f"/booking/v1/gyms/{gym_id}/classes/{class_id}",
            json_body=payload,
        )

    def create_slot(self, class_id: str, payload: dict) -> dict:
        gym_id = self.gym_id
        return self._request(
            "POST",
            f"/booking/v1/gyms/{gym_id}/classes/{class_id}/slots",
            json_body=payload,
        )

    def patch_slot(self, class_id: str, slot_id: str, payload: dict) -> dict:
        gym_id = self.gym_id
        return self._request(
            "PATCH",
            f"/booking/v1/gyms/{gym_id}/classes/{class_id}/slots/{slot_id}",
            json_body=payload,
        )

    def patch_booking(self, booking_number: str, payload: dict) -> dict:
        gym_id = self.gym_id
        return self._request(
            "PATCH",
            f"/booking/v1/gyms/{gym_id}/bookings/{booking_number}",
            json_body=payload,
        )

    def validate_access(self, gympass_id: str, *, gym_id: Optional[int] = None) -> dict:
        """
        Confirma check-in do usuário na Wellhub (Access Control API).
        POST /access/v1/validate — requer check-in prévio no app Wellhub.
        """
        resolved_gym_id = gym_id if gym_id is not None else self.gym_id
        if not resolved_gym_id:
            raise WellhubAPIError("gym_id ausente para Access Validate.")
        gympass_id = str(gympass_id or "").strip()
        if not gympass_id:
            raise WellhubAPIError("gympass_id ausente para Access Validate.")
        return self._request(
            "POST",
            "/access/v1/validate",
            json_body={"gympass_id": gympass_id},
            extra_headers={"X-Gym-Id": str(resolved_gym_id)},
        )
