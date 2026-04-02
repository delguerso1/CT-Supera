"""
Serviços do módulo financeiro.
Contém a lógica de geração de mensalidades reutilizável.
"""
import logging
import re
from calendar import monthrange
from decimal import Decimal

from datetime import date, timedelta
from django.db import IntegrityError
from django.utils import timezone

from financeiro.models import Mensalidade, TransacaoC6Bank
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
    - Ainda não existe mensalidade para o mesmo mês/ano de vencimento (evita duplicação)
    - valor_primeira_mensalidade: valor opcional (matrícula + uniforme + mensalidade proporcional do mês)
    - dia_vencimento_primeira: dia do mês (1-31) para vencimento da primeira mensalidade

    Retorna a Mensalidade criada ou None se não criou.
    """
    if turma.ct.sem_financeiro:
        return None

    valor = valor_primeira_mensalidade or aluno.valor_mensalidade or Decimal("150.00")
    dia_venc = dia_vencimento_primeira if dia_vencimento_primeira is not None else (aluno.dia_vencimento or 10)
    try:
        dia_venc = int(dia_venc)
    except (TypeError, ValueError):
        dia_venc = 10

    # Data "hoje" no fuso configurado (evita deslocar vencimento vs. calendário BR em servidores UTC)
    hoje = timezone.localdate()
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
        mensalidade = Mensalidade.objects.create(aluno=aluno, valor=valor, data_vencimento=data_vencimento)
        logger.info(f'Mensalidade criada para {aluno.get_full_name()} ao vincular à turma {turma}')
        return mensalidade
    return None


def gerar_mensalidades_para_mes(ano: int, mes: int) -> int:
    """
    Gera mensalidades do mês especificado para todos os alunos ativos
    que ainda não possuem mensalidade naquele período.

    Não considera status de pagamento - gera inclusive para alunos com
    mensalidades pendentes/atrasadas do mês anterior.

    Retorna o número de mensalidades criadas.
    Exclui alunos que só estão em CTs com sem_financeiro.

    Critério de "aluno ativo" alinhado ao painel do gerente e à gestão de
    usuários: ativo no CT (ativo=True) e conta liberada para login (is_active=True).
    """
    total_geradas = 0
    hoje = timezone.localdate()
    ultimo_dia = monthrange(ano, mes)[1]

    alunos = Usuario.objects.filter(tipo='aluno', ativo=True, is_active=True)

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
            try:
                Mensalidade.objects.create(
                    aluno=aluno,
                    valor=valor,
                    data_inicio=hoje,
                    data_vencimento=data_vencimento,
                )
                total_geradas += 1
            except IntegrityError:
                # Outra requisição/thread criou no mesmo instante
                pass

    if total_geradas > 0:
        logger.info(f'Mensalidades: {total_geradas} criada(s) para {ano}/{mes:02d}')

    return total_geradas


def _calcular_multa_mora(mensalidade):
    """Calcula multa (2%) e mora (1% ao mês) para mensalidade atrasada."""
    from financeiro.views import calcular_multa_mora
    return calcular_multa_mora(mensalidade)


def gerar_pix_para_mensalidade(mensalidade):
    """
    Gera cobrança PIX para uma mensalidade. Retorna dict com codigo_pix, valor, data_vencimento.
    Levanta exceção em caso de erro.
    """
    from django.conf import settings
    from financeiro.c6_client import c6_client

    transacao_existente = TransacaoC6Bank.objects.filter(
        mensalidade=mensalidade,
        status='pendente',
        data_expiracao__gt=timezone.now(),
        tipo='pix'
    ).first()

    if transacao_existente:
        return {
            'codigo_pix': transacao_existente.codigo_pix,
            'valor': float(transacao_existente.valor),
            'data_vencimento': mensalidade.data_vencimento,
            'transacao': transacao_existente,
        }

    if not getattr(settings, 'C6_BANK_CHAVE_PIX', None):
        raise ValueError('Chave PIX não configurada no servidor.')

    calculo = _calcular_multa_mora(mensalidade)
    valor_total = calculo['valor_total']
    if valor_total < 0.01:
        raise ValueError(f'Valor da mensalidade inválido: R$ {valor_total:.2f}')

    descricao = f"Mensalidade {mensalidade.data_vencimento.strftime('%m/%Y')} - {mensalidade.aluno.get_full_name()}"
    if calculo['esta_atrasada']:
        descricao += f" (Multa: R$ {calculo['valor_multa']:.2f}, Mora: R$ {calculo['valor_mora']:.2f})"

    pix_response = c6_client.create_pix_payment(
        valor=valor_total,
        descricao=descricao[:140],
        chave_pix=settings.C6_BANK_CHAVE_PIX,
        expiracao_segundos=1800
    )

    txid = pix_response.get('txid')
    calendario = pix_response.get('calendario', {})
    pix_copia_cola = pix_response.get('pixCopiaECola')
    expiracao_segundos = calendario.get('expiracao', 1800)
    data_expiracao = timezone.now() + timedelta(seconds=expiracao_segundos)

    transacao = TransacaoC6Bank.objects.create(
        mensalidade=mensalidade,
        tipo='pix',
        valor=Decimal(str(valor_total)),
        txid=txid,
        chave_pix=settings.C6_BANK_CHAVE_PIX,
        descricao=descricao,
        data_expiracao=data_expiracao,
        resposta_api=pix_response,
        codigo_pix=pix_copia_cola
    )

    if not pix_copia_cola:
        try:
            pix_copia_cola = c6_client.get_pix_copia_cola(txid)
            if pix_copia_cola:
                transacao.codigo_pix = pix_copia_cola
                transacao.save()
        except Exception as e:
            logger.warning(f"Erro ao obter código PIX Copia e Cola: {str(e)}")

    return {
        'codigo_pix': pix_copia_cola or transacao.codigo_pix,
        'valor': valor_total,
        'data_vencimento': mensalidade.data_vencimento,
        'transacao': transacao,
    }


def gerar_boleto_para_mensalidade(mensalidade):
    """
    Gera boleto para uma mensalidade. Retorna dict com digitable_line, valor, data_vencimento, pdf_content.
    Levanta exceção em caso de erro.
    """
    from django.conf import settings
    from financeiro.c6_client import c6_client

    transacao_existente = TransacaoC6Bank.objects.filter(
        mensalidade=mensalidade,
        status='pendente',
        data_expiracao__gt=timezone.now(),
        tipo='boleto'
    ).first()

    if transacao_existente:
        pdf_content = None
        try:
            pdf_content = c6_client.get_bank_slip_pdf(transacao_existente.txid)
        except Exception:
            pass
        return {
            'digitable_line': transacao_existente.boleto_codigo,
            'valor': float(transacao_existente.valor),
            'data_vencimento': mensalidade.data_vencimento,
            'transacao': transacao_existente,
            'pdf_content': pdf_content,
        }

    aluno = mensalidade.aluno
    # Valor base (C6 Bank aplica multa/mora automaticamente quando pago após vencimento)
    valor_mensalidade = float(mensalidade.valor)
    if valor_mensalidade < 5.00:
        raise ValueError(f'Valor da mensalidade (R$ {valor_mensalidade:.2f}) está abaixo do mínimo para boletos (R$ 5,00).')

    calculo = _calcular_multa_mora(mensalidade)
    fine = None
    interest = None
    if calculo['esta_atrasada']:
        fine = {"type": "P", "value": 2.0, "dead_line": 0}
        interest = {"type": "P", "value": 1.0, "dead_line": 0}

    endereco_completo = aluno.endereco or "Endereço não informado"
    street = endereco_completo[:33] if len(endereco_completo) <= 33 else endereco_completo[:33]
    number = 1
    if aluno.endereco:
        numero_match = re.search(r'(\d+)', aluno.endereco)
        if numero_match:
            try:
                number = int(numero_match.group(1))
                if number == 0:
                    number = 1
            except ValueError:
                pass

    address = {
        "street": street,
        "number": number,
        "complement": "",
        "city": "São Paulo",
        "state": "SP",
        "zip_code": "01000000"
    }

    nome_completo = aluno.get_full_name().strip()
    if not nome_completo or len(nome_completo) < 3:
        raise ValueError('Nome do aluno inválido. Complete o cadastro com nome completo.')

    cpf_limpo = re.sub(r'\D', '', str(aluno.cpf or ''))
    if len(cpf_limpo) < 11:
        cpf_limpo = cpf_limpo.zfill(11)
    if len(cpf_limpo) != 11 or not cpf_limpo.isdigit():
        raise ValueError('CPF do aluno inválido.')

    payer = {
        "name": nome_completo[:40],
        "tax_id": cpf_limpo,
        "address": address
    }
    if aluno.email and aluno.email != 'pendente' and '@' in aluno.email:
        payer["email"] = aluno.email

    external_ref = f"B{str(mensalidade.id)[:9].zfill(9)}"
    due_date = mensalidade.data_vencimento.strftime('%Y-%m-%d')
    instructions = ["Não receber após o vencimento", f"Mensalidade {mensalidade.data_vencimento.strftime('%m/%Y')}"]

    boleto_response = c6_client.create_bank_slip(
        external_reference_id=external_ref,
        amount=valor_mensalidade,
        due_date=due_date,
        payer=payer,
        instructions=instructions,
        fine=fine,
        interest=interest,
        partner_software_name="CT Supera",
        partner_software_version="1.0.0"
    )

    boleto_id = boleto_response.get('id')
    digitable_line = boleto_response.get('digitable_line')
    data_expiracao = timezone.now() + timedelta(days=30)
    descricao_boleto = f"Boleto - Mensalidade {mensalidade.data_vencimento.strftime('%m/%Y')} - {aluno.get_full_name()}"

    transacao = TransacaoC6Bank.objects.create(
        mensalidade=mensalidade,
        tipo='boleto',
        valor=mensalidade.valor,
        txid=boleto_id,
        boleto_codigo=digitable_line,
        descricao=descricao_boleto,
        data_expiracao=data_expiracao,
        resposta_api=boleto_response
    )

    pdf_content = None
    try:
        pdf_content = c6_client.get_bank_slip_pdf(boleto_id)
    except Exception as e:
        logger.warning(f"Erro ao obter PDF do boleto: {str(e)}")

    return {
        'digitable_line': digitable_line,
        'valor': valor_mensalidade,
        'data_vencimento': mensalidade.data_vencimento,
        'transacao': transacao,
        'pdf_content': pdf_content,
    }
