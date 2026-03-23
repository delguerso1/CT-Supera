# Deploy em produção (GitHub Actions → Hostinger)

O deploy automático está no workflow [`.github/workflows/deploy.yml`](workflows/deploy.yml).

## Quando roda

| Gatilho | Comportamento |
|--------|----------------|
| **Push na branch `main`** | Executa testes do backend, build do React, `rsync` para o VPS, migrações, `collectstatic`, reinício do `gunicorn` (`systemd`) |
| **Actions → “Deploy CT Supera to Hostinger” → Run workflow** | Mesmo fluxo, sem precisar push |

## Segredos obrigatórios (GitHub)

No repositório: **Settings → Secrets and variables → Actions → New repository secret**

| Nome | Descrição |
|------|-----------|
| `SSH_PRIVATE_KEY` | Chave privada SSH (formato PEM/OpenSSH) com acesso ao servidor |
| `HOST` | IP ou hostname do VPS (ex.: `123.45.67.89`) |
| `USERNAME` | Usuário SSH (ex.: `root`) |
| `DJANGO_SECRET_KEY` | Secret usado só no job de CI para `makemigrations --check` e `manage.py check` |

O ambiente **production** (com URL `https://ctsupera.com.br`) pode exigir aprovação manual se estiver configurado em **Settings → Environments**.

## Servidor (já esperado pelo workflow)

- Código em `/root/ct-supera/`
- Virtualenv em `/root/ct-supera/venv`
- Django com `app.settings_hostinger`
- Serviço systemd `ctsupera`
- Nginx com site configurado (ex.: `nginx_hostinger.conf` no repositório)
- Endpoint de saúde testado: `http://localhost:8001/api/status/` ou `https://ctsupera.com.br/api/status/`

O `.env` **não** é sobrescrito pelo deploy (está no `rsync --exclude`).

## Rollback

Use o workflow [`.github/workflows/rollback.yml`](workflows/rollback.yml) (manual). Ele restaura o último tarball em `/root/backups/` ou um backup informado.

## CI em PRs

O workflow [`.github/workflows/test.yml`](workflows/test.yml) roda em **pull requests** para `main` / `develop` e em push em `develop`.

## Checklist antes de subir para `main`

1. `python manage.py migrate` aplicável testado (ou confiar no deploy que roda migrate no servidor)
2. Frontend: `cd ct-supera-frontend && npm run build` localmente
3. Sem credenciais commitadas; `.env` só no servidor

## Primeira vez / novo repositório

1. Criar os segredos acima.
2. Garantir que o VPS já tenha o layout, venv, `systemd` e banco como no ambiente atual.
3. Fazer merge ou push para `main` (ou disparar o workflow manualmente).
