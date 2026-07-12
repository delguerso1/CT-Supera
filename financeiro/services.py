"""
Serviços do módulo financeiro.
Contém a lógica de geração de mensalidades reutilizável.
"""
import logging
import re
from calendar import monthrange
from decimal import Decimal, ROUND_HALF_UP

from datetime import date, timedelta
from django.db import IntegrityError
from django.utils import timezone

from financeiro.dias_uteis import proximo_dia_util_br
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

    data_vencimento = proximo_dia_util_br(data_vencimento)

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
        if getattr(aluno, "contrato_suspenso", False) and aluno.esta_suspenso():
            continue
        if not _aluno_tem_ct_com_financeiro(aluno):
            continue

        valor = aluno.valor_mensalidade or Decimal("150.00")
        dia_venc = aluno.dia_vencimento or 10
        try:
            dia_venc = int(dia_venc)
        except (TypeError, ValueError):
            dia_venc = 10

        dia = min(dia_venc, ultimo_dia)
        data_vencimento = proximo_dia_util_br(date(ano, mes, dia))

        existe = Mensalidade.objects.filter(
            aluno=aluno,
            data_vencimento__year=data_vencimento.year,
            data_vencimento__month=data_vencimento.month,
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
        from financeiro.pix_utils import gerar_qr_pix_png_bytes, normalizar_codigo_pix

        codigo = normalizar_codigo_pix(transacao_existente.codigo_pix)
        if codigo and codigo != transacao_existente.codigo_pix:
            transacao_existente.codigo_pix = codigo
            transacao_existente.save(update_fields=['codigo_pix'])
        qr_png = gerar_qr_pix_png_bytes(codigo) if codigo else None
        return {
            'codigo_pix': codigo or transacao_existente.codigo_pix,
            'valor': float(transacao_existente.valor),
            'data_vencimento': mensalidade.data_vencimento,
            'transacao': transacao_existente,
            'qr_png_bytes': qr_png,
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

    from financeiro.pix_utils import (
        br_code_pix_parece_valido,
        gerar_qr_pix_png_bytes,
        normalizar_codigo_pix,
    )

    if not pix_copia_cola:
        try:
            pix_copia_cola = c6_client.get_pix_copia_cola(txid)
        except Exception as e:
            logger.warning(f"Erro ao obter código PIX Copia e Cola: {str(e)}")

    pix_copia_cola = normalizar_codigo_pix(pix_copia_cola)
    if pix_copia_cola and not br_code_pix_parece_valido(pix_copia_cola):
        logger.warning(
            "BR Code PIX com formato inesperado após normalização (txid=%s, len=%s).",
            txid,
            len(pix_copia_cola),
        )

    transacao = TransacaoC6Bank.objects.create(
        mensalidade=mensalidade,
        tipo='pix',
        valor=Decimal(str(valor_total)),
        txid=txid,
        chave_pix=settings.C6_BANK_CHAVE_PIX,
        descricao=descricao,
        data_expiracao=data_expiracao,
        resposta_api=pix_response,
        codigo_pix=pix_copia_cola,
    )

    qr_png_bytes = gerar_qr_pix_png_bytes(pix_copia_cola) if pix_copia_cola else None

    return {
        'codigo_pix': pix_copia_cola or transacao.codigo_pix,
        'valor': valor_total,
        'data_vencimento': mensalidade.data_vencimento,
        'transacao': transacao,
        'qr_png_bytes': qr_png_bytes,
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


# --- Encerramento de contrato ---

_DIAS_SEMANA_PT = (
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
    "Domingo",
)


def _data_referencia_ultimo_pagamento(ultima_paga):
    """Marco a partir do qual aulas passam a ser cobradas no encerramento."""
    if ultima_paga.data_pagamento:
        return timezone.localtime(ultima_paga.data_pagamento).date()
    return ultima_paga.data_vencimento


def _aulas_esperadas_no_mes(aluno, ano, mes):
    """Quantidade de dias habilitados do aluno no calendário do mês."""
    nomes = set(aluno.dias_habilitados.values_list("nome", flat=True))
    if not nomes:
        return 0
    ultimo = monthrange(ano, mes)[1]
    total = 0
    for dia in range(1, ultimo + 1):
        if _DIAS_SEMANA_PT[date(ano, mes, dia).weekday()] in nomes:
            total += 1
    return total


def calcular_encerramento_contrato(aluno, data_referencia=None):
    """
    Calcula cobrança proporcional pelas aulas presentes após o último pagamento.
    Usado em encerramento e suspensão de contrato.
    """
    from django.db.models import Q
    from funcionarios.models import Presenca

    hoje = data_referencia or timezone.localdate()
    valor_mensal = Decimal(str(aluno.valor_mensalidade or 150))

    ultima_paga = (
        Mensalidade.objects.filter(aluno=aluno, status="pago")
        .order_by("-data_pagamento", "-data_vencimento", "-id")
        .first()
    )

    if ultima_paga:
        ref = _data_referencia_ultimo_pagamento(ultima_paga)
        data_inicio_contagem = ref
        filtro_data = {"data__gt": data_inicio_contagem}
        ref_label = ref.isoformat()
        ultima_paga_info = {
            "id": ultima_paga.id,
            "valor": str(ultima_paga.valor_pago or ultima_paga.valor),
            "data_pagamento": (
                timezone.localtime(ultima_paga.data_pagamento).isoformat()
                if ultima_paga.data_pagamento
                else None
            ),
            "data_vencimento": ultima_paga.data_vencimento.isoformat()
            if ultima_paga.data_vencimento
            else None,
        }
    else:
        if aluno.matriculado_em:
            data_inicio_contagem = timezone.localtime(aluno.matriculado_em).date()
            filtro_data = {"data__gte": data_inicio_contagem}
            ref_label = data_inicio_contagem.isoformat()
        else:
            data_inicio_contagem = None
            filtro_data = {}
            ref_label = None
        ultima_paga_info = None

    qs = (
        Presenca.objects.filter(
            usuario=aluno,
            ausencia_registrada=False,
            **filtro_data,
        )
        .filter(Q(presenca_confirmada=True) | Q(checkin_realizado=True))
        .order_by("data")
    )

    nomes_habilitados = set(aluno.dias_habilitados.values_list("nome", flat=True))
    aulas_datas = []
    for p in qs:
        if nomes_habilitados and _DIAS_SEMANA_PT[p.data.weekday()] not in nomes_habilitados:
            continue
        aulas_datas.append(p.data.isoformat())

    aulas_presentes = len(aulas_datas)

    base_ano = (data_inicio_contagem or hoje).year
    base_mes = (data_inicio_contagem or hoje).month
    aulas_esperadas = _aulas_esperadas_no_mes(aluno, base_ano, base_mes)
    if aulas_esperadas <= 0:
        n_dias = aluno.dias_habilitados.count() or 1
        aulas_esperadas = n_dias * 4

    if aulas_presentes <= 0:
        valor_proporcional = Decimal("0.00")
    else:
        valor_proporcional = (
            valor_mensal * Decimal(aulas_presentes) / Decimal(aulas_esperadas)
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return {
        "aulas_presentes": aulas_presentes,
        "aulas_esperadas_mes": aulas_esperadas,
        "aulas_datas": aulas_datas,
        "valor_mensalidade": str(valor_mensal),
        "valor_encerramento": str(valor_proporcional),
        "valor_proporcional": str(valor_proporcional),
        "data_referencia": ref_label,
        "ultimo_pagamento": ultima_paga_info,
        "precisa_cobrar": valor_proporcional > 0,
    }


def criar_mensalidade_proporcional_aulas(
    aluno,
    calculo=None,
    data_vencimento=None,
    tipo="encerramento",
):
    """
    Cria mensalidade proporcional pelas aulas após o último pagamento.
    tipo: 'encerramento' | 'suspensao'
    Retorna (mensalidade|None, calculo).
    """
    calculo = calculo or calcular_encerramento_contrato(aluno)
    valor = Decimal(str(calculo.get("valor_proporcional") or calculo["valor_encerramento"]))
    if valor <= 0:
        return None, calculo

    if not _aluno_tem_ct_com_financeiro(aluno):
        logger.info(
            "%s sem cobrança: aluno %s só em CT sem_financeiro",
            tipo,
            aluno.pk,
        )
        calculo = {**calculo, "sem_financeiro": True, "precisa_cobrar": False}
        return None, calculo

    hoje = timezone.localdate()
    venc = data_vencimento or hoje
    venc = proximo_dia_util_br(venc)

    ref_txt = (
        f" (ref. {calculo['data_referencia']})"
        if calculo.get("data_referencia")
        else ""
    )
    if tipo == "suspensao":
        titulo = "Suspensão de contrato"
    else:
        titulo = "Encerramento de contrato"
    obs = (
        f"{titulo} — {calculo['aulas_presentes']} aula(s) "
        f"após o último pagamento{ref_txt}. "
        f"Cálculo: R$ {calculo['valor_mensalidade']} × "
        f"{calculo['aulas_presentes']}/{calculo['aulas_esperadas_mes']}."
    )

    existente = Mensalidade.objects.filter(
        aluno=aluno,
        data_vencimento__year=venc.year,
        data_vencimento__month=venc.month,
    ).first()

    if existente:
        if existente.status == "pago":
            ano, mes = venc.year, venc.month
            for _ in range(12):
                if mes == 12:
                    ano, mes = ano + 1, 1
                else:
                    mes += 1
                conflito = Mensalidade.objects.filter(
                    aluno=aluno,
                    data_vencimento__year=ano,
                    data_vencimento__month=mes,
                ).exists()
                if not conflito:
                    dia = min(aluno.dia_vencimento or venc.day, monthrange(ano, mes)[1])
                    venc = proximo_dia_util_br(date(ano, mes, dia))
                    break
            mensalidade = Mensalidade.objects.create(
                aluno=aluno,
                valor=valor,
                data_vencimento=venc,
                observacoes=obs,
            )
        else:
            existente.valor = valor
            existente.data_vencimento = venc
            existente.observacoes = (
                f"{(existente.observacoes or '').strip()}\n{obs}".strip()
                if existente.observacoes
                else obs
            )
            existente.status = "pendente"
            existente.save()
            mensalidade = existente
    else:
        mensalidade = Mensalidade.objects.create(
            aluno=aluno,
            valor=valor,
            data_vencimento=venc,
            observacoes=obs,
        )

    logger.info(
        "Mensalidade de %s criada/atualizada id=%s aluno=%s valor=%s",
        tipo,
        mensalidade.pk,
        aluno.pk,
        valor,
    )
    return mensalidade, calculo


def criar_mensalidade_encerramento(aluno, calculo=None, data_vencimento=None):
    """Compat: cria mensalidade de encerramento de contrato."""
    return criar_mensalidade_proporcional_aulas(
        aluno, calculo=calculo, data_vencimento=data_vencimento, tipo="encerramento"
    )


def criar_mensalidade_suspensao(aluno, calculo=None, data_vencimento=None):
    """Cria mensalidade proporcional ao suspender o contrato."""
    return criar_mensalidade_proporcional_aulas(
        aluno, calculo=calculo, data_vencimento=data_vencimento, tipo="suspensao"
    )


def calcular_preview_suspensao(aluno, duracao_dias):
    """Preview da suspensão: datas + cobrança proporcional."""
    duracao = int(duracao_dias)
    if duracao not in (30, 60):
        raise ValueError("Duração deve ser 30 ou 60 dias.")
    hoje = timezone.localdate()
    suspenso_ate = hoje + timedelta(days=duracao)
    calculo = calcular_encerramento_contrato(aluno)
    return {
        "duracao_dias": duracao,
        "suspenso_desde": hoje.isoformat(),
        "suspenso_ate": suspenso_ate.isoformat(),
        "cobranca": calculo,
    }


def aplicar_suspensao_contrato(aluno, duracao_dias):
    """
    Aplica suspensão: gera mensalidade proporcional e marca o contrato como suspenso.
    Mantém turmas e is_active (aluno pode pagar). Bloqueia check-in via esta_suspenso().
    Retorna (mensalidade|None, preview).
    """
    preview = calcular_preview_suspensao(aluno, duracao_dias)
    mensalidade, calculo = criar_mensalidade_suspensao(aluno, calculo=preview["cobranca"])
    preview["cobranca"] = calculo

    hoje = timezone.localdate()
    aluno.contrato_suspenso = True
    aluno.suspenso_desde = hoje
    aluno.suspenso_ate = hoje + timedelta(days=int(duracao_dias))
    aluno.duracao_suspensao_dias = int(duracao_dias)
    aluno.save(
        update_fields=[
            "contrato_suspenso",
            "suspenso_desde",
            "suspenso_ate",
            "duracao_suspensao_dias",
        ]
    )
    return mensalidade, preview


def reativar_contrato_aluno(aluno):
    """Remove flags de suspensão do aluno."""
    if not aluno.contrato_suspenso and not aluno.suspenso_ate:
        return False
    aluno.limpar_suspensao(save=True)
    return True


def reativar_contratos_suspensos_vencidos():
    """Reativa alunos cuja data suspenso_ate já passou. Retorna quantidade."""
    hoje = timezone.localdate()
    qs = Usuario.objects.filter(
        tipo="aluno",
        contrato_suspenso=True,
        suspenso_ate__isnull=False,
        suspenso_ate__lt=hoje,
    )
    total = 0
    for aluno in qs.iterator():
        aluno.limpar_suspensao(save=True)
        total += 1
    if total:
        logger.info("Reativados %s contrato(s) suspenso(s) vencido(s)", total)
    return total
