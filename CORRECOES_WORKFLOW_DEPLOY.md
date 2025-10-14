# 🔧 Correções no Workflow de Deploy

**Arquivos Modificados:**
- `.github/workflows/deploy.yml`
- `app/settings_hostinger.py`

## 📋 Correções Implementadas

### 🔴 **1. Verificação de Migrações - Falta de Variáveis de Ambiente**
- **Problema:** Job de testes falhava por falta de `DJANGO_SECRET_KEY`
- **Solução:** Adicionadas variáveis de ambiente no job de testes
- **Impacto:** Testes passam corretamente

### 🔴 **2. Comandos SystemCTL Sem Permissões**
- **Problema:** Deploy falha se usuário SSH não for root
- **Solução:** Adicionado `sudo` em todos os comandos `systemctl`
- **Impacto:** Deploy funciona com usuário não-root (requer sudo configurado)

### 🔴 **3. VULNERABILIDADE CRÍTICA - CORS Aberto**
- **Problema:** `CORS_ALLOW_ALL_ORIGINS = True` permitia acesso de qualquer origem
- **Solução:** Removida configuração insegura, mantidas apenas origens específicas
- **Impacto:** **Vulnerabilidade crítica eliminada** - apenas domínios autorizados acessam a API

### 🟡 **4. Falta de Health Check**
- **Problema:** Deploy marcado como sucesso mesmo com aplicação quebrada
- **Solução:** Implementado health check que verifica:
  - Se o serviço systemd está ativo
  - Se a aplicação responde HTTP (10 tentativas de 3s)
- **Impacto:** Deploy falha e aciona rollback se aplicação não iniciar

### 🟡 **5. Rsync Perigoso**
- **Problema:** Excluía todo diretório `ct-supera-frontend/`, podendo perder código fonte
- **Solução:** Exclui apenas `build/` e `node_modules/`, preserva código fonte
- **Impacto:** Código fonte do frontend protegido no servidor

## 🔧 Configuração Necessária

### GitHub Secrets (Settings → Secrets and variables → Actions)
- `SSH_PRIVATE_KEY` - Chave SSH privada
- `HOST` - IP ou domínio do servidor
- `USERNAME` - Usuário SSH
- `DJANGO_SECRET_KEY` - Chave secreta do Django

## ⚠️ Pontos de Atenção

### Sudo no Servidor
Configure sudo sem senha para os comandos systemctl:
```bash
# /etc/sudoers.d/deploy
root ALL=(ALL) NOPASSWD: /bin/systemctl restart ctsupera
root ALL=(ALL) NOPASSWD: /bin/systemctl status *
root ALL=(ALL) NOPASSWD: /bin/systemctl is-active ctsupera
```

### SSL/HTTPS
**Sem SSL:** Configure no `.env` do servidor:
```bash
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False
```

**Com SSL:** 
```bash
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

## ✅ Checklist

- [ ] Secrets configurados no GitHub
- [ ] Arquivo `.env` no servidor
- [ ] Sudo configurado (veja acima)
- [ ] SSL configurado (ou variáveis ajustadas)
- [ ] CORS sem `ALLOW_ALL_ORIGINS`

