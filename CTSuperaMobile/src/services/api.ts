import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginResponse, ApiResponse, Turma } from '../types';
import CONFIG from '../config';

const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: CONFIG.TIMEOUTS.API_REQUEST,
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Aqui você pode redirecionar para a tela de login
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('usuarios/login/', { username, password });
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('usuarios/logout/');
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await api.get('usuarios/profile/');
      return response.data;
    } catch (error) {
      return null;
    }
  },
};

export const userService = {
  getProfile: async (): Promise<User> => {
    const response = await api.get('usuarios/profile/');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put(`usuarios/${data.id}/`, data);
    return response.data;
  },

  uploadPhoto: async (userId: number, photo: any): Promise<User> => {
    const formData = new FormData();
    formData.append('foto_perfil', photo);
    
    const response = await api.put(`usuarios/${userId}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const turmaService = {
  getTurmas: async (params?: any): Promise<Turma[]> => {
    const response = await api.get('turmas/', { params });
    return response.data.results || response.data;
  },

  getTurmaById: async (id: number): Promise<Turma> => {
    const response = await api.get(`turmas/${id}/`);
    return response.data;
  },
};

export const presencaService = {
  registrarPresenca: async (data: {
    turma: number;
    alunos: { id: number }[];
    presencas: { [key: number]: boolean };
  }): Promise<any> => {
    const response = await api.post('presencas/registrar/', data);
    return response.data;
  },

  verificarCheckin: async (turmaId: number): Promise<any> => {
    const response = await api.get(`funcionarios/verificar-checkin/${turmaId}/`);
    return response.data;
  },
};

export const financeiroService = {
  getMensalidades: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await api.get('financeiro/mensalidades/', { params });
    return response.data;
  },

  getDashboardStats: async (): Promise<any> => {
    const response = await api.get('financeiro/dashboard/');
    return response.data;
  },
};

export const funcionarioService = {
  getPainelProfessor: async (): Promise<User> => {
    const response = await api.get('funcionarios/painel-professor/');
    return response.data;
  },

  getPainelGerente: async (): Promise<any> => {
    const response = await api.get('funcionarios/painel-gerente/');
    return response.data;
  },

  atualizarDadosProfessor: async (data: Partial<User>): Promise<User> => {
    const response = await api.put('funcionarios/atualizar-dados-professor/', data);
    return response.data;
  },

  atualizarDadosGerente: async (data: Partial<User>): Promise<User> => {
    const response = await api.put('funcionarios/atualizar-dados-gerente/', data);
    return response.data;
  },
};

export default api; 