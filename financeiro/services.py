"""
Serviços do módulo financeiro.
Contém a lógica de geração de mensalidades reutilizável.
"""
import logging
from calendar import monthrange

from datetime import date
from django.utils import timezone

from financeiro.models import Mensalidade
from usuarios.models import Usuario

logger = logging.getLogger(__name__)


def gerar_mensalidades_para_mes(ano: int, mes: int) -> int:
    """
    Gera mensalidades do mês especificado para todos os alunos ativos
    que ainda não possuem mensalidade naquele período.

    Não considera status de pagamento - gera inclusive para alunos com
    mensalidades pendentes/atrasadas do mês anterior.

    Retorna o número de mensalidades criadas.
    """
    total_geradas = 0
    hoje = timezone.now().date()
    ultimo_dia = monthrange(ano, mes)[1]

    alunos = Usuario.objects.filter(tipo='aluno', ativo=True)

    for aluno in alunos:
        if not aluno.dia_vencimento or not aluno.valor_mensalidade:
            continue

        dia = min(int(aluno.dia_vencimento), ultimo_dia)
        data_vencimento = date(ano, mes, dia)

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

    if total_geradas > 0:
        logger.info(f'Mensalidades: {total_geradas} criada(s) para {ano}/{mes:02d}')

    return total_geradas
