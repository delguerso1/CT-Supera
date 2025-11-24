# Postman Collections - CT Supera C6 Bank

## 📦 Collections Disponíveis

### 1. CT Supera - C6 Bank Complete API
**Arquivo:** `CT_Supera_C6Bank_Complete.postman_collection.json`

Collection completa com todas as APIs integradas:
- ✅ Autenticação OAuth2
- ✅ PIX (Cobranças imediatas e com vencimento)
- ✅ Boleto Bancário (Emissão, consulta, alteração, cancelamento)
- ✅ Checkout (Cartão de crédito e débito)
- ✅ APIs do Django (Sistema CT Supera)
- ✅ Webhooks

### 2. C6 Bank - PIX (Sandbox) (Legado)
**Arquivo:** `C6Bank_PIX_Sandbox.postman_collection.json`

Collection original focada apenas em PIX.

## 🔧 Configuração

### 1. Importar Collection no Postman

1. Abra o Postman
2. Clique em **Import** (ou File > Import)
3. Selecione o arquivo: `CT_Supera_C6Bank_Complete.postman_collection.json`
4. Clique em **Import**

### 2. Importar Environment

1. No Postman, clique no ícone de **engrenagem** (Settings) no canto superior direito
2. Clique em **Import**
3. Selecione o arquivo: `CT_Supera_Sandbox_Env.postman_environment.json`
4. Selecione o environment importado no dropdown (canto superior direito)

### 3. Configurar Variáveis

Edite o environment e preencha as seguintes variáveis:

#### Variáveis Obrigatórias:
- `client_id`: Client ID do OAuth2 do C6 Bank
- `client_secret`: Client Secret do OAuth2 do C6 Bank
- `chave_pix`: Chave PIX do recebedor

#### Variáveis Opcionais (para testes com Django):
- `django_token`: Token de autenticação Django (obter via `/api/auth/login/`)
- `django_base_url`: URL base do Django (padrão: `http://localhost:8000`)
- `mensalidade_id`: ID da mensalidade para testes (padrão: `1`)

### 4. Configurar Certificados SSL (mTLS)

Para requisições ao C6 Bank funcionarem, você precisa configurar os certificados SSL:

1. No Postman, vá em **Settings** > **Certificates**
2. Clique em **Add Certificate**
3. Configure:
   - **Host**: `baas-api-sandbox.c6bank.info`
   - **CRT file**: Selecione o arquivo `.crt` do certificado
   - **Key file**: Selecione o arquivo `.key` da chave privada
   - **Passphrase**: Se necessário

**Nota:** Os certificados estão em: `certificados/Leandro Garrot Rodrigues.crt` e `certificados/key - Leandro Garrot Rodrigues`

## 🚀 Como Usar

### Passo 1: Obter Token OAuth2

1. Preencha `client_id` e `client_secret` no environment
2. Execute a requisição: **"1. Autenticação > C6 Bank - Obter Token OAuth2"**
3. O token será salvo automaticamente na variável `access_token`
4. **Importante:** A requisição solicita automaticamente os escopos necessários para PIX:
   - `cob.write` - Criar/alterar cobranças imediatas
   - `cob.read` - Consultar cobranças imediatas
   - `cobv.write` - Criar/alterar cobranças com vencimento
   - `cobv.read` - Consultar cobranças com vencimento
   - `pix.write` - Alterar Pix
   - `pix.read` - Consultar Pix
   - `webhook.write` - Configurar webhooks
   - `webhook.read` - Consultar webhooks

### Passo 2: Testar APIs C6 Bank Diretamente

Agora você pode testar qualquer API do C6 Bank:
- **PIX**: 
  - Criar cobranças imediatas (com ou sem devedor)
  - Criar cobranças com vencimento
  - Consultar cobranças por TXID
  - Listar cobranças imediatas com filtros
  - Listar cobranças com vencimento com filtros
- **Boleto**: Emitir, consultar, alterar, cancelar
- **Checkout**: Criar, consultar, cancelar

### Passo 3: Testar APIs do Django (Opcional)

Para testar as APIs do sistema Django:

1. Obtenha um token Django:
   ```bash
   POST http://localhost:8000/api/auth/login/
   {
     "username": "seu_usuario",
     "password": "sua_senha"
   }
   ```

2. Copie o token retornado e cole na variável `django_token` do environment

3. Execute as requisições do grupo "CT Supera" na collection

## 📋 Estrutura da Collection

### 1. Autenticação
- C6 Bank - Obter Token OAuth2
- CT Supera - Testar Conexão C6 Bank

### 2. PIX - Cobranças
- C6 Bank - Criar Cobrança PIX Imediata
- C6 Bank - Criar Cobrança PIX Imediata com Devedor
- C6 Bank - Criar Cobrança PIX com Vencimento
- C6 Bank - Consultar Cobrança PIX por TXID
- C6 Bank - Listar Cobranças PIX Imediatas
- C6 Bank - Listar Cobranças PIX com Vencimento
- C6 Bank - Consultar Cobrança PIX com Vencimento
- C6 Bank - Configurar Webhook PIX
- CT Supera - Gerar PIX para Mensalidade
- CT Supera - Consultar Status PIX

### 3. Boleto Bancário
- C6 Bank - Emitir Boleto Simples
- C6 Bank - Emitir Boleto com Juros e Multa
- C6 Bank - Emitir Boleto com Desconto
- C6 Bank - Consultar Boleto
- C6 Bank - Alterar Boleto
- C6 Bank - Cancelar Boleto
- C6 Bank - Download PDF do Boleto
- CT Supera - Gerar Boleto para Mensalidade
- CT Supera - Consultar Boleto

### 4. Checkout (Cartão)
- C6 Bank - Criar Checkout Cartão Crédito
- C6 Bank - Criar Checkout Cartão Débito
- C6 Bank - Consultar Checkout
- C6 Bank - Cancelar Checkout
- CT Supera - Criar Checkout para Mensalidade

### 5. Transações e Webhooks
- CT Supera - Listar Transações C6 Bank
- CT Supera - Detalhes da Transação
- CT Supera - Webhook PIX (Simulação)

## 🔍 Variáveis Automáticas

Algumas variáveis são preenchidas automaticamente:

- `access_token`: Preenchido após autenticação OAuth2
- `txid`: Preenchido ao criar cobrança PIX imediata
- `txid_cobv`: Gerado automaticamente ao criar cobrança com vencimento
- `boleto_id`: Preenchido ao emitir boleto
- `checkout_id`: Preenchido ao criar checkout
- `basic_b64`: Gerado automaticamente a partir de client_id e client_secret

### Variáveis para Filtros (Opcionais)

Você pode configurar as seguintes variáveis no environment para usar nos filtros:

- `data_inicio`: Data inicial no formato ISO 8601 (ex: `2025-01-01T00:00:00Z`)
- `data_fim`: Data final no formato ISO 8601 (ex: `2025-01-31T23:59:59Z`)
- `cpf_filtro`: CPF do devedor para filtrar (11 dígitos)
- `cnpj_filtro`: CNPJ do devedor para filtrar (14 dígitos)
- `status_filtro`: Status da cobrança para filtrar
- `location_presente`: true/false para filtrar por existência de location
- `lote_cobv_id`: ID do lote para filtrar cobranças com vencimento

## 📝 Exemplos de Uso das Novas Funcionalidades PIX

### Criar Cobrança Imediata com Devedor

A requisição **"C6 Bank - Criar Cobrança PIX Imediata com Devedor"** permite criar uma cobrança identificando o devedor:

```json
{
  "calendario": {
    "expiracao": 3600
  },
  "valor": {
    "original": "10.00"
  },
  "chave": "{{chave_pix}}",
  "solicitacaoPagador": "CT Supera - Mensalidade Teste",
  "devedor": {
    "cpf": "11144477735",
    "nome": "João Silva"
  }
}
```

**Notas importantes:**
- A expiração é em **segundos** (3600 = 1 hora)
- Para pessoa jurídica, use `cnpj` ao invés de `cpf`
- **Email não é permitido** em cobranças imediatas (apenas CPF/CNPJ e Nome)
- Email só é permitido em cobranças com vencimento
- **CPF/CNPJ deve ser válido**: Use CPFs válidos para testes (ex: 11144477735). CPFs inválidos podem causar erro 500

### Criar Cobrança com Vencimento

A requisição **"C6 Bank - Criar Cobrança PIX com Vencimento"** cria uma cobrança com data de vencimento:

- **Método:** PUT (não POST)
- **Endpoint:** `/v2/pix/cobv/{txid}`
- **TXID:** Gerado automaticamente pelo script pré-requisição (26-35 caracteres alfanuméricos)
- **Devedor:** Obrigatório com endereço completo (logradouro, cidade, uf, cep)
- **Multa e Juros:** Opcionais, configuráveis no payload
- **CPF/CNPJ:** Deve ser válido (ex: 11144477735)

### Listar Cobranças com Filtros

As requisições de listagem suportam vários filtros:

1. **Listar Cobranças Imediatas:**
   - Configure `data_inicio` e `data_fim` no environment
   - Opcionalmente, habilite filtros por CPF, CNPJ, status ou location

2. **Listar Cobranças com Vencimento:**
   - Similar às imediatas, mas com endpoint `/cobv`
   - Permite filtrar também por `loteCobVId`

**Dica:** Para habilitar filtros opcionais, edite a requisição no Postman e desabilite o campo `disabled: true` nos parâmetros desejados.

## ⚠️ Observações Importantes

1. **Certificados SSL**: Obrigatórios para todas as requisições ao C6 Bank (incluindo autenticação)
2. **Ambiente Sandbox**: Todas as URLs estão configuradas para sandbox
3. **Tokens**: O token OAuth2 expira em 5 minutos (300 segundos)
4. **Escopos OAuth2**: O token deve incluir os escopos necessários. A requisição de autenticação já solicita automaticamente todos os escopos PIX necessários
5. **Erro 401 ao criar cobrança**: Se receber erro 401 ao criar cobrança PIX, obtenha um novo token com os escopos corretos
6. **Webhooks**: O webhook real é enviado pelo C6 Bank, a requisição na collection é apenas para simulação
7. **Expiração PIX**: Agora é em **segundos**, não mais em minutos
8. **Cobrança com Vencimento**: Requer TXID único e devedor com endereço completo

## 🚨 Tratamento de Erros (RFC 7807)

A API do C6 Bank retorna erros no formato **RFC 7807** quando uma requisição não é bem-sucedida (status HTTP diferente de 2XX).

### Formato de Erro

Todas as respostas de erro têm:
- **Content-Type**: `application/problem+json`
- **Estrutura JSON** conforme RFC 7807:

```json
{
  "type": "https://developers.c6bank.com.br/v1/error/invalid_request",
  "title": "Requisição inválida",
  "status": 400,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "correlation_id": "abc123-def456-ghi789",
  "detail": "Descrição detalhada do erro (não deve ser mostrada ao usuário final)"
}
```

### Campos do Erro

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `type` | string | ✅ | URI que identifica o tipo do problema. Pode ser clicável e direciona para documentação. |
| `title` | string | ✅ | Descrição legível do problema, sempre associado ao `type`. |
| `status` | number | ✅ | Código HTTP da resposta (replicado para conveniência). |
| `timestamp` | string | ❌ | Horário da ocorrência em formato `yyyy-MM-dd'T'HH:mm:ss.SSS'Z'`. |
| `correlation_id` | string | ❌ | ID de correlação para suporte. Use este ID ao solicitar ajuda. |
| `detail` | string | ❌ | Descrição detalhada do problema (não deve ser mostrada ao usuário final). |

### Tipos de Erro

| Tipo | Status HTTP | Descrição |
|------|-------------|-----------|
| `invalid_request` | 400 | Requisição inválida |
| `unauthorized` | 401 | Não autorizado |
| `access_denied` | 403 | Acesso negado (sem escopo necessário) |
| `not_found` | 404 | Entidade não encontrada |
| `unprocessable_entity` | 422 | Entidade não pode ser processada (formato correto, mas semanticamente errado) |
| `too_many_requests` | 429 | Muitas requisições em curto espaço de tempo |
| `internal_server_error` | 500 | Erro interno do servidor |
| `service_unavailable` | 503 | Serviço não disponível (manutenção ou fora da janela de funcionamento) |
| `gateway_timeout` | 504 | Serviço demorou além do esperado para retornar |

### Exemplos de Respostas de Erro

#### Erro 400 - Requisição Inválida
```json
{
  "type": "https://developers.c6bank.com.br/v1/error/invalid_request",
  "title": "Requisição inválida",
  "status": 400,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "correlation_id": "abc123-def456-ghi789",
  "detail": "O campo 'valor.original' deve ser um número positivo maior que zero."
}
```

#### Erro 401 - Não Autorizado
```json
{
  "type": "https://developers.c6bank.com.br/v1/error/unauthorized",
  "title": "Não autorizado",
  "status": 401,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "correlation_id": "xyz789-abc123-def456"
}
```

#### Erro 404 - Não Encontrado
```json
{
  "type": "https://developers.c6bank.com.br/v1/error/not_found",
  "title": "Entidade não encontrada",
  "status": 404,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "correlation_id": "not-found-123",
  "detail": "Cobrança PIX com TXID 'abc123' não encontrada."
}
```

#### Erro 422 - Entidade Não Processável
```json
{
  "type": "https://developers.c6bank.com.br/v1/error/unprocessable_entity",
  "title": "Entidade não pode ser processada",
  "status": 422,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "correlation_id": "unprocessable-456",
  "detail": "A chave PIX informada não está cadastrada ou não é válida para este tipo de operação."
}
```

### Documentação de Erros

Cada tipo de erro possui uma página de documentação acessível através da URL no campo `type`:
- Exemplo: `https://developers.c6bank.com.br/v1/error/invalid_request`

Essas páginas contêm informações adicionais para auxiliar na análise e resolução do problema.

### Tratamento no Postman

Ao receber uma resposta de erro:

1. **Verifique o status HTTP**: Se não for 2XX, é um erro
2. **Verifique o Content-Type**: Deve ser `application/problem+json`
3. **Leia o campo `title`**: Descrição legível do problema
4. **Anote o `correlation_id`**: Use ao solicitar suporte
5. **Consulte a URL do `type`**: Para mais informações sobre o erro
6. **Não mostre `detail` ao usuário**: Este campo é apenas para desenvolvedores

### Testando Erros

Para testar cenários de erro no Postman:

1. **Erro 400**: Envie dados inválidos (ex: valor negativo, campos obrigatórios faltando)
2. **Erro 401**: Use um token inválido ou expirado
3. **Erro 403**: Tente acessar recurso sem o escopo necessário
4. **Erro 404**: Consulte um TXID ou ID que não existe
5. **Erro 422**: Envie dados com formato correto mas semanticamente inválidos (ex: chave PIX inválida)

## 🔄 Atualizar para Produção

Para usar em produção:

1. Altere as URLs no environment:
   - `base_url`: `https://baas-api.c6bank.info`
   - `auth_url`: `https://baas-api.c6bank.info/v1/auth/`
   - `pix_base`: `https://baas-api.c6bank.info/v2/pix`
   - `bankslip_base`: `https://baas-api.c6bank.info/v1/bank_slips`
   - `checkout_base`: `https://baas-api.c6bank.info/v1/checkouts`

2. Configure os certificados de produção
3. Use as credenciais de produção (client_id, client_secret, chave_pix)

## 📚 Documentação Adicional

- Documentação C6 Bank: https://developers.c6bank.com.br
- APIs PIX: https://developers.c6bank.com.br/apis/pix
- APIs Boleto: https://developers.c6bank.com.br/apis/bankslip
- APIs Checkout: https://developers.c6bank.com.br/apis/checkout

