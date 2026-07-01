"""Diagnóstico de reservas Wellhub (webhooks, slots e bookings recentes)."""

from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand

from wellhub.config_check import format_wellhub_config_hint
from wellhub.models import WellhubBooking, WellhubSlot, WellhubWebhookEvent


class Command(BaseCommand):
    help = "Lista webhooks recentes, reservas e slots para diagnosticar agendamentos Wellhub."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=10,
            help="Quantidade de registros recentes a exibir (padrão: 10).",
        )

    def handle(self, *args, **options):
        limit = max(1, options["limit"])
        secret = getattr(settings, "WELLHUB_WEBHOOK_SECRET", "") or ""
        self.stdout.write("=== Diagnóstico Wellhub — reservas ===\n")
        self.stdout.write(format_wellhub_config_hint())
        self.stdout.write(
            f"\n  WELLHUB_WEBHOOK_SECRET: {'ok' if secret else 'AUSENTE'} "
            f"({len(secret)} caracteres)"
        )
        self.stdout.write(
            "  Webhook URL esperada: https://ctsupera.com.br/api/wellhub/webhook/\n"
        )

        events = WellhubWebhookEvent.objects.order_by("-criado_em")[:limit]
        self.stdout.write(f"--- Últimos {limit} eventos webhook ---")
        if not events:
            self.stdout.write(self.style.WARNING("  Nenhum evento recebido ainda."))
            self.stdout.write(
                "  Se você fez reserva no app, confira URL + secret no portal Wellhub."
            )
        for ev in events:
            if ev.processed and not ev.error_message:
                label = self.style.SUCCESS("OK")
            elif ev.error_message:
                label = self.style.ERROR(f"ERRO: {ev.error_message[:120]}")
            else:
                label = self.style.WARNING("pendente")
            self.stdout.write(
                f"  [{ev.criado_em:%Y-%m-%d %H:%M}] {ev.event_type or '?'} "
                f"processed={ev.processed} — {label}"
            )

        bookings = WellhubBooking.objects.select_related(
            "slot", "slot__turma", "cadastro"
        ).order_by("-criado_em")[:limit]
        self.stdout.write(f"\n--- Últimas {limit} reservas ---")
        if not bookings:
            self.stdout.write(self.style.WARNING("  Nenhuma reserva Wellhub no banco."))
        for bk in bookings:
            nome = str(bk.cadastro) if bk.cadastro else "(sem cadastro)"
            self.stdout.write(
                f"  {bk.wellhub_booking_id} | {bk.status} | "
                f"{bk.slot.data_aula} {bk.slot.turma.horario} | {nome}"
            )

        slots_sem_id = WellhubSlot.objects.filter(wellhub_slot_id="").count()
        slots_erro = WellhubSlot.objects.exclude(sync_status="ok").count()
        self.stdout.write("\n--- Slots ---")
        self.stdout.write(f"  Sem wellhub_slot_id: {slots_sem_id}")
        self.stdout.write(f"  Com sync_status != ok: {slots_erro}")
        if slots_sem_id:
            self.stdout.write(
                self.style.WARNING(
                    "  Rode: python manage.py sincronizar_wellhub_slots "
                    "--settings=app.settings_hostinger"
                )
            )
