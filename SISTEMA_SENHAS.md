# Sistema de Senhas - CT Supera (100% API REST)

## Visão Geral

O sistema de criação de senhas foi reformulado para seguir as melhores práticas de segurança, implementando links de ativação para **TODOS** os usuários. O sistema é **100% baseado em Django REST Framework (DRF)** - não utiliza templates HTML.

## Fluxo de Criação de Senha

### **Para TODOS os Usuários (Alunos, Professores, Gerentes):**

1. **Cadastro do Usuário**: Frontend chama API para cadastrar usuário
2. **Criação do Usuário**: Usuário é criado inativo (sem senha válida)
3. **Envio de Link de Ativação**: E-mail com link para ativação é enviado automaticamente
4. **Ativação pelo Usuário**: Frontend consome API para definir senha e ativar conta

### **Diferenças por Tipo de Usuário:**

- **Alunos**: Cadastrados via pré-cadastro ou diretamente via API
- **Professores**: Cadastrados diretamente via API pelo gerente
- **Gerentes**: Cadastrados via API por outro gerente ou administrador

## Validação de Força de Senha

### Requisitos Mínimos:
- **8 caracteres** mínimo
- **1 letra maiúscula**
- **1 letra minúscula**
- **1 número**
- **1 caractere especial** (!@#$%^&*(),.?":{}|<>)

### Validação Implementada em:
- `usuarios/serializers.py` - API REST (DefinirSenhaSerializer)

## Endpoints da API

### Criar Usuário
```
POST /api/usuarios/
```

**Payload:**
```json
{
    "cpf": "12345678901",
    "first_name": "João",
    "last_name": "Silva",
    "email": "joao@email.com",
    "tipo": "aluno",
    "telefone": "(21)99999-9999",
    "data_nascimento": "1990-01-01"
}
```

**Resposta:**
```json
{
    "id": 1,
    "username": "12345678901",
    "email": "joao@email.com",
    "first_name": "João",
    "last_name": "Silva",
    "tipo": "aluno",
    "tipo_display": "Aluno"
}
```

### Ativação de Conta
```
POST /api/usuarios/ativar-conta/{uidb64}/{token}/
```

**Payload:**
```json
{
    "new_password1": "NovaSenha123!",
    "new_password2": "NovaSenha123!"
}
```

**Resposta de Sucesso:**
```json
{
    "message": "Conta ativada com sucesso!",
    "user": {
        "id": 1,
        "username": "12345678901",
        "email": "usuario@email.com",
        "first_name": "João",
        "last_name": "Silva"
    }
}
```

**Resposta de Erro:**
```json
{
    "error": "Dados inválidos",
    "details": {
        "new_password1": ["A senha deve conter pelo menos uma letra maiúscula."]
    },
    "code": "VALIDATION_ERROR"
}
```

### Reenviar Convite
```
POST /api/usuarios/reenviar-convite/{usuario_id}/
```

**Resposta:**
```json
{
    "message": "Convite de ativação reenviado com sucesso!"
}
```

### Listar Usuários
```
GET /api/usuarios/
GET /api/usuarios/?tipo=aluno
GET /api/usuarios/?tipo=professor
GET /api/usuarios/?tipo=gerente
```

### Editar Usuário
```
PUT /api/usuarios/{id}/
PATCH /api/usuarios/{id}/
```

### Excluir Usuário
```
DELETE /api/usuarios/{id}/
```

## Códigos de Erro da API

| Código | Descrição |
|--------|-----------|
| `INVALID_TOKEN` | Token de ativação inválido |
| `EXPIRED_TOKEN` | Token de ativação expirado |
| `VALIDATION_ERROR` | Erro de validação de senha |
| `USER_NOT_FOUND` | Usuário não encontrado |

## Configurações

### Variáveis de Ambiente (.env)
```env
EMAIL_HOST_USER=seuemail@gmail.com
EMAIL_HOST_PASSWORD=sua_senha_app
DEFAULT_FROM_EMAIL=sistema@ctsupera.com
FRONTEND_URL=http://localhost:3000
```

### Configurações de E-mail (settings.py)
```python
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL')
FRONTEND_URL = os.getenv('FRONTEND_URL')
```

## Segurança Implementada

### ✅ Boas Práticas Aplicadas:
1. **Nunca envia senha por e-mail**
2. **Links de ativação com tokens seguros para TODOS**
3. **Validação de força de senha via serializer**
4. **Senhas sempre criptografadas**
5. **Tokens com expiração**
6. **Remoção de logs de senha**
7. **100% API REST - sem templates HTML**
8. **Consistência total - todos usam link de ativação**
9. **Usuários criados inativos até ativação**

### 🔒 Medidas de Segurança:
- Tokens únicos por usuário
- Validação de força de senha no serializer
- Criptografia com `set_password()`
- Links com expiração automática
- Validação de confirmação de senha
- Códigos de erro padronizados
- Usuários inativos até ativação via link

## Fluxo de Recuperação

### Reenviar Convite de Ativação:
1. Frontend chama API `POST /api/usuarios/reenviar-convite/{usuario_id}/`
2. Sistema reenvia e-mail com novo link de ativação
3. Usuário recebe novo link válido

## Serializers

### DefinirSenhaSerializer
- Validação de força de senha
- Confirmação de senha
- Mensagens de erro detalhadas
- Compatível com DRF

### UsuarioSerializer
- Cria usuário inativo automaticamente
- Envia convite de ativação automaticamente
- Não aceita senha no cadastro
- Validação completa de dados

## Logs e Monitoramento

### Logs Implementados:
- Criação de usuários
- Envio de convites
- Ativação de contas
- Erros de e-mail

### Exemplo de Log:
```
INFO: Convite de ativação enviado para usuario@email.com
INFO: Conta ativada com sucesso para o usuário 12345678901
ERROR: Erro ao enviar convite para usuario@email.com: SMTP error
```

## Integração com Frontend

### Exemplo de Uso no Frontend (React):
```javascript
// Criar usuário
const criarUsuario = async (userData) => {
  try {
    const response = await fetch('/api/usuarios/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Usuário criado:', data);
      // Mostrar mensagem de sucesso
    } else {
      console.error('Erro:', data.error);
    }
  } catch (error) {
    console.error('Erro de rede:', error);
  }
};

// Ativar conta
const ativarConta = async (uidb64, token, password1, password2) => {
  try {
    const response = await fetch(`/api/usuarios/ativar-conta/${uidb64}/${token}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        new_password1: password1,
        new_password2: password2
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Conta ativada:', data.user);
      // Redirecionar para login
    } else {
      console.error('Erro:', data.error, data.details);
    }
  } catch (error) {
    console.error('Erro de rede:', error);
  }
};

// Listar usuários
const listarUsuarios = async (tipo = null) => {
  try {
    const url = tipo ? `/api/usuarios/?tipo=${tipo}` : '/api/usuarios/';
    const response = await fetch(url, {
      headers: {
        'Authorization': `Token ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Usuários:', data);
      // Atualizar estado do componente
    }
  } catch (error) {
    console.error('Erro:', error);
  }
};
```

## Troubleshooting

### Problemas Comuns:

1. **E-mail não enviado**
   - Verificar configurações SMTP
   - Verificar credenciais de e-mail
   - Verificar logs de erro

2. **Link de ativação inválido**
   - Token pode ter expirado
   - Usuário pode ter sido deletado
   - Verificar se uidb64 está correto

3. **Senha rejeitada pela API**
   - Verificar requisitos de força
   - Verificar se senhas coincidem
   - Verificar caracteres especiais

## Próximos Passos

### Melhorias Futuras:
1. **Implementar redefinição de senha** (esqueci minha senha)
2. **Adicionar rate limiting** para tentativas de login
3. **Implementar autenticação de dois fatores**
4. **Adicionar notificações** de login suspeito
5. **Implementar refresh tokens**

---

**Desenvolvido para CT Supera - Sistema de Gestão de Centro de Treinamento** 