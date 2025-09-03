# 🚀 Guia de Deploy para Hostinger

Este guia explica como configurar e fazer o deploy do CT Supera no servidor privado da Hostinger.

## 📋 Informações do Servidor

- **IP do Servidor**: 72.60.145.13
- **Acesso SSH**: `ssh root@72.60.145.13`
- **Sistema**: Ubuntu (assumindo baseado na Hostinger)

## 🔧 Configuração Inicial do Servidor

### 1. Conectar ao servidor
```bash
ssh root@72.60.145.13
```

### 2. Atualizar o sistema
```bash
apt update && apt upgrade -y
```

### 3. Instalar dependências do sistema
```bash
apt install -y python3 python3-pip python3-venv nginx git curl postgresql postgresql-contrib
```

### 4. Configurar PostgreSQL
```bash
# Iniciar e habilitar PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Criar banco e usuário
sudo -u postgres psql
```

No prompt do PostgreSQL, execute:
```sql
CREATE DATABASE ctsupera;
CREATE USER ctsupera WITH PASSWORD 'sua-senha-segura';
GRANT ALL PRIVILEGES ON DATABASE ctsupera TO ctsupera;
ALTER USER ctsupera CREATEDB;
\q
```

### 5. Configurar firewall
```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
```

## 📦 Deploy da Aplicação

### 1. Clonar o repositório
```bash
cd /root
git clone <seu-repositorio> ct-supera
cd ct-supera
```

### 2. Configurar variáveis de ambiente
```bash
cp hostinger.env.example .env
nano .env
```

### 3. Executar script de deploy
```bash
chmod +x deploy_hostinger.sh
./deploy_hostinger.sh
```

## 🌐 Configuração do Nginx

### 1. Copiar configuração
```bash
cp nginx_hostinger.conf /etc/nginx/sites-available/ctsupera
ln -s /etc/nginx/sites-available/ctsupera /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
```

### 2. Configurar SSL com Let's Encrypt
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

### 3. Testar e reiniciar Nginx
```bash
nginx -t
systemctl restart nginx
systemctl enable nginx
```

## 🔄 Configuração do Systemd

### 1. Copiar arquivo de serviço
```bash
cp ctsupera_hostinger.service /etc/systemd/system/ctsupera.service
```

### 2. Ativar e iniciar o serviço
```bash
systemctl daemon-reload
systemctl enable ctsupera
systemctl start ctsupera
```

### 3. Verificar status
```bash
systemctl status ctsupera
```

## 📊 Monitoramento e Logs

### Verificar logs da aplicação
```bash
journalctl -u ctsupera -f
```

### Verificar logs do Nginx
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🔧 Comandos Úteis

### Reiniciar aplicação
```bash
systemctl restart ctsupera
```

### Atualizar código
```bash
cd /root/ct-supera
git pull
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate --settings=app.settings_production
python manage.py collectstatic --noinput --settings=app.settings_production
systemctl restart ctsupera
```

### Backup do banco de dados
```bash
pg_dump -U ctsupera -h localhost ctsupera > backup_$(date +%Y%m%d).sql
```

## 🛡️ Segurança

### Configurar usuário não-root (recomendado)
```bash
# Criar usuário para a aplicação
adduser ctsupera
usermod -aG sudo ctsupera

# Transferir arquivos para o novo usuário
chown -R ctsupera:ctsupera /root/ct-supera
mv /root/ct-supera /home/ctsupera/
```

### Atualizações automáticas
```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

## 🚨 Troubleshooting

### Problemas comuns:

1. **Erro de conexão com PostgreSQL**:
   - Verificar se o PostgreSQL está rodando: `systemctl status postgresql`
   - Verificar configurações no arquivo `.env`

2. **Erro de permissões**:
   - Verificar se o usuário tem permissões adequadas
   - Verificar permissões dos arquivos estáticos

3. **Erro de SSL**:
   - Verificar se o certificado está válido
   - Verificar configuração do Nginx

4. **Aplicação não inicia**:
   - Verificar logs: `journalctl -u ctsupera -f`
   - Verificar se as variáveis de ambiente estão corretas

## 📞 Próximos Passos

1. Configure o domínio no painel da Hostinger
2. Execute o script de deploy
3. Configure SSL
4. Teste a aplicação
5. Configure backup automático
