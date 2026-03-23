"""
Envio de notificações push via Expo Push Service (app React Native / Expo).
Documentação: https://docs.expo.dev/push-notifications/sending-notifications/
"""
import logging
from typing import Any

import requests

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
# Lote máximo recomendado pela Expo por requisição
MAX_MESSAGES_PER_REQUEST = 100


def _token_expo_valido(t: str) -> bool:
    s = (t or "").strip()
    return bool(s.startswith("ExponentPushToken") or s.startswith("ExpoPushToken"))


def enviar_lote_expo_push(tokens: list[str], titulo: str, corpo: str) -> dict[str, Any]:
    """
    Envia a mesma notificação para vários tokens Expo.
    Retorna dict com: resultados, erros, tickets_ok (int), tickets_erro (int).
    """
    tokens = [t.strip() for t in tokens if t and _token_expo_valido(str(t))]
    if not tokens:
        return {
            "erros": ["Nenhum token Expo válido no banco (formato esperado: ExponentPushToken[...])."],
            "resultados": [],
            "tickets_ok": 0,
            "tickets_erro": 0,
        }

    titulo = (titulo or "")[:200]
    corpo = (corpo or "")[:2000]

    resultados: list = []
    erros: list[str] = []
    tickets_ok = 0
    tickets_erro = 0

    for i in range(0, len(tokens), MAX_MESSAGES_PER_REQUEST):
        chunk = tokens[i : i + MAX_MESSAGES_PER_REQUEST]
        # Payload mínimo: "priority" inválido já gerou 400 na Expo em alguns ambientes.
        messages = [
            {
                "to": t,
                "title": titulo,
                "body": corpo,
            }
            for t in chunk
        ]
        try:
            r = requests.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
                timeout=90,
            )
            try:
                data = r.json()
            except ValueError:
                snippet = (r.text or "")[:500]
                erros.append(f"Resposta não-JSON da Expo (HTTP {r.status_code}): {snippet}")
                continue

            # Falha global da requisição (campo "errors" no JSON)
            if isinstance(data, dict) and data.get("errors"):
                erros.append(f"Expo API: {data.get('errors')}")
                continue

            if r.status_code != 200:
                erros.append(f"HTTP {r.status_code}: {data}")
                continue

            # Resposta: { "data": [ push tickets ] }
            chunk_results: list
            if isinstance(data, dict) and "data" in data:
                chunk_results = data["data"]
            elif isinstance(data, list):
                chunk_results = data
            else:
                chunk_results = [data]

            resultados.extend(chunk_results)
            for ticket in chunk_results:
                if isinstance(ticket, dict):
                    if ticket.get("status") == "ok":
                        tickets_ok += 1
                    else:
                        tickets_erro += 1
                        msg = ticket.get("message", ticket)
                        erros.append(f"Ticket: {msg}")
                else:
                    tickets_erro += 1
        except requests.RequestException as e:
            logger.exception("Falha ao chamar Expo Push API")
            erros.append(str(e))

    return {
        "resultados": resultados,
        "erros": erros,
        "tickets_ok": tickets_ok,
        "tickets_erro": tickets_erro,
    }
