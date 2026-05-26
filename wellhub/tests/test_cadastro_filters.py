from datetime import date, time, timedelta

from django.test import TestCase
from django.utils import timezone

from ct.models import CentroDeTreinamento
from turmas.models import DiaSemana, Turma
from wellhub.filters import (
    parse_mes_param,
    reservas_filter_q,
    resolve_semana_filtro,
    semana_intervalo,
)
from wellhub.models import CadastroWellhub, WellhubBooking, WellhubSlot, WellhubTurmaConfig


class CadastroFiltersTests(TestCase):
    def setUp(self):
        self.ct = CentroDeTreinamento.objects.create(nome="Praia de Itaipuaçu")
        seg, _ = DiaSemana.objects.get_or_create(nome="Segunda-feira")
        self.turma_7 = Turma.objects.create(
            ct=self.ct, horario=time(7, 0), capacidade_maxima=20, ativo=True
        )
        self.turma_19 = Turma.objects.create(
            ct=self.ct, horario=time(19, 0), capacidade_maxima=20, ativo=True
        )
        self.turma_7.dias_semana.set([seg])
        self.turma_19.dias_semana.set([seg])
        WellhubTurmaConfig.objects.create(
            turma=self.turma_7, wellhub_class_id="c7", publicar_wellhub=True
        )
        WellhubTurmaConfig.objects.create(
            turma=self.turma_19, wellhub_class_id="c19", publicar_wellhub=True
        )
        self.cadastro = CadastroWellhub.objects.create(
            wellhub_user_id="u1", first_name="Ana", last_name="Silva", email="a@test.com"
        )
        tz = timezone.get_current_timezone()
        self.data_marco = date(2026, 3, 4)
        self.data_abril = date(2026, 4, 6)

        def mk_slot(turma, data_aula):
            occur = timezone.make_aware(
                timezone.datetime.combine(data_aula, turma.horario), tz
            )
            return WellhubSlot.objects.create(
                turma=turma,
                data_aula=data_aula,
                occur_date=occur,
                wellhub_slot_id=f"slot-{turma.id}-{data_aula}",
                total_capacity=5,
                opens_at=occur - timedelta(days=2),
                closes_at=occur - timedelta(minutes=10),
            )

        self.slot_7_mar = mk_slot(self.turma_7, self.data_marco)
        self.slot_19_abr = mk_slot(self.turma_19, self.data_abril)
        WellhubBooking.objects.create(
            wellhub_booking_id="b1",
            slot=self.slot_7_mar,
            cadastro=self.cadastro,
            status="confirmed",
        )
        WellhubBooking.objects.create(
            wellhub_booking_id="b2",
            slot=self.slot_19_abr,
            cadastro=self.cadastro,
            status="cancelled",
        )

    def test_parse_mes(self):
        self.assertEqual(parse_mes_param("2026-03"), (2026, 3))
        self.assertIsNone(parse_mes_param("invalid"))

    def test_filtro_mes_e_turma(self):
        qs = CadastroWellhub.objects.filter(
            reservas_filter_q(turma_id=self.turma_7.id, mes=(2026, 3))
        ).distinct()
        self.assertEqual(list(qs), [self.cadastro])

        qs_abr_19 = CadastroWellhub.objects.filter(
            reservas_filter_q(turma_id=self.turma_19.id, mes=(2026, 4))
        ).distinct()
        self.assertEqual(list(qs_abr_19), [self.cadastro])

        qs_vazio = CadastroWellhub.objects.filter(
            reservas_filter_q(turma_id=self.turma_7.id, mes=(2026, 4))
        ).distinct()
        self.assertEqual(list(qs_vazio), [])

    def test_filtro_semana_no_mes(self):
        semana = resolve_semana_filtro((2026, 3), "2026-03-02")
        self.assertEqual(semana, semana_intervalo(date(2026, 3, 2)))
        qs = CadastroWellhub.objects.filter(reservas_filter_q(semana=semana)).distinct()
        self.assertEqual(list(qs), [self.cadastro])

        semana_abr = resolve_semana_filtro((2026, 4), "2026-04-06")
        qs_mar = CadastroWellhub.objects.filter(reservas_filter_q(semana=semana_abr)).distinct()
        self.assertEqual(list(qs_mar), [self.cadastro])
