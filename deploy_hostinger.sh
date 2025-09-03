#!/bin/bash

# Script de deploy para Hostinger
echo "🚀 Iniciando deploy do CT Supera na Hostinger..."

# Verificar se estamos no diretório correto
if [ ! -f "manage.py" ]; then
    echo "❌ Erro: Execute este script no diretório raiz do projeto Django"
    exit 1
fi

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    echo "❌ Erro: Arquivo .env não encontrado. Copie hostinger.env.example para .env e configure as variáveis"
    exit 1
fi

# Carregar variáveis de ambiente
export $(cat .env | grep -v '^#' | xargs)

# Criar ambiente virtual se não existir
if [ ! -d "venv" ]; then
    echo "📦 Criando ambiente virtual..."
    python3 -m venv venv
fi

# Ativar ambiente virtual
echo "🔧 Ativando ambiente virtual..."
source venv/bin/activate

# Atualizar pip
echo "📦 Atualizando pip..."
pip install --upgrade pip

# Instalar dependências
echo "📦 Instalando dependências..."
pip install -r requirements.txt

# Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p logs
mkdir -p staticfiles
mkdir -p media

# Executar migrações
echo "🗄️ Executando migrações do banco de dados..."
python manage.py migrate --settings=app.settings_hostinger

# Coletar arquivos estáticos
echo "📁 Coletando arquivos estáticos..."
python manage.py collectstatic --noinput --settings=app.settings_hostinger

# Criar superusuário se não existir
echo "👤 Verificando superusuário..."
python manage.py shell --settings=app.settings_hostinger << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    print("Criando superusuário...")
    User.objects.create_superuser('admin', 'admin@ctsupera.com', 'admin123')
    print("Superusuário criado: admin / admin123")
else:
    print("Superusuário já existe")
EOF

# Configurar permissões
echo "🔐 Configurando permissões..."
chmod -R 755 staticfiles/
chmod -R 755 media/

# Verificar se o serviço systemd existe
if [ -f "ctsupera_hostinger.service" ]; then
    echo "🔄 Configurando serviço systemd..."
    cp ctsupera_hostinger.service /etc/systemd/system/ctsupera.service
    systemctl daemon-reload
    systemctl enable ctsupera
    systemctl restart ctsupera
    echo "✅ Serviço systemd configurado e iniciado"
else
    echo "⚠️ Arquivo ctsupera_hostinger.service não encontrado. Configure manualmente."
fi

# Verificar se o Nginx está configurado
if [ -f "nginx_hostinger.conf" ]; then
    echo "🌐 Configurando Nginx..."
    cp nginx_hostinger.conf /etc/nginx/sites-available/ctsupera
    ln -sf /etc/nginx/sites-available/ctsupera /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração do Nginx
    nginx -t
    if [ $? -eq 0 ]; then
        systemctl restart nginx
        echo "✅ Nginx configurado e reiniciado"
    else
        echo "❌ Erro na configuração do Nginx"
    fi
else
    echo "⚠️ Arquivo nginx_hostinger.conf não encontrado. Configure manualmente."
fi

# Verificar status dos serviços
echo "📊 Verificando status dos serviços..."
echo "Status do PostgreSQL:"
systemctl status postgresql --no-pager -l

echo "Status do Nginx:"
systemctl status nginx --no-pager -l

echo "Status da aplicação:"
systemctl status ctsupera --no-pager -l

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure seu domínio no painel da Hostinger"
echo "2. Execute: certbot --nginx -d seu-dominio.com"
echo "3. Acesse: http://72.60.145.13 ou https://seu-dominio.com"
echo "4. Login: admin / admin123"
echo ""
echo "🔧 Comandos úteis:"
echo "- Ver logs: journalctl -u ctsupera -f"
echo "- Reiniciar: systemctl restart ctsupera"
echo "- Status: systemctl status ctsupera"
