"""Carregamento centralizado do arquivo .env do projeto."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent


def project_env_path() -> Path:
    """Caminho do .env usado pelo Django e pelos comandos manage.py."""
    raw = os.getenv("ENV_FILE", "").strip()
    if raw:
        return Path(raw)
    return BASE_DIR / ".env"


def load_project_env(*, override: bool = True) -> Path:
    """
    Carrega variáveis do .env.

    override=True faz o arquivo prevalecer sobre variáveis vazias no shell
    (comum ao rodar manage.py na VPS após export manual).
    """
    path = project_env_path()
    if path.is_file():
        load_dotenv(dotenv_path=path, override=override)
    return path
