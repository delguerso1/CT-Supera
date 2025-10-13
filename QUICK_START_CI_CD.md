# 🚀 Início Rápido - CI/CD CT Supera

Siga estes passos para configurar o CI/CD em **10 minutos**!

---

## 📋 Pré-requisitos

- ✅ Acesso SSH ao servidor Hostinger (root@72.60.145.13)
- ✅ Repositório no GitHub
- ✅ Git instalado localmente
- ✅ Projeto funcionando no servidor

---

## ⚡ Passo a Passo Rápido

### 1️⃣ Preparar o Servidor (NO SERVIDOR)

```bash
# Conectar ao servidor (use suas credenciais reais do arquivo CREDENTIALS.md)
ssh root@SEU_IP_SERVIDOR

# Download e executar script de preparação
cd /root/ct-supera
chmod +x scripts/server_setup.sh
./scripts/server_setup.sh

# Aguardar conclusão
```

**Tempo: ~2 minutos**

---

### 2️⃣ Gerar Chaves SSH (NO SEU COMPUTADOR)

```bash
# Navegar até o projeto
cd ct-supera

# Executar script de configuração
chmod +x scripts/setup_ci_cd.sh
./scripts/setup_ci_cd.sh
```

O script irá:
- ✅ Gerar chave SSH
- ✅ Copiar para o servidor
- ✅ Mostrar a chave privada para você copiar

**Tempo: ~2 minutos**

---

### 3️⃣ Configurar Secrets no GitHub

1. **Acesse**: `https://github.com/SEU_USUARIO/ct-supera/settings/secrets/actions`

2. **Adicione 3 secrets** (clique em "New repository secret"):

| Nome | Valor | Onde encontrar |
|------|-------|----------------|
| `SSH_PRIVATE_KEY` | Chave privada completa | Output do script do passo 2 |
| `HOST` | `SEU_IP_SERVIDOR` | Ver arquivo CREDENTIALS.md |
| `USERNAME` | `root` | Ver arquivo CREDENTIALS.md |

3. **Como adicionar cada secret**:
   - Clique em "New repository secret"
   - Cole o **Name**
   - Cole o **Value**
   - Clique em "Add secret"

**Tempo: ~2 minutos**

---

### 4️⃣ Commit e Push dos Arquivos de Workflow

```bash
# Adicionar os arquivos
git add .github/workflows/
git add scripts/
git add DEPLOY_CI_CD.md
git add QUICK_START_CI_CD.md
git add .gitignore

# Commit
git commit -m "feat: adicionar CI/CD com GitHub Actions"

# Push
git push origin main
```

**Tempo: ~1 minuto**

---

### 5️⃣ Verificar o Deploy

1. **Acesse**: `https://github.com/SEU_USUARIO/ct-supera/actions`
2. Você verá o workflow "Deploy CT Supera to Hostinger" executando
3. Clique nele para ver o progresso em tempo real

**Tempo: ~3 minutos (tempo de execução)**

---

## ✅ Pronto! CI/CD Configurado!

Agora, **toda vez que você fizer push para main**, o deploy será automático!

```bash
# Workflow de trabalho diário:
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
# 🎉 Deploy automático acontece!
```

---

## 🎯 O que Acontece Automaticamente

Quando você faz `git push origin main`:

1. ✅ **Testes** executam automaticamente
2. ✅ **Build** do frontend React
3. ✅ **Backup** automático do servidor
4. ✅ **Deploy** do código
5. ✅ **Migrações** do banco de dados
6. ✅ **Coleta** de arquivos estáticos
7. ✅ **Reinicialização** dos serviços
8. ✅ **Verificação** de saúde
9. ❌ **Rollback** automático se algo falhar

---

## 🔍 Como Monitorar

### Ver Deploy em Tempo Real
- Acesse: `https://github.com/SEU_USUARIO/ct-supera/actions`

### Ver Logs no Servidor
```bash
ssh root@SEU_IP_SERVIDOR
journalctl -u ctsupera -f
```

### Ver Backups Criados
```bash
ssh root@SEU_IP_SERVIDOR
ls -lht /root/backups/
```

---

## 🆘 Problemas Comuns

### ❌ "Permission denied (publickey)"

**Solução**:
```bash
# No servidor
cat ~/.ssh/authorized_keys | grep github-actions

# Se não aparecer nada, adicione manualmente:
echo "SUA_CHAVE_PUBLICA" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### ❌ Deploy falhou

**Solução rápida - Rollback**:
1. Acesse: `https://github.com/SEU_USUARIO/ct-supera/actions`
2. Clique em "Rollback para Backup Anterior"
3. Clique em "Run workflow"
4. Clique em "Run workflow" novamente

---

## 📚 Documentação Completa

Para mais detalhes, consulte: **[DEPLOY_CI_CD.md](DEPLOY_CI_CD.md)**

---

## 🎉 Benefícios do CI/CD

Antes (Manual):
```
❌ 15-30 minutos por deploy
❌ Risco de erros humanos
❌ Sem testes automáticos
❌ Difícil fazer rollback
❌ Sem histórico de deploys
```

Agora (Automático):
```
✅ 3-5 minutos por deploy
✅ Zero erros humanos
✅ Testes em cada deploy
✅ Rollback com 1 clique
✅ Histórico completo
✅ Backups automáticos
```

---

## 🚀 Próximos Passos (Opcional)

Após dominar o básico, você pode:

1. **Adicionar testes** em `test.yml`
2. **Configurar notificações** (Slack, Discord, Email)
3. **Adicionar ambiente de staging**
4. **Implementar deploy por tags** (v1.0.0, v1.1.0)
5. **Adicionar análise de código** (SonarQube)

---

**Dúvidas?** Consulte [DEPLOY_CI_CD.md](DEPLOY_CI_CD.md) ou os logs no GitHub Actions!

