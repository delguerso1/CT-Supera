#!/bin/bash

echo "=== Diagnóstico do Service ctsupera ==="
echo ""

# Verificar se o diretório existe
echo "1. Verificando diretório do projeto..."
if [ -d "/root/ct-supera" ]; then
    echo "   ✓ Diretório /root/ct-supera existe"
else
    echo "   ✗ Diretório /root/ct-supera NÃO existe"
    exit 1
fi

# Verificar se o ambiente virtual existe
echo ""
echo "2. Verificando ambiente virtual..."
if [ -d "/root/ct-supera/venv" ]; then
    echo "   ✓ Ambiente virtual existe"
    
    # Verificar se o gunicorn existe
    if [ -f "/root/ct-supera/venv/bin/gunicorn" ]; then
        echo "   ✓ Gunicorn encontrado"
        
        # Verificar permissões
        if [ -x "/root/ct-supera/venv/bin/gunicorn" ]; then
            echo "   ✓ Gunicorn tem permissão de execução"
        else
            echo "   ✗ Gunicorn NÃO tem permissão de execução"
            echo "   Corrigindo permissões..."
            chmod +x /root/ct-supera/venv/bin/gunicorn
        fi
    else
        echo "   ✗ Gunicorn NÃO encontrado em /root/ct-supera/venv/bin/gunicorn"
        echo "   Instalando gunicorn..."
        source /root/ct-supera/venv/bin/activate
        pip install gunicorn
    fi
else
    echo "   ✗ Ambiente virtual NÃO existe"
    echo "   Criando ambiente virtual..."
    cd /root/ct-supera
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
fi

# Verificar arquivo .env
echo ""
echo "3. Verificando arquivo .env..."
if [ -f "/root/ct-supera/.env" ]; then
    echo "   ✓ Arquivo .env existe"
else
    echo "   ⚠ Arquivo .env NÃO existe (pode causar problemas)"
fi

# Verificar arquivo de serviço
echo ""
echo "4. Verificando arquivo de serviço..."
if [ -f "/etc/systemd/system/ctsupera.service" ]; then
    echo "   ✓ Arquivo de serviço existe"
    echo ""
    echo "   Conteúdo do arquivo:"
    cat /etc/systemd/system/ctsupera.service
else
    echo "   ✗ Arquivo de serviço NÃO existe"
    echo "   Copiando arquivo..."
    cp /root/ct-supera/ctsupera_hostinger.service /etc/systemd/system/ctsupera.service
    systemctl daemon-reload
fi

# Testar execução do gunicorn manualmente
echo ""
echo "5. Testando execução do gunicorn..."
cd /root/ct-supera
source venv/bin/activate
if /root/ct-supera/venv/bin/gunicorn --version > /dev/null 2>&1; then
    echo "   ✓ Gunicorn pode ser executado"
    /root/ct-supera/venv/bin/gunicorn --version
else
    echo "   ✗ Gunicorn NÃO pode ser executado"
    echo "   Erro ao executar:"
    /root/ct-supera/venv/bin/gunicorn --version 2>&1
fi

# Verificar status do serviço
echo ""
echo "6. Status atual do serviço:"
systemctl status ctsupera.service --no-pager -l || true

echo ""
echo "=== Diagnóstico concluído ==="
echo ""
echo "Próximos passos:"
echo "1. Se houver erros acima, corrija-os"
echo "2. Execute: sudo systemctl daemon-reload"
echo "3. Execute: sudo systemctl restart ctsupera.service"
echo "4. Execute: sudo systemctl status ctsupera.service"
