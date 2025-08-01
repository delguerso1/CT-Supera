export const CONFIG = {
  API_BASE_URL: 'http://10.0.2.2:8000/api/',
  APP_NAME: 'CT Supera',
  VERSION: '1.0.0',
  
  // Cores do tema
  COLORS: {
    primary: '#1a237e',
    secondary: '#f5f7fa',
    success: '#4caf50',
    warning: '#ff9800',
    danger: '#f44336',
    text: {
      primary: '#333',
      secondary: '#666',
      light: '#999',
    },
    background: {
      primary: '#f5f7fa',
      secondary: '#fff',
      card: '#fff',
    },
  },
  
  // Configurações de navegação
  NAVIGATION: {
    headerStyle: {
      backgroundColor: '#1a237e',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    },
  },
  
  // Configurações de storage
  STORAGE_KEYS: {
    TOKEN: 'token',
    USER: 'user',
    SETTINGS: 'settings',
  },
  
  // Configurações de timeout
  TIMEOUTS: {
    API_REQUEST: 10000,
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas
  },
  
  // Configurações de paginação
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
};

export default CONFIG; 