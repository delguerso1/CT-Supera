#!/usr/bin/env python3
"""
Script para gerar uma chave secreta segura para o Django
Execute: python gerar_chave_secreta.py
"""

import secrets
import string

def gerar_chave_secreta():
    """Gera uma chave secreta segura para o Django"""
    # Caracteres permitidos para a chave
    caracteres = string.ascii_letters + string.digits + string.punctuation
    
    # Remove caracteres que podem causar problemas em variáveis de ambiente
    caracteres = caracteres.replace('"', '').replace("'", '').replace('\\', '')
    
    # Gera uma chave de 50 caracteres
    chave = ''.join(secrets.choice(caracteres) for _ in range(50))
    
    return chave

if __name__ == "__main__":
    chave_secreta = gerar_chave_secreta()
    print("=" * 60)
    print("CHAVE SECRETA GERADA PARA O DJANGO")
    print("=" * 60)
    print(f"DJANGO_SECRET_KEY={chave_secreta}")
    print("=" * 60)
    print("Copie esta linha e cole no seu arquivo .env")
    print("IMPORTANTE: Nunca compartilhe esta chave!")
    print("=" * 60) 