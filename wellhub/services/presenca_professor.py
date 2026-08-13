"""Integração Wellhub na lista de presença do professor."""

from __future__ import annotations

from datetime import date

from turmas.models import Turma
from wellhub.models import WellhubBooking

BOOKING_STATUS_CONFIRMED = "confirmed"
NOME_PLACEHOLDER_WELLHUB = "Wellhub"


def nome_exibicao_wellhub(booking: WellhubBooking) -> str:
    """Rótulo identificável do cliente Wellhub para a lista de presença.

    Quando a Wellhub não envia o nome real do membro, o cadastro fica como
    "Wellhub" e todas as reservas apareceriam idênticas. Neste caso montamos um
    rótulo com e-mail (se houver) e um sufixo do booking, para o professor
    conseguir distinguir cada cliente do dia.
    """
    cadastro = booking.cadastro
    first = (cadastro.first_name or "").strip() if cadastro else ""
    last = (cadastro.last_name or "").strip() if cadastro else ""
    nome = f"{first} {last}".strip()
    if nome and nome.lower() != NOME_PLACEHOLDER_WELLHUB.lower():
        return nome

    partes = ["Cliente Wellhub"]
    email = (cadastro.email or "").strip() if cadastro else ""
    if email:
        partes.append(email)
    sufixo = (booking.wellhub_booking_id or str(booking.id or "")).strip()
    if sufixo:
        partes.append(f"#{sufixo[-4:]}")
    return " · ".join(partes)


def wellhub_bookings_presenca_turma(turma: Turma, data_aula: date):
    """Reservas confirmadas Wellhub para a turma na data da aula."""
    return (
        WellhubBooking.objects.filter(
            slot__turma=turma,
            slot__data_aula=data_aula,
            status=BOOKING_STATUS_CONFIRMED,
            cadastro__isnull=False,
        )
        .select_related("cadastro", "slot")
        .order_by("cadastro__first_name", "cadastro__last_name", "id")
    )
