import axios from 'axios';

// Define a URL base dinamicamente com base no ambiente
// Em desenvolvimento (localhost), usa o backend local; caso contrário, usa produção
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const baseURL = process.env.REACT_APP_API_URL || (isDevelopment ? 'http://localhost:8000/api/' : 'https://ctsupera.com.br/api/');

/**
 * Listagens grandes (turmas, alunos, financeiro) frequentemente passam de 10s em rede lenta ou cold start.
 * Cuidado: `Number("10000") || 60000` dá **10000** (valor truthy). Por isso só aceitamos env >= 60s.
 */
const envTimeoutMs = Number(process.env.REACT_APP_API_TIMEOUT_MS);
const DEFAULT_TIMEOUT_MS =
  Number.isFinite(envTimeoutMs) && envTimeoutMs >= 60000 ? envTimeoutMs : 90000;

// Define a URL base para imagens/media
export const MEDIA_URL = process.env.REACT_APP_MEDIA_URL || (isDevelopment ? 'http://localhost:8000' : 'https://ctsupera.com.br');

const api = axios.create({
  baseURL: baseURL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

/**
 * Converte o `next` da paginação DRF em path relativo ao `baseURL` do axios.
 * Evita falhas quando a API devolve URL absoluta (http/https) diferente do `baseURL`.
 */
export function normalizeDrfNextUrl(nextUrl) {
  if (!nextUrl) return null;
  const next = String(nextUrl).trim();
  const base = String(api.defaults.baseURL || '');
  if (base && next.startsWith(base)) {
    return next.slice(base.length);
  }
  try {
    const n = new URL(next);
    const b = new URL(base.endsWith('/') ? base : `${base}/`);
    if (n.origin === b.origin && n.pathname.startsWith(b.pathname.replace(/\/$/, '') || b.pathname)) {
      const stripped = n.pathname.slice(b.pathname.length) + n.search;
      return stripped.replace(/^\//, '');
    }
  } catch {
    /* ignore */
  }
  return next;
}

// Interceptor para requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (isDevelopment) {
      let user = null;
      try {
        user = JSON.parse(localStorage.getItem('user') || 'null');
      } catch {
        user = null;
      }
      console.log('[DEBUG] Requisição:', config.method, config.url, token ? 'com token' : 'sem token');
    }

    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }

    return config;
  },
  (error) => {
    if (isDevelopment) console.error('[DEBUG] Erro na configuração da requisição:', error);
    return Promise.reject(error);
  }
);

// Interceptor para respostas (em produção não logar `data` — listagens grandes travam o navegador)
api.interceptors.response.use(
  (response) => {
    if (isDevelopment) {
      console.log('[DEBUG] Resposta:', response.status, response.config?.url);
    }
    return response;
  },
  (error) => {
    if (isDevelopment) {
      console.error('[DEBUG] Erro na resposta:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
      });
    }

    if (error.response?.status === 401) {
      if (isDevelopment) console.log('[DEBUG] Sessão expirada, redirecionando para login');
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

// Funções específicas para ativação de conta
export const accountActivationAPI = {
  // Ativar conta de aluno
  ativarConta: async (uidb64, token, novaSenha) => {
    const response = await api.post(`/usuarios/ativar-conta/${uidb64}/${token}/`, {
      new_password1: novaSenha,
      new_password2: novaSenha
    });
    return response.data;
  }
};

export default api;