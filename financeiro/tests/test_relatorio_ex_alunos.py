from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from financeiro.models import Mensalidade
from usuarios.models import Usuario


class RelatorioExAlunosPendenciasAPITests(TestCase):
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
        self.aluno = Usuario.objects.create_user(
            username="15892884759",
            password="x",
            tipo="aluno",
            first_name="Elis",
            last_name="Teste",
            email="elis@test.com",
            cpf="15892884759",
            ativo=False,
            data_inativacao=date(2026, 7, 13),
            valor_mensalidade=Decimal("160.00"),
            dia_vencimento=10,
        )
        Mensalidade.objects.create(
            aluno=self.aluno,
            valor=Decimal("36.92"),
            data_vencimento=date(2026, 7, 13),
            status="pendente",
        )
        self.client = APIClient()

    def test_gerente_lista_pendencias_de_ex_aluno(self):
        self.client.force_authenticate(user=self.gerente)
        resp = self.client.get("/api/financeiro/relatorio/ex-alunos-pendencias/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["total_ex_alunos"], 1)
        self.assertEqual(resp.data["total_parcelas"], 1)
        self.assertEqual(resp.data["valor_total"], "36.92")
        item = resp.data["itens"][0]
        self.assertEqual(item["aluno_id"], self.aluno.id)
        self.assertIn("Elis", item["nome"])
        self.assertEqual(len(item["parcelas"]), 1)
        self.assertEqual(item["parcelas"][0]["valor"], "36.92")

    def test_aluno_nao_acessa(self):
        self.client.force_authenticate(user=self.aluno)
        resp = self.client.get("/api/financeiro/relatorio/ex-alunos-pendencias/")
        self.assertEqual(resp.status_code, 403)

    def test_ex_aluno_sem_pendencia_nao_aparece(self):
        Mensalidade.objects.filter(aluno=self.aluno).update(status="pago")
        self.client.force_authenticate(user=self.gerente)
        resp = self.client.get("/api/financeiro/relatorio/ex-alunos-pendencias/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["total_ex_alunos"], 0)
        self.assertEqual(resp.data["itens"], [])
