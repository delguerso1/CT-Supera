from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from app.date_api import format_data_api
from financeiro.models import Mensalidade

MENSAGEM_PAGAR_ATRASADA_PRIMEIRO = (
    "Você possui mensalidade atrasada. Pague primeiro a parcela atrasada "
    "e, em seguida, a pendente."
)


def mensalidade_atrasada_prioritaria(user):
    """Parcela atrasada mais antiga do aluno, se existir."""
    if getattr(user, "tipo", None) != "aluno":
        return None
    hoje = timezone.localdate()
    return (
        Mensalidade.objects.filter(aluno_id=user.pk)
        .exclude(status="pago")
        .filter(data_vencimento__lt=hoje)
        .order_by("data_vencimento", "id")
        .first()
    )


def pagamento_bloqueado_por_atrasada(user, mensalidade) -> bool:
    """
    Aluno não paga parcela pendente (ainda não vencida) se houver outra atrasada.
    Gerente/professor não são bloqueados.
    """
    if getattr(user, "tipo", None) != "aluno" or mensalidade is None:
        return False
    if mensalidade.status == "pago":
        return False
    hoje = timezone.localdate()
    if mensalidade.data_vencimento and hoje > mensalidade.data_vencimento:
        return False
    return mensalidade_atrasada_prioritaria(user) is not None


def resposta_pagamento_fora_de_ordem(user, mensalidade):
    """Response 400 para orientar a ordem, ou None se o pagamento pode seguir."""
    if not pagamento_bloqueado_por_atrasada(user, mensalidade):
        return None
    atrasada = mensalidade_atrasada_prioritaria(user)
    venc = ""
    venc_api = None
    if atrasada and atrasada.data_vencimento:
        venc = atrasada.data_vencimento.strftime("%d/%m/%Y")
        venc_api = format_data_api(atrasada.data_vencimento)
    return Response(
        {
            "error": (
                f"Você possui mensalidade atrasada (vencimento {venc}). "
                "Pague primeiro a parcela atrasada e, em seguida, a pendente."
            ),
            "codigo": "pagar_atrasada_primeiro",
            "mensalidade_atrasada_id": atrasada.pk if atrasada else None,
            "mensalidade_atrasada_vencimento": venc_api,
        },
        status=status.HTTP_400_BAD_REQUEST,
    )
