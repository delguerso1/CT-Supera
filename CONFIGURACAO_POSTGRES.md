# Configuração do Banco de Dados PostgreSQL - Hostinger

## 🗄️ **Configuração do PostgreSQL na Hostinger**

### **1. Acessar o Painel da Hostinger**
1. **Login** no painel da Hostinger
2. **Vá em "Bancos de Dados"** no menu lateral
3. **Clique em "PostgreSQL"**

### **2. Criar o Banco de Dados**
1. **Clique em "Criar Banco de Dados"**
2. **Preencha os campos:**
   - **Nome do banco**: `ctsupera`
   - **Usuário**: `ctsupera`
   - **Senha**: `Supera2025@` (ou uma senha forte de sua escolha)
   - **Confirmar senha**: Repita a senha

### **3. Configurações do Banco**
Após criar, anote as informações:
- **Host**: `localhost` (ou o IP fornecido pela Hostinger)
- **Porta**: `5432`
- **Nome**: `ctsupera`
- **Usuário**: `ctsupera`
- **Senha**: `Supera2025@`

## 🔧 **Configuração no Servidor**

### **1. Instalar PostgreSQL (se necessário)**
```bash
# Atualizar sistema
sudo apt update

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Verificar status
sudo systemctl status postgresql
```

### **2. Configurar Usuário e Banco**
```bash
# Acessar PostgreSQL como superusuário
sudo -u postgres psql

# Criar usuário (se não existir)
CREATE USER ctsupera WITH PASSWORD 'Supera2025@';

# Criar banco de dados
CREATE DATABASE ctsupera OWNER ctsupera;

# Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE ctsupera TO ctsupera;

# Sair do PostgreSQL
\q
```

### **3. Testar Conexão**
```bash
# Testar conexão
psql -h localhost -U ctsupera -d ctsupera

# Se conectar com sucesso, sair
\q
```

## 📝 **Atualizar Arquivo .env**

### **Configuração Completa do .env:**
```bash
# ========================================
# CONFIGURAÇÕES DO DJANGO
# ========================================
DJANGO_SECRET_KEY=sua-chave-secreta-aqui
DJANGO_DEBUG=False

# ========================================
# CONFIGURAÇÕES DO SERVIDOR
# ========================================
DOMAIN_NAME=ctsupera.com.br
SERVER_IP=72.60.145.13

# ========================================
# CONFIGURAÇÕES DO BANCO DE DADOS
# ========================================
POSTGRES_DB_NAME=ctsupera
POSTGRES_DB_USER=ctsupera
POSTGRES_DB_PASSWORD=Supera2025@
POSTGRES_DB_HOST=localhost
POSTGRES_DB_PORT=5432

# ========================================
# CONFIGURAÇÕES DE E-MAIL
# ========================================
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=administracao@ctsupera.com.br
EMAIL_HOST_PASSWORD=Supera2025@
DEFAULT_FROM_EMAIL=administracao@ctsupera.com.br

# ========================================
# CONFIGURAÇÕES DO FRONTEND
# ========================================
FRONTEND_URL=https://ctsupera.com.br

# ========================================
# CONFIGURAÇÕES DE SEGURANÇA
# ========================================
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

## 🚀 **Migrar Dados do SQLite para PostgreSQL**

### **1. Instalar psycopg2 (driver PostgreSQL)**
```bash
# Ativar ambiente virtual (se estiver usando)
source venv/bin/activate

# Instalar psycopg2
pip install psycopg2-binary

# Adicionar ao requirements.txt
echo "psycopg2-binary==2.9.7" >> requirements.txt
```

### **2. Fazer Backup do SQLite**
```bash
# Fazer backup do banco atual
cp db.sqlite3 db.sqlite3.backup

# Exportar dados
python manage.py dumpdata --natural-foreign --natural-primary > data.json
```

### **3. Configurar Django para PostgreSQL**
```bash
# Editar settings.py para usar PostgreSQL
# (já está configurado no settings_hostinger.py)

# Fazer migrações
python manage.py makemigrations
python manage.py migrate

# Carregar dados do backup
python manage.py loaddata data.json
```

### **4. Criar Superusuário**
```bash
# Criar superusuário para admin
python manage.py createsuperuser

# Usuário: admin
# E-mail: administracao@ctsupera.com.br
# Senha: Supera2025@
```

## 🔍 **Verificar Configuração**

### **1. Testar Conexão**
```bash
# Testar conexão com o banco
python manage.py dbshell

# Se conectar, sair
\q
```

### **2. Verificar Tabelas**
```bash
# Listar tabelas
python manage.py showmigrations

# Verificar dados
python manage.py shell
>>> from usuarios.models import Usuario
>>> Usuario.objects.count()
```

## ⚠️ **Troubleshooting**

### **Erro de Conexão:**
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Verificar logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### **Erro de Permissão:**
```bash
# Verificar permissões
sudo -u postgres psql
\du
\l

# Ajustar permissões se necessário
GRANT ALL PRIVILEGES ON DATABASE ctsupera TO ctsupera;
```

### **Erro de Driver:**
```bash
# Instalar dependências
sudo apt install python3-dev libpq-dev
pip install psycopg2-binary
```

## 📊 **Monitoramento**

### **Comandos Úteis:**
```bash
# Verificar status do banco
sudo systemctl status postgresql

# Verificar conexões ativas
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Verificar tamanho do banco
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('ctsupera'));"
```

## 🔒 **Segurança**

### **Configurações de Segurança:**
```bash
# Editar postgresql.conf
sudo nano /etc/postgresql/*/main/postgresql.conf

# Configurações recomendadas:
# listen_addresses = 'localhost'
# port = 5432
# ssl = on

# Editar pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Adicionar linha:
# local   ctsupera   ctsupera   md5
```

## ✅ **Checklist Final**

- [ ] Banco PostgreSQL criado na Hostinger
- [ ] Usuário e senha configurados
- [ ] Driver psycopg2 instalado
- [ ] Arquivo .env atualizado
- [ ] Migrações executadas
- [ ] Dados migrados do SQLite
- [ ] Superusuário criado
- [ ] Conexão testada
- [ ] Aplicação funcionando

## 🎯 **Próximos Passos**

Após configurar o PostgreSQL:
1. **Configurar DNS** (A Record e CNAME)
2. **Configurar SSL** com Certbot
3. **Fazer deploy** da aplicação
4. **Testar** todas as funcionalidades

Precisa de ajuda com algum passo específico?
