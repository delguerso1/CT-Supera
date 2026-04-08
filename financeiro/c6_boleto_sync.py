"""
Sincronização de boleto C6 Bank com TransacaoC6Bank e Mensalidade.
Usado pela API de consulta, webhook BANK_SLIP e comando de cron.
"""
import logging

from django.utils import timezone

from .models import Mensalidade, TransacaoC6Bank
from .c6_client import c6_client

logger = logging.getLogger(__name__)

_PARTNER_NAME = 'CT Supera'
_PARTNER_VERSION = '1.0.0'


def sincronizar_transacao_boleto_c6(transacao: TransacaoC6Bank) -> dict:
    """
    Consulta o status no C6 e atualiza transação e mensalidade (idempotente).

    Returns:
        dict com keys: transacao (objeto atualizado), boleto_data (dict da API C6).
    """
    if not transacao.txid:
        raise ValueError('Transação de boleto sem ID (txid) do C6.')

    boleto_data = c6_client.get_bank_slip(
        transacao.txid,
        partner_software_name=_PARTNER_NAME,
        partner_software_version=_PARTNER_VERSION,
    )
    status_boleto = str(boleto_data.get('status', '') or '').upper().strip()

    transacao.resposta_api = boleto_data

    if status_boleto == 'PAID' and transacao.status != 'aprovado':
        transacao.status = 'aprovado'
        transacao.data_aprovacao = timezone.now()

        mensalidade = transacao.mensalidade
        if mensalidade.status != 'pago':
            mensalidade.status = 'pago'
            mensalidade.valor_pago = transacao.valor
            mensalidade.save()
            proxima = Mensalidade.criar_proxima_mensalidade(mensalidade)
            if proxima:
                logger.info(
                    'Mensalidade %s criada para %s/%s após pagamento (boleto)',
                    proxima.id,
                    str(proxima.data_vencimento.month).zfill(2),
                    proxima.data_vencimento.year,
                )
    elif status_boleto == 'CANCELLED' and transacao.status != 'cancelado':
        transacao.status = 'cancelado'
        transacao.data_cancelamento = timezone.now()

    transacao.save()
    transacao.refresh_from_db()

    return {'transacao': transacao, 'boleto_data': boleto_data}
