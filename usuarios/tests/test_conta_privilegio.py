"""Professor não assume conta alheia; aluno não converte pré-cadastro."""
from datetime import date

from django.core import mail
from django.test import TestCase
from rest_framework.test import APIClient

from usuarios.models import PreCadastro, Usuario


class EmailDeOutraContaTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.gerente = Usuario.objects.create_user(
            username="11144477735",
            password="Gerente123!",
            tipo="gerente",
            first_name="Gerente",
            last_name="Alvo",
            email="gerente.alvo@ct.test",
            cpf="11144477735",
            is_active=True,
        )
        self.professor = Usuario.objects.create_user(
            username="52998224725",
            password="Professor123!",
            tipo="professor",
            first_name="Professor",
            last_name="Atacante",
            email="professor.atacante@ct.test",
            cpf="52998224725",
            is_active=True,
        )

    def test_professor_nao_troca_email_do_gerente(self):
        self.client.force_authenticate(user=self.professor)
        resp = self.client.put(
            f"/api/usuarios/{self.gerente.id}/",
            {
                "email": "atacante-gerente@evil.test",
                "first_name": "Gerente",
                "telefone": "21988887777",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.gerente.refresh_from_db()
        self.assertEqual(self.gerente.email, "gerente.alvo@ct.test")
        self.assertEqual(self.gerente.tipo, "gerente")
        self.assertEqual(self.gerente.telefone, "21988887777")

        self.client.force_authenticate(user=None)
        mail.outbox.clear()
        rec = self.client.post(
            "/api/usuarios/esqueci-senha/",
            {"cpf": "11144477735"},
            format="json",
        )
        self.assertEqual(rec.status_code, 200, rec.data)
        self.assertEqual(mail.outbox[0].to, ["gerente.alvo@ct.test"])

    def test_gerente_ainda_troca_email_de_outro_usuario(self):
        self.client.force_authenticate(user=self.gerente)
        resp = self.client.patch(
            f"/api/usuarios/{self.professor.id}/",
            {"email": "professor.novo@ct.test"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.professor.refresh_from_db()
        self.assertEqual(self.professor.email, "professor.novo@ct.test")

    def test_professor_nao_se_promove_pelo_perfil(self):
        self.client.force_authenticate(user=self.professor)
        resp = self.client.put(
            "/api/funcionarios/atualizar-dados-professor/",
            {"tipo": "gerente", "first_name": "Professor", "email": "professor.perfil@ct.test"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.professor.refresh_from_db()
        self.assertEqual(self.professor.tipo, "professor")
        self.assertEqual(self.professor.email, "professor.perfil@ct.test")


class ConversaoPrecadastroTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.aluno = Usuario.objects.create_user(
            username="15892884759",
            password="Aluno123!",
            tipo="aluno",
            first_name="Aluno",
            last_name="Comum",
            email="aluno.comum@ct.test",
            cpf="15892884759",
            is_active=True,
            ativo=True,
        )
        self.gerente = Usuario.objects.create_user(
            username="11144477735",
            password="Gerente123!",
            tipo="gerente",
            first_name="Gerente",
            last_name="CT",
            email="gerente.conv@ct.test",
            cpf="11144477735",
            is_active=True,
        )
        self.precadastro = PreCadastro.objects.create(
            first_name="Lead",
            last_name="Novo",
            cpf="39053344705",
            telefone="21999998888",
            data_nascimento=date(2001, 5, 5),
            email="lead.original@ct.test",
            status="pendente",
            origem="formulario",
        )

    def test_aluno_nao_altera_email_nem_converte_precadastro(self):
        self.client.force_authenticate(user=self.aluno)
        edit = self.client.patch(
            f"/api/usuarios/precadastros/{self.precadastro.id}/",
            {"email": "atacante-lead@evil.test"},
            format="json",
        )
        self.assertEqual(edit.status_code, 403)
        conv = self.client.post(
            f"/api/funcionarios/converter-precadastro/{self.precadastro.id}/",
            {},
            format="json",
        )
        self.assertEqual(conv.status_code, 403)
        self.precadastro.refresh_from_db()
        self.assertEqual(self.precadastro.email, "lead.original@ct.test")
        self.assertFalse(Usuario.objects.filter(cpf="39053344705").exists())

    def test_gerente_converte_precadastro(self):
        self.client.force_authenticate(user=self.gerente)
        mail.outbox.clear()
        conv = self.client.post(
            f"/api/funcionarios/converter-precadastro/{self.precadastro.id}/",
            {},
            format="json",
        )
        self.assertEqual(conv.status_code, 201, getattr(conv, "data", conv.content))
        self.assertFalse(PreCadastro.objects.filter(pk=self.precadastro.id).exists())
        novo = Usuario.objects.get(cpf="39053344705")
        self.assertEqual(novo.email, "lead.original@ct.test")
        self.assertFalse(novo.is_active)
        self.assertEqual(mail.outbox[0].to, ["lead.original@ct.test"])
