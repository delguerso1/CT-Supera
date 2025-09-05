#!/usr/bin/env python3
"""
Script para testar conexão com PostgreSQL
Execute este script para verificar se a configuração está correta
"""

import os
import sys
import django
from django.core.management import execute_from_command_line

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings_hostinger')
django.setup()

def testar_conexao():
    print("🔍 Testando conexão com PostgreSQL...")
    
    try:
        # Testar conexão
        from django.db import connection
        cursor = connection.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"✅ Conexão bem-sucedida!")
        print(f"📊 Versão do PostgreSQL: {version[0]}")
        
        # Testar tabelas
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        print(f"📋 Tabelas encontradas: {len(tables)}")
        for table in tables:
            print(f"   - {table[0]}")
        
        # Testar contagem de registros
        from django.apps import apps
        models = apps.get_models()
        print(f"\n📊 Contagem de registros:")
        for model in models:
            try:
                count = model.objects.count()
                print(f"   - {model._meta.label}: {count} registros")
            except Exception as e:
                print(f"   - {model._meta.label}: Erro - {e}")
        
        print("\n🎉 Teste concluído com sucesso!")
        return True
        
    except Exception as e:
        print(f"❌ Erro na conexão: {e}")
        print("\n🔧 Verifique:")
        print("   1. Se o PostgreSQL está rodando")
        print("   2. Se as credenciais estão corretas no .env")
        print("   3. Se o banco de dados existe")
        print("   4. Se o usuário tem permissões")
        return False

def main():
    print("=" * 50)
    print("🧪 TESTE DE CONEXÃO POSTGRESQL")
    print("=" * 50)
    
    if testar_conexao():
        print("\n✅ PostgreSQL configurado corretamente!")
        sys.exit(0)
    else:
        print("\n❌ Problemas na configuração do PostgreSQL!")
        sys.exit(1)

if __name__ == "__main__":
    main()
