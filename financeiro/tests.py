from django.test import SimpleTestCase

from .c6_pix_sync import extrair_lista_pix_webhook


class ExtrairListaPixWebhookTests(SimpleTestCase):
    def test_array_na_raiz(self):
        body = [{"txid": "a", "endToEndId": "e1"}]
        self.assertEqual(len(extrair_lista_pix_webhook(body)), 1)

    def test_objeto_com_chave_pix(self):
        body = {
            "pix": [
                {"txid": "t1", "endToEndId": "e1", "valor": "10.00"},
                {"txid": "t2", "endToEndId": "e2", "valor": "20.00"},
            ]
        }
        self.assertEqual(len(extrair_lista_pix_webhook(body)), 2)

    def test_objeto_unico_pix(self):
        body = {"txid": "x", "valor": "5.00", "horario": "2025-01-01T12:00:00Z"}
        out = extrair_lista_pix_webhook(body)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["txid"], "x")
