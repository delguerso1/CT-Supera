from datetime import date, time, timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone

from ct.models import CentroDeTreinamento
from turmas.models import DiaSemana, Turma
from wellhub.constants import CT_NOME_PILOTO, DIAS_WELLHUB
from wellhub.services.sync_slots import iter_slot_dates, _is_wellhub_day, upsert_local_slot
from wellhub.models import WellhubTurmaConfig


class IterSlotDatesTests(TestCase):
    def test_apenas_segunda_e_quarta_no_mes(self):
        # Maio 2026: 1º é sexta — pegamos seg 4 e qua 6 entre outros
        hoje = date(2026, 5, 4)  # segunda
        datas = list(iter_slot_dates(hoje))
        for d in datas:
            self.assertTrue(_is_wellhub_day(d), f"{d} não é dia Wellhub")
            self.assertNotEqual(d.weekday(), 4, "Sexta não deve aparecer")

    def test_nao_inclui_sexta(self):
        hoje = date(2026, 5, 1)  # sexta
        datas = list(iter_slot_dates(hoje))
        self.assertTrue(all(d.weekday() != 4 for d in datas))


class UpsertLocalSlotTests(TestCase):
    def setUp(self):
        self.ct = CentroDeTreinamento.objects.create(nome=CT_NOME_PILOTO)
        self.seg, _ = DiaSemana.objects.get_or_create(nome="Segunda-feira")
        self.qua, _ = DiaSemana.objects.get_or_create(nome="Quarta-feira")
        self.sex, _ = DiaSemana.objects.get_or_create(nome="Sexta-feira")
        self.turma = Turma.objects.create(
            ct=self.ct,
            horario=time(7, 0),
            capacidade_maxima=20,
            ativo=True,
        )
        self.turma.dias_semana.set([self.seg, self.qua, self.sex])
        self.turma_config = WellhubTurmaConfig.objects.create(
            turma=self.turma,
            publicar_wellhub=True,
            cota_wellhub=5,
        )

    def test_cria_slot_segunda(self):
        data_aula = date(2026, 5, 4)  # segunda
        slot = upsert_local_slot(self.turma_config, data_aula)
        self.assertEqual(slot.total_capacity, 5)
        self.assertEqual(slot.data_aula, data_aula)
        self.assertEqual(slot.closes_at, slot.occur_date - timedelta(minutes=10))
