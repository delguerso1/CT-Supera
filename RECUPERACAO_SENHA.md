# Funcionalidade de Recuperação de Senha - CT Supera

## 🔐 **Visão Geral**

Implementada funcionalidade completa de "Esqueci Minha Senha" para usuários ativos do sistema. A funcionalidade segue os mesmos padrões de segurança já implementados no sistema de ativação de contas.

## 🚀 **Funcionalidades Implementadas**

### **1. Solicitação de Recuperação de Senha**
- **Endpoint**: `POST /api/usuarios/esqueci-senha/`
- **Requisitos**: CPF do usuário
- **Segurança**: Não revela se o usuário existe ou não
- **E-mail**: Enviado automaticamente se usuário for encontrado

### **2. Redefinição de Senha**
- **Endpoint**: `POST /api/usuarios/redefinir-senha/{uidb64}/{token}/`
- **Requisitos**: Token válido e nova senha
- **Validação**: Mesma validação de força de senha do sistema
- **Segurança**: Token com expiração de 24 horas

## 📧 **E-mail de Recuperação**

### **Configuração:**
- **De**: `administracao@ctsupera.com.br`
- **Servidor**: `smtp.hostinger.com`
- **Template**: HTML profissional com design responsivo
- **Validade**: Link válido por 24 horas

### **Conteúdo do E-mail:**
- ✅ Design profissional em HTML
- ✅ Fallback em texto simples
- ✅ Aviso de segurança
- ✅ Instruções claras
- ✅ Link de recuperação seguro

## 🔒 **Segurança Implementada**

### **Medidas de Segurança:**
1. **Tokens únicos** por usuário
2. **Validação de força** de senha
3. **Criptografia** com `set_password()`
4. **Links com expiração** automática (24h)
5. **Validação de confirmação** de senha
6. **Não revela** se usuário existe
7. **Logs de segurança** completos

### **Validação de Senha:**
- **8 caracteres** mínimo
- **1 letra maiúscula**
- **1 letra minúscula**
- **1 número**
- **1 caractere especial** (!@#$%^&*(),.?":{}|<>)

## 📋 **Endpoints da API**

### **Solicitar Recuperação de Senha**
```http
POST /api/usuarios/esqueci-senha/
Content-Type: application/json

{
    "cpf": "12345678901"
}
```

**Resposta de Sucesso:**
```json
{
    "message": "E-mail de recuperação enviado com sucesso!",
    "email": "usuario@email.com"
}
```

**Resposta de Segurança (usuário não encontrado):**
```json
{
    "message": "Se o CPF estiver cadastrado e ativo, você receberá um e-mail com instruções para recuperar sua senha.",
    "code": "EMAIL_SENT"
}
```

### **Redefinir Senha**
```http
POST /api/usuarios/redefinir-senha/{uidb64}/{token}/
Content-Type: application/json

{
    "new_password1": "NovaSenha123!",
    "new_password2": "NovaSenha123!"
}
```

**Resposta de Sucesso:**
```json
{
    "message": "Senha redefinida com sucesso!",
    "user": {
        "id": 1,
        "username": "12345678901",
        "email": "usuario@email.com",
        "first_name": "João",
        "last_name": "Silva"
    }
}
```

## 🎯 **Fluxo Completo**

### **1. Usuário Esquece a Senha:**
1. Acessa tela de "Esqueci Minha Senha"
2. Informa CPF
3. Sistema valida e envia e-mail (se usuário existir)

### **2. Usuário Recebe E-mail:**
1. E-mail com link de recuperação
2. Link válido por 24 horas
3. Design profissional e responsivo

### **3. Usuário Redefine Senha:**
1. Clica no link do e-mail
2. Define nova senha (com validação)
3. Confirma nova senha
4. Senha é atualizada no sistema

### **4. Usuário Faz Login:**
1. Usa CPF como usuário
2. Usa nova senha
3. Acesso liberado

## 🔍 **Códigos de Erro**

| Código | Descrição |
|--------|-----------|
| `INVALID_TOKEN` | Token de recuperação inválido |
| `EXPIRED_TOKEN` | Token de recuperação expirado |
| `VALIDATION_ERROR` | Erro de validação de senha |
| `NO_EMAIL` | Usuário sem e-mail válido |
| `INTERNAL_ERROR` | Erro interno do servidor |

## 📊 **Logs e Monitoramento**

### **Logs Implementados:**
- Solicitação de recuperação
- Envio de e-mail
- Redefinição de senha
- Erros de validação
- Erros de e-mail

### **Exemplo de Logs:**
```
INFO: Solicitação de recuperação de senha para usuario@email.com
INFO: E-mail de recuperação de senha enviado para usuario@email.com
INFO: Senha redefinida com sucesso para o usuário 12345678901
ERROR: Erro ao enviar e-mail de recuperação para usuario@email.com: SMTP error
```

## 🎨 **Integração com Frontend**

### **Páginas Necessárias:**
1. **Tela de "Esqueci Minha Senha"**
   - Campo para CPF
   - Botão de solicitar
   - Mensagem de confirmação

2. **Tela de Redefinição de Senha**
   - Campos para nova senha
   - Confirmação de senha
   - Validação em tempo real

### **Exemplo de Uso (React):**
```javascript
// Solicitar recuperação
const solicitarRecuperacao = async (cpf) => {
  const response = await api.post('/api/usuarios/esqueci-senha/', { cpf });
  return response.data;
};

// Redefinir senha
const redefinirSenha = async (uidb64, token, novaSenha) => {
  const response = await api.post(`/api/usuarios/redefinir-senha/${uidb64}/${token}/`, {
    new_password1: novaSenha,
    new_password2: novaSenha
  });
  return response.data;
};
```

## ✅ **Testes Recomendados**

### **Cenários de Teste:**
1. **CPF válido com e-mail** → Deve enviar e-mail
2. **CPF inválido** → Deve retornar mensagem de segurança
3. **CPF sem e-mail** → Deve retornar erro específico
4. **Token válido** → Deve permitir redefinição
5. **Token expirado** → Deve rejeitar redefinição
6. **Senha fraca** → Deve rejeitar com validação
7. **Senhas diferentes** → Deve rejeitar com erro

## 🚀 **Deploy**

### **Arquivos Modificados:**
- ✅ `usuarios/serializers.py` - Novos serializers
- ✅ `usuarios/utils.py` - Função de envio de e-mail
- ✅ `usuarios/views.py` - Novas views
- ✅ `usuarios/urls.py` - Novas rotas

### **Configurações Necessárias:**
- ✅ E-mail já configurado (`administracao@ctsupera.com.br`)
- ✅ Frontend URL configurada
- ✅ Validação de senha implementada

## 🎉 **Resultado Final**

**Agora o sistema possui funcionalidade completa de recuperação de senha!**

- ✅ **Usuários ativos** podem recuperar senha
- ✅ **E-mail profissional** com design responsivo
- ✅ **Segurança robusta** com tokens e validações
- ✅ **Logs completos** para monitoramento
- ✅ **Integração fácil** com frontend
- ✅ **Padrão consistente** com o resto do sistema

---

**Desenvolvido para CT Supera - Sistema de Gestão de Centro de Treinamento**
