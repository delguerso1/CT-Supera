#!/bin/bash

# Script de configuração inicial do servidor Oracle Cloud
echo "🚀 Configurando servidor Oracle Cloud para CT Supera..."

# Atualizar o sistema
echo "📦 Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependências do sistema
echo "🔧 Instalando dependências..."
sudo apt install -y python3 python3-pip python3-venv nginx git curl unzip

# Instalar Oracle Instant Client
echo "🗄️ Instalando Oracle Instant Client..."
cd /tmp
wget https://download.oracle.com/otn_software/linux/instantclient/219000/instantclient-basic-linux.x64-21.9.0.0.0dbru.zip
unzip instantclient-basic-linux.x64-21.9.0.0.0dbru.zip
sudo mv instantclient_21_9 /opt/oracle
sudo ln -s /opt/oracle/instantclient_21_9 /opt/oracle/instantclient

# Configurar variáveis de ambiente Oracle
echo 'export LD_LIBRARY_PATH=/opt/oracle/instantclient:$LD_LIBRARY_PATH' >> ~/.bashrc
echo 'export PATH=/opt/oracle/instantclient:$PATH' >> ~/.bashrc
source ~/.bashrc

# Configurar firewall
echo "🛡️ Configurando firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p /home/ubuntu/backups
mkdir -p /home/ubuntu/ct-supera/logs

# Configurar permissões
echo "🔐 Configurando permissões..."
chmod +x /home/ubuntu/ct-supera/deploy.sh
chmod +x /home/ubuntu/ct-supera/backup.sh

echo "✅ Configuração inicial concluída!"
echo "📋 Próximos passos:"
echo "1. Configure o arquivo .env com suas variáveis"
echo "2. Execute: ./deploy.sh"
echo "3. Configure o Nginx e SSL"
echo "4. Ative o serviço systemd" 