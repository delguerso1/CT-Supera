# Configuração do Domínio ctsupera.com.br

## ✅ Configurações Atualizadas

O domínio `ctsupera.com.br` foi configurado nos seguintes arquivos:

### 1. Backend (Django)
- ✅ `env_template.txt` - Template de variáveis de ambiente
- ✅ `app/settings.py` - Configurações de desenvolvimento
- ✅ `app/settings_hostinger.py` - Configurações de produção

### 2. Servidor Web (Nginx)
- ✅ `nginx_hostinger.conf` - Configuração para Hostinger
- ✅ `nginx.conf` - Configuração geral

### 3. Frontend (React)
- ✅ `ct-supera-frontend/src/services/api.js` - Adicionada variável MEDIA_URL
- ✅ `ct-supera-frontend/src/pages/DashboardGerente.js` - URLs de imagens atualizadas
- ✅ `ct-supera-frontend/src/pages/DashboardProfessor.js` - URLs de imagens atualizadas
- ✅ `ct-supera-frontend/src/pages/DashboardAluno.js` - URLs de imagens atualizadas

## 🔧 Próximos Passos para Deploy

### 1. Configurar DNS
Configure os registros DNS do domínio `ctsupera.com.br` para apontar para o IP do servidor:
- **A Record**: `ctsupera.com.br` → `72.60.145.13`
- **CNAME Record**: `www.ctsupera.com.br` → `ctsupera.com.br`

### 2. Atualizar Arquivo .env
No servidor, atualize o arquivo `.env` com:
```bash
DOMAIN_NAME=ctsupera.com.br
FRONTEND_URL=https://ctsupera.com.br
DEFAULT_FROM_EMAIL=administracao@ctsupera.com.br
EMAIL_HOST_USER=administracao@ctsupera.com.br
EMAIL_HOST_PASSWORD=Supera2025@
```

### 3. Configurar SSL (Certificado HTTPS)
Execute no servidor:
```bash
# Instalar Certbot (se não estiver instalado)
sudo apt install certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d ctsupera.com.br -d www.ctsupera.com.br

# Testar renovação automática
sudo certbot renew --dry-run
```

### 4. Atualizar Configuração do Nginx
Após obter o certificado SSL, descomente as seções HTTPS no arquivo `nginx_hostinger.conf`.

### 5. Configurar Frontend para Produção
Crie um arquivo `.env` no diretório `ct-supera-frontend/`:
```bash
REACT_APP_API_URL=https://ctsupera.com.br/api/
REACT_APP_MEDIA_URL=https://ctsupera.com.br
```

### 6. Rebuild e Deploy
```bash
# Backend
cd /root/ct-supera
python manage.py collectstatic --noinput
sudo systemctl restart ctsupera

# Frontend
cd /root/ct-supera/ct-supera-frontend
npm run build
# Copiar arquivos build para o servidor web
```

## 🔍 Verificações Pós-Deploy

1. **Teste de Conectividade**:
   - `https://ctsupera.com.br` - Deve carregar o frontend
   - `https://ctsupera.com.br/api/` - Deve retornar dados da API

2. **Teste de SSL**:
   - Verificar se o certificado está válido
   - Testar redirecionamento HTTP → HTTPS

3. **Teste de Funcionalidades**:
   - Login de usuários
   - Upload de imagens
   - Todas as funcionalidades do sistema

## 📝 Notas Importantes

- O domínio `www.ctsupera.com.br` também foi configurado para redirecionar para `ctsupera.com.br`
- As configurações de CORS foram atualizadas para aceitar o novo domínio
- As URLs de imagens agora usam variáveis de ambiente para facilitar mudanças futuras
- O sistema está preparado para HTTPS com configurações de segurança adequadas

## 🚨 Troubleshooting

Se houver problemas após o deploy:

1. **Verificar logs do Nginx**:
   ```bash
   sudo tail -f /var/log/nginx/ctsupera_error.log
   ```

2. **Verificar logs do Django**:
   ```bash
   sudo journalctl -u ctsupera -f
   ```

3. **Testar conectividade**:
   ```bash
   curl -I https://ctsupera.com.br
   curl -I https://ctsupera.com.br/api/
   ```
