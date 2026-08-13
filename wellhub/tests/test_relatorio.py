from datetime import date, datetime, time, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from ct.models import CentroDeTreinamento
from turmas.models import DiaSemana, Turma
from usuarios.models import Usuario
from wellhub.models import CadastroWellhub, WellhubBooking, WellhubSlot, WellhubTurmaConfig


class WellhubRelatorioAPITests(TestCase):
    def setUp(self):
        self.gerente = Usuario.objects.create_user(
            username="00000000000",
            password="gerente123",
            tipo="gerente",
            first_name="Gerente",
            last_name="Teste",
            email="gerente@test.com",
            cpf="00000000000",
            is_active=True,
        )
        self.ct = CentroDeTreinamento.objects.create(nome="Praia de Itaipuaçu")
        seg, _ = DiaSemana.objects.get_or_create(nome="Segunda-feira")
        self.turma = Turma.objects.create(
            ct=self.ct, horario=time(8, 0), capacidade_maxima=20, ativo=True
        )
        self.turma.dias_semana.set([seg])
        WellhubTurmaConfig.objects.create(
            turma=self.turma, wellhub_class_id="c8", publicar_wellhub=True
        )
        self.cadastro = CadastroWellhub.objects.create(
            wellhub_user_id="wh-rel",
            first_name="João",
            last_name="Wellhub",
        )
        tz = timezone.get_current_timezone()
        self.data_ago = date(2026, 8, 10)
        occur = timezone.make_aware(datetime.combine(self.data_ago, self.turma.horario), tz)
        self.slot = WellhubSlot.objects.create(
            turma=self.turma,
            data_aula=self.data_ago,
            occur_date=occur,
            wellhub_slot_id="slot-relatorio-1",
            total_capacity=5,
            opens_at=occur - timedelta(days=2),
            closes_at=occur - timedelta(minutes=10),
        )
        self.booking = WellhubBooking.objects.create(
            wellhub_booking_id="b-rel-1",
            slot=self.slot,
            cadastro=self.cadastro,
            status="confirmed",
            presenca_confirmada=True,
            checkin_validado=True,
        )
        slot_jul = WellhubSlot.objects.create(
            turma=self.turma,
            data_aula=date(2026, 7, 6),
            occur_date=occur,
            wellhub_slot_id="slot-relatorio-jul",
            total_capacity=5,
            opens_at=occur - timedelta(days=2),
            closes_at=occur - timedelta(minutes=10),
        )
        WellhubBooking.objects.create(
            wellhub_booking_id="b-rel-jul",
            slot=slot_jul,
            cadastro=self.cadastro,
            status="confirmed",
        )
        self.client = APIClient()

    def test_relatorio_filtra_mes_e_totais(self):
        self.client.force_authenticate(user=self.gerente)
        resp = self.client.get("/api/wellhub/relatorio/", {"mes": 8, "ano": 2026})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["mes"], 8)
        self.assertEqual(resp.data["ano"], 2026)
        self.assertEqual(resp.data["totais"]["reservas"], 1)
        self.assertEqual(resp.data["totais"]["confirmadas"], 1)
        self.assertEqual(resp.data["totais"]["presencas"], 1)
        self.assertEqual(resp.data["totais"]["checkins_validados"], 1)
        self.assertEqual(len(resp.data["reservas"]), 1)
        item = resp.data["reservas"][0]
        self.assertEqual(item["cadastro_nome"], "João Wellhub")
        self.assertEqual(item["presenca_display"], "Presente")
        self.assertTrue(item["checkin_validado"])

    def test_nao_gerente_nao_acessa(self):
        aluno = Usuario.objects.create_user(
            username="11111111111",
            password="x",
            tipo="aluno",
            cpf="11111111111",
            is_active=True,
        )
        self.client.force_authenticate(user=aluno)
        resp = self.client.get("/api/wellhub/relatorio/", {"mes": 8, "ano": 2026})
        self.assertEqual(resp.status_code, 403)
