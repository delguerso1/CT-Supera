/**
 * CT Supera — cores alinhadas ao site (`ct-supera-frontend`):
 * - App.css: botões, formulários, foco
 * - Navbar.js: barra #1F6C86, botão login #E0CC98 + texto #1F6C86
 */
export const colors = {
  primary: '#1F6C86',
  primaryDark: '#155a6e',
  accent: '#E0CC98',
  accentDark: '#D4C088',
  /** Texto sobre fundo primário (botões azuis) */
  onPrimary: '#ffffff',
  /** Texto sobre botão dourado (como o “Login” da Navbar) */
  onAccent: '#1F6C86',
  /** Hover de links no menu do site */
  linkHover: '#90caf9',
  background: '#f5f7fa',
  surface: '#ffffff',
  text: '#2c3e50',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#e1e8ed',
  /** Bordas / divisórias um pouco mais fortes (equivalente a #e0e0e0 no app legado) */
  borderStrong: '#e0e0e0',
  /** Chips e filtros inativos */
  chipInactive: '#e0e0e0',
  success: '#4caf50',
  warning: '#ff9800',
  danger: '#f44336',
  tabInactive: '#888888',
  primaryMuted: '#E8F4F8',
  splashBackground: '#1F6C86',
  /** Sombras de botão (equivalente ao rgba do site) */
  shadowPrimary: 'rgba(31, 108, 134, 0.25)',
  shadowAccent: 'rgba(224, 204, 152, 0.35)',
} as const;

export type AppColors = typeof colors;
