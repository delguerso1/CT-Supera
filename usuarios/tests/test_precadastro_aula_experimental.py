from datetime import time

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from app.aula_experimental_datas import listar_datas_aula_experimental
from ct.models import CentroDeTreinamento
from turmas.models import DiaSemana, Turma
from usuarios.models import PreCadastro


class PrecadastroAulaExperimentalAPITests(TestCase):
    """Cadastro de aula experimental via pré-cadastro (fluxo do gerente / site)."""

    def setUp(self):
        self.client = APIClient()
        self.ct = CentroDeTreinamento.objects.create(nome="CT Teste")
        hoje = timezone.localdate()
        # Turma com todos os dias da semana para garantir datas na janela
        dias = []
        for nome in (
            "Segunda-feira",
            "Terça-feira",
            "Quarta-feira",
            "Quinta-feira",
            "Sexta-feira",
            "Sábado",
            "Domingo",
        ):
            dia, _ = DiaSemana.objects.get_or_create(nome=nome)
            dias.append(dia)
        self.turma = Turma.objects.create(
            ct=self.ct, horario=time(8, 0), capacidade_maxima=20, ativo=True
        )
        self.turma.dias_semana.set(dias)

        weekdays = set(range(7))
        datas = listar_datas_aula_experimental(weekdays, min_data_inclusive=hoje)
        self.assertTrue(datas, "É preciso haver ao menos uma data válida na janela de testes")
        self.data_aula = datas[0]

        self.payload_base = {
            "first_name": "Maria",
            "last_name": "Silva",
            "email": "maria.aula.exp@test.com",
            "telefone": "21999998888",
            "data_nascimento": self.data_aula.replace(year=self.data_aula.year - 20).strftime(
                "%d-%m-%Y"
            ),
            "origem": "aula_experimental",
            "turma": self.turma.id,
        }

    def test_cria_aula_experimental_exige_data(self):
        resp = self.client.post("/api/usuarios/precadastros/", self.payload_base, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("data_aula_experimental", resp.data)

    def test_cria_aula_experimental_com_turma_e_data(self):
        payload = {
            **self.payload_base,
            "data_aula_experimental": self.data_aula.strftime("%d-%m-%Y"),
        }
        resp = self.client.post("/api/usuarios/precadastros/", payload, format="json")
        self.assertEqual(resp.status_code, 201, resp.data)
        pc = PreCadastro.objects.get(id=resp.data["id"])
        self.assertEqual(pc.origem, "aula_experimental")
        self.assertEqual(pc.data_aula_experimental, self.data_aula)
        self.assertEqual(pc.turma_id, self.turma.id)
