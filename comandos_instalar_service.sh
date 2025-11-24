#!/bin/bash
# Script para instalar o service no servidor

echo "📦 Instalando service ctsupera..."

# 1. Copiar o arquivo de service
sudo cp /root/ct-supera/ctsupera_hostinger.service /etc/systemd/system/ctsupera.service

# 2. Recarregar systemd
sudo systemctl daemon-reload

# 3. Habilitar service
sudo systemctl enable ctsupera.service

# 4. Iniciar service
sudo systemctl start ctsupera.service

# 5. Verificar status
echo ""
echo "📊 Status do service:"
sudo systemctl status ctsupera.service --no-pager -l

echo ""
echo "✅ Service instalado!"
echo ""
echo "🔍 Verificar logs: journalctl -u ctsupera.service -f"
echo "🔄 Reiniciar: systemctl restart ctsupera.service"

