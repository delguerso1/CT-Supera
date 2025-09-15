# Funcionalidade de Recuperação de Senha - Frontend React

## 🎨 **Componentes Implementados**

### **1. EsqueciMinhaSenha.js**
- **Rota**: `/esqueci-senha`
- **Funcionalidade**: Solicitar recuperação de senha
- **Características**:
  - ✅ Formulário com validação de CPF
  - ✅ Máscara automática para CPF
  - ✅ Loading state durante requisição
  - ✅ Mensagens de sucesso e erro
  - ✅ Design responsivo e profissional
  - ✅ Integração com API

### **2. RedefinirSenha.js**
- **Rota**: `/redefinir-senha/:uidb64/:token`
- **Funcionalidade**: Redefinir senha com token
- **Características**:
  - ✅ Validação de força de senha em tempo real
  - ✅ Confirmação de senha
  - ✅ Indicadores visuais de validação
  - ✅ Verificação de token válido
  - ✅ Redirecionamento automático após sucesso
  - ✅ Design responsivo e profissional

## 🔗 **Integração com API**

### **Serviço de API Atualizado:**
```javascript
// ct-supera-frontend/src/services/api.js
export const passwordRecoveryAPI = {
  // Solicitar recuperação de senha
  solicitarRecuperacao: async (cpf) => {
    const response = await api.post('/usuarios/esqueci-senha/', { cpf });
    return response.data;
  },

  // Redefinir senha
  redefinirSenha: async (uidb64, token, novaSenha) => {
    const response = await api.post(`/usuarios/redefinir-senha/${uidb64}/${token}/`, {
      new_password1: novaSenha,
      new_password2: novaSenha
    });
    return response.data;
  }
};
```

## 🛣️ **Rotas Adicionadas**

### **App.js - Novas Rotas:**
```javascript
import EsqueciMinhaSenha from './pages/EsqueciMinhaSenha';
import RedefinirSenha from './pages/RedefinirSenha';

// Rotas públicas
<Route path="/esqueci-senha" element={<EsqueciMinhaSenha />} />
<Route path="/redefinir-senha/:uidb64/:token" element={<RedefinirSenha />} />
```

## 🎯 **Funcionalidades Implementadas**

### **1. Tela de "Esqueci Minha Senha":**
- ✅ Campo de CPF com máscara automática
- ✅ Validação de CPF (11 dígitos)
- ✅ Botão de envio com loading state
- ✅ Mensagens de feedback
- ✅ Link para voltar ao login
- ✅ Design responsivo

### **2. Tela de "Redefinir Senha":**
- ✅ Validação de força de senha em tempo real
- ✅ Indicadores visuais de validação
- ✅ Confirmação de senha
- ✅ Verificação de token válido
- ✅ Redirecionamento automático
- ✅ Tratamento de erros

### **3. Página de Login Atualizada:**
- ✅ Link "Esqueci minha senha"
- ✅ Navegação para recuperação
- ✅ Design integrado

## 🔒 **Validações Implementadas**

### **Validação de CPF:**
- ✅ Formato correto (11 dígitos)
- ✅ Máscara automática
- ✅ Validação antes do envio

### **Validação de Senha:**
- ✅ Mínimo 8 caracteres
- ✅ Pelo menos 1 letra maiúscula
- ✅ Pelo menos 1 letra minúscula
- ✅ Pelo menos 1 número
- ✅ Pelo menos 1 caractere especial
- ✅ Confirmação de senha
- ✅ Indicadores visuais em tempo real

## 🎨 **Design e UX**

### **Características do Design:**
- ✅ **Gradientes modernos** para diferenciação visual
- ✅ **Cores temáticas**: Azul para ativação, Vermelho para recuperação
- ✅ **Animações suaves** e transições
- ✅ **Loading states** com spinners
- ✅ **Feedback visual** para validações
- ✅ **Design responsivo** para mobile
- ✅ **Acessibilidade** com labels e placeholders

### **Estados Visuais:**
- ✅ **Campos válidos**: Borda verde
- ✅ **Campos inválidos**: Borda vermelha
- ✅ **Loading**: Spinner animado
- ✅ **Sucesso**: Mensagem verde
- ✅ **Erro**: Mensagem vermelha

## 📱 **Responsividade**

### **Breakpoints:**
- ✅ **Desktop**: Layout completo
- ✅ **Tablet**: Ajustes de padding
- ✅ **Mobile**: Layout otimizado

### **Adaptações Mobile:**
- ✅ Padding reduzido
- ✅ Fontes ajustadas
- ✅ Botões otimizados
- ✅ Formulários adaptados

## 🔄 **Fluxo de Navegação**

### **1. Usuário Esquece Senha:**
```
Login → "Esqueci minha senha" → EsqueciMinhaSenha
```

### **2. Solicitação de Recuperação:**
```
EsqueciMinhaSenha → API → E-mail enviado
```

### **3. Redefinição de Senha:**
```
E-mail → Link → RedefinirSenha → Nova senha → Login
```

### **4. Sucesso:**
```
RedefinirSenha → Sucesso → Redirecionamento → Login
```

## 🚀 **Como Usar**

### **1. Acessar Recuperação:**
- Na página de login, clique em "Esqueci minha senha"
- Digite seu CPF
- Clique em "Enviar E-mail de Recuperação"

### **2. Redefinir Senha:**
- Acesse o link do e-mail
- Digite nova senha (com validação)
- Confirme a senha
- Clique em "Redefinir Senha"

### **3. Fazer Login:**
- Use seu CPF como usuário
- Use a nova senha
- Acesse seu dashboard

## 🧪 **Testes Recomendados**

### **Cenários de Teste:**
1. **CPF válido** → Deve enviar e-mail
2. **CPF inválido** → Deve mostrar erro
3. **Token válido** → Deve permitir redefinição
4. **Token expirado** → Deve mostrar erro
5. **Senha fraca** → Deve rejeitar com validação
6. **Senhas diferentes** → Deve rejeitar
7. **Navegação** → Deve funcionar corretamente

## 📁 **Arquivos Criados/Modificados**

### **Novos Arquivos:**
- ✅ `src/pages/EsqueciMinhaSenha.js`
- ✅ `src/pages/RedefinirSenha.js`

### **Arquivos Modificados:**
- ✅ `src/App.js` - Rotas adicionadas
- ✅ `src/pages/LoginPage.js` - Link adicionado
- ✅ `src/services/api.js` - Funções de API adicionadas

## 🎉 **Resultado Final**

**Funcionalidade completa de recuperação de senha implementada no frontend!**

- ✅ **Interface moderna** e responsiva
- ✅ **Validações robustas** em tempo real
- ✅ **Integração perfeita** com API
- ✅ **UX otimizada** com feedback visual
- ✅ **Navegação intuitiva** entre telas
- ✅ **Tratamento de erros** completo
- ✅ **Design consistente** com o sistema

---

**Desenvolvido para CT Supera - Sistema de Gestão de Centro de Treinamento**
