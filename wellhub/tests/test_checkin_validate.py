import json
from datetime import time, timedelta
from unittest.mock import MagicMock, patch

from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone

from ct.models import CentroDeTreinamento
from turmas.models import DiaSemana, Turma
from wellhub.models import CadastroWellhub, WellhubBooking, WellhubSlot, WellhubTurmaConfig
from wellhub.services.checkins import handle_checkin_occurred
from wellhub.views import WellhubWebhookAPIView
from wellhub.webhooks import extract_gympass_id, is_checkin_event


@override_settings(
    WELLHUB_WEBHOOK_SECRET="test-secret",
    WELLHUB_API_KEY="test-key",
    WELLHUB_GYM_ID=438,
)
class WellhubCheckinValidateTests(TestCase):
    def setUp(self):
        ct = CentroDeTreinamento.objects.create(nome="CT Teste")
        seg, _ = DiaSemana.objects.get_or_create(nome="Segunda-feira")
        self.turma = Turma.objects.create(
            ct=ct,
            horario=time(7, 0),
            capacidade_maxima=20,
            ativo=True,
        )
        self.turma.dias_semana.add(seg)
        WellhubTurmaConfig.objects.create(
            turma=self.turma,
            wellhub_class_id="class-checkin",
            publicar_wellhub=True,
        )
        self.hoje = timezone.localdate()
        agora = timezone.now()
        self.slot = WellhubSlot.objects.create(
            turma=self.turma,
            data_aula=self.hoje,
            occur_date=agora,
            wellhub_slot_id="slot-checkin-1",
            total_capacity=5,
            opens_at=agora - timedelta(hours=1),
            closes_at=agora + timedelta(hours=2),
        )
        self.cadastro = CadastroWellhub.objects.create(
            wellhub_user_id="1000000000003",
            first_name="Patty",
            last_name="Cork",
            email="patty@test.com",
        )
        self.booking = WellhubBooking.objects.create(
            wellhub_booking_id="BK_CHECKIN_1",
            slot=self.slot,
            cadastro=self.cadastro,
            status="confirmed",
        )

    def test_is_checkin_event(self):
        self.assertTrue(is_checkin_event("checkin.occurred"))
        self.assertTrue(is_checkin_event("checkin-booking-occurred"))
        self.assertFalse(is_checkin_event("booking.requested"))

    def test_extract_gympass_id(self):
        payload = {
            "event_data": {
                "gympass_user_id": "1000000000003",
                "slot": {"booking_number": "BK_CHECKIN_1"},
            }
        }
        self.assertEqual(extract_gympass_id(payload), "1000000000003")

    @patch("wellhub.services.checkins.WellhubClient")
    def test_handle_checkin_occurred_calls_validate(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client.configured = True
        mock_client.gym_id = 438
        mock_client.validate_access.return_value = {
            "metadata": {"total": 1, "errors": 0},
            "results": {"user": {"gympass_id": "1000000000003"}},
        }
        mock_client_cls.return_value = mock_client

        payload = {
            "event_type": "checkin-booking-occurred",
            "event_data": {
                "gympass_user_id": "1000000000003",
                "gym_id": 438,
                "slot": {
                    "id": self.slot.wellhub_slot_id,
                    "booking_number": "BK_CHECKIN_1",
                },
                "user": {
                    "unique_token": "1000000000003",
                    "name": "Patty Cork",
                    "email": "patty@test.com",
                },
            },
        }

        action, detail = handle_checkin_occurred(payload)
        self.assertEqual(action, "validated")
        self.assertEqual(detail, "1000000000003")
        mock_client.validate_access.assert_called_once_with("1000000000003", gym_id=438)

        self.booking.refresh_from_db()
        self.assertTrue(self.booking.checkin_validado)
        self.assertIsNotNone(self.booking.checkin_validado_em)
        self.assertEqual(
            self.booking.checkin_validate_response["results"]["user"]["gympass_id"],
            "1000000000003",
        )

    @patch("wellhub.views.handle_checkin_occurred")
    def test_webhook_dispatches_checkin_event(self, mock_handler):
        mock_handler.return_value = ("validated", "1000000000003")
        payload = {
            "event_type": "checkin.occurred",
            "event_id": "evt-checkin-1",
            "event_data": {
                "gympass_user_id": "1000000000003",
                "gym_id": 438,
            },
        }
        import hashlib
        import hmac

        body = json.dumps(payload).encode("utf-8")
        sig = hmac.new(b"test-secret", body, hashlib.sha1).hexdigest()
        req = RequestFactory().post(
            "/api/wellhub/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_GYMPASS_SIGNATURE=sig,
        )
        resp = WellhubWebhookAPIView.as_view()(req)
        self.assertEqual(resp.status_code, 200)
        mock_handler.assert_called_once()
        data = json.loads(resp.content)
        self.assertEqual(data["result"]["handler"], "checkin")
