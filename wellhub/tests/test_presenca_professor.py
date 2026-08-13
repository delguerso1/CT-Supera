from datetime import datetime, time, timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from ct.models import CentroDeTreinamento
from turmas.models import DiaSemana, Turma
from usuarios.models import Usuario
from wellhub.models import CadastroWellhub, WellhubBooking, WellhubSlot, WellhubTurmaConfig
from wellhub.services.presenca_professor import wellhub_bookings_presenca_turma


class WellhubPresencaProfessorTests(TestCase):
    def setUp(self):
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
            wellhub_user_id="wh-u1",
            first_name="João",
            last_name="Wellhub",
            email="joao@wellhub.test",
        )
        self.hoje = timezone.localdate()
        tz = timezone.get_current_timezone()
        occur = timezone.make_aware(datetime.combine(self.hoje, self.turma.horario), tz)
        self.slot = WellhubSlot.objects.create(
            turma=self.turma,
            data_aula=self.hoje,
            occur_date=occur,
            wellhub_slot_id=f"slot-presenca-{self.turma.id}",
            total_capacity=5,
            opens_at=occur - timedelta(days=2),
            closes_at=occur - timedelta(minutes=10),
        )
        self.booking_ok = WellhubBooking.objects.create(
            wellhub_booking_id="bk-presenca-ok",
            slot=self.slot,
            cadastro=self.cadastro,
            status="confirmed",
        )
        self.booking_cancel = WellhubBooking.objects.create(
            wellhub_booking_id="bk-presenca-cancel",
            slot=self.slot,
            cadastro=self.cadastro,
            status="cancelled",
        )

    def test_lista_apenas_confirmadas_do_dia(self):
        qs = list(wellhub_bookings_presenca_turma(self.turma, self.hoje))
        self.assertEqual(qs, [self.booking_ok])

    def test_outra_data_nao_retorna(self):
        outro_dia = self.hoje + timedelta(days=7)
        qs = wellhub_bookings_presenca_turma(self.turma, outro_dia)
        self.assertEqual(qs.count(), 0)

    @override_settings(ALLOWED_HOSTS=["testserver"], SECURE_SSL_REDIRECT=False)
    def test_api_presenca_inclui_wellhub_mesmo_com_email_de_aluno(self):
        """Reserva Wellhub não pode ser omitida só porque o e-mail já é de aluno CT."""
        professor = Usuario.objects.create_user(
            username="prof_wh",
            password="x",
            tipo="professor",
            first_name="Prof",
            email="prof@test.com",
            cpf="11111111111",
        )
        aluno = Usuario.objects.create_user(
            username="aluno_wh",
            password="x",
            tipo="aluno",
            first_name="João",
            last_name="CT",
            email="joao@wellhub.test",
            ativo=True,
            cpf="22222222222",
        )
        self.turma.alunos.add(aluno)
        self.turma.professores.add(professor)

        client = APIClient()
        client.force_authenticate(user=professor)
        resp = client.get(f"/api/funcionarios/verificar-checkin/{self.turma.id}/")
        self.assertEqual(resp.status_code, 200)
        alunos = resp.data["alunos"]
        tipos = [a["tipo"] for a in alunos]
        self.assertIn("aluno", tipos)
        self.assertIn("wellhub", tipos)
        wh = next(a for a in alunos if a["tipo"] == "wellhub")
        self.assertEqual(wh["id"], f"wellhub_{self.booking_ok.id}")
        self.assertIn("João", wh["nome"])
