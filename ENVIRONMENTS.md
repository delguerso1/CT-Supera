# Ambientes e variaveis

Este projeto usa variaveis de ambiente no backend (Django) e no mobile (React Native).

## Backend (Django)

Use `.env` na raiz do projeto. O arquivo `.env.example` mostra todas as variaveis esperadas.

### Desenvolvimento

- DJANGO_DEBUG=True
- C6_BANK_ENVIRONMENT=sandbox
- DB pode ser SQLite (default em `app/settings.py`) ou Postgres local

### Producao

- DJANGO_DEBUG=False
- C6_BANK_ENVIRONMENT=production
- Use Postgres com as variaveis `POSTGRES_*`
- Ative configuracoes de seguranca:
  - SECURE_SSL_REDIRECT=True
  - SESSION_COOKIE_SECURE=True
  - CSRF_COOKIE_SECURE=True

### Variaveis do C6 Bank

O backend seleciona as credenciais com base em `C6_BANK_ENVIRONMENT`.

Sandbox:
- C6_BANK_SANDBOX_CLIENT_ID
- C6_BANK_SANDBOX_CLIENT_SECRET
- C6_BANK_SANDBOX_CHAVE_PIX
- C6_BANK_SANDBOX_CERT_PATH
- C6_BANK_SANDBOX_KEY_PATH
- C6_BANK_SANDBOX_URL

Producao:
- C6_BANK_PRODUCTION_CLIENT_ID
- C6_BANK_PRODUCTION_CLIENT_SECRET
- C6_BANK_PRODUCTION_CHAVE_PIX
- C6_BANK_PRODUCTION_CERT_PATH
- C6_BANK_PRODUCTION_KEY_PATH
- C6_BANK_PRODUCTION_URL

### Email (SMTP)

- EMAIL_HOST
- EMAIL_PORT
- EMAIL_USE_TLS
- EMAIL_HOST_USER
- EMAIL_HOST_PASSWORD
- DEFAULT_FROM_EMAIL

### Cron - Lembretes de aula experimental

Para enviar lembretes por e-mail (24h antes da aula experimental), execute diariamente:

```bash
python manage.py enviar_lembretes_aula_experimental
```

Exemplo no crontab (todos os dias às 9h):
```
0 9 * * * cd /caminho/do/projeto && python manage.py enviar_lembretes_aula_experimental
```

### Outros

- FRONTEND_URL (links de ativacao/redefinicao, confirmacao e reagendamento)
- DOMAIN_NAME, SERVER_IP (ALLOWED_HOSTS)
- TIME_ZONE, LANGUAGE_CODE

## Mobile (React Native)

Use `CTSuperaMobile/.env` (nao reutilize o `.env` do backend).

Variaveis:
- API_BASE_URL (ex: http://10.0.2.2:8000/api/)

Observacao: o app nao deve conter segredos no bundle.
