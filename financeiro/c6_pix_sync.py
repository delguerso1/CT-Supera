"""
Sincronização de cobranças PIX (C6 / BACEN) com TransacaoC6Bank e Mensalidade.
Usado pelo webhook, pelas APIs de consulta de status e por fluxos de reconciliação.
"""
import logging
from typing import Any

from django.utils import timezone

from .c6_client import c6_client
from .models import Mensalidade, TransacaoC6Bank

logger = logging.getLogger(__name__)

# Estados locais para os quais ainda faz sentido consultar GET /cob/{txid}
_STATUS_PIX_CONSULTAVEL = frozenset({"pendente", "expirado", "processando"})


def extrair_lista_pix_webhook(body: Any) -> list:
    """
    Normaliza o body do webhook PIX do C6.

    Documentação (pix-api.yaml): pode vir ``{"pix": [ {...}, ... ]}``;
    também tratamos array na raiz (lista) ou um único objeto Pix.
    """
    if body is None:
        return []
    if isinstance(body, list):
        return body
    if isinstance(body, dict):
        pix = body.get("pix")
        if isinstance(pix, list):
            return pix
        # Objeto único com campos típicos de Pix recebido
        if any(k in body for k in ("txid", "endToEndId", "valor", "horario")):
            return [body]
    return []


def sincronizar_transacao_pix_c6(transacao: TransacaoC6Bank) -> dict | None:
    """
    Consulta a cobrança no C6 e alinha transação e mensalidade (idempotente).

    Consulta antes de marcar expirado localmente; também reconcilia transações
    já marcadas como ``expirado`` se o banco tiver ``CONCLUIDA``.

    Returns:
        Resposta JSON da API de cobrança quando houve consulta bem-sucedida;
        ``None`` se não consultou (sem txid, tipo diferente de pix, já aprovado).
    """
    if transacao.tipo != "pix" or not transacao.txid:
        return None
    if transacao.status not in _STATUS_PIX_CONSULTAVEL:
        return None

    try:
        status_response = c6_client.get_pix_payment_status(transacao.txid)
    except Exception as e:
        logger.warning("Erro ao consultar cobrança PIX no C6 (txid=%s): %s", transacao.txid, e)
        return None

    status_pix = status_response.get("status")

    if status_pix == "CONCLUIDA" and transacao.status != "aprovado":
        transacao.status = "aprovado"
        transacao.data_aprovacao = timezone.now()
        transacao.resposta_api = status_response
        transacao.save()

        mensalidade = transacao.mensalidade
        if mensalidade.status != "pago":
            mensalidade.status = "pago"
            mensalidade.valor_pago = transacao.valor
            mensalidade.save()
            proxima = Mensalidade.criar_proxima_mensalidade(mensalidade)
            if proxima:
                logger.info(
                    "Mensalidade %s criada para %s/%s após pagamento PIX",
                    proxima.id,
                    str(proxima.data_vencimento.month).zfill(2),
                    proxima.data_vencimento.year,
                )
            logger.info(
                "Mensalidade %s marcada como paga após sincronização PIX (transação %s)",
                mensalidade.id,
                transacao.id,
            )

    elif status_pix == "REMOVIDA_PELO_USUARIO_RECEBEDOR":
        transacao.status = "cancelado"
        transacao.data_cancelamento = timezone.now()
        transacao.resposta_api = status_response
        transacao.save()

    else:
        transacao.resposta_api = status_response
        transacao.save(update_fields=["resposta_api"])

    # Só depois da consulta: expirar localmente se o C6 não concluiu a cobrança
    transacao.refresh_from_db()
    if transacao.status == "pendente" and timezone.now() > transacao.data_expiracao:
        transacao.status = "expirado"
        transacao.save(update_fields=["status"])

    return status_response
