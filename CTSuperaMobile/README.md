# CT Supera Mobile App

Aplicativo móvel para o sistema de gestão do CT Supera, desenvolvido em React Native com TypeScript.

## 🚀 Funcionalidades

### Para Alunos
- ✅ Dashboard personalizado
- ✅ Visualização de turmas
- ✅ Check-in de presença
- ✅ Gestão de pagamentos
- ✅ Perfil do usuário

### Para Professores
- ✅ Dashboard de professor
- ✅ Gerenciamento de turmas
- ✅ Registro de presença
- ✅ Perfil profissional

### Para Gerentes
- ✅ Dashboard gerencial
- ✅ Gestão financeira
- ✅ Relatórios
- ✅ Gestão de alunos

## 📱 Tecnologias Utilizadas

- **React Native** 0.80.2
- **TypeScript** 5.0.4
- **React Navigation** 7.x
- **Axios** para requisições HTTP
- **AsyncStorage** para persistência local
- **React Native Vector Icons** para ícones

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

### Configuração do Ambiente

Para desenvolvimento local, certifique-se de que:

1. A API Django está rodando em `http://localhost:8000`
2. O emulador Android está configurado para acessar `localhost`
3. Para dispositivos físicos, use o IP da sua máquina

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── Button.tsx
│   ├── Card.tsx
│   └── LoadingScreen.tsx
├── config/             # Configurações do app
│   └── index.ts
├── screens/            # Telas do aplicativo
│   ├── LoginScreen.tsx
│   ├── DashboardAlunoScreen.tsx
│   ├── DashboardProfessorScreen.tsx
│   └── DashboardGerenteScreen.tsx
├── services/           # Serviços de API
│   └── api.ts
├── types/              # Definições de tipos TypeScript
│   └── index.ts
└── utils/              # Utilitários
    └── AuthContext.tsx
```

## 🔐 Autenticação

O app utiliza um sistema de autenticação baseado em tokens:

- **Login**: Usuário e senha
- **Token**: Armazenado no AsyncStorage
- **Context**: Gerenciado pelo AuthContext
- **Logout**: Remove token e redireciona para login

## 🎨 Design System

### Cores Principais
- **Primary**: `#1a237e` (Azul escuro)
- **Success**: `#4caf50` (Verde)
- **Warning**: `#ff9800` (Laranja)
- **Danger**: `#f44336` (Vermelho)

### Componentes Padrão
- **Button**: Botões com variantes (primary, secondary, danger)
- **Card**: Cards com sombra e bordas arredondadas
- **LoadingScreen**: Tela de carregamento padronizada

## 📱 Navegação

O app utiliza React Navigation com:

- **Stack Navigator**: Para navegação principal
- **Bottom Tabs**: Para navegação entre seções
- **Navegação baseada em tipo de usuário**: Cada tipo tem suas próprias abas

### Estrutura de Navegação

```
Login Screen
    ↓
Main App (baseado no tipo de usuário)
    ↓
├── Aluno: Dashboard | Perfil | Checkin | Pagamentos
├── Professor: Dashboard | Turmas | Presença | Perfil
└── Gerente: Dashboard | Financeiro | Alunos | Relatórios
```

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

## 📞 Suporte

Para suporte ou dúvidas:

- **Email**: suporte@ctsupera.com
- **Documentação**: [Link para documentação]
- **Issues**: [Link para issues do GitHub]

---

**Desenvolvido com ❤️ para o CT Supera**
