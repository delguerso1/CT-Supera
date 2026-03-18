"""
Comando para enviar e-mails de lembrete de aula experimental (24h antes).
Executar diariamente via cron: python manage.py enviar_lembretes_aula_experimental
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from usuarios.models import PreCadastro
from usuarios.utils import enviar_lembrete_aula_experimental


class Command(BaseCommand):
    help = 'Envia lembretes por e-mail para pré-cadastros com aula experimental no dia seguinte.'

    def handle(self, *args, **kwargs):
        amanha = (timezone.now() + timedelta(days=1)).date()
        precadastros = PreCadastro.objects.filter(
            origem='aula_experimental',
            status='pendente',
            data_aula_experimental=amanha,
        ).exclude(email='').exclude(email__isnull=True).exclude(email='pendente')

        enviados = 0
        for p in precadastros:
            if enviar_lembrete_aula_experimental(p):
                enviados += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'{enviados} lembrete(s) enviado(s) para aula experimental em {amanha.strftime("%d/%m/%Y")}.'
            )
        )
