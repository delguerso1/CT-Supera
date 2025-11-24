# Solução: Erro ENOTFOUND {{auth_url}} no Postman

## 🔍 Problema

Ao executar a requisição de autenticação no Postman, aparece o erro:
```
Error: getaddrinfo ENOTFOUND {{auth_url}}
```

## ✅ Soluções

### Solução 1: Verificar se o Environment está selecionado

**O problema mais comum é não ter o environment selecionado:**

1. No Postman, verifique o **dropdown no canto superior direito** (ao lado do ícone de engrenagem)
2. Certifique-se de que **"CT Supera - C6 Bank Sandbox"** está selecionado
3. Se não estiver, selecione-o no dropdown

### Solução 2: Verificar se a variável existe no Environment

1. Clique no ícone de **engrenagem** (Settings) no canto superior direito
2. Clique em **"CT Supera - C6 Bank Sandbox"** para editar
3. Verifique se existe a variável `auth_url` com o valor:
   ```
   https://baas-api-sandbox.c6bank.info/v1/auth/
   ```
4. Se não existir, adicione:
   - **Variable**: `auth_url`
   - **Initial Value**: `https://baas-api-sandbox.c6bank.info/v1/auth/`
   - **Current Value**: `https://baas-api-sandbox.c6bank.info/v1/auth/`
   - Marque **"Enabled"** como ativado

### Solução 3: Usar URL direta (Alternativa rápida)

Se o problema persistir, você pode editar a requisição diretamente:

1. Abra a requisição **"C6 Bank - Obter Token OAuth2"**
2. Na aba **Params** ou na URL, substitua `{{auth_url}}` por:
   ```
   https://baas-api-sandbox.c6bank.info/v1/auth/
   ```

### Solução 4: Reimportar o Environment

Se nada funcionar, reimporte o environment:

1. No Postman, vá em **Import**
2. Selecione o arquivo: `CT_Supera_Sandbox_Env.postman_environment.json`
3. Clique em **Import**
4. Selecione o environment no dropdown

## 🔧 Verificação Rápida

Para verificar se as variáveis estão funcionando:

1. No Postman, clique no ícone de **olho** (👁️) ao lado da URL
2. Você deve ver as variáveis resolvidas:
   - `{{auth_url}}` deve aparecer como `https://baas-api-sandbox.c6bank.info/v1/auth/`
   - Se aparecer `{{auth_url}}` literal, o environment não está selecionado ou a variável não existe

## 📝 Checklist

Antes de executar a requisição, verifique:

- [ ] Environment "CT Supera - C6 Bank Sandbox" está selecionado
- [ ] Variável `auth_url` existe no environment
- [ ] Variável `auth_url` está **habilitada** (Enabled = true)
- [ ] Variável `auth_url` tem o valor correto: `https://baas-api-sandbox.c6bank.info/v1/auth/`
- [ ] `client_id` e `client_secret` estão preenchidos no environment
- [ ] Certificados SSL estão configurados no Postman

## 🚀 Após Corrigir

Depois de corrigir, a requisição deve funcionar e você verá:
- Status: `200 OK`
- Resposta com `access_token`
- Token será salvo automaticamente na variável `access_token`

