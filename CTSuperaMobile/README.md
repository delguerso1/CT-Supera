# CT Supera Mobile App

Aplicativo móvel para o sistema de gestão do CT Supera, desenvolvido em React Native com TypeScript.

## 🚀 Funcionalidades

### Para Alunos
- ✅ **Autenticação**: Login com usuário e senha
- ✅ **Dashboard Personalizado**: 
  - Visualização de status (Ativo/Inativo)
  - Contador de turmas
  - Valor da mensalidade
  - Lista de turmas com detalhes (centro, professor, horário, dias da semana)
- ✅ **Perfil do Usuário**:
  - Visualização de foto de perfil ou iniciais
  - Informações pessoais (nome, email, telefone, endereço)
  - Data de nascimento
  - Ficha médica
- ⏳ **Check-in de Presença**: Estrutura criada, aguardando implementação
- ⏳ **Gestão de Pagamentos**: Estrutura criada, aguardando implementação

### Para Professores
- ✅ **Autenticação**: Login com usuário e senha
- ✅ **Dashboard de Professor**:
  - Visualização de perfil com foto/iniciais
  - Estatísticas: Turmas ativas, Total de alunos, Salário
  - Lista de turmas com detalhes completos
- ✅ **Gerenciamento de Turmas**:
  - Visualização de todas as turmas do professor
  - Status de cada turma (Ativa/Inativa)
  - Detalhes: Centro, número de alunos, horário, dias da semana
- ⏳ **Registro de Presença**: Estrutura criada, aguardando implementação completa
- ✅ **Perfil Profissional**:
  - Informações pessoais e profissionais
  - Salário
  - Chave PIX do professor
  - Opção de editar perfil (estrutura criada)

### Para Gerentes
- ✅ **Autenticação**: Login com usuário e senha
- ✅ **Dashboard Gerencial**:
  - Estatísticas gerais: Alunos ativos, Professores, Turmas
  - Estatísticas financeiras: Mensalidades pendentes, atrasadas e pagas
  - Atividades recentes do sistema
- ✅ **Gestão Financeira**:
  - Total de mensalidades pendentes e atrasadas
  - Lista de mensalidades com status (Pago/Pendente/Atrasado)
  - Informações: Aluno, valor, data de vencimento
- ✅ **Gestão de Alunos**:
  - Estatísticas de alunos
  - Estrutura para visualizar e cadastrar alunos
- ✅ **Relatórios**:
  - Estrutura para relatórios financeiros
  - Estrutura para relatórios de presença
  - Estrutura para relatórios de alunos e turmas

## 📱 Tecnologias Utilizadas

### Core
- **React Native** 0.80.2
- **TypeScript** 5.0.4
- **React** 19.1.0

### Navegação
- **@react-navigation/native** 7.1.16
- **@react-navigation/stack** 7.4.4
- **@react-navigation/bottom-tabs** 7.4.4
- **react-native-screens** 4.13.1
- **react-native-safe-area-context** 5.5.2
- **react-native-gesture-handler** 2.27.2

### Requisições HTTP e Storage
- **Axios** 1.11.0 - Para requisições HTTP
- **@react-native-async-storage/async-storage** 2.2.0 - Para persistência local

### UI e Ícones
- **react-native-vector-icons** 10.3.0 - Biblioteca de ícones Material Icons

### Outras Dependências
- **react-native-image-picker** 8.2.1 - Para seleção de imagens
- **react-native-permissions** 5.4.2 - Para gerenciamento de permissões

## 🛠️ Instalação

### Pré-requisitos

- Node.js >= 18
- React Native CLI
- Android Studio (para Android)
- Xcode (para iOS - apenas macOS)

### Passos para Instalação

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd CTSuperaMobile
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Para Android:**
   ```bash
   # Certifique-se de que o emulador Android está rodando
   npm run android
   ```

4. **Para iOS:**
   ```bash
   cd ios
   pod install
   cd ..
   npm run ios
   ```

## 🔧 Configuração

### Configuração da API

O app está configurado para se conectar com a API Django. Para alterar a URL da API:

1. Abra o arquivo `src/config/index.ts`
2. Modifique a constante `API_BASE_URL`:
   ```typescript
   API_BASE_URL: 'http://seu-servidor:8000/api/',
   ```

**Nota**: O valor padrão é `http://10.0.2.2:8000/api/` (para emulador Android). Para dispositivos físicos, use o IP da sua máquina na rede local.

### Configuração do Ambiente

Para desenvolvimento local, certifique-se de que:

1. A API Django está rodando em `http://localhost:8000`
2. **Emulador Android**: Use `http://10.0.2.2:8000/api/` (já configurado)
3. **Dispositivo Físico Android**: Use o IP da sua máquina (ex: `http://192.168.1.100:8000/api/`)
4. **iOS Simulator**: Use `http://localhost:8000/api/`
5. **Dispositivo Físico iOS**: Use o IP da sua máquina na rede local

## 📁 Estrutura do Projeto

```
CTSuperaMobile/
├── src/
│   ├── assets/                    # Recursos estáticos (imagens, etc)
│   ├── components/                # Componentes reutilizáveis
│   │   ├── Button.tsx            # Botão customizado com variantes
│   │   ├── Card.tsx              # Card com sombra e bordas arredondadas
│   │   └── LoadingScreen.tsx     # Tela de carregamento padronizada
│   ├── config/                    # Configurações do app
│   │   └── index.ts              # Configurações (API, cores, timeouts, etc)
│   ├── screens/                   # Telas do aplicativo
│   │   ├── LoginScreen.tsx       # Tela de login
│   │   ├── DashboardAlunoScreen.tsx      # Dashboard e funcionalidades do aluno
│   │   ├── DashboardProfessorScreen.tsx  # Dashboard e funcionalidades do professor
│   │   └── DashboardGerenteScreen.tsx    # Dashboard e funcionalidades do gerente
│   ├── services/                  # Serviços de API
│   │   └── api.ts                # Cliente Axios e serviços de API
│   ├── types/                     # Definições de tipos TypeScript
│   │   ├── index.ts              # Interfaces e tipos principais
│   │   └── react-native-vector-icons.d.ts  # Tipos para ícones
│   └── utils/                     # Utilitários
│       └── AuthContext.tsx       # Context de autenticação
├── App.tsx                        # Componente raiz e navegação
├── package.json                   # Dependências do projeto
├── tsconfig.json                  # Configuração TypeScript
└── README.md                      # Este arquivo
```

## 🔐 Autenticação

O app utiliza um sistema de autenticação baseado em tokens:

### Fluxo de Autenticação

1. **Login**: 
   - Endpoint: `POST /api/usuarios/login/`
   - Envia `username` e `password`
   - Recebe `token` e `user` (dados do usuário)

2. **Armazenamento**:
   - Token salvo no AsyncStorage com chave `'token'`
   - Dados do usuário salvos no AsyncStorage com chave `'user'`

3. **Interceptores Axios**:
   - Token adicionado automaticamente em todas as requisições via header `Authorization: Token {token}`
   - Tratamento automático de erro 401 (token expirado/inválido) - limpa storage e redireciona

4. **Context API**:
   - `AuthContext` gerencia estado global de autenticação
   - Hook `useAuth()` disponível em todos os componentes
   - Propriedades: `user`, `token`, `login()`, `logout()`, `loading`

5. **Logout**:
   - Endpoint: `POST /api/usuarios/logout/`
   - Remove token e dados do usuário do AsyncStorage
   - Redireciona automaticamente para tela de login

### Endpoints de Autenticação Implementados

- ✅ `POST /api/usuarios/login/` - Login
- ✅ `POST /api/usuarios/logout/` - Logout
- ✅ `GET /api/usuarios/profile/` - Obter perfil do usuário atual

## 🎨 Design System

### Cores Principais
- **Primary**: `#1a237e` (Azul escuro) - Botões principais, headers, destaques
- **Secondary**: `#f5f7fa` (Cinza claro) - Backgrounds secundários
- **Success**: `#4caf50` (Verde) - Status ativo, sucesso
- **Warning**: `#ff9800` (Laranja) - Avisos, pendências
- **Danger**: `#f44336` (Vermelho) - Erros, status inativo, logout
- **Text Primary**: `#333` - Texto principal
- **Text Secondary**: `#666` - Texto secundário
- **Text Light**: `#999` - Texto desabilitado/claro
- **Background Primary**: `#f5f7fa` - Background principal
- **Background Secondary**: `#fff` - Background de cards

### Componentes Padrão

#### Button (`src/components/Button.tsx`)
- Variantes: `primary`, `secondary`, `danger`
- Props: `title`, `onPress`, `variant`, `disabled`, `loading`, `style`, `textStyle`
- Suporte a estado de loading com ActivityIndicator

#### Card (`src/components/Card.tsx`)
- Card com sombra e bordas arredondadas
- Props: `children`, `style`, `padding` (padrão: 16)
- Elevação e sombra para Android e iOS

#### LoadingScreen (`src/components/LoadingScreen.tsx`)
- Tela de carregamento padronizada
- Props: `message` (padrão: "Carregando...")
- ActivityIndicator centralizado com mensagem

## 📱 Navegação

O app utiliza React Navigation com:

- **Stack Navigator**: Para navegação principal (Login ↔ App)
- **Bottom Tabs**: Para navegação entre seções dentro do app
- **Navegação baseada em tipo de usuário**: Cada tipo tem suas próprias abas

### Estrutura de Navegação

```
Login Screen
    ↓ (após login bem-sucedido)
Main App (baseado no tipo de usuário)
    ↓
├── Aluno:
│   ├── Dashboard (estatísticas, turmas)
│   ├── Perfil (informações pessoais)
│   ├── Check-in (estrutura criada)
│   └── Pagamentos (estrutura criada)
│
├── Professor:
│   ├── Dashboard (estatísticas, turmas)
│   ├── Turmas (gerenciamento de turmas)
│   ├── Presença (registro de presença)
│   └── Perfil (informações profissionais)
│
└── Gerente:
    ├── Dashboard (estatísticas gerais e financeiras)
    ├── Financeiro (mensalidades, relatórios)
    ├── Alunos (gestão de alunos)
    └── Relatórios (relatórios diversos)
```

### Ícones de Navegação

O app utiliza Material Icons do `react-native-vector-icons`:
- Dashboard: `dashboard`
- Perfil: `person`
- Check-in: `qr-code-scanner`
- Pagamentos: `payment`
- Turmas: `group`
- Presença: `checklist`
- Financeiro: `account-balance-wallet`
- Alunos: `people`
- Relatórios: `assessment`

## 🔌 APIs e Serviços Implementados

### Serviços de Autenticação (`authService`)
- ✅ `login(username, password)` - Realiza login e salva token
- ✅ `logout()` - Realiza logout e remove dados
- ✅ `getCurrentUser()` - Obtém dados do usuário atual

### Serviços de Usuário (`userService`)
- ✅ `getProfile()` - Obtém perfil completo do usuário
- ✅ `updateProfile(data)` - Atualiza dados do perfil
- ✅ `uploadPhoto(userId, photo)` - Faz upload de foto de perfil

### Serviços de Turma (`turmaService`)
- ✅ `getTurmas(params?)` - Lista turmas com filtros opcionais
- ✅ `getTurmaById(id)` - Obtém detalhes de uma turma específica

### Serviços de Presença (`presencaService`)
- ✅ `registrarPresenca(data)` - Registra presença de alunos
- ✅ `verificarCheckin(turmaId)` - Verifica status de check-in

### Serviços Financeiros (`financeiroService`)
- ✅ `getMensalidades(params?)` - Lista mensalidades com filtros
- ✅ `getDashboardStats()` - Obtém estatísticas do dashboard financeiro

### Serviços de Funcionário (`funcionarioService`)
- ✅ `getPainelProfessor()` - Obtém dados do painel do professor
- ✅ `getPainelGerente()` - Obtém dados do painel do gerente
- ✅ `atualizarDadosProfessor(data)` - Atualiza dados do professor
- ✅ `atualizarDadosGerente(data)` - Atualiza dados do gerente

### Endpoints Utilizados

#### Autenticação
- `POST /api/usuarios/login/`
- `POST /api/usuarios/logout/`
- `GET /api/usuarios/profile/`
- `PUT /api/usuarios/{id}/`

#### Turmas
- `GET /api/turmas/`
- `GET /api/turmas/{id}/`

#### Presença
- `POST /api/presencas/registrar/`
- `GET /api/funcionarios/verificar-checkin/{turmaId}/`

#### Financeiro
- `GET /api/financeiro/mensalidades/`
- `GET /api/financeiro/dashboard/`

#### Funcionários
- `GET /api/funcionarios/painel-professor/`
- `GET /api/funcionarios/painel-gerente/`
- `PUT /api/funcionarios/atualizar-dados-professor/`
- `PUT /api/funcionarios/atualizar-dados-gerente/`

### Interceptores Axios

1. **Request Interceptor**: Adiciona token de autenticação automaticamente
2. **Response Interceptor**: Trata erros 401 (não autorizado) removendo dados de autenticação

## 📊 Tipos TypeScript

### Interfaces Principais

- **User**: Dados do usuário (aluno, professor ou gerente)
- **Turma**: Informações da turma
- **CentroTreinamento**: Dados do centro de treinamento
- **Mensalidade**: Informações de mensalidade
- **Presenca**: Dados de presença
- **DashboardStats**: Estatísticas do dashboard
- **Activity**: Atividades recentes
- **LoginResponse**: Resposta do login
- **ApiResponse<T>**: Resposta genérica da API
- **NavigationProps**: Props de navegação
- **AuthContextType**: Tipo do contexto de autenticação

## 🔧 Desenvolvimento

### Scripts Disponíveis

```bash
npm start          # Inicia o Metro bundler
npm run android    # Executa no Android
npm run ios        # Executa no iOS
npm run lint       # Executa o linter
npm test           # Executa os testes
```

### Debugging

1. **React Native Debugger**: Recomendado para debugging
2. **Flipper**: Para inspeção de rede e logs
3. **Chrome DevTools**: Para debugging JavaScript

### Logs

Os logs são exibidos no console do Metro bundler. Para logs específicos:

```typescript
console.log('Debug info:', data);
```

## 🚀 Deploy

### Android

1. **Gerar APK de release:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. **Gerar AAB para Google Play:**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

### iOS

1. **Arquivo de projeto:** `ios/CTSuperaMobile.xcworkspace`
2. **Configuração:** Use Xcode para configurar certificados e provisioning profiles
3. **Build:** Archive e export para App Store

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## ⏳ Funcionalidades Pendentes

### Para Alunos
- [ ] Implementação completa de Check-in de presença
- [ ] Implementação completa de Gestão de Pagamentos
  - [ ] Visualização de mensalidades pendentes
  - [ ] Geração de PIX para pagamento
  - [ ] Geração de boleto bancário
  - [ ] Pagamento via cartão (checkout)
  - [ ] Histórico de pagamentos
  - [ ] Consulta de status de pagamento

### Para Professores
- [ ] Implementação completa de Registro de Presença
  - [ ] Lista de alunos da turma
  - [ ] Marcação de presença individual
  - [ ] Marcação de presença em lote
  - [ ] Histórico de presenças
- [ ] Edição de perfil funcional
- [ ] Upload de foto de perfil

### Para Gerentes
- [ ] Visualização completa de todos os alunos
- [ ] Cadastro de novos alunos
- [ ] Edição de dados de alunos
- [ ] Geração de relatórios financeiros
- [ ] Geração de relatórios de presença
- [ ] Geração de relatórios de alunos
- [ ] Geração de relatórios de turmas

### Funcionalidades Gerais
- [ ] Notificações push
- [ ] Modo offline (cache de dados)
- [ ] Sincronização de dados
- [ ] Suporte a múltiplos idiomas
- [ ] Tema claro/escuro
- [ ] Melhorias de performance
- [ ] Testes unitários e de integração

## 🔗 Integração com APIs de Pagamento

O app está preparado para integrar com as APIs de pagamento do C6 Bank através do backend Django:

### APIs Disponíveis no Backend (não implementadas no mobile ainda)

- **PIX**: 
  - `POST /api/financeiro/mensalidades/{id}/gerar-pix/`
  - `GET /api/financeiro/mensalidades/{id}/status-pix/`
  - `POST /api/financeiro/pix/gerar/{mensalidade_id}/`
  - `GET /api/financeiro/pix/status/{transacao_id}/`

- **Boleto**:
  - `POST /api/financeiro/mensalidades/{id}/gerar-boleto/`
  - `GET /api/financeiro/mensalidades/{id}/consultar-boleto/`

- **Checkout (Cartão)**:
  - `POST /api/financeiro/pagamento-bancario/gerar/{mensalidade_id}/`

### Próximos Passos para Integração

1. Adicionar serviços de pagamento em `src/services/api.ts`
2. Criar componentes de UI para pagamentos
3. Implementar tela de pagamentos para alunos
4. Integrar com bibliotecas de QR Code para PIX
5. Implementar webhooks para atualização de status

## 📞 Suporte

Para suporte ou dúvidas:

- **Email**: suporte@ctsupera.com
- **Documentação**: [Link para documentação]
- **Issues**: [Link para issues do GitHub]

## 📝 Notas de Desenvolvimento

### Configuração de URL da API

- **Android Emulator**: `http://10.0.2.2:8000/api/` (já configurado)
- **iOS Simulator**: `http://localhost:8000/api/`
- **Dispositivo Físico**: Use o IP da máquina na rede local

### Timeouts

- Timeout de requisições API: 10 segundos
- Timeout de sessão: 24 horas

### Paginação

- Tamanho padrão de página: 20 itens
- Tamanho máximo de página: 100 itens

---

**Desenvolvido com ❤️ para o CT Supera**
