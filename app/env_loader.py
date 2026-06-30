"""Carregamento centralizado do arquivo .env do projeto (produção: /root/ct-supera/.env)."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent


def project_env_path() -> Path:
    """Caminho do .env na raiz do projeto (ou ENV_FILE se definido)."""
    raw = os.getenv("ENV_FILE", "").strip()
    if raw:
        return Path(raw)
    return BASE_DIR / ".env"


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
    return path


def bootstrap_cli_env() -> Path:
    """Carrega o .env antes do Django no manage.py (comandos Wellhub, migrate, etc.)."""
    return load_project_env(override=True)
