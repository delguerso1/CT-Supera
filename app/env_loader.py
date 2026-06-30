"""Carregamento centralizado do arquivo .env do projeto (produção: /root/ct-supera/.env)."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Chaves que o python-dotenv costuma falhar (JWT longo, # na linha, linha 87+ após erro de parse).
_DIRECT_READ_KEYS = (
    "WELLHUB_API_KEY",
    "WELLHUB_WEBHOOK_SECRET",
)


def project_env_path() -> Path:
    """Caminho do .env na raiz do projeto (ou ENV_FILE se definido)."""
    raw = os.getenv("ENV_FILE", "").strip()
    if raw:
        return Path(raw)
    return BASE_DIR / ".env"


def _strip_env_value(raw: str) -> str:
    value = raw.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def read_env_file_value(key: str) -> str:
    """
    Lê uma variável diretamente do .env (linha KEY=valor).

    Fallback quando python-dotenv não parseia a linha (ex.: JWT, linha inválida antes).
    """
    path = project_env_path()
    if not path.is_file():
        return ""
    prefix = f"{key}="
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return ""
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("export "):
            stripped = stripped[7:].strip()
        if stripped.startswith(prefix):
            return _strip_env_value(stripped[len(prefix) :])
    return ""


def patch_env_from_file(
    keys: tuple[str, ...] = _DIRECT_READ_KEYS,
    *,
    override: bool = False,
) -> None:
    """Preenche os.environ com leitura linha-a-linha se dotenv não carregou."""
    for key in keys:
        if not override and os.getenv(key):
            continue
        value = read_env_file_value(key)
        if value:
            os.environ[key] = value


def load_project_env(*, override: bool = False) -> Path:
    """
    Carrega variáveis do .env do projeto.

    override=False (padrão): não sobrescreve variáveis já definidas pelo systemd
    (EnvironmentFile no serviço ctsupera) ou pelo shell.
    override=True: usado pelo manage.py na VPS para garantir leitura do .env.
    """
    path = project_env_path()
    if path.is_file():
        load_dotenv(dotenv_path=path, override=override)
        patch_env_from_file(override=override)
    return path


def bootstrap_cli_env() -> Path:
    """Carrega o .env antes do Django no manage.py (comandos Wellhub, migrate, etc.)."""
    return load_project_env(override=True)
