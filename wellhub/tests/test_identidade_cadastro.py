"""Testes de identificação de clientes Wellhub na lista de presença.

Cobre o cenário em que a Wellhub não envia o nome real do membro na reserva
(o cadastro fica como "Wellhub") e a correção que:
  1. enriquece o nome quando ele chega no check-in / Access Validate;
  2. nunca sobrescreve um nome real pelo placeholder;
  3. gera um rótulo identificável quando não há nome real.
"""

from datetime import datetime, time, timedelta

from django.test import TestCase
from django.utils import timezone

from ct.models import CentroDeTreinamento
from turmas.models import DiaSemana, Turma
from wellhub.models import CadastroWellhub, WellhubBooking, WellhubSlot
from wellhub.services.bookings import enrich_cadastro_identity, get_or_create_cadastro
from wellhub.services.checkins import _merge_validate_identity
from wellhub.services.presenca_professor import nome_exibicao_wellhub


class EnriquecerCadastroTests(TestCase):
    def test_placeholder_nao_sobrescreve_nome_real(self):
        cadastro = CadastroWellhub.objects.create(
            wellhub_user_id="u1", first_name="Ana", last_name="Silva"
        )
        # Webhook posterior sem nome -> extract_user_data devolve o placeholder.
        get_or_create_cadastro({"wellhub_user_id": "u1", "first_name": "Wellhub", "last_name": ""})
        cadastro.refresh_from_db()
        self.assertEqual(cadastro.first_name, "Ana")
        self.assertEqual(cadastro.last_name, "Silva")

    def test_nome_real_substitui_placeholder(self):
        cadastro = CadastroWellhub.objects.create(
            wellhub_user_id="u2", first_name="Wellhub", last_name=""
        )
        changed = enrich_cadastro_identity(
            cadastro, {"first_name": "Bruno", "last_name": "Costa", "email": "b@x.com"}
        )
        cadastro.refresh_from_db()
        self.assertTrue(changed)
        self.assertEqual(cadastro.first_name, "Bruno")
        self.assertEqual(cadastro.last_name, "Costa")
        self.assertEqual(cadastro.email, "b@x.com")

    def test_merge_validate_identity_preenche_nome(self):
        user_data = {"first_name": "Wellhub", "last_name": "", "email": ""}
        validate_response = {
            "results": {"user": {"name": "Patty Cork", "email": "patty@x.com"}}
        }
        _merge_validate_identity(user_data, validate_response)
        self.assertEqual(user_data["first_name"], "Patty")
        self.assertEqual(user_data["last_name"], "Cork")
        self.assertEqual(user_data["email"], "patty@x.com")

    def test_merge_validate_identity_nao_apaga_nome_existente(self):
        user_data = {"first_name": "Carla", "last_name": "Dias", "email": "c@x.com"}
        _merge_validate_identity(user_data, {"results": {"user": {"name": "Outro Nome"}}})
        self.assertEqual(user_data["first_name"], "Carla")
        self.assertEqual(user_data["last_name"], "Dias")


class RotuloExibicaoWellhubTests(TestCase):
    def setUp(self):
        self.ct = CentroDeTreinamento.objects.create(nome="CT Rótulo")
        seg, _ = DiaSemana.objects.get_or_create(nome="Segunda-feira")
        self.turma = Turma.objects.create(
            ct=self.ct, horario=time(8, 0), capacidade_maxima=20, ativo=True
        )
        self.turma.dias_semana.set([seg])
        hoje = timezone.localdate()
        tz = timezone.get_current_timezone()
        occur = timezone.make_aware(datetime.combine(hoje, self.turma.horario), tz)
        self.slot = WellhubSlot.objects.create(
            turma=self.turma,
            data_aula=hoje,
            occur_date=occur,
            total_capacity=5,
            opens_at=occur - timedelta(days=1),
            closes_at=occur,
        )

    def _booking(self, wellhub_booking_id, cadastro):
        return WellhubBooking.objects.create(
            wellhub_booking_id=wellhub_booking_id,
            slot=self.slot,
            cadastro=cadastro,
            status="confirmed",
        )

    def test_usa_nome_real_quando_existe(self):
        cad = CadastroWellhub.objects.create(first_name="Marta", last_name="Reis")
        booking = self._booking("BK-1", cad)
        self.assertEqual(nome_exibicao_wellhub(booking), "Marta Reis")

    def test_fallback_com_email_e_sufixo(self):
        cad = CadastroWellhub.objects.create(first_name="Wellhub", last_name="", email="x@y.com")
        booking = self._booking("BK-ABCDEFG7788", cad)
        rotulo = nome_exibicao_wellhub(booking)
        self.assertIn("Cliente Wellhub", rotulo)
        self.assertIn("x@y.com", rotulo)
        self.assertIn("#7788", rotulo)

    def test_fallback_distingue_clientes_sem_nome(self):
        cad1 = CadastroWellhub.objects.create(first_name="Wellhub", last_name="")
        cad2 = CadastroWellhub.objects.create(first_name="Wellhub", last_name="")
        r1 = nome_exibicao_wellhub(self._booking("BK-0001", cad1))
        r2 = nome_exibicao_wellhub(self._booking("BK-0002", cad2))
        self.assertNotEqual(r1, r2)
