from datetime import date, datetime, time
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from ct.models import CentroDeTreinamento
from financeiro.models import Mensalidade
from financeiro.services import (
    calcular_encerramento_contrato,
    criar_mensalidade_suspensao,
)
from funcionarios.models import Presenca
from turmas.models import DiaSemana, Turma
from usuarios.models import Usuario


class ProporcionalMesCorrenteTests(TestCase):
    def setUp(self):
        self.ct = CentroDeTreinamento.objects.create(nome="Praia de Itaipuaçu")
        self.seg, _ = DiaSemana.objects.get_or_create(nome="Segunda-feira")
        self.sex, _ = DiaSemana.objects.get_or_create(nome="Sexta-feira")
        self.turma = Turma.objects.create(
            ct=self.ct, horario=time(7, 0), capacidade_maxima=20, ativo=True
        )
        self.turma.dias_semana.set([self.seg, self.sex])
        self.aluno = Usuario.objects.create_user(
            username="bella_test",
            password="x",
            tipo="aluno",
            first_name="Bella",
            last_name="Teste",
            email="bella@test.com",
            cpf="21501658727",
            ativo=True,
            valor_mensalidade=Decimal("160.00"),
            dia_vencimento=8,
        )
        self.aluno.dias_habilitados.set([self.seg, self.sex])
        self.turma.alunos.add(self.aluno)

        Mensalidade.objects.create(
            aluno=self.aluno,
            valor=Decimal("160.00"),
            valor_pago=Decimal("160.00"),
            data_vencimento=date(2026, 6, 8),
            data_pagamento=timezone.make_aware(datetime(2026, 6, 5, 18, 0, 0)),
            status="pago",
        )
        Presenca.objects.create(
            usuario=self.aluno,
            turma=self.turma,
            data=date(2026, 6, 22),
            presenca_confirmada=True,
            checkin_realizado=False,
            ausencia_registrada=False,
        )

    def test_suspensao_julho_sem_frequencia_zera(self):
        Presenca.objects.create(
            usuario=self.aluno,
            turma=self.turma,
            data=date(2026, 7, 3),
            presenca_confirmada=False,
            checkin_realizado=False,
            ausencia_registrada=True,
        )
        calc = calcular_encerramento_contrato(self.aluno, data_referencia=date(2026, 7, 12))
        self.assertEqual(calc["aulas_presentes"], 0)
        self.assertEqual(calc["valor_proporcional"], "0.00")
        self.assertFalse(calc["precisa_cobrar"])
        self.assertEqual(calc["mes_referencia"], "2026-07")

        mensalidade, calc2 = criar_mensalidade_suspensao(self.aluno, calculo=calc)
        self.assertIsNone(mensalidade)
        self.assertFalse(calc2["precisa_cobrar"])

    def test_suspensao_julho_com_frequencia_rateia_mes(self):
        Presenca.objects.create(
            usuario=self.aluno,
            turma=self.turma,
            data=date(2026, 7, 6),
            presenca_confirmada=True,
            checkin_realizado=False,
            ausencia_registrada=False,
        )
        calc = calcular_encerramento_contrato(self.aluno, data_referencia=date(2026, 7, 12))
        self.assertEqual(calc["aulas_presentes"], 1)
        self.assertEqual(calc["mes_referencia"], "2026-07")
        esperadas = calc["aulas_esperadas_mes"]
        self.assertGreater(esperadas, 0)
        esperado = (Decimal("160.00") * Decimal(1) / Decimal(esperadas)).quantize(
            Decimal("0.01")
        )
        self.assertEqual(Decimal(calc["valor_proporcional"]), esperado)

    def test_cancela_pendente_do_mes_quando_zera(self):
        pendente = Mensalidade.objects.create(
            aluno=self.aluno,
            valor=Decimal("12.31"),
            data_vencimento=date(2026, 7, 13),
            status="pendente",
            observacoes="Suspensão de contrato — 1 aula(s) após o último pagamento",
        )
        calc = calcular_encerramento_contrato(self.aluno, data_referencia=date(2026, 7, 12))
        self.assertEqual(calc["valor_proporcional"], "0.00")
        mensalidade, _ = criar_mensalidade_suspensao(self.aluno, calculo=calc)
        self.assertIsNone(mensalidade)
        self.assertFalse(Mensalidade.objects.filter(pk=pendente.pk).exists())
