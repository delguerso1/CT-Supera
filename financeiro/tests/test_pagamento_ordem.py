from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from financeiro.models import Mensalidade
from financeiro.pagamento_ordem import pagamento_bloqueado_por_atrasada
from usuarios.models import Usuario


def _vencimento_atrasado():
    hoje = timezone.localdate()
    if hoje.month == 1:
        return date(hoje.year - 1, 12, 10)
    return date(hoje.year, hoje.month - 1, 10)


def _vencimento_pendente():
    hoje = timezone.localdate()
    mes = hoje.month + 1
    ano = hoje.year
    if mes > 12:
        mes = 1
        ano += 1
    return date(ano, mes, 10)


class PagamentoOrdemAtrasadaPendenteTests(TestCase):
    def setUp(self):
        self.aluno = Usuario.objects.create_user(
            username="15892884759",
            password="Aluno123!",
            tipo="aluno",
            first_name="Aluno",
            last_name="Ordem",
            email="aluno.ordem@test.com",
            cpf="15892884759",
            is_active=True,
            ativo=True,
            valor_mensalidade=Decimal("150.00"),
            dia_vencimento=10,
        )
        self.atrasada = Mensalidade.objects.create(
            aluno=self.aluno,
            valor=Decimal("150.00"),
            data_vencimento=_vencimento_atrasado(),
            status="atrasado",
        )
        self.pendente = Mensalidade.objects.create(
            aluno=self.aluno,
            valor=Decimal("150.00"),
            data_vencimento=_vencimento_pendente(),
            status="pendente",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.aluno)

    def _post_pix(self, mensalidade_id, txid="txid-ordem"):
        pix_payload = {
            "txid": txid,
            "calendario": {"expiracao": 1800},
            "valor": {"original": "150.00"},
            "pixCopiaECola": "00020126" + ("A" * 60),
        }
        with override_settings(C6_BANK_CHAVE_PIX="chave-teste"):
            with patch("financeiro.views.c6_client.create_pix_payment", return_value=pix_payload):
                return self.client.post(f"/api/financeiro/pix/gerar/{mensalidade_id}/")

    def test_helper_bloqueia_pendente_se_ha_atrasada(self):
        self.assertTrue(pagamento_bloqueado_por_atrasada(self.aluno, self.pendente))
        self.assertFalse(pagamento_bloqueado_por_atrasada(self.aluno, self.atrasada))

    def test_nao_gera_pix_da_pendente_enquanto_houver_atrasada(self):
        resp = self._post_pix(self.pendente.id)
        self.assertEqual(resp.status_code, 400, resp.data)
        self.assertEqual(resp.data.get("codigo"), "pagar_atrasada_primeiro")
        self.assertEqual(resp.data.get("mensalidade_atrasada_id"), self.atrasada.id)
        self.assertIn("atrasada", resp.data.get("error", "").lower())

    def test_gera_pix_da_atrasada_mesmo_com_pendente(self):
        resp = self._post_pix(self.atrasada.id)
        self.assertIn(resp.status_code, (200, 201), resp.data)

    def test_apos_quitar_atrasada_pode_gerar_pix_da_pendente(self):
        self.atrasada.status = "pago"
        self.atrasada.save()
        self.assertFalse(pagamento_bloqueado_por_atrasada(self.aluno, self.pendente))
        resp = self._post_pix(self.pendente.id, txid="txid-depois")
        self.assertIn(resp.status_code, (200, 201), resp.data)

    def test_realizar_pagamento_da_pendente_tambem_e_bloqueado(self):
        resp = self.client.post(f"/api/alunos/realizar-pagamento/{self.pendente.id}/")
        self.assertEqual(resp.status_code, 400, resp.data)
        self.assertEqual(resp.data.get("codigo"), "pagar_atrasada_primeiro")
