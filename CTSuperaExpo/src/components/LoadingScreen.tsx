import React, { useEffect } from 'react';
import { colors } from '../theme';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import SafeScreen from './SafeScreen';
import LogoSupera from './LogoSupera';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Carregando...' }) => {
  /** Esta tela fica fora do NavigationContainer — não usar useFocusEffect aqui. */
  useEffect(() => {
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
  }, []);

  return (
    <SafeScreen style={styles.container}>
      <View style={styles.content}>
        <LogoSupera variant="compact" style={styles.logo} />
        <ActivityIndicator size="large" color={colors.onPrimary} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    marginBottom: 24,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
});

export default LoadingScreen;
