# 🔧 Configuração Pré-Deploy - CT Supera

## ✅ Já Configurado

- ✅ **Chave Secreta Django**: `[,ME;@,<hEjz_#!L8%e`NFXQci:A7rA7bX(eqQA^V>n:@Yq<wo`
- ✅ **Banco PostgreSQL**: Configurado no servidor (ctsupera/ctsupera123)
- ✅ **IP do Servidor**: 72.60.145.13
- ✅ **Dependências**: Instaladas no servidor

## ⚠️ Pendente de Configuração

### 1. 🌐 Domínio
**Status**: ❌ Não configurado

**O que fazer**:
1. Acesse o painel da Hostinger
2. Vá em "Domínios" → "Gerenciar"
3. Configure seu domínio para apontar para o IP: `72.60.145.13`
4. Anote o domínio (ex: `ctsupera.com`)

**Arquivo a atualizar**: `env_template.txt`
- Linha 16: `DOMAIN_NAME=seu-dominio.com` → `DOMAIN_NAME=ctsupera.com`
- Linha 51: `FRONTEND_URL=https://seu-dominio.com` → `FRONTEND_URL=https://ctsupera.com`
- Linha 44: `DEFAULT_FROM_EMAIL=sistema@seu-dominio.com` → `DEFAULT_FROM_EMAIL=sistema@ctsupera.com`

### 2. 📧 Email
**Status**: ❌ Não configurado

**O que fazer**:
1. Crie um email no painel da Hostinger (ex: `sistema@ctsupera.com`)
2. Anote a senha do email
3. Configure as credenciais

**Arquivo a atualizar**: `env_template.txt`
- Linha 42: `EMAIL_HOST_USER=seu-email@seu-dominio.com` → `EMAIL_HOST_USER=sistema@ctsupera.com`
- Linha 43: `EMAIL_HOST_PASSWORD=sua-senha-de-email` → `EMAIL_HOST_PASSWORD=senha-do-email`

### 3. 📁 Arquivo .env Final
**Status**: ❌ Não criado

**O que fazer**:
1. Após configurar domínio e email
2. Copie o conteúdo de `env_template.txt`
3. Renomeie para `.env`
4. Faça upload para o servidor

## 🚀 Próximos Passos

Após configurar domínio e email:

1. **Atualizar arquivo .env** com as informações corretas
2. **Fazer upload do .env** para o servidor
3. **Executar deploy**: `./deploy_hostinger.sh`
4. **Configurar SSL**: `certbot --nginx -d seu-dominio.com`
5. **Testar sistema**

## 📋 Checklist

- [ ] Domínio configurado no painel Hostinger
- [ ] Email criado no painel Hostinger
- [ ] Arquivo .env atualizado com domínio e email
- [ ] Arquivo .env enviado para o servidor
- [ ] Deploy executado
- [ ] SSL configurado
- [ ] Sistema testado

## 🔗 Links Úteis

- **Painel Hostinger**: https://hpanel.hostinger.com
- **Documentação Hostinger**: https://support.hostinger.com
- **Certbot SSL**: https://certbot.eff.org

---

**Nota**: Mantenha a chave secreta segura e nunca a compartilhe publicamente!

