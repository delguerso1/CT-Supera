"""
Signals do módulo financeiro.
"""
import logging
from django.dispatch import Signal

from financeiro.services import gerar_mensalidades_para_mes

logger = logging.getLogger(__name__)

# Signal disparado na virada de mês (ano e mes do novo mês)
mes_virado = Signal()


def on_mes_virado(sender, ano: int, mes: int, **kwargs):
    """
    Receiver do signal mes_virado.
    Gera as mensalidades do novo mês para todos os alunos ativos.
    """
    try:
        total = gerar_mensalidades_para_mes(ano=ano, mes=mes)
        logger.info(f'Signal mes_virado: {total} mensalidade(s) gerada(s) para {ano}/{mes:02d}')
    except Exception as e:
        logger.exception(f'Erro ao gerar mensalidades no signal mes_virado: {e}')
        raise
