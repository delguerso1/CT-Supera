from django.test import TestCase

from wellhub.services.sync_classes import _class_id_from_response


class ClassIdFromResponseTests(TestCase):
    def test_extrai_id_da_lista_classes(self):
        resp = {"classes": [{"id": 42, "name": "Aula"}]}
        self.assertEqual(_class_id_from_response(resp), "42")

    def test_extrai_id_resposta_plana(self):
        resp = {"id": 99}
        self.assertEqual(_class_id_from_response(resp), "99")
