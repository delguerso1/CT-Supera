# 🚀 Guia de Deploy CI/CD - CT Supera

## 📋 Índice
1. [Configuração Inicial](#configuração-inicial)
2. [Configuração dos Secrets](#configuração-dos-secrets)
3. [Como Funciona](#como-funciona)
4. [Como Fazer Deploy](#como-fazer-deploy)
5. [Rollback](#rollback)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Configuração Inicial

### 1. Preparar o Servidor

Conecte no servidor via SSH e execute:

```bash
# Criar diretório de backups
mkdir -p /root/backups

# Instalar rsync (se não estiver instalado)
apt-get update
apt-get install -y rsync

# Verificar se os serviços estão rodando
systemctl status ctsupera
systemctl status nginx
systemctl status postgresql
```

### 2. Configurar SSH Key para GitHub Actions

No seu **computador local**, execute:

```bash
# Gerar par de chaves SSH (se ainda não tiver)
ssh-keygen -t rsa -b 4096 -C "github-actions@ctsupera.com" -f ~/.ssh/github_actions_key

# Copiar chave pública para o servidor
ssh-copy-id -i ~/.ssh/github_actions_key.pub root@72.60.145.13

# Exibir chave privada (vamos adicionar como secret no GitHub)
cat ~/.ssh/github_actions_key
```

**⚠️ IMPORTANTE**: Guarde a chave privada em local seguro!

---

## 🔐 Configuração dos Secrets no GitHub

Acesse seu repositório no GitHub:
`https://github.com/SEU_USUARIO/ct-supera/settings/secrets/actions`

### Adicionar os seguintes Secrets:

| Secret Name | Valor | Descrição |
|------------|-------|-----------|
| `SSH_PRIVATE_KEY` | Conteúdo do arquivo `~/.ssh/github_actions_key` | Chave privada SSH |
| `HOST` | `SEU_IP_SERVIDOR` | Ver CREDENTIALS.md |
| `USERNAME` | `SEU_USUARIO_SSH` | Ver CREDENTIALS.md (geralmente `root`) |

### Como adicionar um Secret:

1. Clique em **"New repository secret"**
2. Preencha **Name** (nome do secret)
3. Cole o **Value** (valor)
4. Clique em **"Add secret"**

---

## 🎯 Como Funciona

### Workflows Criados

#### 1. **deploy.yml** - Deploy Automático
- **Quando executa**: Automaticamente quando você faz push para `main`
- **O que faz**:
  - ✅ Executa testes
  - ✅ Build do frontend React
  - ✅ Cria backup automático
  - ✅ Sincroniza código via rsync
  - ✅ Executa migrações
  - ✅ Coleta arquivos estáticos
  - ✅ Reinicia serviços
  - ✅ Verifica status
  - ❌ Rollback automático se falhar

#### 2. **test.yml** - Testes em Pull Requests
- **Quando executa**: Em Pull Requests e pushes para `develop`
- **O que faz**:
  - ✅ Testa backend (Python/Django)
  - ✅ Testa frontend (React)
  - ✅ Verifica qualidade do código

#### 3. **rollback.yml** - Rollback Manual
- **Quando executa**: Manualmente quando necessário
- **O que faz**:
  - ✅ Lista backups disponíveis
  - ✅ Restaura backup anterior
  - ✅ Reinicia serviços

---

## 🚀 Como Fazer Deploy

### Método 1: Push Automático (Recomendado)

```bash
# 1. Fazer suas alterações
git add .
git commit -m "feat: implementar nova funcionalidade"

# 2. Push para main (deploy automático)
git push origin main
```

### Método 2: Deploy Manual via GitHub

1. Acesse: `https://github.com/SEU_USUARIO/ct-supera/actions`
2. Clique em **"Deploy CT Supera to Hostinger"**
3. Clique em **"Run workflow"**
4. Selecione a branch `main`
5. Clique em **"Run workflow"**

### Acompanhar o Deploy

1. Acesse: `https://github.com/SEU_USUARIO/ct-supera/actions`
2. Clique no workflow em execução
3. Veja os logs em tempo real

**Status dos Jobs:**
- 🟡 Amarelo = Em execução
- 🟢 Verde = Sucesso
- 🔴 Vermelho = Falha

---

## ⏮️ Rollback

### Quando fazer rollback?

- ❌ Deploy apresentou erros em produção
- ❌ Funcionalidade não está funcionando
- ❌ Precisa voltar para versão anterior urgentemente

### Como fazer rollback?

#### Opção 1: Via GitHub Actions (Recomendado)

1. Acesse: `https://github.com/SEU_USUARIO/ct-supera/actions`
2. Clique em **"Rollback para Backup Anterior"**
3. Clique em **"Run workflow"**
4. Deixe em branco para usar o backup mais recente OU
5. Digite o nome do backup específico (ex: `ct-supera-backup-20250113-143022.tar.gz`)
6. Clique em **"Run workflow"**

#### Opção 2: Manual via SSH

```bash
# Conectar no servidor
ssh root@72.60.145.13

# Ver backups disponíveis
ls -lht /root/backups/ct-supera-backup-*.tar.gz

# Restaurar backup específico
cd /root
tar -xzf backups/ct-supera-backup-20250113-143022.tar.gz

# Reiniciar serviço
systemctl restart ctsupera
```

---

## 🔍 Troubleshooting

### ❌ Deploy falhou - "Permission denied"

**Problema**: GitHub Actions não consegue conectar ao servidor

**Solução**:
```bash
# No servidor, verificar se a chave foi adicionada
cat ~/.ssh/authorized_keys | grep github-actions

# Adicionar manualmente se necessário
echo "SUA_CHAVE_PUBLICA" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### ❌ Deploy falhou - "Service failed to start"

**Problema**: Aplicação Django não inicializou

**Solução**:
```bash
# Conectar no servidor
ssh root@72.60.145.13

# Ver logs do serviço
journalctl -u ctsupera -n 50 --no-pager

# Ver logs da aplicação
tail -f /root/ct-supera/logs/django.log

# Verificar arquivo .env
cat /root/ct-supera/.env

# Reiniciar manualmente
systemctl restart ctsupera
```

### ❌ Frontend não atualizou

**Problema**: Arquivos estáticos não foram atualizados

**Solução**:
```bash
# No servidor
cd /root/ct-supera
source venv/bin/activate
python manage.py collectstatic --noinput --settings=app.settings_hostinger

# Limpar cache do Nginx
systemctl reload nginx
```

### ❌ Migrações falharam

**Problema**: Erro ao executar migrações

**Solução**:
```bash
# No servidor
cd /root/ct-supera
source venv/bin/activate

# Ver status das migrações
python manage.py showmigrations --settings=app.settings_hostinger

# Executar migrações manualmente
python manage.py migrate --settings=app.settings_hostinger

# Se houver conflito, fazer fake migration
python manage.py migrate --fake <app> <migration> --settings=app.settings_hostinger
```

---

## 📊 Monitoramento

### Ver logs em tempo real:

```bash
# Logs da aplicação
journalctl -u ctsupera -f

# Logs do Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Logs do PostgreSQL
tail -f /var/log/postgresql/postgresql-13-main.log
```

### Verificar status dos serviços:

```bash
systemctl status ctsupera
systemctl status nginx
systemctl status postgresql
```

---

## 🎯 Boas Práticas

### ✅ DO (Faça):

- ✅ Sempre teste localmente antes do push
- ✅ Use mensagens de commit descritivas
- ✅ Faça deploy em horários de baixo tráfego
- ✅ Monitore os logs após o deploy
- ✅ Mantenha backups por pelo menos 30 dias

### ❌ DON'T (Não Faça):

- ❌ Fazer push direto para `main` sem testar
- ❌ Ignorar falhas nos testes
- ❌ Fazer deploy em horários de pico
- ❌ Deletar backups sem verificar
- ❌ Compartilhar as chaves SSH

---

## 📞 Suporte

Se precisar de ajuda:

1. Verifique os logs do GitHub Actions
2. Verifique os logs do servidor
3. Consulte este guia
4. Entre em contato com a equipe de desenvolvimento

---

## 📝 Changelog

### Versão 1.0 - 13/01/2025
- ✅ Implementação inicial do CI/CD
- ✅ Deploy automático
- ✅ Testes automatizados
- ✅ Sistema de rollback
- ✅ Backups automáticos

---

**🎉 Parabéns! Você agora tem um sistema de deploy profissional!**

