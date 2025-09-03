# 🚀 CT Supera - Deploy na Hostinger

## 📋 Resumo das Configurações

Este projeto foi configurado especificamente para deploy na **Hostinger** com as seguintes características:

### 🗄️ Banco de Dados
- **PostgreSQL** (em vez de Oracle)
- Configuração simplificada e compatível com Hostinger

### 📁 Arquivos de Deploy para Hostinger

#### Scripts de Deploy
- `setup_hostinger.sh` - Configuração inicial do servidor
- `deploy_hostinger.sh` - Deploy automatizado da aplicação
- `backup_hostinger.sh` - Backup automático

#### Configurações
- `hostinger.env.example` - Template de variáveis de ambiente
- `app/settings_hostinger.py` - Configurações Django para Hostinger
- `nginx_hostinger.conf` - Configuração do Nginx
- `ctsupera_hostinger.service` - Serviço systemd

#### Documentação
- `HOSTINGER_DEPLOY.md` - Guia completo de deploy
- `crontab.example` - Configuração de tarefas automáticas

### 🚀 Passos para Deploy

1. **Conectar ao servidor**: `ssh root@72.60.145.13`
2. **Configuração inicial**: `./setup_hostinger.sh`
3. **Configurar variáveis**: Editar `.env` baseado em `hostinger.env.example`
4. **Deploy**: `./deploy_hostinger.sh`
5. **Configurar domínio e SSL**

### 🔧 Informações do Servidor

- **IP**: 72.60.145.13
- **Sistema**: Ubuntu
- **Usuário**: root
- **Banco**: PostgreSQL
- **Web Server**: Nginx
- **Process Manager**: Gunicorn + Systemd

### 📊 Monitoramento

- **Logs da aplicação**: `journalctl -u ctsupera -f`
- **Logs do Nginx**: `/var/log/nginx/`
- **Backup automático**: Configurado via cron

### 🛡️ Segurança

- Firewall configurado (portas 22, 80, 443)
- SSL com Let's Encrypt
- Backup automático diário
- Logs de monitoramento

## 📞 Suporte

Para problemas específicos, consulte:
1. `HOSTINGER_DEPLOY.md` - Guia completo
2. Logs da aplicação
3. Status dos serviços systemd
4. Configurações do Nginx

---

**Nota**: Toda documentação relacionada ao Oracle Cloud e AWS foi removida para evitar confusão. Este projeto está focado exclusivamente no deploy na Hostinger.
