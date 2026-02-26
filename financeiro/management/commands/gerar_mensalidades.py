from django.core.management.base import BaseCommand
from django.utils import timezone

from financeiro.services import gerar_mensalidades_para_mes


class Command(BaseCommand):
    help = 'Gera mensalidades do mês atual para alunos ativos. Também executado automaticamente na virada de mês via signal.'

    def handle(self, *args, **kwargs):
        hoje = timezone.now().date()
        total_geradas = gerar_mensalidades_para_mes(ano=hoje.year, mes=hoje.month)

        self.stdout.write(
            self.style.SUCCESS(
                f'{total_geradas} mensalidade(s) gerada(s) para {hoje.year}/{hoje.month:02d}.'
            )
        )
