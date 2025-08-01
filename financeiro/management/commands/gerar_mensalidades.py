from django.core.management.base import BaseCommand
from financeiro.models import Mensalidade
from alunos.models import PreCadastro
from django.utils import timezone
from datetime import timedelta
from usuarios.models import Usuario
from calendar import monthrange

class Command(BaseCommand):
    help = 'Gera mensalidades automaticamente para alunos ativos, usando vencimento e valor personalizados.'

    def handle(self, *args, **kwargs):
        hoje = timezone.now().date()
        ano = hoje.year
        mes = hoje.month
        total_geradas = 0

        alunos = Usuario.objects.filter(tipo='aluno', ativo=True)

        for aluno in alunos:
            if not aluno.dia_vencimento or not aluno.valor_mensalidade:
                continue  # Pula alunos sem configuração
            # Calcula o vencimento para o mês atual
            ultimo_dia = monthrange(ano, mes)[1]
            dia = min(int(aluno.dia_vencimento), ultimo_dia)
            data_vencimento = hoje.replace(day=dia)
            # Evita duplicidade
            existe = Mensalidade.objects.filter(
                aluno=aluno,
                data_vencimento__year=ano,
                data_vencimento__month=mes
            ).exists()
            if not existe:
                Mensalidade.objects.create(
                    aluno=aluno,
                    valor=aluno.valor_mensalidade,
                    data_inicio=hoje,
                    data_vencimento=data_vencimento
                )
                total_geradas += 1

        self.stdout.write(self.style.SUCCESS(f'{total_geradas} mensalidade(s) gerada(s) com sucesso.'))
