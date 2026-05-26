"""Integração Wellhub na lista de presença do professor."""

from __future__ import annotations

from datetime import date

from turmas.models import Turma
from wellhub.models import WellhubBooking

BOOKING_STATUS_CONFIRMED = "confirmed"


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
