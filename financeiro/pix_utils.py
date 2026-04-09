"""
Utilitários PIX (BR Code / copia e cola) e QR Code para e-mails e API.
"""
from __future__ import annotations

import logging
import re
from io import BytesIO
from typing import Optional

logger = logging.getLogger(__name__)

# Cobrança PIX imediata (DICT) — EMV costuma começar por 00020126…
_PREFIXO_BR_CODE_PIX = "000201"


def normalizar_codigo_pix(codigo: Optional[str]) -> Optional[str]:
    """
    Remove quebras de linha, espaços e caracteres invisíveis que quebram
    o "copia e cola" em apps (PagBank, Nubank, etc.).
    O BR Code deve ser uma única string contínua.
    """
    if codigo is None:
        return None
    s = str(codigo).strip()
    if not s:
        return None
    # Remove apenas quebras de linha/tabulações.
    # IMPORTANTE: não remover espaços internos indiscriminadamente, pois podem
    # fazer parte do payload EMV e alterar comprimento/CRC do BR Code.
    s = s.replace("\r", "").replace("\n", "").replace("\t", "")
    for zw in ("\u200b", "\u200c", "\u200d", "\ufeff", "\xa0"):
        s = s.replace(zw, "")
    return s or None


def br_code_pix_parece_valido(codigo: str) -> bool:
    """Verificação leve do formato BR Code PIX (não valida CRC)."""
    if not codigo or len(codigo) < 50:
        return False
    if not codigo.startswith(_PREFIXO_BR_CODE_PIX):
        return False
    return bool(re.match(r"^[0-9A-Za-z]+$", codigo))


def gerar_qr_pix_png_bytes(codigo_pix: str) -> Optional[bytes]:
    """Gera PNG do QR Code a partir do BR Code (mesmo payload do copia e cola)."""
    if not codigo_pix:
        return None
    try:
        import qrcode  # type: ignore
        from qrcode.constants import ERROR_CORRECT_M  # type: ignore

        qr = qrcode.QRCode(
            version=None,
            error_correction=ERROR_CORRECT_M,
            box_size=6,
            border=2,
        )
        qr.add_data(codigo_pix)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    except ImportError:
        logger.warning("Pacote qrcode não instalado; QR Code não gerado.")
    except Exception as e:
        logger.warning("Erro ao gerar PNG do QR PIX: %s", e)
    return None
