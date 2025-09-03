# 📋 Guia de Configuração do Arquivo .env

## 🚀 Passo a Passo para Configurar

### 1. Criar o arquivo .env
```bash
# Copie o template
cp env_template.txt .env
```

### 2. Gerar Chave Secreta
```bash
python gerar_chave_secreta.py
```
Copie a chave gerada e substitua no arquivo `.env`

### 3. Configurar Variáveis Obrigatórias

#### 🔐 Django (OBRIGATÓRIO)
```env
DJANGO_SECRET_KEY=sua-chave-gerada-pelo-script
DJANGO_DEBUG=True  # False para produção
```

#### 🌐 Servidor (OBRIGATÓRIO para produção)
```env
DOMAIN_NAME=seu-dominio.com
SERVER_IP=seu-ip-do-servidor
```

#### 📧 E-mail (OBRIGATÓRIO para funcionalidades de e-mail)
```env
EMAIL_HOST_USER=seu-email@gmail.com
EMAIL_HOST_PASSWORD=sua-senha-de-app-gmail
```

**Como obter senha de app do Gmail:**
1. Acesse: https://myaccount.google.com/apppasswords
2. Gere uma senha para "Django"
3. Use essa senha no `EMAIL_HOST_PASSWORD`

#### 💳 Mercado Pago (OBRIGATÓRIO para pagamentos)
```env
MERCADO_PAGO_ACCESS_TOKEN=seu-token-mercado-pago
MERCADO_PAGO_PUBLIC_KEY=sua-chave-publica-mercado-pago
```

**Como obter credenciais do Mercado Pago:**
1. Acesse: https://www.mercadopago.com.br/developers
2. Crie uma aplicação
3. Copie as credenciais

### 4. Configurar Banco de Dados

#### Para Desenvolvimento (SQLite - Padrão)
Não precisa configurar nada, usa SQLite por padrão.

#### Para Produção (PostgreSQL - Hostinger)
```env
POSTGRES_DB_NAME=ctsupera
POSTGRES_DB_USER=ctsupera
POSTGRES_DB_PASSWORD=sua-senha-postgres
POSTGRES_DB_HOST=localhost
POSTGRES_DB_PORT=5432
```

### 5. Configurações por Ambiente

#### 🛠️ Desenvolvimento
```env
DJANGO_DEBUG=True
FRONTEND_URL=http://localhost:3000
SECURE_SSL_REDIRECT=False
```

#### 🚀 Produção
```env
DJANGO_DEBUG=False
FRONTEND_URL=https://seu-dominio.com
SECURE_SSL_REDIRECT=True
```

## 🔒 Segurança

### ✅ O que fazer:
- ✅ Use senhas fortes
- ✅ Gere chave secreta única
- ✅ Use HTTPS em produção
- ✅ Mantenha o arquivo .env no .gitignore

### ❌ O que NÃO fazer:
- ❌ Nunca commite o arquivo .env
- ❌ Não use senhas fracas
- ❌ Não compartilhe credenciais
- ❌ Não use DEBUG=True em produção

## 📁 Estrutura do Arquivo .env

```env
# ========================================
# CONFIGURAÇÕES DO DJANGO
# ========================================
DJANGO_SECRET_KEY=sua-chave-secreta
DJANGO_DEBUG=True

# ========================================
# CONFIGURAÇÕES DO SERVIDOR
# ========================================
DOMAIN_NAME=localhost
SERVER_IP=127.0.0.1

# ========================================
# CONFIGURAÇÕES DO BANCO DE DADOS
# ========================================
POSTGRES_DB_NAME=ctsupera
POSTGRES_DB_USER=ctsupera
POSTGRES_DB_PASSWORD=sua-senha
POSTGRES_DB_HOST=localhost
POSTGRES_DB_PORT=5432

# ========================================
# CONFIGURAÇÕES DE E-MAIL
# ========================================
EMAIL_HOST_USER=seu-email@gmail.com
EMAIL_HOST_PASSWORD=sua-senha-de-app

# ========================================
# CONFIGURAÇÕES DO FRONTEND
# ========================================
FRONTEND_URL=http://localhost:3000

# ========================================
# CONFIGURAÇÕES DO MERCADO PAGO
# ========================================
MERCADO_PAGO_ACCESS_TOKEN=seu-token
MERCADO_PAGO_PUBLIC_KEY=sua-chave-publica
```

## 🧪 Testando a Configuração

```bash
# Verificar se o Django carrega as variáveis
python manage.py check

# Testar conexão com banco
python manage.py dbshell

# Testar envio de e-mail
python manage.py shell
```

No shell do Django:
```python
from django.core.mail import send_mail
send_mail('Teste', 'Mensagem de teste', 'from@example.com', ['to@example.com'])
```

## 🆘 Solução de Problemas

### Erro: "SECRET_KEY not set"
- Verifique se o arquivo `.env` existe
- Confirme se `DJANGO_SECRET_KEY` está definida

### Erro: "Database connection failed"
- Verifique credenciais do banco
- Confirme se o banco está rodando

### Erro: "Email not sent"
- Verifique credenciais do Gmail
- Confirme se a senha de app está correta

### Erro: "CORS blocked"
- Verifique se `FRONTEND_URL` está correto
- Confirme configurações de CORS no settings.py 