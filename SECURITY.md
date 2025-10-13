# 🔐 Guia de Segurança - CT Supera

Este documento descreve as práticas de segurança do projeto e como gerenciar credenciais de forma segura.

---

## 📋 Índice

1. [Gerenciamento de Credenciais](#-gerenciamento-de-credenciais)
2. [Arquivos Sensíveis](#-arquivos-sensíveis)
3. [Boas Práticas](#-boas-práticas)
4. [Configuração Segura](#-configuração-segura)
5. [Em Caso de Comprometimento](#-em-caso-de-comprometimento)

---

## 🔑 Gerenciamento de Credenciais

### ⚠️ NUNCA COMMITE NO GIT:

❌ **NÃO commitar**:
- Senhas
- Chaves privadas SSH
- Tokens de API
- Secret keys do Django
- Credenciais de banco de dados
- Variáveis de ambiente com dados sensíveis
- Arquivo `.env`
- Arquivo `CREDENTIALS.md`

✅ **Pode commitar**:
- Arquivos `.example` (templates)
- Documentação sem credenciais reais
- Configurações públicas
- Chaves públicas SSH (com cautela)

---

## 📁 Arquivos Sensíveis

### 1. Arquivo de Credenciais

```bash
# Criar seu arquivo de credenciais (primeira vez)
cp CREDENTIALS.example.md CREDENTIALS.md

# Editar com suas credenciais reais
nano CREDENTIALS.md  # ou seu editor preferido
```

**⚠️ IMPORTANTE**: 
- O arquivo `CREDENTIALS.md` está no `.gitignore`
- Guarde uma cópia de backup em local seguro
- Use um gerenciador de senhas

### 2. Arquivo .env

```bash
# Criar arquivo .env (primeira vez)
cp env_template.txt .env

# Editar com suas configurações
nano .env
```

**Conteúdo do .env**:
```env
# NUNCA compartilhe este arquivo!
SECRET_KEY=SUA_SECRET_KEY_AQUI_COM_50_CARACTERES_MINIMO
DEBUG=False
ALLOWED_HOSTS=seudominio.com,www.seudominio.com,SEU_IP

# Database
DB_NAME=ct_supera_db
DB_USER=ct_supera_user
DB_PASSWORD=SUA_SENHA_SUPER_FORTE_AQUI
DB_HOST=localhost
DB_PORT=5432

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=seu_email@exemplo.com
EMAIL_HOST_PASSWORD=sua_senha_app_aqui
```

### 3. Chaves SSH

**Localização segura**:
```bash
~/.ssh/
├── id_rsa_hostinger          # Chave privada (NUNCA compartilhar)
├── id_rsa_hostinger.pub      # Chave pública
├── github_actions_key        # Chave privada GitHub Actions
└── github_actions_key.pub    # Chave pública GitHub Actions
```

**Permissões corretas**:
```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa_hostinger
chmod 600 ~/.ssh/github_actions_key
chmod 644 ~/.ssh/*.pub
```

---

## ✅ Boas Práticas

### 1. Senhas Fortes

✅ **Senha forte**:
- Mínimo 16 caracteres
- Letras maiúsculas e minúsculas
- Números
- Caracteres especiais
- Não use palavras do dicionário
- Não use informações pessoais

❌ **Senha fraca**:
- `senha123`, `admin`, `password`
- Datas de nascimento
- Nomes de familiares
- Sequências simples

**Gerar senha forte**:
```bash
# Linux/Mac
openssl rand -base64 32

# Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. Gerenciador de Senhas

Use um gerenciador de senhas profissional:
- ✅ **1Password** (pago, excelente)
- ✅ **Bitwarden** (gratuito, open source)
- ✅ **LastPass** (gratuito/pago)
- ✅ **KeePass** (gratuito, offline)

### 3. Autenticação de Dois Fatores (2FA)

Ative 2FA em:
- ✅ GitHub
- ✅ Painel da Hostinger
- ✅ Registrador de domínio
- ✅ Email principal
- ✅ Serviços de pagamento

### 4. Rotação de Credenciais

Troque regularmente:
- 🔄 **A cada 90 dias**: Senhas de administrador
- 🔄 **A cada 180 dias**: Chaves SSH
- 🔄 **A cada 365 dias**: Secret key do Django
- 🔄 **Imediatamente**: Se houver suspeita de comprometimento

---

## 🔧 Configuração Segura

### 1. Secrets do GitHub

**Adicionar secrets**:
1. Acesse: `https://github.com/SEU_USUARIO/ct-supera/settings/secrets/actions`
2. Clique em "New repository secret"
3. Nome: `SSH_PRIVATE_KEY`
4. Valor: Cole a chave privada completa
5. Clique em "Add secret"

**Secrets necessários**:
- `SSH_PRIVATE_KEY` - Chave privada SSH
- `HOST` - IP do servidor (não tão sensível, mas melhor como secret)
- `USERNAME` - Usuário SSH

**⚠️ NUNCA**:
- Não imprima secrets nos logs
- Não use secrets em nomes de arquivos
- Não compartilhe secrets entre repositórios desnecessariamente

### 2. Variáveis de Ambiente no Servidor

```bash
# No servidor, edite .env
nano /root/ct-supera/.env

# Permissões corretas
chmod 600 /root/ct-supera/.env
chown root:root /root/ct-supera/.env
```

### 3. Firewall

```bash
# Configurar UFW (se não estiver configurado)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### 4. Fail2ban

```bash
# Instalar fail2ban (proteção contra ataques)
apt-get install fail2ban

# Configurar
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 🚨 Em Caso de Comprometimento

### Se uma credencial foi comprometida:

#### 1. Contenção Imediata
```bash
# Desabilitar acesso comprometido
# Exemplo: remover chave SSH comprometida
nano ~/.ssh/authorized_keys
# Remova a linha da chave comprometida

# Bloquear IP suspeito
ufw deny from IP_SUSPEITO
```

#### 2. Trocar Credenciais
- [ ] Gerar nova Secret Key do Django
- [ ] Trocar senha do banco de dados
- [ ] Gerar novas chaves SSH
- [ ] Trocar senhas de acesso ao servidor
- [ ] Atualizar secrets do GitHub
- [ ] Trocar tokens de API

#### 3. Investigação
```bash
# Ver últimos logins SSH
last -20

# Ver tentativas de login falhadas
lastb -20

# Ver logs do sistema
journalctl -n 100 --no-pager

# Ver conexões ativas
netstat -tupln
```

#### 4. Notificação
- Notificar a equipe imediatamente
- Documentar o incidente
- Atualizar procedimentos de segurança

#### 5. Prevenção Futura
- Revisar permissões de acesso
- Atualizar documentação de segurança
- Implementar monitoramento adicional
- Treinar equipe sobre segurança

---

## 📝 Checklist de Segurança

### Setup Inicial
- [ ] `.gitignore` configurado corretamente
- [ ] Arquivo `CREDENTIALS.md` criado e NÃO commitado
- [ ] Arquivo `.env` criado e NÃO commitado
- [ ] Chaves SSH geradas e com permissões corretas
- [ ] Secrets do GitHub configurados
- [ ] 2FA ativado em contas importantes

### Manutenção Regular
- [ ] Backups automáticos funcionando
- [ ] Logs de acesso revisados mensalmente
- [ ] Senhas trocadas trimestralmente
- [ ] Dependências atualizadas (segurança)
- [ ] Certificado SSL válido

### Auditoria (Semestral)
- [ ] Revisar usuários com acesso ao servidor
- [ ] Revisar secrets do GitHub
- [ ] Verificar logs de acesso SSH
- [ ] Testar procedimento de rollback
- [ ] Atualizar documentação

---

## 🔗 Recursos Adicionais

### Ferramentas de Segurança
- **git-secrets**: Previne commit de secrets
- **truffleHog**: Procura secrets no histórico do Git
- **detect-secrets**: Scanner de secrets pré-commit

### Instalando git-secrets
```bash
# Clonar repositório
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets
make install

# Configurar no projeto
cd /caminho/para/ct-supera
git secrets --install
git secrets --register-aws
```

### Documentação
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Django Security](https://docs.djangoproject.com/en/4.2/topics/security/)

---

## 📞 Contato de Segurança

Se você descobrir uma vulnerabilidade de segurança:

1. **NÃO** crie uma issue pública
2. Envie email para: `security@seudominio.com`
3. Aguarde resposta em até 48h
4. Disclosure responsável após correção

---

## 📊 Matriz de Responsabilidades

| Responsabilidade | Responsável | Frequência |
|-----------------|-------------|------------|
| Troca de senhas admin | DevOps | Trimestral |
| Revisão de logs | DevOps | Mensal |
| Atualização de dependências | Dev Team | Mensal |
| Backup verification | DevOps | Semanal |
| Auditoria de acesso | Gerente TI | Semestral |

---

**Última atualização**: [Data]  
**Responsável**: [Nome]  
**Versão**: 1.0

