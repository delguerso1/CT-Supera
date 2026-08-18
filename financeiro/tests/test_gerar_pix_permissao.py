from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from financeiro.models import Mensalidade
from usuarios.models import Usuario


def _vencimento_dia_10_atrasado():
    hoje = timezone.localdate()
    if hoje.day >= 10:
        return date(hoje.year, hoje.month, 10)
    ano = hoje.year if hoje.month > 1 else hoje.year - 1
    mes = hoje.month - 1 if hoje.month > 1 else 12
    return date(ano, mes, 10)


class GerarPixPermissaoTests(TestCase):
    def setUp(self):
        self.aluno = Usuario.objects.create_user(
            username="15892884759",
            password="Aluno123!",
            tipo="aluno",
            first_name="Aluno",
            last_name="Pix",
            email="aluno.pix@test.com",
            cpf="15892884759",
            is_active=True,
            ativo=True,
            valor_mensalidade=Decimal("160.00"),
            dia_vencimento=10,
        )
        self.outro = Usuario.objects.create_user(
            username="21501658727",
            password="Aluno123!",
            tipo="aluno",
            first_name="Outro",
            last_name="Aluno",
            email="outro.pix@test.com",
            cpf="21501658727",
            is_active=True,
            ativo=True,
            valor_mensalidade=Decimal("160.00"),
            dia_vencimento=10,
        )
        vencimento = _vencimento_dia_10_atrasado()
        # Cria a do outro primeiro para o id do aluno ≠ id da mensalidade dele
        self.mensalidade_outro = Mensalidade.objects.create(
            aluno=self.outro,
            valor=Decimal("140.00"),
            data_vencimento=vencimento,
            status="atrasado",
        )
        self.mensalidade = Mensalidade.objects.create(
            aluno=self.aluno,
            valor=Decimal("160.00"),
            data_vencimento=vencimento,
            status="atrasado",
        )
        self.mensalidade_outro_antiga = Mensalidade.objects.create(
            aluno=self.outro,
            valor=Decimal("140.00"),
            data_vencimento=date(2025, 1, 10),
            status="atrasado",
        )
        self.client = APIClient()

    def _post_pix(self, mensalidade_id, txid="txid-teste"):
        pix_payload = {
            "txid": txid,
            "calendario": {"expiracao": 1800},
            "valor": {"original": "163.20"},
            "pixCopiaECola": "00020126" + ("A" * 60),
        }
        with override_settings(C6_BANK_CHAVE_PIX="chave-teste"):
            with patch("financeiro.views.c6_client.create_pix_payment", return_value=pix_payload):
                return self.client.post(f"/api/financeiro/pix/gerar/{mensalidade_id}/")

    def test_aluno_gera_pix_da_propria_mensalidade_atrasada(self):
        self.client.force_authenticate(user=self.aluno)
        resp = self._post_pix(self.mensalidade.id)
        self.assertNotEqual(resp.status_code, 403, resp.data)
        self.assertIn(resp.status_code, (200, 201), resp.data)

    def test_aluno_nao_gera_pix_de_outro(self):
        self.assertNotEqual(self.aluno.id, self.mensalidade_outro_antiga.id)
        self.client.force_authenticate(user=self.aluno)
        resp = self.client.post(f"/api/financeiro/pix/gerar/{self.mensalidade_outro_antiga.id}/")
        self.assertEqual(resp.status_code, 403)
        self.assertIn("permissão", resp.data.get("error", "").lower())

    def test_aluno_que_envia_o_proprio_id_usa_a_mensalidade_em_aberto(self):
        self.client.force_authenticate(user=self.aluno)
        resp = self._post_pix(self.aluno.id, txid="txid-user-id")
        self.assertNotEqual(resp.status_code, 403, resp.data)
        self.assertIn(resp.status_code, (200, 201), resp.data)
