"""
WSGI config for app project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

from app.env_loader import load_project_env

load_project_env()
os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    os.getenv('DJANGO_SETTINGS_MODULE', 'app.settings'),
)

application = get_wsgi_application()
