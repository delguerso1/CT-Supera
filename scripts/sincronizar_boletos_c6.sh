#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_PATH="${VENV_PATH:-}"

if [ -n "$VENV_PATH" ] && [ -f "$VENV_PATH/bin/activate" ]; then
  # shellcheck disable=SC1090
  . "$VENV_PATH/bin/activate"
fi

cd "$ROOT_DIR"

DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-app.settings_hostinger}" $PYTHON_BIN manage.py sincronizar_boletos_c6
