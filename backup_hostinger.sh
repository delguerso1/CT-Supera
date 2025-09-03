#!/bin/bash

# Script de backup para Hostinger
echo "💾 Iniciando backup do CT Supera..."

# Configurações
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/root/ct-supera"

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR

# Backup do banco de dados PostgreSQL
echo "🗄️ Fazendo backup do banco de dados..."
pg_dump -U ctsupera -h localhost ctsupera > $BACKUP_DIR/database_backup_$DATE.sql

# Backup dos arquivos de mídia
echo "📁 Fazendo backup dos arquivos de mídia..."
tar -czf $BACKUP_DIR/media_backup_$DATE.tar.gz -C $PROJECT_DIR media/

# Backup dos logs
echo "📋 Fazendo backup dos logs..."
tar -czf $BACKUP_DIR/logs_backup_$DATE.tar.gz -C $PROJECT_DIR logs/

# Backup do arquivo .env
echo "🔐 Fazendo backup do arquivo .env..."
cp $PROJECT_DIR/.env $BACKUP_DIR/env_backup_$DATE

# Criar backup completo
echo "📦 Criando backup completo..."
tar -czf $BACKUP_DIR/complete_backup_$DATE.tar.gz \
    -C $BACKUP_DIR \
    database_backup_$DATE.sql \
    media_backup_$DATE.tar.gz \
    logs_backup_$DATE.tar.gz \
    env_backup_$DATE

# Remover arquivos temporários
rm $BACKUP_DIR/database_backup_$DATE.sql
rm $BACKUP_DIR/media_backup_$DATE.tar.gz
rm $BACKUP_DIR/logs_backup_$DATE.tar.gz
rm $BACKUP_DIR/env_backup_$DATE

# Limpar backups antigos (manter apenas os últimos 7 dias)
echo "🧹 Limpando backups antigos..."
find $BACKUP_DIR -name "complete_backup_*.tar.gz" -mtime +7 -delete

echo "✅ Backup concluído: $BACKUP_DIR/complete_backup_$DATE.tar.gz"

# Mostrar informações do backup
ls -lh $BACKUP_DIR/complete_backup_$DATE.tar.gz
