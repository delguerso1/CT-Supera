#!/bin/bash

# Script de deploy para produção no Oracle Cloud
echo "🚀 Iniciando deploy do CT Supera para produção..."

# Verificar se o Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 não encontrado. Instalando..."
    sudo apt update
    sudo apt install -y python3 python3-pip python3-venv
fi

# Criar ambiente virtual
echo "📦 Criando ambiente virtual..."
python3 -m venv venv
source venv/bin/activate

# Instalar dependências
echo "📥 Instalando dependências..."
pip install --upgrade pip
pip install -r requirements.txt

# Criar diretório de logs
echo "📁 Criando diretório de logs..."
mkdir -p logs

# Coletar arquivos estáticos
echo "🗂️ Coletando arquivos estáticos..."
python manage.py collectstatic --noinput --settings=app.settings_production

# Executar migrações
echo "🔄 Executando migrações..."
python manage.py migrate --settings=app.settings_production

# Criar superusuário (opcional)
echo "👤 Deseja criar um superusuário? (s/n)"
read -r create_superuser
if [[ $create_superuser == "s" ]]; then
    python manage.py createsuperuser --settings=app.settings_production
fi

# Configurar permissões
echo "🔐 Configurando permissões..."
chmod +x gunicorn.conf.py

echo "✅ Deploy concluído!"
echo "📋 Para iniciar o servidor, execute:"
echo "   source venv/bin/activate"
echo "   gunicorn app.wsgi:application --config gunicorn.conf.py --settings=app.settings_production" 