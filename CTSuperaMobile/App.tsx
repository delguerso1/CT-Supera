/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/utils/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardAlunoScreen from './src/screens/DashboardAlunoScreen';
import DashboardProfessorScreen from './src/screens/DashboardProfessorScreen';
import DashboardGerenteScreen from './src/screens/DashboardGerenteScreen';
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
      <Tab.Screen name="Relatórios" component={DashboardGerenteScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

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
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Usuário logado - mostrar dashboard baseado no tipo
          <Stack.Screen
            name="MainApp"
            component={getDashboardComponent()}
            options={{ headerShown: false }}
          />
        ) : (
          // Usuário não logado - mostrar tela de login
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
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
