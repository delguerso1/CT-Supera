from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from ct.models import CentroDeTreinamento
from financeiro.models import Mensalidade
from financeiro.relatorio_centros import dividir_valor
from turmas.models import DiaSemana, Turma
from usuarios.models import Usuario
from wellhub.models import CadastroWellhub, WellhubBooking, WellhubSlot


def _criar_usuario(username, first_name, tipo="aluno", **extra):
    return Usuario.objects.create_user(
        username=username,
        password="x",
        tipo=tipo,
        first_name=first_name,
        last_name="Teste",
        email=f"{username}@test.com",
        cpf=username,
        is_active=True,
        **extra,
    )


class DividirValorTests(TestCase):
    def test_sobra_de_centavos_fica_nas_primeiras_fatias(self):
        fatias = dividir_valor(Decimal("100.00"), ["a", "b", "c"])
        valores = [valor for _, valor in fatias]
        self.assertEqual(valores, [Decimal("33.34"), Decimal("33.33"), Decimal("33.33")])
        self.assertEqual(sum(valores, Decimal("0")), Decimal("100.00"))


class RelatorioPorCentroAPITests(TestCase):
    def setUp(self):
        self.gerente = _criar_usuario("00000000000", "Gerente", tipo="gerente")
        self.ct_praia = CentroDeTreinamento.objects.create(nome="Praia")
        self.ct_quadra = CentroDeTreinamento.objects.create(nome="Quadra")
        self.segunda, _ = DiaSemana.objects.get_or_create(nome="Segunda-feira")
        self.quarta, _ = DiaSemana.objects.get_or_create(nome="Quarta-feira")
        self.turma_praia = Turma.objects.create(
            ct=self.ct_praia, horario=time(8, 0), capacidade_maxima=20, ativo=True
        )
        self.turma_praia.dias_semana.set([self.segunda])
        self.turma_praia_tarde = Turma.objects.create(
            ct=self.ct_praia, horario=time(16, 0), capacidade_maxima=20, ativo=True
        )
        self.turma_praia_tarde.dias_semana.set([self.quarta])
        self.turma_quadra = Turma.objects.create(
            ct=self.ct_quadra, horario=time(9, 0), capacidade_maxima=20, ativo=True
        )
        self.turma_quadra.dias_semana.set([self.segunda])
        self.client = APIClient()
        self.client.force_authenticate(user=self.gerente)
        self.hoje = timezone.localdate()

    def _mensalidade(self, aluno, valor, vencimento, status="pendente", valor_pago=None):
        return Mensalidade.objects.create(
            aluno=aluno,
            valor=valor,
            valor_pago=valor_pago,
            data_vencimento=vencimento,
            status=status,
        )

    def _centro(self, payload, nome):
        return next(item for item in payload["centros"] if item["nome"] == nome)

    def _turma(self, centro, horario):
        return next(item for item in centro["turmas"] if item["horario"] == horario)

    def test_aluno_nao_acessa(self):
        aluno = _criar_usuario("15892884759", "Aluno")
        self.client.force_authenticate(user=aluno)
        resp = self.client.get("/api/financeiro/relatorio/por-centro/")
        self.assertEqual(resp.status_code, 403)

    def test_valor_pago_no_centro_e_na_turma(self):
        aluno = _criar_usuario("21501658727", "Marina")
        self.turma_praia.alunos.add(aluno)
        self._mensalidade(
            aluno,
            Decimal("150.00"),
            date(self.hoje.year, self.hoje.month, min(self.hoje.day, 28)),
            status="pago",
            valor_pago=Decimal("160.00"),
        )
        resp = self.client.get(
            "/api/financeiro/relatorio/por-centro/",
            {"mes": self.hoje.month, "ano": self.hoje.year},
        )
        self.assertEqual(resp.status_code, 200)
        praia = self._centro(resp.data["atual"], "Praia")
        turma = self._turma(praia, "08:00")
        self.assertEqual(praia["pago"], 160.0)
        self.assertEqual(praia["alunos"], 1)
        self.assertEqual(praia["qtd_pago"], 1)
        self.assertFalse(praia["teve_wellhub"])
        self.assertEqual(turma["pago"], 160.0)
        self.assertEqual(turma["nome"], "Segunda-feira - 08:00")
        self.assertFalse(turma["teve_wellhub"])
        self.assertEqual(self._centro(resp.data["atual"], "Quadra")["pago"], 0.0)

    def test_mensalidade_em_duas_turmas_do_mesmo_centro_e_dividida(self):
        aluno = _criar_usuario("39053344705", "Caio")
        self.turma_praia.alunos.add(aluno)
        self.turma_praia_tarde.alunos.add(aluno)
        self._mensalidade(
            aluno,
            Decimal("200.00"),
            date(self.hoje.year, self.hoje.month, min(self.hoje.day, 28)),
            status="pago",
        )
        resp = self.client.get(
            "/api/financeiro/relatorio/por-centro/",
            {"mes": self.hoje.month, "ano": self.hoje.year},
        )
        praia = self._centro(resp.data["atual"], "Praia")
        self.assertEqual(praia["pago"], 200.0)
        self.assertEqual(praia["alunos"], 1)
        self.assertEqual(praia["qtd_pago"], 1)
        self.assertEqual(self._turma(praia, "08:00")["pago"], 100.0)
        self.assertEqual(self._turma(praia, "16:00")["pago"], 100.0)
        self.assertEqual(resp.data["atual"]["totais"]["pago"], 200.0)

    def test_mensalidade_em_dois_centros_e_dividida(self):
        aluno = _criar_usuario("52998224725", "Lia")
        self.turma_praia.alunos.add(aluno)
        self.turma_quadra.alunos.add(aluno)
        self._mensalidade(
            aluno,
            Decimal("200.00"),
            date(self.hoje.year, self.hoje.month, min(self.hoje.day, 28)),
            status="pago",
        )
        resp = self.client.get(
            "/api/financeiro/relatorio/por-centro/",
            {"mes": self.hoje.month, "ano": self.hoje.year},
        )
        atual = resp.data["atual"]
        self.assertEqual(self._centro(atual, "Praia")["pago"], 100.0)
        self.assertEqual(self._centro(atual, "Quadra")["pago"], 100.0)
        self.assertEqual(atual["totais"]["pago"], 200.0)

    def test_aluno_sem_turma_vai_para_sem_centro(self):
        aluno = _criar_usuario("11144477735", "Sem Turma")
        ontem = self.hoje - timedelta(days=1)
        self._mensalidade(aluno, Decimal("80.00"), ontem, status="pendente")
        resp = self.client.get(
            "/api/financeiro/relatorio/por-centro/",
            {"mes": ontem.month, "ano": ontem.year},
        )
        sem_centro = self._centro(resp.data["atual"], "Sem centro de treinamento")
        self.assertEqual(sem_centro["atrasado"], 80.0)
        self.assertEqual(sem_centro["turmas"][0]["nome"], "Sem turma")

    def test_wellhub_marca_centro_turma_e_lista_o_aluno(self):
        aluno = _criar_usuario("15350946056", "Regular")
        self.turma_praia.alunos.add(aluno)
        self._mensalidade(
            aluno,
            Decimal("150.00"),
            date(self.hoje.year, self.hoje.month, min(self.hoje.day, 28)),
            status="pago",
        )
        cadastro = CadastroWellhub.objects.create(
            wellhub_user_id="wh-centro",
            first_name="João",
            last_name="Wellhub",
        )
        tz = timezone.get_current_timezone()
        occur = timezone.make_aware(datetime.combine(self.hoje, self.turma_praia.horario), tz)
        slot = WellhubSlot.objects.create(
            turma=self.turma_praia,
            data_aula=self.hoje,
            occur_date=occur,
            wellhub_slot_id="slot-centro-1",
            total_capacity=5,
            opens_at=occur - timedelta(days=2),
            closes_at=occur - timedelta(minutes=10),
        )
        WellhubBooking.objects.create(
            wellhub_booking_id="b-centro-1",
            slot=slot,
            cadastro=cadastro,
            status="confirmed",
            presenca_confirmada=True,
            checkin_validado=True,
        )
        WellhubBooking.objects.create(
            wellhub_booking_id="b-centro-rejeitada",
            slot=slot,
            cadastro=cadastro,
            status="rejected",
        )
        resp = self.client.get(
            "/api/financeiro/relatorio/por-centro/",
            {"mes": self.hoje.month, "ano": self.hoje.year},
        )
        atual = resp.data["atual"]
        praia = self._centro(atual, "Praia")
        manha = self._turma(praia, "08:00")
        tarde = self._turma(praia, "16:00")
        self.assertTrue(praia["teve_wellhub"])
        self.assertEqual(praia["wellhub_alunos"], 1)
        self.assertEqual(praia["wellhub_reservas"], 1)
        self.assertEqual(praia["wellhub_presencas"], 1)
        self.assertTrue(manha["teve_wellhub"])
        self.assertFalse(tarde["teve_wellhub"])
        self.assertFalse(self._centro(atual, "Quadra")["teve_wellhub"])
        self.assertEqual(atual["centros_com_wellhub"], 1)
        self.assertEqual(len(atual["wellhub_alunos"]), 1)
        linha = atual["wellhub_alunos"][0]
        self.assertEqual(linha["nome"], "João Wellhub")
        self.assertEqual(linha["ct_nome"], "Praia")
        self.assertEqual(linha["turma_nome"], "Segunda-feira - 08:00")
        self.assertEqual(linha["presencas"], 1)
        self.assertEqual(linha["checkins"], 1)
        self.assertEqual(linha["reservas"], 1)

    def test_comparacao_traz_o_outro_mes(self):
        aluno = _criar_usuario("86954321000", "Otto")
        self.turma_quadra.alunos.add(aluno)
        anterior = date(self.hoje.year if self.hoje.month > 1 else self.hoje.year - 1, 1 if self.hoje.month == 1 else self.hoje.month - 1, 10)
        # 10 do mês anterior pode ser dia futuro em relação a "hoje" só se cruzar... não, mês anterior day 10 is past
        # unless hoje is early and we use status pago so date doesn't matter
        self._mensalidade(aluno, Decimal("90.00"), anterior, status="pago")
        resp = self.client.get(
            "/api/financeiro/relatorio/por-centro/",
            {"mes": self.hoje.month, "ano": self.hoje.year},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["mes_comparacao"], anterior.month)
        self.assertEqual(resp.data["ano_comparacao"], anterior.year)
        self.assertEqual(self._centro(resp.data["comparacao"], "Quadra")["pago"], 90.0)
        self.assertEqual(resp.data["atual"]["totais"]["pago"], 0.0)
