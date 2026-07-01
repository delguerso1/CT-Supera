from datetime import date, datetime, time, timedelta

from django.test import TestCase
from django.utils import timezone

from ct.models import CentroDeTreinamento
from turmas.models import DiaSemana, Turma
from wellhub.constants import CT_NOME_PILOTO
from wellhub.models import WellhubSlot, WellhubTurmaConfig
from wellhub.services.sync_slots import (
    _normalize_wellhub_datetime,
    _parse_remote_occur,
    _slot_matches_local,
    _slot_id_from_response,
    iter_slot_dates,
    _is_wellhub_day,
    upsert_local_slot,
)


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


class SlotIdFromResponseTests(TestCase):
    def test_extrai_id_da_lista_slots(self):
        resp = {"slots": [{"id": 77}]}
        self.assertEqual(_slot_id_from_response(resp), "77")


class SlotMatchesLocalTests(TestCase):
    def setUp(self):
        self.ct = CentroDeTreinamento.objects.create(nome=CT_NOME_PILOTO)
        self.turma = Turma.objects.create(
            ct=self.ct,
            horario=time(7, 0),
            capacidade_maxima=20,
            ativo=True,
        )
        tz = timezone.get_current_timezone()
        occur = timezone.make_aware(datetime(2026, 7, 1, 7, 0), tz)
        self.slot = WellhubSlot(
            turma=self.turma,
            data_aula=date(2026, 7, 1),
            occur_date=occur,
            opens_at=occur,
            closes_at=occur,
            total_capacity=5,
        )

    def test_match_por_data_e_horario(self):
        item = {"id": 99, "occur_date": "2026-07-01T07:00:00-03:00"}
        self.assertTrue(_slot_matches_local(self.slot, item))

    def test_match_formato_wellhub_utc(self):
        item = {"id": 99, "occur_date": "2026-07-01T10:00:00Z[UTC]"}
        self.assertTrue(_slot_matches_local(self.slot, item))

    def test_parse_wellhub_utc_suffix(self):
        parsed = _parse_remote_occur("2026-07-01T10:00:00Z[UTC]")
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed.date(), date(2026, 7, 1))
        self.assertEqual(parsed.hour, 7)
        self.assertEqual(parsed.minute, 0)

    def test_normalize_wellhub_datetime(self):
        self.assertEqual(
            _normalize_wellhub_datetime("2026-07-01T10:00:00Z[UTC]"),
            "2026-07-01T10:00:00Z",
        )

    def test_nao_match_horario_diferente(self):
        item = {"id": 99, "occur_date": "2026-07-01T08:00:00-03:00"}
        self.assertFalse(_slot_matches_local(self.slot, item))


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
