#!/usr/bin/env python3
"""
Script para migrar dados do SQLite para PostgreSQL
Execute este script no servidor após configurar o PostgreSQL
"""

import os
import sys
import django
from django.core.management import execute_from_command_line

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings_hostinger')
django.setup()

def main():
    print("🔄 Iniciando migração para PostgreSQL...")
    
    try:
        # 1. Fazer backup do SQLite
        print("📦 Fazendo backup do SQLite...")
        os.system("cp db.sqlite3 db.sqlite3.backup")
        
        # 2. Exportar dados do SQLite
        print("📤 Exportando dados do SQLite...")
        os.system("python manage.py dumpdata --natural-foreign --natural-primary > data.json")
        
        # 3. Fazer migrações
        print("🔧 Executando migrações...")
        execute_from_command_line(['manage.py', 'makemigrations'])
        execute_from_command_line(['manage.py', 'migrate'])
        
        # 4. Carregar dados
        print("📥 Carregando dados no PostgreSQL...")
        execute_from_command_line(['manage.py', 'loaddata', 'data.json'])
        
        # 5. Verificar migração
        print("✅ Verificando migração...")
        execute_from_command_line(['manage.py', 'showmigrations'])
        
        print("🎉 Migração concluída com sucesso!")
        print("📋 Próximos passos:")
        print("   1. Criar superusuário: python manage.py createsuperuser")
        print("   2. Testar aplicação: python manage.py runserver")
        print("   3. Verificar admin: http://localhost:8000/admin/")
        
    except Exception as e:
        print(f"❌ Erro durante a migração: {e}")
        print("🔄 Restaurando backup...")
        os.system("cp db.sqlite3.backup db.sqlite3")
        sys.exit(1)

if __name__ == "__main__":
    main()
