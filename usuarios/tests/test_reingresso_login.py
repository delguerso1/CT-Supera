from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from usuarios.models import PreCadastro, Usuario


class ReingressoLoginTests(TestCase):
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
            username="21501658727",
            password="senhaAntiga1",
            tipo="aluno",
            first_name="Bella",
            last_name="Teste",
            email="bella.reingresso@test.com",
            cpf="21501658727",
            ativo=True,
            is_active=True,
            valor_mensalidade=Decimal("160.00"),
            dia_vencimento=10,
        )
        self.client = APIClient()

    def _encerrar(self, is_active=True):
        self.aluno.ativo = False
        self.aluno.is_active = is_active
        self.aluno.data_inativacao = date(2026, 8, 13)
        self.aluno.save(update_fields=["ativo", "is_active", "data_inativacao"])

    def _precadastro_ex_aluno(self, usuario=None):
        return PreCadastro.objects.create(
            first_name="Bella",
            last_name="Teste",
            cpf="21501658727",
            telefone="21988887777",
            data_nascimento=date(2000, 1, 1),
            email="bella.reingresso@test.com",
            status="pendente",
            origem="ex_aluno",
            usuario=usuario,
        )

    def test_reingresso_reativa_is_active_e_login(self):
        self._encerrar(is_active=False)
        pc = self._precadastro_ex_aluno()
        pc.converter_para_aluno(
            self.gerente,
            dia_vencimento=10,
            valor_mensalidade=Decimal("160.00"),
        )
        self.aluno.refresh_from_db()
        self.assertTrue(self.aluno.ativo)
        self.assertTrue(self.aluno.is_active)
        self.assertIsNone(self.aluno.data_inativacao)

        resp = self.client.post(
            "/api/usuarios/login/",
            {"cpf": "21501658727", "password": "senhaAntiga1"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertIn("token", resp.data)

    def test_reingresso_via_vinculo_legado_tambem_reativa_login(self):
        self._encerrar(is_active=False)
        pc = self._precadastro_ex_aluno(usuario=self.aluno)
        pc.converter_para_aluno(
            self.gerente,
            dia_vencimento=10,
            valor_mensalidade=Decimal("160.00"),
        )
        self.aluno.refresh_from_db()
        self.assertTrue(self.aluno.is_active)
        self.assertTrue(self.aluno.ativo)

        resp = self.client.post(
            "/api/usuarios/login/",
            {"cpf": "21501658727", "password": "senhaAntiga1"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)

    def test_login_por_cpf_quando_username_diverge(self):
        self.aluno.username = "bella.old"
        self.aluno.save(update_fields=["username"])
        resp = self.client.post(
            "/api/usuarios/login/",
            {"cpf": "21501658727", "password": "senhaAntiga1"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)

    def test_ex_aluno_com_is_active_false_nao_loga_antes_do_reingresso(self):
        self._encerrar(is_active=False)
        resp = self.client.post(
            "/api/usuarios/login/",
            {"cpf": "21501658727", "password": "senhaAntiga1"},
            format="json",
        )
        self.assertEqual(resp.status_code, 401)
        self.assertIn("desativada", resp.data["error"].lower())

    def test_reingresso_sem_senha_nao_liga_is_active(self):
        self.aluno.set_unusable_password()
        self.aluno.save(update_fields=["password"])
        self._encerrar(is_active=False)
        pc = self._precadastro_ex_aluno()
        pc.converter_para_aluno(
            self.gerente,
            dia_vencimento=10,
            valor_mensalidade=Decimal("160.00"),
        )
        self.aluno.refresh_from_db()
        self.assertTrue(self.aluno.ativo)
        self.assertFalse(self.aluno.is_active)
