import { useCallback } from 'react';
import { Platform, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme';

/** Fundo azul da marca + status bar clara (telas de login / recuperação / ativação). */
export function useAuthBlueScreen() {
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(colors.primary);
      }
      return () => {
        StatusBar.setBarStyle('dark-content', true);
        if (Platform.OS === 'android') {
          StatusBar.setBackgroundColor(colors.background);
        }
      };
    }, [])
  );
}
