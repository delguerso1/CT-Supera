# 🔐 Credenciais do Projeto (EXEMPLO)

⚠️ **ATENÇÃO**: Este é um arquivo de EXEMPLO. 
**NUNCA** commite o arquivo real `CREDENTIALS.md` no Git!

---

## 📋 Como Usar Este Arquivo

1. Copie este arquivo: `cp CREDENTIALS.example.md CREDENTIALS.md`
2. Preencha com as credenciais reais
3. O arquivo `CREDENTIALS.md` está no `.gitignore` (não será commitado)
4. Guarde uma cópia em local seguro (cofre de senhas, etc.)

---

## 🖥️ Servidor Hostinger

### Acesso SSH
- **IP**: `SEU_IP_AQUI` (ex: 123.456.789.012)
- **Porta**: `22`
- **Usuário**: `SEU_USUARIO` (ex: root)
- **Senha**: `SUA_SENHA_AQUI`
- **Chave SSH**: Ver seção [Chaves SSH](#-chaves-ssh)

### Painel Hostinger
- **URL**: `https://hpanel.hostinger.com/`
- **Email**: `SEU_EMAIL@exemplo.com`
- **Senha**: `SUA_SENHA_PAINEL`

---

## 🔑 Chaves SSH

### Chave Principal
- **Arquivo Privado**: `~/.ssh/id_rsa_hostinger`
- **Arquivo Público**: `~/.ssh/id_rsa_hostinger.pub`
- **Passphrase**: `SUA_PASSPHRASE` (se tiver)

### Chave GitHub Actions
- **Arquivo Privado**: `~/.ssh/github_actions_key`
- **Arquivo Público**: `~/.ssh/github_actions_key.pub`
- **Adicionada em**: `https://github.com/SEU_USUARIO/ct-supera/settings/secrets/actions`

**⚠️ NUNCA compartilhe a chave privada!**

---

## 🗄️ Banco de Dados

### PostgreSQL (Produção)
- **Host**: `localhost` ou `SEU_IP`
- **Porta**: `5432`
- **Database**: `ct_supera_db`
- **Usuário**: `ct_supera_user`
- **Senha**: `SUA_SENHA_DB`

### PostgreSQL (Local)
- **Host**: `localhost`
- **Porta**: `5432`
- **Database**: `ct_supera_local`
- **Usuário**: `postgres`
- **Senha**: `SUA_SENHA_LOCAL`

---

## 🔐 Secrets do GitHub

Acesse: `https://github.com/SEU_USUARIO/ct-supera/settings/secrets/actions`

### Secrets Configurados

| Nome | Descrição | Valor |
|------|-----------|-------|
| `SSH_PRIVATE_KEY` | Chave privada SSH | `[Conteúdo da chave privada]` |
| `HOST` | IP do servidor | `SEU_IP_SERVIDOR` |
| `USERNAME` | Usuário SSH | `root` ou outro |
| `DB_PASSWORD` | Senha do banco (se necessário) | `SUA_SENHA_DB` |

---

## 🌐 Domínio e DNS

### Domínio Principal
- **Domínio**: `seudominio.com.br`
- **Registrador**: `Registro.br` ou outro
- **Login Registrador**: `seu_email@exemplo.com`
- **Senha Registrador**: `SUA_SENHA_REGISTRO`

### Cloudflare (se usar)
- **Email**: `seu_email@exemplo.com`
- **Senha**: `SUA_SENHA_CLOUDFLARE`
- **API Token**: `SUA_API_TOKEN`

---

## 📧 Email / SMTP

### Configurações de Email
- **SMTP Host**: `smtp.gmail.com` ou outro
- **SMTP Port**: `587`
- **Email**: `noreply@seudominio.com`
- **Senha**: `SUA_SENHA_EMAIL`
- **App Password** (se Gmail): `xxxx xxxx xxxx xxxx`

---

## 🔑 Django

### Variáveis de Ambiente (.env)
```env
SECRET_KEY=sua-secret-key-super-secreta-aqui-com-50-caracteres-minimo
DEBUG=False
ALLOWED_HOSTS=seudominio.com,www.seudominio.com,SEU_IP

# Database
DATABASE_URL=postgres://usuario:senha@localhost:5432/nome_db

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=seu_email@exemplo.com
EMAIL_HOST_PASSWORD=sua_senha_ou_app_password
```

---

## 👥 Usuários do Sistema

### Superusuário Django
- **Username**: `admin`
- **Email**: `admin@seudominio.com`
- **Senha**: `SUA_SENHA_ADMIN`

### Usuários de Teste (Desenvolvimento)
- **Gerente**: usuario `gerente` / senha `senha123`
- **Professor**: usuario `professor` / senha `senha123`
- **Aluno**: usuario `aluno` / senha `senha123`

---

## 💳 Pagamentos (Se Integrado)

### Mercado Pago / PagSeguro / etc
- **Public Key**: `SUA_PUBLIC_KEY`
- **Access Token**: `SEU_ACCESS_TOKEN`
- **Webhook URL**: `https://seudominio.com/api/webhook/pagamento`

---

## 📱 Outras Integrações

### Twilio (SMS)
- **Account SID**: `SEU_ACCOUNT_SID`
- **Auth Token**: `SEU_AUTH_TOKEN`
- **Phone Number**: `+55XXXXXXXXXXX`

### SendGrid (Email)
- **API Key**: `SUA_API_KEY`

---

## 🔄 Backup

### Backup Automático
- **Localização**: `/root/backups/`
- **Frequência**: Diária às 3h
- **Retenção**: 10 últimos backups

### Backup Externo
- **Serviço**: Google Drive / Dropbox / S3
- **Credenciais**: Ver serviço específico
- **Frequência**: Semanal

---

## 📞 Contatos de Emergência

### Equipe
- **Desenvolvedor Principal**: nome@email.com / (XX) XXXXX-XXXX
- **DevOps**: nome@email.com / (XX) XXXXX-XXXX
- **Gerente**: nome@email.com / (XX) XXXXX-XXXX

### Suporte Técnico
- **Hostinger**: https://www.hostinger.com.br/contato
- **Domínio**: Contato do registrador

---

## ⚠️ IMPORTANTE

### Segurança
- ✅ Este arquivo (`CREDENTIALS.md`) está no `.gitignore`
- ✅ Nunca compartilhe senhas por email/chat não criptografado
- ✅ Use gerenciador de senhas (1Password, Bitwarden, etc.)
- ✅ Ative 2FA onde possível
- ✅ Troque senhas periodicamente
- ✅ Use senhas fortes e únicas

### Em Caso de Comprometimento
1. Trocar todas as senhas imediatamente
2. Revogar chaves SSH comprometidas
3. Verificar logs de acesso
4. Notificar equipe
5. Atualizar documentação

---

## 📝 Histórico de Alterações

| Data | Alteração | Responsável |
|------|-----------|-------------|
| DD/MM/AAAA | Senha do banco alterada | Nome |
| DD/MM/AAAA | Nova chave SSH adicionada | Nome |
| DD/MM/AAAA | Migração de servidor | Nome |

---

**Última atualização**: DD/MM/AAAA  
**Responsável**: Seu Nome

