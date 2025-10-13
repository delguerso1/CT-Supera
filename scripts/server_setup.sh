#!/bin/bash
# Script para preparar o servidor para CI/CD
# Execute este script NO SERVIDOR (Hostinger)

set -e

echo "🔧 Preparando servidor para CI/CD"
echo "===================================="
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Por favor, execute como root (use sudo)"
    exit 1
fi

# Criar diretório de backups
echo "📁 Criando diretório de backups..."
mkdir -p /root/backups
chmod 700 /root/backups
echo "✅ Diretório de backups criado: /root/backups"

# Instalar rsync (se não estiver instalado)
echo ""
echo "📦 Verificando rsync..."
if ! command -v rsync &> /dev/null; then
    echo "Instalando rsync..."
    apt-get update
    apt-get install -y rsync
    echo "✅ rsync instalado!"
else
    echo "✅ rsync já está instalado"
fi

# Criar script de limpeza de backups antigos
echo ""
echo "📝 Criando script de limpeza de backups..."
cat > /root/cleanup_backups.sh << 'EOF'
#!/bin/bash
# Mantém apenas os últimos 10 backups

cd /root/backups
backup_count=$(ls -1 ct-supera-backup-*.tar.gz 2>/dev/null | wc -l)

if [ $backup_count -gt 10 ]; then
    echo "Limpando backups antigos..."
    ls -t ct-supera-backup-*.tar.gz | tail -n +11 | xargs -r rm
    echo "✅ Backups antigos removidos. Mantidos os 10 mais recentes."
else
    echo "ℹ️ Apenas $backup_count backups encontrados. Nada a remover."
fi
EOF

chmod +x /root/cleanup_backups.sh
echo "✅ Script de limpeza criado: /root/cleanup_backups.sh"

# Configurar cron para limpeza automática (diária às 3am)
echo ""
echo "⏰ Configurando limpeza automática de backups..."
(crontab -l 2>/dev/null | grep -v cleanup_backups.sh; echo "0 3 * * * /root/cleanup_backups.sh >> /root/backups/cleanup.log 2>&1") | crontab -
echo "✅ Cron configurado para limpeza diária às 3h"

# Verificar permissões do diretório do projeto
echo ""
echo "🔐 Verificando permissões..."
if [ -d "/root/ct-supera" ]; then
    chown -R root:root /root/ct-supera
    chmod -R 755 /root/ct-supera
    echo "✅ Permissões configuradas"
else
    echo "⚠️ Diretório /root/ct-supera não encontrado"
fi

# Verificar serviços
echo ""
echo "🔍 Verificando serviços..."
services=("ctsupera" "nginx" "postgresql")
for service in "${services[@]}"; do
    if systemctl is-active --quiet $service; then
        echo "✅ $service está rodando"
    else
        echo "❌ $service NÃO está rodando"
    fi
done

# Criar backup inicial
echo ""
echo "📦 Criando backup inicial..."
if [ -d "/root/ct-supera" ]; then
    cd /root
    timestamp=$(date +%Y%m%d-%H%M%S)
    tar -czf backups/ct-supera-backup-initial-$timestamp.tar.gz ct-supera/
    echo "✅ Backup inicial criado: ct-supera-backup-initial-$timestamp.tar.gz"
else
    echo "⚠️ Diretório do projeto não encontrado. Pulando backup."
fi

# Verificar chaves SSH autorizadas
echo ""
echo "🔑 Verificando chaves SSH..."
if [ -f "/root/.ssh/authorized_keys" ]; then
    key_count=$(grep -c "^ssh-" /root/.ssh/authorized_keys 2>/dev/null || echo "0")
    echo "✅ Encontradas $key_count chaves autorizadas"
else
    echo "⚠️ Arquivo authorized_keys não encontrado"
    mkdir -p /root/.ssh
    chmod 700 /root/.ssh
    touch /root/.ssh/authorized_keys
    chmod 600 /root/.ssh/authorized_keys
    echo "✅ Criado /root/.ssh/authorized_keys"
fi

echo ""
echo "========================================"
echo "✅ Servidor preparado para CI/CD!"
echo "========================================"
echo ""
echo "📊 Resumo:"
echo "- Diretório de backups: /root/backups"
echo "- Script de limpeza: /root/cleanup_backups.sh"
echo "- Limpeza automática: Diária às 3h"
echo ""
echo "📝 Próximos passos:"
echo "1. Adicione a chave pública SSH do GitHub Actions em:"
echo "   /root/.ssh/authorized_keys"
echo "2. Configure os secrets no GitHub"
echo "3. Faça push para a branch main para testar o deploy"
echo ""
echo "Para ver os backups: ls -lht /root/backups/"
echo "Para executar limpeza manual: /root/cleanup_backups.sh"

