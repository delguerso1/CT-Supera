from datetime import date, datetime, time
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from ct.models import CentroDeTreinamento
from financeiro.models import Mensalidade
from financeiro.services import (
    criar_mensalidade_encerramento,
    criar_mensalidade_suspensao,
    gerar_mensalidades_para_mes,
    listar_exalunos_com_mensalidade_aberta,
)
from turmas.models import DiaSemana, Turma
from usuarios.models import Usuario


class EncerramentoLimpaParcelasAbertasTests(TestCase):
    def setUp(self):
        self.ct = CentroDeTreinamento.objects.create(nome="Praia de Itaipuaçu")
        self.seg, _ = DiaSemana.objects.get_or_create(nome="Segunda-feira")
        self.turma = Turma.objects.create(
            ct=self.ct, horario=time(7, 0), capacidade_maxima=20, ativo=True
        )
        self.turma.dias_semana.set([self.seg])
        self.aluno = Usuario.objects.create_user(
            username="elis_test",
            password="x",
            tipo="aluno",
            first_name="Elis",
            last_name="Teste",
            email="elis@test.com",
            cpf="15892884759",
            ativo=True,
            valor_mensalidade=Decimal("160.00"),
            dia_vencimento=10,
        )
        self.aluno.dias_habilitados.set([self.seg])
        self.turma.alunos.add(self.aluno)

        Mensalidade.objects.create(
            aluno=self.aluno,
            valor=Decimal("160.00"),
            valor_pago=Decimal("160.00"),
            data_vencimento=date(2026, 6, 10),
            data_pagamento=timezone.make_aware(datetime(2026, 6, 8, 10, 0, 0)),
            status="pago",
        )

    def test_encerramento_cancela_atraso_de_outro_mes_e_mes_seguinte(self):
        """Elis + Felipe: atraso antigo e parcela já gerada do mês seguinte saem."""
        julho = Mensalidade.objects.create(
            aluno=self.aluno,
            valor=Decimal("160.00"),
            data_vencimento=date(2026, 7, 10),
            status="atrasado",
        )
        agosto = Mensalidade.objects.create(
            aluno=self.aluno,
            valor=Decimal("160.00"),
            data_vencimento=date(2026, 8, 10),
            status="pendente",
        )
        calc = {
            "aulas_presentes": 0,
            "aulas_esperadas_mes": 8,
            "aulas_datas": [],
            "valor_mensalidade": "160.00",
            "valor_encerramento": "0.00",
            "valor_proporcional": "0.00",
            "mes_referencia": "2026-07",
            "precisa_cobrar": False,
        }
        mensalidade, calc2 = criar_mensalidade_encerramento(self.aluno, calculo=calc)
        self.assertIsNone(mensalidade)
        self.assertEqual(calc2["mensalidades_canceladas"], 2)
        self.assertFalse(Mensalidade.objects.filter(pk=julho.pk).exists())
        self.assertFalse(Mensalidade.objects.filter(pk=agosto.pk).exists())
        self.assertTrue(
            Mensalidade.objects.filter(
                aluno=self.aluno, status="pago", data_vencimento=date(2026, 6, 10)
            ).exists()
        )

    def test_suspensao_nao_cancela_mes_anterior(self):
        """Suspensão continua limitada ao mês de referência."""
        maio = Mensalidade.objects.create(
            aluno=self.aluno,
            valor=Decimal("160.00"),
            data_vencimento=date(2026, 5, 11),
            status="atrasado",
        )
        julho = Mensalidade.objects.create(
            aluno=self.aluno,
            valor=Decimal("160.00"),
            data_vencimento=date(2026, 7, 10),
            status="pendente",
        )
        calc = {
            "aulas_presentes": 0,
            "aulas_esperadas_mes": 8,
            "aulas_datas": [],
            "valor_mensalidade": "160.00",
            "valor_encerramento": "0.00",
            "valor_proporcional": "0.00",
            "mes_referencia": "2026-07",
            "precisa_cobrar": False,
        }
        mensalidade, _ = criar_mensalidade_suspensao(self.aluno, calculo=calc)
        self.assertIsNone(mensalidade)
        self.assertFalse(Mensalidade.objects.filter(pk=julho.pk).exists())
        self.assertTrue(Mensalidade.objects.filter(pk=maio.pk).exists())

    def test_gerar_mensalidade_ignora_ex_aluno(self):
        self.aluno.ativo = False
        self.aluno.data_inativacao = date(2026, 7, 13)
        self.aluno.save(update_fields=["ativo", "data_inativacao"])
        criadas = gerar_mensalidades_para_mes(2026, 8)
        self.assertEqual(criadas, 0)
        self.assertFalse(
            Mensalidade.objects.filter(
                aluno=self.aluno,
                data_vencimento__year=2026,
                data_vencimento__month=8,
            ).exists()
        )

    def test_criar_proxima_ignora_ex_aluno(self):
        self.aluno.ativo = False
        self.aluno.save(update_fields=["ativo"])
        base = Mensalidade.objects.get(aluno=self.aluno, data_vencimento=date(2026, 6, 10))
        self.assertIsNone(Mensalidade.criar_proxima_mensalidade(base))

    def test_listar_exalunos_com_residual(self):
        self.aluno.ativo = False
        self.aluno.data_inativacao = date(2026, 7, 13)
        self.aluno.save(update_fields=["ativo", "data_inativacao"])
        Mensalidade.objects.create(
            aluno=self.aluno,
            valor=Decimal("160.00"),
            data_vencimento=date(2026, 7, 10),
            status="atrasado",
        )
        grupos = listar_exalunos_com_mensalidade_aberta()
        self.assertEqual(len(grupos), 1)
        self.assertEqual(grupos[0]["aluno"].pk, self.aluno.pk)
        self.assertEqual(len(grupos[0]["mensalidades"]), 1)
