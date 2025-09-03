#!/usr/bin/env python3
"""
Script automatizado para configurar o arquivo .env
Execute: python setup_env.py
"""

import os
import secrets
import string
from pathlib import Path

def gerar_chave_secreta():
    """Gera uma chave secreta segura para o Django"""
    caracteres = string.ascii_letters + string.digits + string.punctuation
    caracteres = caracteres.replace('"', '').replace("'", '').replace('\\', '')
    return ''.join(secrets.choice(caracteres) for _ in range(50))

def criar_arquivo_env():
    """Cria o arquivo .env com configurações básicas"""
    
    # Verifica se já existe
    if os.path.exists('.env'):
        print("⚠️  Arquivo .env já existe!")
        resposta = input("Deseja sobrescrever? (s/N): ").lower()
        if resposta != 's':
            print("❌ Operação cancelada.")
            return
    
    # Gera chave secreta
    chave_secreta = gerar_chave_secreta()
    
    # Template do arquivo .env
    env_content = f"""# ========================================
# CONFIGURAÇÕES DO DJANGO
# ========================================

# Chave secreta do Django (GERE UMA NOVA PARA PRODUÇÃO!)
DJANGO_SECRET_KEY={chave_secreta}

# Modo debug (True para desenvolvimento, False para produção)
DJANGO_DEBUG=True

# ========================================
# CONFIGURAÇÕES DO SERVIDOR
# ========================================

# Nome do domínio (para produção)
DOMAIN_NAME=localhost

# IP do servidor (para produção)
SERVER_IP=127.0.0.1

# ========================================
# CONFIGURAÇÕES DO BANCO DE DADOS
# ========================================

# Banco de dados PostgreSQL (Hostinger)
POSTGRES_DB_NAME=ctsupera
POSTGRES_DB_USER=ctsupera
POSTGRES_DB_PASSWORD=sua-senha-postgres
POSTGRES_DB_HOST=localhost
POSTGRES_DB_PORT=5432

# ========================================
# CONFIGURAÇÕES DE E-MAIL
# ========================================

# Servidor SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True

# Credenciais do e-mail
EMAIL_HOST_USER=seu-email@gmail.com
EMAIL_HOST_PASSWORD=sua-senha-de-app-gmail
DEFAULT_FROM_EMAIL=sistema@ctsupera.com

# ========================================
# CONFIGURAÇÕES DO FRONTEND
# ========================================

# URL do frontend React
FRONTEND_URL=http://localhost:3000

# ========================================
# CONFIGURAÇÕES DO MERCADO PAGO
# ========================================

# Credenciais do Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=seu-token-mercado-pago
MERCADO_PAGO_PUBLIC_KEY=sua-chave-publica-mercado-pago

# ========================================
# CONFIGURAÇÕES DE SEGURANÇA
# ========================================

# Configurações SSL (True para produção)
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False

# ========================================
# CONFIGURAÇÕES ADICIONAIS
# ========================================

# Timezone
TIME_ZONE=America/Sao_Paulo

# Idioma
LANGUAGE_CODE=pt-br
"""
    
    # Escreve o arquivo
    with open('.env', 'w', encoding='utf-8') as f:
        f.write(env_content)
    
    print("✅ Arquivo .env criado com sucesso!")
    print("🔑 Chave secreta gerada automaticamente")
    print("📝 Edite o arquivo .env com suas configurações específicas")
    print("📖 Consulte o arquivo CONFIGURACAO_ENV.md para mais detalhes")

def main():
    print("🚀 Configurador Automático do Arquivo .env")
    print("=" * 50)
    
    try:
        criar_arquivo_env()
        
        print("\n📋 PRÓXIMOS PASSOS:")
        print("1. Edite o arquivo .env com suas configurações")
        print("2. Configure seu e-mail Gmail (senha de app)")
        print("3. Configure credenciais do Mercado Pago")
        print("4. Para produção, altere DJANGO_DEBUG=False")
        print("5. Teste com: python manage.py check")
        
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    main() 