#!/bin/bash

# Script de backup automático para o CT Supera
BACKUP_DIR="/home/oracle/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR

# Função para backup Oracle
backup_oracle() {
    echo "🔄 Iniciando backup do Oracle Database..."
    
    # Configurar variáveis de ambiente Oracle
    export ORACLE_HOME=/opt/oracle/instantclient
    export LD_LIBRARY_PATH=$ORACLE_HOME:$LD_LIBRARY_PATH
    export PATH=$ORACLE_HOME:$PATH
    
    # Executar backup
    expdp $ORACLE_DB_USER/$ORACLE_DB_PASSWORD@$ORACLE_DB_HOST:$ORACLE_DB_PORT/$ORACLE_DB_NAME \
        directory=DATA_PUMP_DIR \
        dumpfile=ctsupera_backup_$DATE.dmp \
        logfile=ctsupera_backup_$DATE.log \
        schemas=$ORACLE_DB_USER
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup Oracle concluído com sucesso!"
    else
        echo "❌ Erro no backup Oracle"
        exit 1
    fi
}

# Função para backup PostgreSQL
backup_postgres() {
    echo "🔄 Iniciando backup do PostgreSQL..."
    
    pg_dump -U $POSTGRES_DB_USER -h $POSTGRES_DB_HOST -p $POSTGRES_DB_PORT $POSTGRES_DB_NAME > $BACKUP_DIR/ctsupera_backup_$DATE.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup PostgreSQL concluído com sucesso!"
    else
        echo "❌ Erro no backup PostgreSQL"
        exit 1
    fi
}

# Função para backup SQLite
backup_sqlite() {
    echo "🔄 Iniciando backup do SQLite..."
    
    cp db.sqlite3 $BACKUP_DIR/ctsupera_backup_$DATE.sqlite3
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup SQLite concluído com sucesso!"
    else
        echo "❌ Erro no backup SQLite"
        exit 1
    fi
}

# Função para backup de arquivos de mídia
backup_media() {
    echo "🔄 Iniciando backup de arquivos de mídia..."
    
    tar -czf $BACKUP_DIR/media_backup_$DATE.tar.gz media/
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup de mídia concluído com sucesso!"
    else
        echo "❌ Erro no backup de mídia"
    fi
}

# Determinar tipo de banco de dados
if [ ! -z "$ORACLE_DB_NAME" ]; then
    backup_oracle
elif [ ! -z "$POSTGRES_DB_NAME" ]; then
    backup_postgres
else
    backup_sqlite
fi

# Backup de arquivos de mídia
backup_media

# Limpar backups antigos
echo "🧹 Limpando backups antigos..."
find $BACKUP_DIR -name "*.dmp" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.sql" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.sqlite3" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup concluído! Arquivos salvos em: $BACKUP_DIR" 