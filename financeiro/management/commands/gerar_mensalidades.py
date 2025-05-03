from django.core.management.base import BaseCommand
from financeiro.models import Mensalidade
from alunos.models import PreCadastro
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Gera mensalidades automaticamente para alunos com vencimento em 5 dias'

    def handle(self, *args, **kwargs):
        hoje = timezone.now().date()
        data_vencimento = hoje + timedelta(days=5)

        alunos = PreCadastro.objects.all()
        total_geradas = 0

        for aluno in alunos:
            existe = Mensalidade.objects.filter(
                aluno=aluno,
                data_vencimento=data_vencimento
            ).exists()

            if not existe:
                Mensalidade.objects.create(
                    aluno=aluno,
                    valor=aluno.valor_mensalidade,
                    data_inicio=data_vencimento,
                    data_vencimento=data_vencimento + timedelta(days=30)
                )
                total_geradas += 1

        self.stdout.write(self.style.SUCCESS(f'{total_geradas} mensalidade(s) gerada(s) com sucesso.'))
