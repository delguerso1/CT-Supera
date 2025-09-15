import axios from 'axios';

// Define a URL base dinamicamente com base no ambiente
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/';

// Define a URL base para imagens/media
export const MEDIA_URL = process.env.REACT_APP_MEDIA_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: baseURL,
  timeout: 10000, // Tempo limite de 10 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Interceptor para requisições
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    console.log('[DEBUG] Configurando requisição:', {
      url: config.url,
      method: config.method,
      user: user,
      token: token ? 'Token presente' : 'Token ausente',
      baseURL: config.baseURL
    });

    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('[DEBUG] Erro na configuração da requisição:', error);
    return Promise.reject(error);
  }
);

// Interceptor para respostas
api.interceptors.response.use(
  (response) => {
    console.log('[DEBUG] Resposta recebida:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('[DEBUG] Erro na resposta:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      message: error.message,
      baseURL: error.config?.baseURL
    });

    if (error.response?.status === 401) {
      console.log('[DEBUG] Sessão expirada, redirecionando para login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// Funções específicas para recuperação de senha
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

export default api;