import { AppState, type AppStateStatus, Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { usuarioService } from '../services/api';
import { EAS_PROJECT_ID_FALLBACK } from '../config';

let lastForegroundPushAttempt = 0;
const FOREGROUND_PUSH_DEBOUNCE_MS = 5000;

function logPush(message: string, err?: unknown) {
  if (err !== undefined) {
    console.warn(`[Push] ${message}`, err);
  } else {
    console.warn(`[Push] ${message}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enviarTokenAoServidorComRetentativas(token: string): Promise<boolean> {
  const tentativas = 3;
  let ultimo: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      await usuarioService.registrarPushTokenExpo(token);
      return true;
    } catch (e) {
      ultimo = e;
      if (i < tentativas - 1) {
        await delay(1500 * (i + 1));
      }
    }
  }
  logPush(
    `Falha ao registrar push após ${tentativas} tentativas (rede ou servidor). O gerente pode ver 0 alunos até o próximo login ou reabrir o app.`,
    ultimo
  );
  return false;
}

/** EAS projectId: env → Constants (várias formas no SDK 49+) → fallback do app (evita 0 tokens no servidor). */
function resolverEasProjectId(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() : '';
  if (fromEnv) return fromEnv;

  const exCfg = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const fromExpoConfig = exCfg?.eas?.projectId?.trim();
  if (fromExpoConfig) return fromExpoConfig;

  const legacy = Constants as {
    easConfig?: { projectId?: string };
    manifest?: { extra?: { eas?: { projectId?: string } } };
    manifest2?: { extra?: { eas?: { projectId?: string } } };
  };
  const fromEasConfig = legacy.easConfig?.projectId?.trim();
  if (fromEasConfig) return fromEasConfig;
  const fromManifest = legacy.manifest?.extra?.eas?.projectId?.trim();
  if (fromManifest) return fromManifest;
  const fromManifest2 = legacy.manifest2?.extra?.eas?.projectId?.trim();
  if (fromManifest2) return fromManifest2;

  return EAS_PROJECT_ID_FALLBACK.trim();
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Solicita permissão e envia o token Expo ao backend (apenas alunos devem chamar).
 * Em simulador / sem serviço push, sai silenciosamente.
 * Re-tenta ao voltar o app ao primeiro plano (útil após o aluno conceder permissão).
 *
 * @returns `true` se o token foi enviado e aceito pelo servidor; caso contrário `false`.
 */
export async function registrarPushTokenAluno(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    logPush(
      'Permissão de notificação não concedida; o gerente verá 0 alunos com app registrado.'
    );
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const projectId = resolverEasProjectId();
    if (!projectId) {
      logPush('Sem EAS Project ID. Token Expo não é gerado.');
      return false;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    if (
      token &&
      (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken'))
    ) {
      const ok = await enviarTokenAoServidorComRetentativas(token);
      if (ok) {
        logPush('Token Expo enviado ao servidor com sucesso (usuarios/push-token/).');
      }
      return ok;
    }
    logPush(
      `Token com formato inesperado (não enviado ao servidor): ${String(token).slice(0, 40)}…`
    );
    return false;
  } catch (e) {
    logPush(
      'Não foi possível obter/registrar o token. Em Android, push no Expo Go é limitado; use APK/AAB (dev ou loja).',
      e
    );
    return false;
  }
}

/** Re-registra quando o app volta ao primeiro plano (permissão/token podem ficar prontos depois). */
export function iniciarListenerRegistroPushEmForeground(): () => void {
  const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next !== 'active') return;
    const now = Date.now();
    if (now - lastForegroundPushAttempt < FOREGROUND_PUSH_DEBOUNCE_MS) return;
    lastForegroundPushAttempt = now;
    void registrarPushTokenAluno();
  });
  return () => sub.remove();
}
