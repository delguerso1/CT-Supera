"""
Serviços do módulo financeiro.
Contém a lógica de geração de mensalidades reutilizável.
"""
import logging
from calendar import monthrange
from decimal import Decimal

from datetime import date
from django.utils import timezone

from financeiro.models import Mensalidade
from usuarios.models import Usuario

logger = logging.getLogger(__name__)


def _aluno_tem_ct_com_financeiro(aluno):
    """Retorna True se o aluno está em ao menos uma turma de um CT sem sem_financeiro."""
    from turmas.models import Turma
    return Turma.objects.filter(
        alunos=aluno,
        ct__sem_financeiro=False
    ).exists()


def criar_mensalidade_ao_vincular_turma(aluno, turma, valor_primeira_mensalidade=None, dia_vencimento_primeira=None):
    """
    Cria mensalidade quando aluno é vinculado a uma turma, se:
    - O CT da turma não tem sem_financeiro
    - O aluno ainda não possui mensalidade (evita duplicação)
    - valor_primeira_mensalidade: valor opcional (matrícula + uniforme + mensalidade)
    - dia_vencimento_primeira: dia do mês (1-31) para vencimento da primeira mensalidade
    """
    if turma.ct.sem_financeiro:
        return
    if Mensalidade.objects.filter(aluno=aluno).exists():
        return  # Já possui mensalidade, não duplicar

    valor = valor_primeira_mensalidade or aluno.valor_mensalidade or Decimal("150.00")
    dia_venc = dia_vencimento_primeira if dia_vencimento_primeira is not None else (aluno.dia_vencimento or 10)
    try:
        dia_venc = int(dia_venc)
    except (TypeError, ValueError):
        dia_venc = 10

    hoje = timezone.now().date()
    ultimo_dia = monthrange(hoje.year, hoje.month)[1]
    dia_venc = min(max(1, dia_venc), ultimo_dia)
    data_vencimento = hoje.replace(day=dia_venc)

    if data_vencimento < hoje:
        if hoje.month == 12:
            data_vencimento = data_vencimento.replace(year=hoje.year + 1, month=1)
        else:
            data_vencimento = data_vencimento.replace(month=hoje.month + 1)

    existe = Mensalidade.objects.filter(
        aluno=aluno,
        data_vencimento__year=data_vencimento.year,
        data_vencimento__month=data_vencimento.month
    ).exists()
    if not existe:
        Mensalidade.objects.create(aluno=aluno, valor=valor, data_vencimento=data_vencimento)
        logger.info(f'Mensalidade criada para {aluno.get_full_name()} ao vincular à turma {turma}')


def gerar_mensalidades_para_mes(ano: int, mes: int) -> int:
    """
    Gera mensalidades do mês especificado para todos os alunos ativos
    que ainda não possuem mensalidade naquele período.

    Não considera status de pagamento - gera inclusive para alunos com
    mensalidades pendentes/atrasadas do mês anterior.

    Retorna o número de mensalidades criadas.
    Exclui alunos que só estão em CTs com sem_financeiro.
    """
    total_geradas = 0
    hoje = timezone.now().date()
    ultimo_dia = monthrange(ano, mes)[1]

    alunos = Usuario.objects.filter(tipo='aluno', ativo=True)

    for aluno in alunos:
        if not _aluno_tem_ct_com_financeiro(aluno):
            continue

        valor = aluno.valor_mensalidade or Decimal("150.00")
        dia_venc = aluno.dia_vencimento or 10
        try:
            dia_venc = int(dia_venc)
        except (TypeError, ValueError):
            dia_venc = 10

        dia = min(dia_venc, ultimo_dia)
        data_vencimento = date(ano, mes, dia)

        existe = Mensalidade.objects.filter(
            aluno=aluno,
            data_vencimento__year=ano,
            data_vencimento__month=mes
        ).exists()

        if not existe:
            Mensalidade.objects.create(
                aluno=aluno,
                valor=valor,
                data_inicio=hoje,
                data_vencimento=data_vencimento
            )
            total_geradas += 1

    if total_geradas > 0:
        logger.info(f'Mensalidades: {total_geradas} criada(s) para {ano}/{mes:02d}')

    return total_geradas
