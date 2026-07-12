from django.core.management.base import BaseCommand

from financeiro.services import reativar_contratos_suspensos_vencidos


class Command(BaseCommand):
    help = "Reativa contratos de alunos cuja suspensão (suspenso_ate) já expirou."

    def handle(self, *args, **options):
        total = reativar_contratos_suspensos_vencidos()
        self.stdout.write(self.style.SUCCESS(f"{total} contrato(s) reativado(s)."))
