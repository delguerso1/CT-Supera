#!/bin/bash
# Script de configuração inicial do CI/CD para CT Supera

set -e

echo "🚀 Configurando CI/CD para CT Supera"
echo "======================================"
echo ""

# Verificar se está no diretório correto
if [ ! -f "manage.py" ]; then
    echo "❌ Erro: Execute este script no diretório raiz do projeto Django"
    exit 1
fi

# Gerar chave SSH para GitHub Actions
echo "🔐 Gerando chave SSH para GitHub Actions..."
if [ ! -f ~/.ssh/github_actions_key ]; then
    ssh-keygen -t rsa -b 4096 -C "github-actions@ctsupera.com" -f ~/.ssh/github_actions_key -N ""
    echo "✅ Chave SSH gerada!"
else
    echo "⚠️ Chave SSH já existe"
fi

echo ""
echo "📋 Chave pública SSH (copie esta chave para o servidor):"
echo "--------------------------------------------------------"
cat ~/.ssh/github_actions_key.pub
echo "--------------------------------------------------------"
echo ""

# Copiar chave para servidor
read -p "Digite o IP do servidor Hostinger (padrão: 72.60.145.13): " server_ip
server_ip=${server_ip:-72.60.145.13}

read -p "Digite o usuário SSH (padrão: root): " ssh_user
ssh_user=${ssh_user:-root}

echo ""
echo "📤 Copiando chave pública para o servidor..."
ssh-copy-id -i ~/.ssh/github_actions_key.pub ${ssh_user}@${server_ip}

if [ $? -eq 0 ]; then
    echo "✅ Chave copiada com sucesso!"
else
    echo "❌ Erro ao copiar chave. Copie manualmente:"
    echo "ssh ${ssh_user}@${server_ip}"
    echo "echo \"$(cat ~/.ssh/github_actions_key.pub)\" >> ~/.ssh/authorized_keys"
fi

echo ""
echo "🔐 CHAVE PRIVADA SSH (adicione como SECRET no GitHub):"
echo "======================================================="
echo "Nome do Secret: SSH_PRIVATE_KEY"
echo ""
echo "Valor (copie todo o conteúdo abaixo):"
echo "------------------------------------------------------"
cat ~/.ssh/github_actions_key
echo "------------------------------------------------------"
echo ""

echo "📝 OUTROS SECRETS NECESSÁRIOS:"
echo "======================================================="
echo "1. HOST: ${server_ip}"
echo "2. USERNAME: ${ssh_user}"
echo ""

echo "🔗 Para adicionar os secrets no GitHub:"
echo "1. Acesse: https://github.com/SEU_USUARIO/ct-supera/settings/secrets/actions"
echo "2. Clique em 'New repository secret'"
echo "3. Adicione cada secret listado acima"
echo ""

echo "✅ Configuração local concluída!"
echo ""
echo "📚 Próximos passos:"
echo "1. Adicione os secrets no GitHub (veja acima)"
echo "2. Commit e push dos arquivos de workflow"
echo "3. Verifique o deploy automático no GitHub Actions"
echo ""
echo "Para mais informações, leia: DEPLOY_CI_CD.md"

