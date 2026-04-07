"""
Sincronização de checkout C6 Bank (cartão) com TransacaoC6Bank e Mensalidade.
Usado pela API de consulta, webhook de CHECKOUT e comando de cron.
"""
import logging

from django.utils import timezone

from .models import Mensalidade, TransacaoC6Bank
from .c6_client import c6_client

logger = logging.getLogger(__name__)


def sincronizar_transacao_checkout_c6(transacao: TransacaoC6Bank) -> dict:
    """
    Consulta o status no C6 e atualiza transação e mensalidade (idempotente).

    Returns:
        dict com keys: transacao (objeto atualizado), checkout_data (dict da API C6).
    """
    if not transacao.txid:
        raise ValueError('Transação de checkout sem ID (txid) do C6.')

    checkout_data = c6_client.get_checkout(transacao.txid)
    status_checkout = str(checkout_data.get('status', '') or '').upper().strip()

    transacao.resposta_api = checkout_data
    if checkout_data.get('url'):
        transacao.payment_url = checkout_data.get('url')

    if status_checkout in ('PAID', 'APPROVED', 'AUTHORIZED', 'CONFIRMED', 'SUCCEEDED'):
        if transacao.status != 'aprovado':
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
                    "Mensalidade %s criada para %s/%s após pagamento (checkout)",
                    proxima.id,
                    str(proxima.data_vencimento.month).zfill(2),
                    proxima.data_vencimento.year,
                )
    elif status_checkout in ('CANCELLED', 'CANCELED'):
        transacao.status = 'cancelado'
        transacao.data_cancelamento = timezone.now()
    elif status_checkout in ('EXPIRED',):
        transacao.status = 'expirado'
    elif status_checkout in ('DECLINED', 'ERROR'):
        transacao.status = 'rejeitado'
        transacao.data_cancelamento = timezone.now()

    transacao.save()
    transacao.refresh_from_db()

    return {'transacao': transacao, 'checkout_data': checkout_data}
