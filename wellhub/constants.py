"""Constantes da integração Wellhub (piloto Praia de Itaipuaçu)."""

from datetime import time, timedelta

CT_NOME_PILOTO = "Praia de Itaipuaçu"

HORARIOS_PILOTO = (time(7, 0), time(8, 0), time(19, 0))

DIAS_WELLHUB = ("Segunda-feira", "Quarta-feira")

# Alinhado a alunos.checkin_utils._DIAS_SEMANA_NOMES (weekday() → nome)
DIAS_SEMANA_NOMES = (
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
    "Domingo",
)

COTA_PADRAO = 5
OPENS_BEFORE = timedelta(days=2)
CLOSES_BEFORE = timedelta(minutes=10)
SLOT_LENGTH_MINUTES = 60
SLOT_STATUS_ACTIVE = 1

# Status Wellhub Booking API (PATCH booking)
BOOKING_STATUS_RESERVED = 2
BOOKING_STATUS_REJECTED = 3
BOOKING_STATUS_CANCELLED_BY_GYM = 5

BOOKING_STATUS_REQUESTED = "requested"
BOOKING_STATUS_CONFIRMED = "confirmed"
BOOKING_STATUS_REJECTED_LOCAL = "rejected"
BOOKING_STATUS_CANCELLED = "cancelled"
BOOKING_STATUS_LATE_CANCELLED = "late_cancelled"

WEBHOOK_EVENT_REQUESTED = "booking.requested"
WEBHOOK_EVENT_CANCELATION = "booking.cancelation"
WEBHOOK_EVENT_LATE_CANCELATION = "booking.latecancelation"
WEBHOOK_EVENT_CHECKIN_OCCURRED = "checkin.occurred"
WEBHOOK_EVENT_CHECKIN_BOOKING_OCCURRED = "checkin-booking-occurred"

PRECREATE_NEXT_MONTH_LAST_N_DAYS = 3
