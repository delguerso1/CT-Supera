from datetime import date, time

from django.test import TestCase
from rest_framework.test import APIClient

from ct.models import CentroDeTreinamento
from turmas.models import Turma
from usuarios.models import PreCadastro, Usuario


class EdicaoExAlunoTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.gerente = Usuario.objects.create_user(
            username="00000000000", password="x", tipo="gerente", first_name="Gerente",
            email="gerente@test.com", cpf="00000000000", is_active=True,
        )
        # Aluno encerrado: o cadastro antigo continua no banco com o mesmo e-mail/CPF.
        self.aluno = Usuario.objects.create_user(
            username="21501658727", password="x", tipo="aluno", first_name="Bella",
            last_name="Teste", email="bella@test.com", cpf="21501658727",
            data_nascimento=date(2000, 1, 1), ativo=False, is_active=True,
        )
        self.precadastro = PreCadastro.objects.create(
            first_name="Bella", last_name="Teste", cpf="21501658727",
            telefone="21988887777", data_nascimento=date(2000, 1, 1),
            email="bella@test.com", status="pendente", origem="ex_aluno",
        )
        self.client.force_authenticate(user=self.gerente)

    def _put(self, **extra):
        payload = {
            "first_name": "Bella", "last_name": "Teste", "email": "bella@test.com",
            "telefone": "21988887777", "data_nascimento": "01/01/2000",
            "cpf": "21501658727", "origem": "ex_aluno", "turma": None,
        }
        payload.update(extra)
        return self.client.put(
            f"/api/usuarios/precadastros/{self.precadastro.id}/", payload, format="json"
        )

    def test_salvar_ex_aluno_adulto_com_mesmo_email_do_cadastro_antigo(self):
        resp = self._put(telefone="21999990000")
        self.assertEqual(resp.status_code, 200, resp.data)
        self.precadastro.refresh_from_db()
        self.assertEqual(self.precadastro.telefone, "21999990000")

    def test_email_de_outro_adulto_continua_bloqueado(self):
        Usuario.objects.create_user(
            username="52998224725", password="x", tipo="aluno", first_name="Outro",
            email="outro@test.com", cpf="52998224725",
            data_nascimento=date(1995, 5, 5), is_active=True,
        )
        resp = self._put(email="outro@test.com")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("email", resp.data)

    def test_manter_turma_desativada_ao_editar_ex_aluno(self):
        ct = CentroDeTreinamento.objects.create(nome="CT Teste")
        turma = Turma.objects.create(ct=ct, horario=time(8, 0), capacidade_maxima=20, ativo=True)
        self.precadastro.turma = turma
        self.precadastro.save()
        turma.ativo = False
        turma.save()

        resp = self._put(turma=turma.id, telefone="21999990000")
        self.assertEqual(resp.status_code, 200, resp.data)
        self.precadastro.refresh_from_db()
        self.assertEqual(self.precadastro.turma_id, turma.id)

    def test_nao_aceita_vincular_outra_turma_desativada(self):
        ct = CentroDeTreinamento.objects.create(nome="CT Teste")
        inativa = Turma.objects.create(ct=ct, horario=time(9, 0), capacidade_maxima=20, ativo=False)
        resp = self._put(turma=inativa.id)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("turma", resp.data)
