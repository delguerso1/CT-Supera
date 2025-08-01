# 🚀 Comandos para Executar no Servidor Oracle Linux

## 1. Configuração Inicial

```bash
# Navegar para o diretório do projeto
cd /home/oracle/ct-supera

# Executar configuração inicial
chmod +x setup_server_oracle_linux.sh
./setup_server_oracle_linux.sh
```

## 2. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp production.env.example .env

# Editar o arquivo .env
nano .env
```

**Conteúdo do arquivo .env:**
```env
# Configurações do Django
DJANGO_SECRET_KEY=sua-chave-secreta-muito-segura-aqui
DJANGO_DEBUG=False

# Configurações do servidor
DOMAIN_NAME=seu-dominio.com
SERVER_IP=163.176.178.246

# Configurações do banco de dados Oracle
ORACLE_DB_NAME=XE
ORACLE_DB_USER=ctsupera
ORACLE_DB_PASSWORD=sua-senha-oracle
ORACLE_DB_HOST=localhost
ORACLE_DB_PORT=1521

# Configurações de e-mail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=seu-email@gmail.com
EMAIL_HOST_PASSWORD=sua-senha-de-app
DEFAULT_FROM_EMAIL=sistema@ctsupera.com

# URL do frontend
FRONTEND_URL=https://163.176.178.246

# Configurações do Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=seu-token-mercado-pago
MERCADO_PAGO_PUBLIC_KEY=sua-chave-publica-mercado-pago
```

## 3. Deploy da Aplicação

```bash
# Executar script de deploy
./deploy.sh
```

## 4. Configurar Nginx

```bash
# Copiar configuração do Nginx (Oracle Linux)
sudo cp nginx_simple.conf /etc/nginx/conf.d/ctsupera.conf

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 5. Configurar SSL (Opcional - se tiver domínio)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Gerar certificado SSL
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

## 6. Configurar Serviço Systemd

```bash
# Copiar arquivo de serviço
sudo cp ctsupera.service /etc/systemd/system/

# Recarregar systemd
sudo systemctl daemon-reload

# Ativar e iniciar serviço
sudo systemctl enable ctsupera
sudo systemctl start ctsupera

# Verificar status
sudo systemctl status ctsupera
```

## 7. Configurar Backup Automático

```bash
# Editar crontab
crontab -e

# Adicionar as seguintes linhas:
0 2 * * * /home/oracle/ct-supera/backup.sh >> /home/oracle/backups/backup.log 2>&1
0 3 * * 0 find /home/oracle/ct-supera/logs -name "*.log" -mtime +30 -delete
0 4 * * 0 sudo systemctl restart ctsupera
```

## 8. Verificar Logs

```bash
# Logs da aplicação
sudo journalctl -u ctsupera -f

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs do Django
tail -f logs/django.log
```

## 9. Comandos Úteis

```bash
# Reiniciar aplicação
sudo systemctl restart ctsupera

# Verificar status
sudo systemctl status ctsupera

# Backup manual
./backup.sh

# Atualizar código
git pull
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate --settings=app.settings_production
python manage.py collectstatic --noinput --settings=app.settings_production
sudo systemctl restart ctsupera
```

## 10. Verificar Acesso

Após a configuração, você poderá acessar:
- **HTTP**: http://163.176.178.246
- **HTTPS**: https://163.176.178.246 (se SSL configurado)

## 🚨 Troubleshooting

Se encontrar problemas:

1. **Verificar logs da aplicação:**
   ```bash
   sudo journalctl -u ctsupera -f
   ```

2. **Verificar se o Oracle Instant Client está instalado:**
   ```bash
   ls -la /opt/oracle/instantclient
   ```

3. **Verificar variáveis de ambiente:**
   ```bash
   echo $LD_LIBRARY_PATH
   ```

4. **Verificar conectividade com banco:**
   ```bash
   python manage.py dbshell --settings=app.settings_production
   ```

5. **Verificar permissões:**
   ```bash
   ls -la /home/oracle/ct-supera/
   ``` 