# 🚀 Guia de Deploy para Produção - Oracle Cloud

Este guia explica como configurar e fazer o deploy do CT Supera no Oracle Cloud.

## 📋 Pré-requisitos

- Instância Oracle Cloud com Ubuntu 20.04 ou superior
- Acesso SSH à instância
- Domínio configurado (opcional, mas recomendado)
- Certificado SSL (Let's Encrypt)

## 🔧 Configuração Inicial do Servidor

### 1. Atualizar o sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar dependências do sistema
```bash
sudo apt install -y python3 python3-pip python3-venv nginx git curl
```

### 3. Instalar Oracle Instant Client (para banco Oracle)
```bash
# Baixar e instalar Oracle Instant Client
wget https://download.oracle.com/otn_software/linux/instantclient/219000/instantclient-basic-linux.x64-21.9.0.0.0dbru.zip
unzip instantclient-basic-linux.x64-21.9.0.0.0dbru.zip
sudo mv instantclient_21_9 /opt/oracle
sudo ln -s /opt/oracle/instantclient_21_9 /opt/oracle/instantclient

# Configurar variáveis de ambiente
echo 'export LD_LIBRARY_PATH=/opt/oracle/instantclient:$LD_LIBRARY_PATH' >> ~/.bashrc
echo 'export PATH=/opt/oracle/instantclient:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## 📦 Deploy da Aplicação

### 1. Clonar o repositório
```bash
cd /home/ubuntu
git clone <seu-repositorio> ct-supera
cd ct-supera
```

### 2. Configurar variáveis de ambiente
```bash
cp production.env.example .env
nano .env
```

Edite o arquivo `.env` com suas configurações:
- `DJANGO_SECRET_KEY`: Chave secreta do Django
- `DOMAIN_NAME`: Seu domínio
- `SERVER_IP`: IP da sua instância Oracle
- Configurações do banco de dados Oracle
- Configurações de e-mail

### 3. Executar script de deploy
```bash
chmod +x deploy.sh
./deploy.sh
```

## 🗄️ Configuração do Banco de Dados

### Opção 1: Oracle Database (Recomendado)
1. Criar instância Oracle Database no Oracle Cloud
2. Configurar usuário e senha
3. Atualizar as variáveis de ambiente no `.env`

### Opção 2: PostgreSQL
1. Instalar PostgreSQL:
```bash
sudo apt install -y postgresql postgresql-contrib
```

2. Criar banco e usuário:
```sql
sudo -u postgres psql
CREATE DATABASE ctsupera;
CREATE USER ctsupera WITH PASSWORD 'sua-senha';
GRANT ALL PRIVILEGES ON DATABASE ctsupera TO ctsupera;
\q
```

3. Descomentar configuração PostgreSQL no `settings_production.py`

## 🌐 Configuração do Nginx

### 1. Copiar configuração
```bash
sudo cp nginx.conf /etc/nginx/sites-available/ctsupera
sudo ln -s /etc/nginx/sites-available/ctsupera /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```

### 2. Configurar SSL com Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

### 3. Testar e reiniciar Nginx
```bash
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔄 Configuração do Systemd

### 1. Copiar arquivo de serviço
```bash
sudo cp ctsupera.service /etc/systemd/system/
```

### 2. Ativar e iniciar o serviço
```bash
sudo systemctl daemon-reload
sudo systemctl enable ctsupera
sudo systemctl start ctsupera
```

### 3. Verificar status
```bash
sudo systemctl status ctsupera
```

## 📊 Monitoramento e Logs

### Verificar logs da aplicação
```bash
sudo journalctl -u ctsupera -f
```

### Verificar logs do Nginx
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Verificar logs do Django
```bash
tail -f logs/django.log
```

## 🔧 Comandos Úteis

### Reiniciar aplicação
```bash
sudo systemctl restart ctsupera
```

### Atualizar código
```bash
cd /home/ubuntu/ct-supera
git pull
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate --settings=app.settings_production
python manage.py collectstatic --noinput --settings=app.settings_production
sudo systemctl restart ctsupera
```

### Backup do banco de dados
```bash
# Para Oracle
expdp ctsupera/password@localhost:1521/XE directory=DATA_PUMP_DIR dumpfile=backup_$(date +%Y%m%d).dmp

# Para PostgreSQL
pg_dump -U ctsupera -h localhost ctsupera > backup_$(date +%Y%m%d).sql
```

## 🛡️ Segurança

### Configurar firewall
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Atualizações automáticas
```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 🚨 Troubleshooting

### Problemas comuns:

1. **Erro de conexão com banco Oracle**:
   - Verificar se o Oracle Instant Client está instalado
   - Verificar variáveis de ambiente LD_LIBRARY_PATH

2. **Erro de permissões**:
   - Verificar se o usuário ubuntu tem permissões adequadas
   - Verificar permissões dos arquivos estáticos

3. **Erro de SSL**:
   - Verificar se o certificado está válido
   - Verificar configuração do Nginx

4. **Aplicação não inicia**:
   - Verificar logs: `sudo journalctl -u ctsupera -f`
   - Verificar se as variáveis de ambiente estão corretas

## 📞 Suporte

Para problemas específicos, verifique:
1. Logs da aplicação
2. Logs do Nginx
3. Status do serviço systemd
4. Configurações de firewall
5. Conectividade com banco de dados 