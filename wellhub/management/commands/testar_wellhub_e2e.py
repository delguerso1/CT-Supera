"""
Teste ponta a ponta Wellhub (sandbox):
1. Garante CT/turmas piloto no banco local
2. Sincroniza classes/slots na API (se configurada)
3. Simula webhook booking.requested (formato Wellhub)
4. Simula cancelamento
"""

from __future__ import annotations

import hashlib
import hmac
import json
from datetime import time, timedelta

from django.core.management.base import BaseCommand
from django.test import RequestFactory
from django.utils import timezone

from ct.models import CentroDeTreinamento
from turmas.models import DiaSemana, Turma
from wellhub.constants import CT_NOME_PILOTO, HORARIOS_PILOTO
from wellhub.models import CadastroWellhub, WellhubBooking, WellhubSlot, WellhubTurmaConfig
from wellhub.services.sync_slots import sync_all_published_slots, upsert_local_slot
from wellhub.views import WellhubWebhookAPIView


class Command(BaseCommand):
    help = "Executa teste E2E Wellhub: seed piloto, sync API, webhooks simulados."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-api",
            action="store_true",
            help="Não chama API Wellhub (só seed + webhooks locais).",
        )

    def handle(self, *args, **options):
        skip_api = options["skip_api"]
        self.stdout.write("=== E2E Wellhub CT Supera ===\n")

        self._seed_piloto()
        if not skip_api:
            from wellhub.client import WellhubClient
            from wellhub.services.sync_classes import ensure_gym_config, setup_piloto_classes

            client = WellhubClient()
            if not client.configured:
                self.stdout.write(self.style.WARNING("API não configurada; usando --skip-api."))
                skip_api = True
            else:
                try:
                    from django.conf import settings

                    ensure_gym_config(int(settings.WELLHUB_GYM_ID), settings.WELLHUB_PRODUCT_ID)
                    configs = setup_piloto_classes(client=client, call_api=True)
                    for cfg in configs:
                        self.stdout.write(
                            f"Class turma {cfg.turma.horario}: id={cfg.wellhub_class_id or '?'}"
                        )
                    stats = sync_all_published_slots(client=client, call_api=True)
                    self.stdout.write(self.style.SUCCESS(f"Sync API: {stats}"))
                except Exception as exc:
                    msg = str(exc).encode("ascii", "replace").decode("ascii")
                    self.stdout.write(self.style.ERROR(f"Sync API falhou: {msg}"))
                    self.stdout.write("Continuando com slots locais...")
                    skip_api = True

        if skip_api:
            from wellhub.services.sync_classes import ensure_gym_config, setup_piloto_classes

            from django.conf import settings

            ensure_gym_config(int(settings.WELLHUB_GYM_ID or 438), 1)
            setup_piloto_classes(call_api=False)
            for tc in WellhubTurmaConfig.objects.filter(publicar_wellhub=True):
                if not tc.wellhub_class_id:
                    tc.wellhub_class_id = f"local-class-{tc.turma_id}"
                    tc.save(update_fields=["wellhub_class_id"])
            agora = timezone.localdate()
            for tc in WellhubTurmaConfig.objects.filter(publicar_wellhub=True):
                d = agora
                while d.weekday() != 0:
                    d += timedelta(days=1)
                slot = upsert_local_slot(tc, d)
                if not slot.wellhub_slot_id:
                    slot.wellhub_slot_id = f"local-slot-{slot.pk}"
                    slot.sync_status = WellhubSlot.SYNC_OK
                    slot.save(update_fields=["wellhub_slot_id", "sync_status"])
            self.stdout.write(self.style.WARNING("Modo local: slots fictícios criados."))

        slot = (
            WellhubSlot.objects.filter(turma__ct__nome=CT_NOME_PILOTO)
            .order_by("occur_date")
            .first()
        )
        if not slot:
            raise SystemExit("Nenhum slot disponível para teste.")

        # Garantir janela aberta para o teste local
        agora = timezone.now()
        if agora < slot.opens_at or agora > slot.closes_at:
            slot.opens_at = agora - timedelta(hours=1)
            slot.closes_at = agora + timedelta(days=1)
            slot.save(update_fields=["opens_at", "closes_at"])
            self.stdout.write(self.style.WARNING("Janela de reserva ajustada para o teste."))

        self.stdout.write(
            f"Slot teste: id={slot.pk} wellhub_slot_id={slot.wellhub_slot_id} data={slot.data_aula}"
        )

        run_id = timezone.now().strftime("%Y%m%d%H%M%S")
        booking_number = f"BK_E2E_{run_id}"
        secret = __import__("django.conf", fromlist=["settings"]).settings.WELLHUB_WEBHOOK_SECRET

        requested_payload = {
            "event_type": "booking.requested",
            "event_id": f"e2e-event-requested-{run_id}",
            "event_data": {
                "user": {
                    "unique_token": "1000000000003",
                    "name": "Patty Cork",
                    "email": "patty@mail.com",
                    "phone_number": "+5521999998888",
                },
                "slot": {
                    "id": int(slot.wellhub_slot_id) if str(slot.wellhub_slot_id).isdigit() else slot.wellhub_slot_id,
                    "gym_id": 438,
                    "class_id": slot.turma.wellhub_config.wellhub_class_id,
                    "booking_number": booking_number,
                },
                "event_id": f"e2e-event-requested-{run_id}",
            },
        }

        client = RequestFactory()
        view = WellhubWebhookAPIView.as_view()
        body = json.dumps(requested_payload).encode("utf-8")
        sig = hmac.new(secret.encode("utf-8"), body, hashlib.sha1).hexdigest()
        req = client.post(
            "/api/wellhub/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_GYMPASS_SIGNATURE=sig,
        )
        resp = view(req)
        self.stdout.write(f"Webhook requested: HTTP {resp.status_code} {resp.content.decode()[:300]}")

        booking = WellhubBooking.objects.filter(wellhub_booking_id=booking_number).first()
        cadastro = CadastroWellhub.objects.filter(wellhub_user_id="1000000000003").first()
        self.stdout.write(f"Booking: {booking.status if booking else 'N/A'}")
        self.stdout.write(f"Cadastro: {cadastro}")

        if not booking or booking.status != "confirmed":
            self.stdout.write(self.style.ERROR("FALHA: booking não confirmado."))
        else:
            self.stdout.write(self.style.SUCCESS("OK: booking confirmado + cadastro Wellhub."))

        cancel_payload = {
            "event_type": "booking.cancelation",
            "event_id": f"e2e-event-cancel-{run_id}",
            "event_data": {
                "user": {
                    "unique_token": "1000000000003",
                    "name": "Patty Cork",
                    "email": "patty@mail.com",
                },
                "slot": {
                    "id": slot.wellhub_slot_id,
                    "booking_number": booking_number,
                },
                "event_id": f"e2e-event-cancel-{run_id}",
            },
        }
        body2 = json.dumps(cancel_payload).encode("utf-8")
        sig2 = hmac.new(secret.encode("utf-8"), body2, hashlib.sha1).hexdigest()
        req2 = client.post(
            "/api/wellhub/webhook/",
            data=body2,
            content_type="application/json",
            HTTP_X_GYMPASS_SIGNATURE=sig2,
        )
        resp2 = view(req2)
        self.stdout.write(f"Webhook cancel: HTTP {resp2.status_code} {resp2.content.decode()[:200]}")
        if booking:
            booking.refresh_from_db()
            self.stdout.write(f"Booking após cancel: {booking.status}")
            if booking.status in ("cancelled", "late_cancelled"):
                self.stdout.write(self.style.SUCCESS("OK: cancelamento processado."))
            else:
                self.stdout.write(self.style.WARNING(f"Cancel status inesperado: {booking.status}"))
        else:
            self.stdout.write(self.style.WARNING("Cancel ignorado: booking não existia."))

    def _seed_piloto(self):
        ct, _ = CentroDeTreinamento.objects.get_or_create(nome=CT_NOME_PILOTO)
        dias = {}
        for nome in ("Segunda-feira", "Quarta-feira", "Sexta-feira"):
            dias[nome], _ = DiaSemana.objects.get_or_create(nome=nome)
        for horario in HORARIOS_PILOTO:
            turma, created = Turma.objects.get_or_create(
                ct=ct,
                horario=horario,
                defaults={"capacidade_maxima": 20, "ativo": True},
            )
            if not created and not turma.ativo:
                turma.ativo = True
                turma.save(update_fields=["ativo"])
            turma.dias_semana.set([dias[n] for n in ("Segunda-feira", "Quarta-feira", "Sexta-feira")])
            self.stdout.write(f"Turma {horario}: id={turma.id} {'(criada)' if created else ''}")
