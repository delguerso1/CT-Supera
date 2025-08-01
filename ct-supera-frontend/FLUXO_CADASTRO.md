# Fluxo de Cadastro - Frontend React

## Visão Geral

O sistema CT Supera utiliza um fluxo de cadastro seguro onde **não há campo de senha** no formulário de cadastro. Em vez disso, o sistema envia um convite de ativação por e-mail para que o usuário defina sua própria senha.

## Como Funciona

### 1. Cadastro de Usuário
- O formulário de cadastro (`CadastroUsuario.js`) **não possui campo de senha**
- Todos os dados são enviados para o backend via API REST
- O backend cria o usuário inativo e envia convite de ativação

### 2. Interface do Usuário
- Durante o cadastro, uma mensagem informativa é exibida:
  ```
  📧 Convite de Ativação
  Após o cadastro, um convite será enviado para o e-mail informado 
  para que o usuário possa definir sua senha e ativar a conta.
  ```

### 3. Mensagem de Sucesso
- Após o cadastro bem-sucedido, a mensagem é:
  ```
  "Usuário cadastrado com sucesso! Um convite de ativação foi enviado para o e-mail informado."
  ```

## Componentes Afetados

### CadastroUsuario.js
- **Removido**: Campo `senha` do estado `formData`
- **Removido**: Campo `password` dos dados enviados para a API
- **Adicionado**: Mensagem informativa sobre convite de ativação
- **Atualizado**: Mensagem de sucesso para mencionar o convite

### LoginPage.js
- **Não modificado**: Continua funcionando normalmente para usuários já ativos
- Usuários devem ativar a conta via e-mail antes de fazer login

## Fluxo Completo

1. **Cadastro**: Usuário preenche formulário (sem senha)
2. **Backend**: Cria usuário inativo e envia convite por e-mail
3. **E-mail**: Usuário recebe link de ativação
4. **Ativação**: Usuário acessa link e define sua senha
5. **Login**: Usuário pode fazer login normalmente

## Segurança

- ✅ Nenhuma senha é enviada por e-mail
- ✅ Usuário define sua própria senha
- ✅ Tokens de ativação são seguros e temporários
- ✅ Validação de força de senha no backend
- ✅ Sistema de reenvio de convite disponível

## APIs Utilizadas

- `POST /usuarios/` - Cadastro de usuário
- `POST /usuarios/login/` - Login de usuário ativo
- `POST /usuarios/ativar-conta/` - Ativação via token
- `POST /usuarios/reenviar-convite/` - Reenvio de convite

## Desenvolvimento

Para testar o fluxo completo:

1. Cadastre um novo usuário via frontend
2. Verifique o e-mail recebido
3. Acesse o link de ativação
4. Defina a senha
5. Faça login no sistema

## Notas Importantes

- O frontend é 100% baseado em APIs REST
- Não há templates Django - apenas React
- Todas as validações de senha são feitas no backend
- O sistema é compatível com diferentes tipos de usuário (aluno, professor, gerente) 