import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api';
import { User, AuthContextType } from '../types';
import { registrarPushTokenAluno } from './registerExpoPush';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Garante `tipo` em minúsculas (API / AsyncStorage antigo podem variar). */
function normalizeUserTipo(raw: User): User {
  const t = String(raw.tipo ?? 'aluno')
    .toLowerCase()
    .trim();
  let tipo: User['tipo'] = 'aluno';
  if (t === 'gerente') tipo = 'gerente';
  else if (t === 'professor') tipo = 'professor';
  return { ...raw, tipo };
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(normalizeUserTipo(JSON.parse(storedUser)));
      }
    } catch (error) {
      console.error('Erro ao carregar dados de autenticação:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      const response = await authService.login(username, password);
      
      const userNorm = normalizeUserTipo(response.user);
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(userNorm));

      setToken(response.token);
      setUser(userNorm);
      if (userNorm.tipo === 'aluno') {
        setTimeout(() => {
          void registrarPushTokenAluno();
        }, 400);
      }
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 