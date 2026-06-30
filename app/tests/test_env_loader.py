import tempfile
import unittest
from pathlib import Path
from unittest import mock

from app.env_loader import patch_env_from_file, read_env_file_value, sanitize_secret_value


class ReadEnvFileValueTests(unittest.TestCase):
    def test_le_valor_simples(self):
        with tempfile.TemporaryDirectory() as tmp:
            env_path = Path(tmp) / ".env"
            env_path.write_text(
                "WELLHUB_GYM_ID=826411\n"
                "INVALID_LINE=('tuple', 'bad')\n"
                "WELLHUB_API_KEY=eyJhbGci.test.token\n",
                encoding="utf-8",
            )
            with mock.patch("app.env_loader.project_env_path", return_value=env_path):
                self.assertEqual(read_env_file_value("WELLHUB_API_KEY"), "eyJhbGci.test.token")

    def test_le_valor_com_aspas(self):
        with tempfile.TemporaryDirectory() as tmp:
            env_path = Path(tmp) / ".env"
            env_path.write_text('WELLHUB_API_KEY="quoted-key"\n', encoding="utf-8")
            with mock.patch("app.env_loader.project_env_path", return_value=env_path):
                self.assertEqual(read_env_file_value("WELLHUB_API_KEY"), "quoted-key")

    def test_remove_aspas_soltas(self):
        self.assertEqual(sanitize_secret_value('"token"'), "token")
        self.assertEqual(sanitize_secret_value('token"'), "token")

    def test_patch_preenche_variavel_ausente(self):
        with tempfile.TemporaryDirectory() as tmp:
            env_path = Path(tmp) / ".env"
            env_path.write_text("WELLHUB_API_KEY=from-file\n", encoding="utf-8")
            with mock.patch("app.env_loader.project_env_path", return_value=env_path):
                with mock.patch.dict("os.environ", {}, clear=True):
                    patch_env_from_file()
                    import os

                    self.assertEqual(os.environ.get("WELLHUB_API_KEY"), "from-file")
