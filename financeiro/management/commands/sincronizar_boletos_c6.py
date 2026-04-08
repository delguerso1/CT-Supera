"""
Fallback quando o webhook BANK_SLIP do C6 não estiver cadastrado ou falhar.
Agendar no cron (ex.: a cada 10 min):

    python manage.py sincronizar_boletos_c6
"""
import logging

from django.core.management.base import BaseCommand

from financeiro.models import TransacaoC6Bank
from financeiro.c6_boleto_sync import sincronizar_transacao_boleto_c6
from financeiro.c6_client import C6BankError

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        'Consulta C6 para boletos ainda pendentes e atualiza mensalidades '
        '(fallback ao webhook).'
    )

    def handle(self, *args, **options):
        qs = (
            TransacaoC6Bank.objects.filter(
                tipo='boleto',
                status='pendente',
                txid__isnull=False,
            )
            .exclude(txid='')
            .order_by('-id')[:200]
        )
        ok = 0
        err = 0
        for transacao in qs:
            try:
                sincronizar_transacao_boleto_c6(transacao)
                ok += 1
            except C6BankError as e:
                logger.warning('sync boleto %s: C6 %s', transacao.id, e)
                err += 1
            except Exception as e:
                logger.exception('sync boleto %s: %s', transacao.id, e)
                err += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Boletos: {ok} sincronizado(s), {err} erro(s).'
            )
        )
