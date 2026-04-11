"""
Reconciliação em lote: consulta C6 para cobranças PIX pendentes/expiradas/processando
e alinha TransacaoC6Bank + Mensalidade (mesma lógica do webhook e das APIs de status).

Agendar no cron (ex.: a cada 10 min), como fallback quando o webhook falhar:

    python manage.py sincronizar_pix_c6
"""
import logging

from django.core.management.base import BaseCommand

from financeiro.c6_pix_sync import sincronizar_transacao_pix_c6
from financeiro.models import TransacaoC6Bank

logger = logging.getLogger(__name__)

_STATUS = ('pendente', 'expirado', 'processando')


class Command(BaseCommand):
    help = (
        'Consulta C6 para transações PIX ainda não finalizadas e atualiza mensalidades '
        '(reconciliação em lote; fallback ao webhook).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=200,
            help='Número máximo de transações a processar por execução (default: 200).',
        )

    def handle(self, *args, **options):
        limit = max(1, options['limit'])
        qs = (
            TransacaoC6Bank.objects.filter(
                tipo='pix',
                status__in=_STATUS,
            )
            .exclude(txid__isnull=True)
            .exclude(txid='')
            .order_by('-id')[:limit]
        )

        processadas = 0
        novas_aprovadas = 0
        novas_canceladas = 0
        erros_api = 0

        for transacao in qs:
            old_status = transacao.status
            cobranca = sincronizar_transacao_pix_c6(transacao)
            transacao.refresh_from_db()
            processadas += 1

            if cobranca is None:
                erros_api += 1
                continue

            if transacao.status == 'aprovado' and old_status != 'aprovado':
                novas_aprovadas += 1
            elif transacao.status == 'cancelado' and old_status != 'cancelado':
                novas_canceladas += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'PIX C6: {processadas} consultada(s); '
                f'{novas_aprovadas} nova(s) aprovada(s); '
                f'{novas_canceladas} nova(s) cancelada(s); '
                f'{erros_api} falha(s) de API ou consulta.'
            )
        )
