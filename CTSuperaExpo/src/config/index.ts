import { Platform } from 'react-native';
import { colors } from '../theme';

/**
 * Em desenvolvimento: emulador Android usa 10.0.2.2 para o host;
 * iOS Simulator usa localhost. Dispositivo físico: defina EXPO_PUBLIC_API_BASE_URL com o IP da máquina.
 * Produção: omita a variável para usar prodBaseUrl.
 */
const envUrl =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL
    ? process.env.EXPO_PUBLIC_API_BASE_URL
    : undefined;

const devBaseUrl =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api/'
    : 'http://localhost:8000/api/';

const prodBaseUrl = 'https://ctsupera.com.br/api/';

export const CONFIG = {
  API_BASE_URL: envUrl || (__DEV__ ? devBaseUrl : prodBaseUrl),
  APP_NAME: 'CT Supera',
  VERSION: '1.0.5',

  COLORS: {
    primary: colors.primary,
    secondary: colors.background,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    accent: colors.accent,
    onPrimary: colors.onPrimary,
    onAccent: colors.onAccent,
    text: {
      primary: colors.text,
      secondary: colors.textSecondary,
      light: colors.textMuted,
    },
    background: {
      primary: colors.background,
      secondary: colors.surface,
      card: colors.surface,
    },
  },

  NAVIGATION: {
    headerStyle: {
      backgroundColor: colors.primary,
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold' as const,
    },
  },

  STORAGE_KEYS: {
    TOKEN: 'token',
    USER: 'user',
    SETTINGS: 'settings',
  },

  TIMEOUTS: {
    API_REQUEST: 10000,
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000,
  },

  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
};

export default CONFIG;
