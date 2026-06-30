"""Diagnóstico de configuração Wellhub (sem expor segredos)."""

from __future__ import annotations

import os

from django.conf import settings

from app.env_loader import project_env_path
from wellhub.client import WellhubClient


def format_wellhub_config_hint(client: WellhubClient | None = None) -> str:
    client = client or WellhubClient()
    env_path = project_env_path()
    lines = [
        f"  DJANGO_SETTINGS_MODULE: {os.environ.get('DJANGO_SETTINGS_MODULE', '(não definido)')}",
        f"  Arquivo de env: {env_path} ({'existe' if env_path.is_file() else 'NÃO encontrado'})",
        f"  WELLHUB_API_KEY: {'ok' if client.api_key else 'AUSENTE'} ({len(client.api_key)} caracteres)",
        f"  WELLHUB_GYM_ID: {client.gym_id or 'AUSENTE'}",
        f"  WELLHUB_PRODUCT_ID: {client.product_id}",
        f"  WELLHUB_API_BASE_URL: {client.base_url}",
    ]
    if not client.api_key:
        lines.append(
            "  Dica: credenciais devem estar em /root/ct-supera/.env "
            "(variáveis WELLHUB_*). Rode com --settings=app.settings_hostinger na VPS."
        )
    return "\n".join(lines)


def settings_wellhub_gym_id():
    return getattr(settings, "WELLHUB_GYM_ID", None) or os.getenv("WELLHUB_GYM_ID")
