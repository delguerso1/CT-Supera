#!/bin/bash
# Script para corrigir o service ctsupera - Copie e cole diretamente no servidor

echo "=== Corrigindo Service ctsupera ==="

# 1. Parar o serviço
echo "1. Parando serviço..."
sudo systemctl stop ctsupera.service

# 2. Verificar e instalar gunicorn se necessário
echo "2. Verificando gunicorn..."
if [ ! -f "/root/ct-supera/venv/bin/gunicorn" ]; then
    echo "   Gunicorn não encontrado, instalando..."
    cd /root/ct-supera
    source venv/bin/activate
    pip install gunicorn
    deactivate
else
    echo "   ✓ Gunicorn encontrado"
fi

# 3. Corrigir permissões
echo "3. Corrigindo permissões..."
chmod +x /root/ct-supera/venv/bin/gunicorn

# 4. Testar gunicorn
echo "4. Testando gunicorn..."
if /root/ct-supera/venv/bin/gunicorn --version > /dev/null 2>&1; then
    echo "   ✓ Gunicorn funciona"
    /root/ct-supera/venv/bin/gunicorn --version
else
    echo "   ✗ Erro ao executar gunicorn"
    /root/ct-supera/venv/bin/gunicorn --version
fi

# 5. Fazer backup do arquivo de serviço atual
echo "5. Fazendo backup do arquivo de serviço..."
sudo cp /etc/systemd/system/ctsupera.service /etc/systemd/system/ctsupera.service.backup

# 6. Corrigir arquivo de serviço (remover ProtectHome e ajustar ProtectSystem)
echo "6. Corrigindo arquivo de serviço..."
sudo sed -i 's/^ProtectHome=true$/#ProtectHome=true/' /etc/systemd/system/ctsupera.service
sudo sed -i 's/^ProtectSystem=strict$/ProtectSystem=read-only/' /etc/systemd/system/ctsupera.service

# 7. Verificar se as alterações foram aplicadas
echo "7. Verificando alterações..."
if grep -q "ProtectSystem=read-only" /etc/systemd/system/ctsupera.service; then
    echo "   ✓ ProtectSystem corrigido"
else
    echo "   ⚠ ProtectSystem não foi alterado (pode não existir no arquivo)"
fi

if grep -q "^#ProtectHome=true" /etc/systemd/system/ctsupera.service || ! grep -q "^ProtectHome=true" /etc/systemd/system/ctsupera.service; then
    echo "   ✓ ProtectHome removido/comentado"
else
    echo "   ⚠ ProtectHome ainda está ativo"
fi

# 8. Recarregar systemd
echo "8. Recarregando systemd..."
sudo systemctl daemon-reload

# 9. Iniciar serviço
echo "9. Iniciando serviço..."
sudo systemctl start ctsupera.service

# 10. Aguardar um pouco
sleep 2

# 11. Verificar status
echo "10. Status do serviço:"
sudo systemctl status ctsupera.service --no-pager -l

echo ""
echo "=== Correção concluída ==="
echo ""
echo "Se o serviço ainda não estiver funcionando, verifique os logs:"
echo "  sudo journalctl -u ctsupera.service -n 50 --no-pager"

