"""
Fallback quando o webhook de CHECKOUT do C6 não estiver cadastrado ou falhar.
Agendar no cron (ex.: a cada 5–15 min):

    python manage.py sincronizar_checkouts_cartao_c6
"""
import logging

from django.core.management.base import BaseCommand

from financeiro.models import TransacaoC6Bank
from financeiro.c6_checkout_sync import sincronizar_transacao_checkout_c6
from financeiro.c6_client import C6BankError

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Consulta C6 para transações de cartão ainda pendentes e atualiza mensalidades (fallback ao webhook).'

    def handle(self, *args, **options):
        qs = (
            TransacaoC6Bank.objects.filter(
                tipo='cartao',
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
                sincronizar_transacao_checkout_c6(transacao)
                ok += 1
            except C6BankError as e:
                logger.warning('sync checkout %s: C6 %s', transacao.id, e)
                err += 1
            except Exception as e:
                logger.exception('sync checkout %s: %s', transacao.id, e)
                err += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Checkouts cartão: {ok} sincronizado(s), {err} erro(s).'
            )
        )
