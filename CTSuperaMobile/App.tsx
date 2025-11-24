/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/utils/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import EsqueciSenhaScreen from './src/screens/EsqueciSenhaScreen';
import RedefinirSenhaScreen from './src/screens/RedefinirSenhaScreen';
import AtivarContaScreen from './src/screens/AtivarContaScreen';
import DashboardAlunoScreen from './src/screens/DashboardAlunoScreen';
import DashboardProfessorScreen from './src/screens/DashboardProfessorScreen';
import DashboardGerenteScreen from './src/screens/DashboardGerenteScreen';
import GerenciarTurmasScreen from './src/screens/GerenciarTurmasScreen';
import GerenciarCTsScreen from './src/screens/GerenciarCTsScreen';
import GerenciarSuperaNewsScreen from './src/screens/GerenciarSuperaNewsScreen';
import GerenciarGaleriaScreen from './src/screens/GerenciarGaleriaScreen';
import LoadingScreen from './src/components/LoadingScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AlunoTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Perfil':
              iconName = 'person';
              break;
            case 'Checkin':
              iconName = 'qr-code-scanner';
              break;
            case 'Pagamentos':
              iconName = 'payment';
              break;
            default:
              iconName = 'dashboard';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1a237e',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardAlunoScreen} />
      <Tab.Screen name="Perfil" component={DashboardAlunoScreen} />
      <Tab.Screen name="Checkin" component={DashboardAlunoScreen} />
      <Tab.Screen name="Pagamentos" component={DashboardAlunoScreen} />
    </Tab.Navigator>
  );
};

const ProfessorTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Turmas':
              iconName = 'group';
              break;
            case 'Presença':
              iconName = 'checklist';
              break;
            case 'Perfil':
              iconName = 'person';
              break;
            default:
              iconName = 'dashboard';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1a237e',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardProfessorScreen} />
      <Tab.Screen name="Turmas" component={DashboardProfessorScreen} />
      <Tab.Screen name="Presença" component={DashboardProfessorScreen} />
      <Tab.Screen name="Perfil" component={DashboardProfessorScreen} />
    </Tab.Navigator>
  );
};

const GerenteTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Financeiro':
              iconName = 'account-balance-wallet';
              break;
            case 'Alunos':
              iconName = 'people';
              break;
            case 'Turmas':
              iconName = 'group';
              break;
            case 'CTs':
              iconName = 'business';
              break;
            case 'News':
              iconName = 'article';
              break;
            case 'Galeria':
              iconName = 'photo-library';
              break;
            case 'Relatórios':
              iconName = 'assessment';
              break;
            default:
              iconName = 'dashboard';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1a237e',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardGerenteScreen} />
      <Tab.Screen name="Financeiro" component={DashboardGerenteScreen} />
      <Tab.Screen name="Alunos" component={DashboardGerenteScreen} />
      <Tab.Screen name="Turmas" component={GerenciarTurmasScreen} />
      <Tab.Screen name="CTs" component={GerenciarCTsScreen} />
      <Tab.Screen name="News" component={GerenciarSuperaNewsScreen} />
      <Tab.Screen name="Galeria" component={GerenciarGaleriaScreen} />
      <Tab.Screen name="Relatórios" component={DashboardGerenteScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();
  const navigationRef = useRef<any>(null);
  const linking = {
    prefixes: ['ctsupera://', 'https://ctsupera.com', 'https://www.ctsupera.com'],
    config: {
      screens: {
        Login: 'login',
        EsqueciSenha: 'esqueci-senha',
        RedefinirSenha: {
          path: 'redefinir-senha/:uidb64/:token',
          parse: {
            uidb64: (uidb64: string) => uidb64,
            token: (token: string) => token,
          },
        },
        AtivarConta: {
          path: 'ativar-conta/:uidb64/:token',
          parse: {
            uidb64: (uidb64: string) => uidb64,
            token: (token: string) => token,
          },
        },
      },
    },
  };

  // Deep linking é gerenciado automaticamente pelo React Navigation
  // A configuração 'linking' acima já cuida do parsing das URLs

  if (loading) {
    return <LoadingScreen message="Carregando..." />;
  }

  const getDashboardComponent = () => {
    if (!user) return AlunoTabs; // Fallback para caso não tenha usuário

    switch (user.tipo) {
      case 'aluno':
        return AlunoTabs;
      case 'professor':
        return ProfessorTabs;
      case 'gerente':
        return GerenteTabs;
      default:
        return AlunoTabs;
    }
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Usuário logado - mostrar dashboard baseado no tipo
          <Stack.Screen
            name="MainApp"
            component={getDashboardComponent()}
            options={{ headerShown: false }}
          />
        ) : (
          // Usuário não logado - mostrar telas de autenticação
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EsqueciSenha"
              component={EsqueciSenhaScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="RedefinirSenha"
              component={RedefinirSenhaScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AtivarConta"
              component={AtivarContaScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
};

export default App;
