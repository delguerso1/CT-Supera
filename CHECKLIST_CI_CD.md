# ✅ Checklist de Configuração CI/CD

Use este checklist para garantir que tudo está configurado corretamente.

---

## 📦 Pré-Deploy

### Arquivos do Projeto
- [ ] `.github/workflows/deploy.yml` criado
- [ ] `.github/workflows/test.yml` criado
- [ ] `.github/workflows/rollback.yml` criado
- [ ] `scripts/setup_ci_cd.sh` criado
- [ ] `scripts/server_setup.sh` criado
- [ ] `.gitignore` atualizado
- [ ] Documentação criada (DEPLOY_CI_CD.md, QUICK_START_CI_CD.md)

---

## 🖥️ Configuração do Servidor

### No Servidor Hostinger (root@72.60.145.13)

- [ ] Conectado ao servidor via SSH
- [ ] Executado `scripts/server_setup.sh`
- [ ] Diretório `/root/backups` criado
- [ ] Rsync instalado
- [ ] Serviços verificados (ctsupera, nginx, postgresql)
- [ ] Backup inicial criado
- [ ] Arquivo `/root/.ssh/authorized_keys` existe

### Verificações
```bash
# Execute no servidor para verificar
ls -la /root/backups                    # ✅ Deve existir
which rsync                              # ✅ Deve retornar caminho
systemctl status ctsupera                # ✅ Deve estar active
systemctl status nginx                   # ✅ Deve estar active
systemctl status postgresql              # ✅ Deve estar active
ls -la /root/.ssh/authorized_keys       # ✅ Deve existir
```

---

## 🔐 Configuração de Chaves SSH

### No Seu Computador Local

- [ ] Executado `scripts/setup_ci_cd.sh`
- [ ] Chave SSH gerada em `~/.ssh/github_actions_key`
- [ ] Chave pública copiada para o servidor
- [ ] Testada conexão SSH com a nova chave

### Teste de Conexão
```bash
# Execute no seu computador (use seu IP e usuário reais)
ssh -i ~/.ssh/github_actions_key root@SEU_IP_SERVIDOR "echo 'Conexão OK!'"
# ✅ Deve imprimir "Conexão OK!" sem pedir senha
```

- [ ] Conexão funcionou sem pedir senha

---

## 🔑 Secrets do GitHub

Acesse: `https://github.com/SEU_USUARIO/ct-supera/settings/secrets/actions`

### Secrets Obrigatórios

- [ ] **SSH_PRIVATE_KEY** adicionado
  - Valor: Conteúdo completo de `~/.ssh/github_actions_key`
  - Começa com: `-----BEGIN OPENSSH PRIVATE KEY-----`
  - Termina com: `-----END OPENSSH PRIVATE KEY-----`

- [ ] **HOST** adicionado
  - Valor: `SEU_IP_SERVIDOR` (ver CREDENTIALS.md)

- [ ] **USERNAME** adicionado
  - Valor: `root` ou seu usuário (ver CREDENTIALS.md)

### Verificação
- [ ] Total de 3 secrets configurados
- [ ] Cada secret tem o nome EXATAMENTE como indicado (maiúsculas)

---

## 📤 Git e GitHub

### Repositório

- [ ] Repositório criado no GitHub
- [ ] Remote configurado localmente
  ```bash
  git remote -v  # ✅ Deve mostrar origin apontando para GitHub
  ```

### Commit dos Arquivos

- [ ] Todos os arquivos de CI/CD adicionados
  ```bash
  git status  # ✅ Não deve mostrar arquivos não rastreados importantes
  ```

- [ ] Commit realizado
  ```bash
  git log --oneline -1  # ✅ Deve mostrar último commit
  ```

- [ ] Push para main realizado
  ```bash
  git push origin main  # ✅ Deve executar sem erros
  ```

---

## 🚀 Primeiro Deploy

### GitHub Actions

Acesse: `https://github.com/SEU_USUARIO/ct-supera/actions`

- [ ] Workflow "Deploy CT Supera to Hostinger" aparece na lista
- [ ] Workflow está executando ou foi executado
- [ ] Todos os jobs completaram com sucesso (verde)
  - [ ] `test` - ✅
  - [ ] `build-frontend` - ✅
  - [ ] `deploy` - ✅
  - [ ] `notify` - ✅

### Se algum job falhou (vermelho):

1. [ ] Clique no job que falhou
2. [ ] Leia os logs de erro
3. [ ] Corrija o problema
4. [ ] Faça novo commit e push
5. [ ] Aguarde novo deploy automático

---

## ✅ Verificação Pós-Deploy

### Aplicação Funcionando

- [ ] Site acessível em: `http://72.60.145.13`
- [ ] Site acessível em: `https://ctsupera.com.br`
- [ ] Login funcionando
- [ ] Dashboard funcionando
- [ ] Frontend atualizado (verificar mudanças recentes)

### Verificação no Servidor

```bash
# Execute no servidor
ssh root@72.60.145.13

# Verificar serviço
systemctl status ctsupera
# ✅ Deve estar: Active: active (running)

# Verificar logs (últimas 20 linhas)
journalctl -u ctsupera -n 20 --no-pager
# ✅ Não deve ter erros

# Verificar backup foi criado
ls -lht /root/backups/ | head -3
# ✅ Deve mostrar backup recente
```

- [ ] Serviço está rodando
- [ ] Sem erros nos logs
- [ ] Backup foi criado

---

## 🧪 Teste do Workflow Completo

### Fazer uma Mudança Simples

1. [ ] Editar um arquivo (ex: adicionar comentário em um .py)
2. [ ] Commit
   ```bash
   git add .
   git commit -m "test: testar CI/CD"
   ```
3. [ ] Push
   ```bash
   git push origin main
   ```
4. [ ] Verificar deploy automático no GitHub Actions
5. [ ] Confirmar que mudança foi aplicada

---

## 🔄 Teste de Rollback

### Executar Rollback Manual

1. [ ] Acessar: `https://github.com/SEU_USUARIO/ct-supera/actions`
2. [ ] Clicar em "Rollback para Backup Anterior"
3. [ ] Clicar em "Run workflow"
4. [ ] Deixar campo em branco (usar backup mais recente)
5. [ ] Clicar em "Run workflow" (botão verde)
6. [ ] Aguardar execução
7. [ ] Verificar se completou com sucesso

---

## 📊 Monitoramento

### Configurar Monitoramento Contínuo

- [ ] Salvar nos favoritos: `https://github.com/SEU_USUARIO/ct-supera/actions`
- [ ] Configurar notificações do GitHub (opcional)
- [ ] Criar alerta de monitoramento da aplicação (opcional)

---

## 📚 Documentação

### Conhecimento da Equipe

- [ ] Equipe leu `QUICK_START_CI_CD.md`
- [ ] Equipe sabe como fazer deploy (apenas push para main)
- [ ] Equipe sabe como fazer rollback (via GitHub Actions)
- [ ] Equipe sabe onde ver logs (GitHub Actions + servidor)

---

## 🎯 Checklist Final

Marque cada item à medida que completa:

1. [ ] ✅ Servidor preparado
2. [ ] ✅ Chaves SSH configuradas
3. [ ] ✅ Secrets do GitHub adicionados
4. [ ] ✅ Arquivos commitados e pushed
5. [ ] ✅ Primeiro deploy executou com sucesso
6. [ ] ✅ Aplicação funcionando
7. [ ] ✅ Rollback testado
8. [ ] ✅ Equipe treinada

---

## 🎉 Parabéns!

Se todos os itens estão marcados, você tem um **CI/CD profissional** configurado!

### Benefícios Alcançados:

✅ Deploy automático em 3-5 minutos  
✅ Zero intervenção manual  
✅ Backups automáticos  
✅ Rollback com 1 clique  
✅ Histórico completo de deploys  
✅ Testes automatizados  
✅ Redução de 80% no tempo de deploy  

---

## 📞 Próximos Passos

- [ ] Configurar ambiente de staging (opcional)
- [ ] Adicionar testes unitários (opcional)
- [ ] Configurar notificações (Slack/Discord) (opcional)
- [ ] Implementar versionamento semântico (v1.0.0) (opcional)

---

**Data de Conclusão**: _______________

**Responsável**: _______________

**Status**: [ ] Em Andamento [ ] Concluído

