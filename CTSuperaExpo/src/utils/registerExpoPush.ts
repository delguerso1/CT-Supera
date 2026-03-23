import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { usuarioService } from '../services/api';

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
 */
export async function registrarPushTokenAluno(): Promise<void> {
  if (!Device.isDevice) {
    return;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const envPid =
      typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_EAS_PROJECT_ID : undefined;
    const projectId = (
      envPid ||
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
        ?.projectId ||
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId ||
      ''
    ).trim();

    if (!projectId) {
      if (__DEV__) {
        console.warn(
          '[Push] Defina EXPO_PUBLIC_EAS_PROJECT_ID no .env (expo.dev → Project → Project ID). Sem isso o token não é gerado.'
        );
      }
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    if (
      token &&
      (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken'))
    ) {
      await usuarioService.registrarPushTokenExpo(token);
    }
  } catch (e) {
    if (__DEV__) {
      console.warn('[Push] Não foi possível registrar token:', e);
    }
  }
}
