#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path


def _bootstrap_env() -> None:
    """Lê /root/ct-supera/.env (ou BASE/.env) antes de importar o Django."""
    project_dir = Path(__file__).resolve().parent
    env_path = Path(os.getenv("ENV_FILE", project_dir / ".env"))
    if env_path.is_file():
        from dotenv import load_dotenv

        load_dotenv(dotenv_path=env_path, override=True)


_bootstrap_env()


def main():
    """Run administrative tasks."""
    os.environ.setdefault(
        'DJANGO_SETTINGS_MODULE',
        os.getenv('DJANGO_SETTINGS_MODULE', 'app.settings'),
    )
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
