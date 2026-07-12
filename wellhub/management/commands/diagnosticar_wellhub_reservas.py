"""Diagnóstico de reservas Wellhub (webhooks, slots e bookings recentes)."""

from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from wellhub.config_check import format_wellhub_config_hint
from wellhub.models import (
    WellhubBooking,
    WellhubGymConfig,
    WellhubSlot,
    WellhubTurmaConfig,
    WellhubWebhookEvent,
)


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

        env_gym = getattr(settings, "WELLHUB_GYM_ID", "") or ""
        env_product = getattr(settings, "WELLHUB_PRODUCT_ID", 1)
        env_base = getattr(settings, "WELLHUB_API_BASE_URL", "")
        is_prod_api = "api.partners.gympass.com" in str(env_base)
        self.stdout.write("--- Ambiente (.env / settings) ---")
        self.stdout.write(f"  API: {'PRODUÇÃO' if is_prod_api else 'SANDBOX/outro'} ({env_base})")
        self.stdout.write(f"  gym_id={env_gym or 'AUSENTE'}, product_id={env_product}")

        gym_cfg = WellhubGymConfig.objects.select_related("ct").first()
        self.stdout.write("\n--- Banco (WellhubGymConfig) ---")
        if not gym_cfg:
            self.stdout.write(self.style.WARNING("  Nenhuma config no banco."))
            self.stdout.write(
                "  Rode: python manage.py configurar_wellhub_praia "
                "--settings=app.settings_hostinger"
            )
        else:
            self.stdout.write(
                f"  CT={gym_cfg.ct.nome} | gym_id={gym_cfg.gym_id} | "
                f"product_id={gym_cfg.product_id} | ativo={gym_cfg.ativo}"
            )
            if env_gym and str(gym_cfg.gym_id) != str(env_gym):
                self.stdout.write(
                    self.style.ERROR(
                        f"  DIVERGÊNCIA: banco gym_id={gym_cfg.gym_id} ≠ .env gym_id={env_gym}. "
                        "Rode configurar_wellhub_praia."
                    )
                )
            if env_product and gym_cfg.product_id != int(env_product):
                self.stdout.write(
                    self.style.ERROR(
                        f"  DIVERGÊNCIA: banco product_id={gym_cfg.product_id} "
                        f"≠ .env product_id={env_product}. Rode configurar_wellhub_praia."
                    )
                )

        turmas_local = WellhubTurmaConfig.objects.filter(
            wellhub_class_id__startswith="local-class-"
        ).count()
        turmas_sem_id = WellhubTurmaConfig.objects.filter(
            publicar_wellhub=True, wellhub_class_id=""
        ).count()
        if turmas_local or turmas_sem_id:
            self.stdout.write("\n--- Classes (turmas) ---")
            if turmas_local:
                self.stdout.write(
                    self.style.ERROR(
                        f"  {turmas_local} turma(s) com class_id fictício (local-class-*). "
                        "Sincronize com a API de produção via configurar_wellhub_praia."
                    )
                )
            if turmas_sem_id:
                self.stdout.write(
                    self.style.WARNING(
                        f"  {turmas_sem_id} turma(s) publicadas sem wellhub_class_id."
                    )
                )
        else:
            configs = WellhubTurmaConfig.objects.filter(publicar_wellhub=True)
            if configs.exists():
                self.stdout.write("\n--- Classes (turmas) ---")
                for cfg in configs.select_related("turma"):
                    self.stdout.write(
                        f"  Turma {cfg.turma.horario}: class_id={cfg.wellhub_class_id or '—'}"
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
        slots_ok = WellhubSlot.objects.filter(sync_status=WellhubSlot.SYNC_OK).count()
        slots_pending = WellhubSlot.objects.filter(sync_status=WellhubSlot.SYNC_PENDING).count()
        slots_erro = WellhubSlot.objects.filter(sync_status=WellhubSlot.SYNC_ERROR).count()
        agora = timezone.now()
        slots_futuros_sem_id = WellhubSlot.objects.filter(
            wellhub_slot_id="",
            occur_date__gt=agora,
        ).count()
        self.stdout.write("\n--- Slots ---")
        self.stdout.write(f"  sync_status=ok: {slots_ok}")
        self.stdout.write(f"  sync_status=pending (janela ainda não abriu): {slots_pending}")
        self.stdout.write(f"  sync_status=error: {slots_erro}")
        self.stdout.write(f"  Sem wellhub_slot_id: {slots_sem_id} (futuros: {slots_futuros_sem_id})")
        if slots_pending and not slots_erro:
            self.stdout.write(
                "  Slots pending: vínculo com a Wellhub ainda incompleto — rode a sync."
            )
        proximos = (
            WellhubSlot.objects.filter(occur_date__gt=agora)
            .select_related("turma")
            .order_by("occur_date")[:5]
        )
        if proximos:
            self.stdout.write("  Próximos slots futuros:")
            for s in proximos:
                abre = timezone.localtime(s.opens_at).strftime("%d/%m %H:%M")
                self.stdout.write(
                    f"    {s.data_aula} {s.turma.horario} | "
                    f"sync={s.sync_status} | id={s.wellhub_slot_id or '—'} | abre {abre}"
                )

        booking_events = WellhubWebhookEvent.objects.filter(
            event_type__icontains="booking"
        )
        e2e_count = 0
        real_booking_events = 0
        for ev in booking_events.only("payload"):
            if "BK_E2E_" in str(ev.payload):
                e2e_count += 1
            else:
                real_booking_events += 1
        self.stdout.write("\n--- Reservas reais vs teste ---")
        self.stdout.write(f"  Webhooks booking de teste (BK_E2E_*): {e2e_count}")
        self.stdout.write(f"  Webhooks booking reais (app Wellhub): {real_booking_events}")
        if real_booking_events == 0:
            self.stdout.write(
                self.style.WARNING(
                    "  Nenhuma reserva real recebida ainda. Faça teste no app e rode este "
                    "comando de novo em seguida."
                )
            )

        if slots_sem_id or slots_erro:
            self.stdout.write(
                self.style.WARNING(
                    "  Rode: python manage.py sincronizar_wellhub_slots "
                    "--settings=app.settings_hostinger"
                )
            )
        if not is_prod_api and env_gym and str(env_gym) not in ("438", ""):
            self.stdout.write(
                self.style.WARNING(
                    "  gym_id de produção no .env, mas API aponta para sandbox — "
                    "confira WELLHUB_API_BASE_URL."
                )
            )
        elif is_prod_api and str(env_gym) == "438":
            self.stdout.write(
                self.style.WARNING(
                    "  API de produção, mas gym_id=438 (sandbox). Confira WELLHUB_GYM_ID."
                )
            )
