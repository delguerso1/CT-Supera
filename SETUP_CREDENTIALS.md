# 🔐 Como Configurar Credenciais - Guia Rápido

Este guia mostra como criar e configurar seu arquivo de credenciais de forma segura.

---

## ⚡ Início Rápido (5 minutos)

### 1. Criar Arquivo de Credenciais

```bash
# No diretório do projeto
cp CREDENTIALS.example.md CREDENTIALS.md
```

### 2. Editar com suas Credenciais Reais

```bash
# Abrir no editor (escolha um):
nano CREDENTIALS.md
# ou
code CREDENTIALS.md  # VSCode
# ou
vim CREDENTIALS.md
```

### 3. Preencher as Informações

Substitua **TODOS** os placeholders (`SEU_...`, `SUA_...`) com suas informações reais:

#### Informações do Servidor (Hostinger)
Você pode encontrar no painel da Hostinger ou no email de boas-vindas:

```markdown
## 🖥️ Servidor Hostinger

### Acesso SSH
- **IP**: `72.60.145.13`  (seu IP real aqui)
- **Porta**: `22`
- **Usuário**: `root`  (ou seu usuário)
- **Senha**: `SenhaForteAqui123!@#`  (sua senha real)
```

#### Banco de Dados
Informações do PostgreSQL que você configurou:

```markdown
### PostgreSQL (Produção)
- **Host**: `localhost`
- **Porta**: `5432`
- **Database**: `ct_supera_db`
- **Usuário**: `ct_supera_user`
- **Senha**: `SuaSenhaDB123!@#`
```

#### Chaves SSH
Após gerar as chaves com o script `setup_ci_cd.sh`:

```markdown
## 🔑 Chaves SSH

### Chave GitHub Actions
- **Arquivo Privado**: `~/.ssh/github_actions_key`
- **Arquivo Público**: `~/.ssh/github_actions_key.pub`
- **Conteúdo Privado**: [Gerado pelo script, NUNCA compartilhe]
```

---

## ✅ Verificação de Segurança

### 1. Confirmar que o arquivo NÃO será commitado:

```bash
# Deve retornar: CREDENTIALS.md
git check-ignore CREDENTIALS.md

# Não deve aparecer na lista:
git status
```

✅ Se `CREDENTIALS.md` não aparecer em `git status`, está correto!

### 2. Verificar permissões do arquivo:

```bash
# Linux/Mac - restringir acesso
chmod 600 CREDENTIALS.md

# Verificar
ls -la CREDENTIALS.md
# Deve mostrar: -rw-------
```

### 3. Fazer backup seguro:

Escolha **UMA** opção:

**Opção A: Gerenciador de Senhas (Recomendado)**
- Use 1Password, Bitwarden, LastPass, etc.
- Crie nota segura com o conteúdo

**Opção B: Arquivo criptografado**
```bash
# Criar cópia criptografada
gpg -c CREDENTIALS.md
# Será criado: CREDENTIALS.md.gpg (criptografado)

# Para descriptografar depois:
gpg CREDENTIALS.md.gpg
```

**Opção C: USB criptografado**
- Copie para USB com criptografia
- Guarde em local físico seguro

---

## 📋 Checklist de Preenchimento

Use este checklist para garantir que preencheu tudo:

### Servidor
- [ ] IP do servidor Hostinger
- [ ] Usuário SSH
- [ ] Senha SSH (se não usar apenas chave)
- [ ] Email e senha do painel Hostinger

### Banco de Dados
- [ ] Host do PostgreSQL
- [ ] Nome do banco
- [ ] Usuário do banco
- [ ] Senha do banco

### Chaves SSH
- [ ] Localização da chave privada
- [ ] Localização da chave pública
- [ ] Chave está gerada (`ls ~/.ssh/github_actions_key`)

### Django
- [ ] SECRET_KEY gerado
- [ ] ALLOWED_HOSTS configurado
- [ ] Usuário admin criado

### Email (se configurado)
- [ ] SMTP host
- [ ] SMTP port
- [ ] Email de envio
- [ ] Senha/App Password

### Secrets do GitHub
- [ ] SSH_PRIVATE_KEY adicionado
- [ ] HOST adicionado
- [ ] USERNAME adicionado

---

## 🔧 Gerar Informações Necessárias

### 1. Gerar SECRET_KEY do Django

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copie o resultado e cole em `CREDENTIALS.md` na seção Django.

### 2. Criar Senha Forte

```bash
# Gerar senha aleatória forte
openssl rand -base64 32
```

Use para senhas de banco, admin, etc.

### 3. Gerar Chaves SSH

```bash
# Já incluído no script setup_ci_cd.sh
# Mas se quiser gerar manualmente:
ssh-keygen -t rsa -b 4096 -C "github-actions@ctsupera.com" -f ~/.ssh/github_actions_key
```

---

## 🚨 O QUE NUNCA FAZER

### ❌ NUNCA:
- Commitar `CREDENTIALS.md` no Git
- Enviar por email/WhatsApp/Telegram
- Postar em chat público (Slack, Discord)
- Compartilhar via cloud público (Google Drive compartilhado)
- Deixar em editor online (Google Docs compartilhado)
- Copiar para área de transferência e esquecer
- Deixar aberto em tela compartilhada

### ✅ SEMPRE:
- Manter apenas localmente
- Usar gerenciador de senhas
- Compartilhar via método criptografado se necessário
- Trocar senhas se suspeitar de vazamento
- Fazer backup criptografado

---

## 📚 Onde Encontrar Cada Informação

### IP e Acesso SSH
1. Acesse painel Hostinger: https://hpanel.hostinger.com/
2. Vá em **VPS** → Seu servidor
3. Veja **IP Address** e credenciais SSH

### Informações do Banco
- Se configurou manualmente: suas anotações
- Se usou script de setup: ver arquivo `.env` no servidor

```bash
# No servidor
cat /root/ct-supera/.env | grep DB_
```

### Chaves SSH
- Geradas pelo script `setup_ci_cd.sh`
- Localização: `~/.ssh/github_actions_key` (no seu computador)

### Secrets do GitHub
- Mesmo conteúdo das chaves SSH
- HOST = IP do servidor
- USERNAME = usuário SSH (geralmente `root`)

---

## 🔄 Atualizar Credenciais

Quando trocar alguma credencial:

### 1. Atualizar arquivo local
```bash
nano CREDENTIALS.md
# Editar a credencial alterada
```

### 2. Atualizar no servidor (se aplicável)
```bash
ssh root@SEU_IP_SERVIDOR
nano /root/ct-supera/.env
# Atualizar variável de ambiente
# Reiniciar serviço
systemctl restart ctsupera
```

### 3. Atualizar Secrets do GitHub (se aplicável)
1. Acesse: https://github.com/SEU_USUARIO/ct-supera/settings/secrets/actions
2. Clique no secret a atualizar
3. Clique em **Update**
4. Cole novo valor
5. Salve

### 4. Documentar mudança
No próprio `CREDENTIALS.md`, atualize a seção:

```markdown
## 📝 Histórico de Alterações

| Data | Alteração | Responsável |
|------|-----------|-------------|
| 13/01/2025 | SECRET_KEY rotacionada | João |
| 10/01/2025 | Senha DB alterada | Maria |
```

---

## 🆘 Recuperação

### Se perdeu o arquivo CREDENTIALS.md:

1. **Acesso ao servidor** - Ainda pode acessar?
   ```bash
   ssh root@IP_SERVIDOR
   # Se sim, veja .env:
   cat /root/ct-supera/.env
   ```

2. **Backup** - Tem backup?
   - Cheque gerenciador de senhas
   - Cheque backups criptografados
   - Cheque USB de backup

3. **Secrets do GitHub** - Alguns dados estão lá
   - Mas não pode ver (só atualizar)
   - Precisará recriar

4. **Pior caso** - Precisa reconfigurar:
   - Gerar novas chaves SSH
   - Resetar senhas (servidor, banco, etc.)
   - Atualizar tudo conforme setup inicial

---

## ✅ Validação Final

Antes de prosseguir com o deploy, confirme:

```bash
# 1. Arquivo existe e não está no Git
test -f CREDENTIALS.md && echo "✅ Arquivo existe"
git check-ignore CREDENTIALS.md && echo "✅ Será ignorado pelo Git"

# 2. Permissões corretas (Linux/Mac)
ls -l CREDENTIALS.md | grep "^-rw-------" && echo "✅ Permissões OK"

# 3. Pode conectar ao servidor (teste de conexão)
ssh -o ConnectTimeout=5 root@SEU_IP_SERVIDOR "echo '✅ Conexão OK'"

# 4. Arquivo não está vazio
test -s CREDENTIALS.md && echo "✅ Arquivo tem conteúdo"
```

Se **TODOS** os testes passarem com ✅, você está pronto!

---

## 📖 Próximos Passos

Após configurar `CREDENTIALS.md`:

1. ✅ Configure secrets no GitHub (use dados de `CREDENTIALS.md`)
2. ✅ Configure arquivo `.env` no servidor
3. ✅ Teste conexão SSH
4. ✅ Prossiga com setup do CI/CD

---

**Dúvidas?** Veja também:
- [SECURITY.md](SECURITY.md) - Guia completo de segurança
- [QUICK_START_CI_CD.md](QUICK_START_CI_CD.md) - Setup do CI/CD

---

**Lembre-se**: Este arquivo contém informações sensíveis. Trate-o como você trataria as chaves da sua casa! 🔐

