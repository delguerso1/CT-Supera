#!/bin/bash

# Script de configuração inicial do servidor Hostinger
echo "🚀 Configurando servidor Hostinger para CT Supera..."

# Atualizar o sistema
echo "📦 Atualizando sistema..."
apt update && apt upgrade -y

# Instalar dependências do sistema
echo "🔧 Instalando dependências..."
apt install -y python3 python3-pip python3-venv nginx git curl postgresql postgresql-contrib

# Configurar PostgreSQL
echo "🗄️ Configurando PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Criar banco e usuário PostgreSQL
echo "👤 Criando usuário e banco PostgreSQL..."
sudo -u postgres psql << EOF
CREATE DATABASE ctsupera;
CREATE USER ctsupera WITH PASSWORD 'ctsupera123';
GRANT ALL PRIVILEGES ON DATABASE ctsupera TO ctsupera;
ALTER USER ctsupera CREATEDB;
\q
EOF

# Configurar firewall
echo "🛡️ Configurando firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p /root/backups
mkdir -p /root/ct-supera/logs

# Configurar permissões
echo "🔐 Configurando permissões..."
chmod +x /root/ct-supera/deploy_hostinger.sh
chmod +x /root/ct-supera/backup.sh

# Instalar Certbot para SSL
echo "🔒 Instalando Certbot para SSL..."
apt install -y certbot python3-certbot-nginx

echo "✅ Configuração inicial concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Clone seu repositório: git clone <seu-repositorio> /root/ct-supera"
echo "2. Configure o arquivo .env com suas variáveis"
echo "3. Execute: ./deploy_hostinger.sh"
echo "4. Configure seu domínio no painel da Hostinger"
echo "5. Execute: certbot --nginx -d seu-dominio.com"
echo ""
echo "🔧 Informações importantes:"
echo "- IP do servidor: 72.60.145.13"
echo "- Banco PostgreSQL: ctsupera / ctsupera123"
echo "- Usuário admin padrão: admin / admin123"
