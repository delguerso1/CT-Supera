from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from financeiro.models import Despesa, Mensalidade, Salario, TransacaoC6Bank
from usuarios.models import Usuario


class PermissoesFinanceiroTests(TestCase):
    def setUp(self):
        self.gerente = Usuario.objects.create_user(
            username="gerente.fin",
            password="Gerente123!",
            tipo="gerente",
            first_name="Gestor",
            last_name="Financeiro",
            email="gerente.fin@test.com",
            cpf="39053344705",
            is_active=True,
            ativo=True,
        )
        self.aluno = Usuario.objects.create_user(
            username="11144477735",
            password="Aluno123!",
            tipo="aluno",
            first_name="Aluno",
            last_name="Atacante",
            email="aluno.fin@test.com",
            cpf="11144477735",
            is_active=True,
            ativo=True,
            valor_mensalidade=Decimal("150.00"),
            dia_vencimento=10,
        )
        self.vitima = Usuario.objects.create_user(
            username="52998224725",
            password="Vitima123!",
            tipo="aluno",
            first_name="Vitima",
            last_name="Mensalidade",
            email="vitima.fin@test.com",
            cpf="52998224725",
            ficha_medica="FICHA-MEDICA-SENTINELA",
            is_active=True,
            ativo=True,
            valor_mensalidade=Decimal("150.00"),
            dia_vencimento=10,
        )
        self.professor = Usuario.objects.create_user(
            username="prof.fin",
            password="Prof123!",
            tipo="professor",
            first_name="Prof",
            last_name="Salario",
            email="prof.fin@test.com",
            cpf="15350946056",
            is_active=True,
            ativo=True,
        )
        vencimento = timezone.localdate() + timedelta(days=10)
        self.mensalidade_aluno = Mensalidade.objects.create(
            aluno=self.aluno,
            valor=Decimal("150.00"),
            data_vencimento=vencimento,
            status="pendente",
        )
        self.mensalidade_vitima = Mensalidade.objects.create(
            aluno=self.vitima,
            valor=Decimal("180.00"),
            data_vencimento=vencimento,
            status="pendente",
        )
        self.despesa = Despesa.objects.create(
            categoria="outros",
            descricao="DESPESA-SENTINELA",
            valor=Decimal("40.00"),
            data=date(2026, 9, 1),
        )
        self.salario = Salario.objects.filter(professor=self.professor).first()
        if self.salario is None:
            self.salario = Salario.objects.create(
                professor=self.professor,
                valor=Decimal("2000.00"),
                competencia=date(2026, 9, 1),
                status="pendente",
            )
        else:
            self.salario.status = "pendente"
            self.salario.data_pagamento = None
            self.salario.save(update_fields=["status", "data_pagamento"])
        self.transacao = TransacaoC6Bank.objects.create(
            mensalidade=self.mensalidade_vitima,
            tipo="pix",
            valor=Decimal("180.00"),
            status="pendente",
            txid="txid-sentinela-sec",
            chave_pix="chave-pix-recebedor-sentinela",
            codigo_pix="00020126CODIGO-PIX-SENTINELA",
            data_expiracao=timezone.now() + timedelta(hours=1),
        )
        self.client = APIClient()

    def test_aluno_lista_somente_as_proprias_mensalidades_sem_dados_sensiveis(self):
        self.client.force_authenticate(user=self.aluno)
        resp = self.client.get("/api/financeiro/mensalidades/?page_size=100")
        self.assertEqual(resp.status_code, 200, resp.data)
        ids = [item["id"] for item in resp.data["results"]]
        self.assertIn(self.mensalidade_aluno.id, ids)
        self.assertNotIn(self.mensalidade_vitima.id, ids)
        aluno = resp.data["results"][0]["aluno"]
        self.assertEqual(set(aluno.keys()), {"id", "first_name", "last_name"})
        corpo = str(resp.data)
        self.assertNotIn("FICHA-MEDICA-SENTINELA", corpo)
        self.assertNotIn("52998224725", corpo)

    def test_aluno_nao_ve_mensalidade_alheia_mesmo_filtrando_o_id(self):
        self.client.force_authenticate(user=self.aluno)
        resp = self.client.get(
            f"/api/financeiro/mensalidades/?aluno={self.vitima.id}&page_size=100"
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        ids = [item["id"] for item in resp.data["results"]]
        self.assertNotIn(self.mensalidade_vitima.id, ids)

    def test_aluno_nao_marca_mensalidade_como_paga(self):
        self.client.force_authenticate(user=self.aluno)
        detalhe = self.client.get(f"/api/financeiro/mensalidades/{self.mensalidade_vitima.id}/")
        self.assertEqual(detalhe.status_code, 404)
        resp = self.client.patch(
            f"/api/financeiro/mensalidades/{self.mensalidade_vitima.id}/",
            {"status": "pago"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)
        propria = self.client.patch(
            f"/api/financeiro/mensalidades/{self.mensalidade_aluno.id}/",
            {"status": "pago", "valor": "1.00"},
            format="json",
        )
        self.assertEqual(propria.status_code, 403)
        self.mensalidade_aluno.refresh_from_db()
        self.mensalidade_vitima.refresh_from_db()
        self.assertNotEqual(self.mensalidade_aluno.status, "pago")
        self.assertNotEqual(self.mensalidade_vitima.status, "pago")
        self.assertEqual(self.mensalidade_aluno.valor, Decimal("150.00"))

    def test_gerente_nao_quita_mensalidade_por_patch(self):
        self.client.force_authenticate(user=self.gerente)
        resp = self.client.patch(
            f"/api/financeiro/mensalidades/{self.mensalidade_vitima.id}/",
            {"status": "pago", "valor": "1.00", "observacoes": "nota"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.mensalidade_vitima.refresh_from_db()
        self.assertNotEqual(self.mensalidade_vitima.status, "pago")
        self.assertEqual(self.mensalidade_vitima.valor, Decimal("180.00"))
        self.assertEqual(self.mensalidade_vitima.observacoes, "nota")

    def test_gerente_ainda_da_baixa(self):
        self.client.force_authenticate(user=self.gerente)
        resp = self.client.post(
            f"/api/financeiro/mensalidades/{self.mensalidade_vitima.id}/dar-baixa/"
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.mensalidade_vitima.refresh_from_db()
        self.assertEqual(self.mensalidade_vitima.status, "pago")

    def test_aluno_nao_acessa_despesas_salarios_nem_cobrancas(self):
        self.client.force_authenticate(user=self.aluno)
        self.assertEqual(self.client.get("/api/financeiro/despesas/").status_code, 403)
        self.assertEqual(
            self.client.delete(f"/api/financeiro/despesas/{self.despesa.id}/").status_code,
            403,
        )
        self.assertTrue(Despesa.objects.filter(pk=self.despesa.id).exists())
        self.assertEqual(self.client.get("/api/financeiro/salarios/").status_code, 403)
        pago = self.client.post(
            "/api/financeiro/pagar-salario/",
            {"salario_id": self.salario.id},
            format="json",
        )
        self.assertEqual(pago.status_code, 403)
        self.salario.refresh_from_db()
        self.assertEqual(self.salario.status, "pendente")
        cobrancas = self.client.get("/api/financeiro/c6/transactions/")
        self.assertEqual(cobrancas.status_code, 403)
        detalhe = self.client.get(f"/api/financeiro/c6/transactions/{self.transacao.id}/")
        self.assertEqual(detalhe.status_code, 403)

    def test_gerente_paga_salario_e_lista_cobranca(self):
        self.client.force_authenticate(user=self.gerente)
        resp = self.client.patch(
            f"/api/financeiro/salarios/{self.salario.id}/",
            {"status": "pago"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.salario.refresh_from_db()
        self.assertEqual(self.salario.status, "pago")
        lista = self.client.get("/api/financeiro/c6/transactions/")
        self.assertEqual(lista.status_code, 200, lista.data)
        corpo = str(lista.data)
        self.assertIn("00020126CODIGO-PIX-SENTINELA", corpo)

    def test_professor_nao_lista_financeiro(self):
        self.client.force_authenticate(user=self.professor)
        self.assertEqual(self.client.get("/api/financeiro/mensalidades/").status_code, 403)
        self.assertEqual(self.client.get("/api/financeiro/despesas/").status_code, 403)
        self.assertEqual(self.client.get("/api/financeiro/salarios/").status_code, 403)
