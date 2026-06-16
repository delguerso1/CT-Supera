import hashlib
import hmac
from datetime import date, time, timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone

from ct.models import CentroDeTreinamento
from turmas.models import DiaSemana, Turma
from wellhub.models import CadastroWellhub, WellhubBooking, WellhubSlot, WellhubTurmaConfig
from wellhub.services.bookings import handle_booking_requested
from wellhub.webhooks import verify_gympass_signature


@override_settings(WELLHUB_WEBHOOK_SECRET="test-secret")
class SignatureTests(TestCase):
    def test_assinatura_valida(self):
        body = b'{"event":"booking.requested"}'
        sig = hmac.new(b"test-secret", body, hashlib.sha1).hexdigest()
        self.assertTrue(verify_gympass_signature(body, sig))

    def test_assinatura_valida_maiusculas(self):
        body = b'{"event":"booking.requested"}'
        sig = hmac.new(b"test-secret", body, hashlib.sha1).hexdigest().upper()
        self.assertTrue(verify_gympass_signature(body, sig))

    def test_assinatura_invalida(self):
        body = b'{"event":"booking.requested"}'
        self.assertFalse(verify_gympass_signature(body, "invalid"))


class BookingRequestedTests(TestCase):
    def setUp(self):
        self.ct = CentroDeTreinamento.objects.create(nome="Praia de Itaipuaçu")
        seg, _ = DiaSemana.objects.get_or_create(nome="Segunda-feira")
        self.turma = Turma.objects.create(
            ct=self.ct,
            horario=time(19, 0),
            capacidade_maxima=20,
            ativo=True,
        )
        self.turma.dias_semana.set([seg])
        self.turma_config = WellhubTurmaConfig.objects.create(
            turma=self.turma,
            wellhub_class_id="class-1",
            publicar_wellhub=True,
            cota_wellhub=5,
        )
        tz = timezone.get_current_timezone()
        agora = timezone.now()
        data_aula = (agora + timedelta(days=3)).date()
        # Garantir segunda
        while data_aula.weekday() != 0:
            data_aula += timedelta(days=1)
        occur = timezone.make_aware(
            timezone.datetime.combine(data_aula, time(19, 0)),
            tz,
        )
        self.slot = WellhubSlot.objects.create(
            turma=self.turma,
            data_aula=data_aula,
            occur_date=occur,
            wellhub_slot_id="slot-99",
            total_capacity=5,
            total_booked=0,
            opens_at=occur - timedelta(days=2),
            closes_at=occur - timedelta(minutes=10),
        )

    @patch("wellhub.services.bookings.WellhubClient")
    def test_confirma_dentro_da_cota(self, mock_client_cls):
        mock_client_cls.return_value.configured = False
        with patch(
            "wellhub.services.sync_slots.timezone.now",
            return_value=self.slot.opens_at + timedelta(hours=1),
        ):
            payload = {
                "event": "booking.requested",
                "booking_number": "bk-1",
                "slot_id": "slot-99",
                "user": {
                    "first_name": "Ana",
                    "last_name": "Silva",
                    "email": "ana@test.com",
                    "phone": "21999998888",
                    "gpw-id": "gpw-abc",
                },
            }
            action, _ = handle_booking_requested(payload)
        self.assertEqual(action, "confirmed")
        self.assertTrue(CadastroWellhub.objects.filter(wellhub_user_id="gpw-abc").exists())
        booking = WellhubBooking.objects.get(wellhub_booking_id="bk-1")
        self.assertEqual(booking.status, "confirmed")

    @patch("wellhub.services.bookings.WellhubClient")
    def test_rejeita_sexta(self, mock_client_cls):
        mock_client_cls.return_value.configured = False
        tz = timezone.get_current_timezone()
        data_sex = date(2030, 6, 7)  # sexta
        occur = timezone.make_aware(
            timezone.datetime.combine(data_sex, time(19, 0)),
            tz,
        )
        slot_sex = WellhubSlot.objects.create(
            turma=self.turma,
            data_aula=data_sex,
            occur_date=occur,
            wellhub_slot_id="slot-sex",
            total_capacity=5,
            total_booked=0,
            opens_at=occur - timedelta(days=2),
            closes_at=occur - timedelta(minutes=10),
        )
        with patch(
            "wellhub.services.sync_slots.timezone.now",
            return_value=occur - timedelta(hours=1),
        ):
            payload = {
                "event": "booking.requested",
                "booking_number": "bk-sex",
                "slot_id": "slot-sex",
                "user": {"first_name": "João", "email": "j@test.com"},
            }
            action, motivo = handle_booking_requested(payload)
        self.assertEqual(action, "rejected")
        self.assertIn("Wellhub", motivo)

    @patch("wellhub.services.bookings.WellhubClient")
    def test_rejeita_sexta_cota(self, mock_client_cls):
        mock_client_cls.return_value.configured = False
        for i in range(5):
            WellhubBooking.objects.create(
                wellhub_booking_id=f"bk-full-{i}",
                slot=self.slot,
                status="confirmed",
            )
        with patch(
            "wellhub.services.sync_slots.timezone.now",
            return_value=self.slot.opens_at + timedelta(hours=1),
        ):
            payload = {
                "event": "booking.requested",
                "booking_number": "bk-6",
                "slot_id": "slot-99",
                "user": {"first_name": "Extra", "email": "x@test.com"},
            }
            action, _ = handle_booking_requested(payload)
        self.assertEqual(action, "rejected")
