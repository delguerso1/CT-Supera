"""Cliente HTTP para a Booking API Wellhub / Gympass."""

from __future__ import annotations

import logging
import time
from typing import Any, Optional

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class WellhubAPIError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None, body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body


class WellhubClient:
    """Wrapper mínimo da Booking API (partners)."""

    def __init__(self):
        self.base_url = getattr(
            settings,
            "WELLHUB_API_BASE_URL",
            "https://api.partners.gympass-staging.com",
        ).rstrip("/")
        self.api_key = getattr(settings, "WELLHUB_API_KEY", "") or ""
        raw_gym = getattr(settings, "WELLHUB_GYM_ID", None)
        self.gym_id = int(raw_gym) if raw_gym not in (None, "") else None
        self.product_id = getattr(settings, "WELLHUB_PRODUCT_ID", 1)
        self.timeout = getattr(settings, "WELLHUB_HTTP_TIMEOUT", 30)
        self.max_retries = getattr(settings, "WELLHUB_HTTP_MAX_RETRIES", 2)

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
    ) -> Any:
        if not self.configured:
            raise WellhubAPIError("Wellhub API não configurada (WELLHUB_API_KEY / WELLHUB_GYM_ID).")

        url = f"{self.base_url}{path}"
        last_exc: Optional[Exception] = None

        for attempt in range(self.max_retries + 1):
            try:
                response = requests.request(
                    method,
                    url,
                    headers=self._headers(),
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
