import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  LinkingOptions,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

import { colors } from './src/theme';
import { AuthProvider, useAuth } from './src/utils/AuthContext';
import LoadingScreen from './src/components/LoadingScreen';
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
import GerenciarUsuariosScreen from './src/screens/GerenciarUsuariosScreen';

export type RootStackParamList = {
  Login: undefined;
  EsqueciSenha: undefined;
  RedefinirSenha: { uidb64?: string; token?: string };
  AtivarConta: { uidb64?: string; token?: string };
  MainApp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const AlunoTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName = 'dashboard';

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
            case 'Parq':
              iconName = 'assignment';
              break;
            default:
              iconName = 'dashboard';
          }

          return (
            <MaterialIcons
              name={iconName as keyof typeof MaterialIcons.glyphMap}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardAlunoScreen} />
      <Tab.Screen name="Perfil" component={DashboardAlunoScreen} />
      <Tab.Screen name="Parq" component={DashboardAlunoScreen} options={{ tabBarLabel: 'PAR-Q' }} />
      <Tab.Screen name="Checkin" component={DashboardAlunoScreen} />
      <Tab.Screen name="Pagamentos" component={DashboardAlunoScreen} />
    </Tab.Navigator>
  );
};

const ProfessorTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName = 'dashboard';

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
            case 'Histórico':
              iconName = 'history';
              break;
            case 'Perfil':
              iconName = 'person';
              break;
            default:
              iconName = 'dashboard';
          }

          return (
            <MaterialIcons
              name={iconName as keyof typeof MaterialIcons.glyphMap}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardProfessorScreen} />
      <Tab.Screen name="Turmas" component={DashboardProfessorScreen} />
      <Tab.Screen name="Presença" component={DashboardProfessorScreen} />
      <Tab.Screen name="Histórico" component={DashboardProfessorScreen} />
      <Tab.Screen name="Perfil" component={DashboardProfessorScreen} />
    </Tab.Navigator>
  );
};

const GerenteTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName = 'dashboard';

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
            case 'Usuários':
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

          return (
            <MaterialIcons
              name={iconName as keyof typeof MaterialIcons.glyphMap}
              size={size}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardGerenteScreen} />
      <Tab.Screen name="Financeiro" component={DashboardGerenteScreen} />
      <Tab.Screen name="Usuários" component={GerenciarUsuariosScreen} />
      <Tab.Screen name="Turmas" component={GerenciarTurmasScreen} />
      <Tab.Screen name="CTs" component={GerenciarCTsScreen} />
      <Tab.Screen name="News" component={GerenciarSuperaNewsScreen} />
      <Tab.Screen name="Galeria" component={GerenciarGaleriaScreen} />
      <Tab.Screen name="Relatórios" component={DashboardGerenteScreen} />
    </Tab.Navigator>
  );
};

const linking: LinkingOptions<RootStackParamList> = {
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

function AppNavigator() {
  const { user, loading } = useAuth();

  const getDashboardComponent = () => {
    if (!user) return AlunoTabs;

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

  if (loading) {
    return <LoadingScreen message="Carregando..." />;
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="MainApp" component={getDashboardComponent()} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="EsqueciSenha" component={EsqueciSenhaScreen} />
            <Stack.Screen name="RedefinirSenha" component={RedefinirSenhaScreen} />
            <Stack.Screen name="AtivarConta" component={AtivarContaScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
