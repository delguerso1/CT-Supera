#!/bin/bash

# Script de configuração inicial do servidor Oracle Linux
echo "🚀 Configurando servidor Oracle Linux para CT Supera..."

# Atualizar o sistema
echo "📦 Atualizando sistema..."
sudo dnf update -y

# Instalar dependências do sistema
echo "🔧 Instalando dependências..."
sudo dnf install -y python3 python3-pip python3-venv nginx git curl unzip wget

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

# Configurar firewall (firewalld no Oracle Linux)
echo "🛡️ Configurando firewall..."
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload

# Configurar SELinux (se necessário)
echo "🔒 Configurando SELinux..."
sudo setsebool -P httpd_can_network_connect 1

# Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p /home/oracle/backups
mkdir -p /home/oracle/ct-supera/logs

# Configurar permissões
echo "🔐 Configurando permissões..."
chmod +x /home/oracle/ct-supera/deploy.sh
chmod +x /home/oracle/ct-supera/backup.sh

echo "✅ Configuração inicial concluída!"
echo "📋 Próximos passos:"
echo "1. Configure o arquivo .env com suas variáveis"
echo "2. Execute: ./deploy.sh"
echo "3. Configure o Nginx e SSL"
echo "4. Ative o serviço systemd" 