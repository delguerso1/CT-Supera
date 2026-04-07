import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { useAuthBlueScreen } from '../hooks/useAuthBlueScreen';
import { NavigationProps } from '../types';
import { formatarCpfMascara, apenasDigitosCpf, MSG_CPF_11_DIGITOS } from '../utils/cpf';
import CONFIG from '../config';
import { colors } from '../theme';
import SafeScreen from '../components/SafeScreen';
import LogoSupera from '../components/LogoSupera';

function hostDaApi(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function mensagemErroLogin(error: any, baseUrl: string): string {
  const status = error.response?.status;
  const data = error.response?.data;

  if (data && typeof data === 'object' && !Array.isArray(data) && 'error' in data && typeof (data as { error?: string }).error === 'string') {
    return (data as { error: string }).error;
  }

  if (typeof data === 'string') {
    if (data.includes('DisallowedHost') || data.toLowerCase().includes('invalid http_host')) {
      const h = hostDaApi(baseUrl);
      return `O Django recusou o host${h ? ` (${h})` : ''}. Inclua esse IP em DJANGO_EXTRA_ALLOWED_HOSTS no .env do backend (ou em ALLOWED_HOSTS) e reinicie o runserver.`;
    }
    return data.length > 200 ? data.slice(0, 200) + '…' : data;
  }

  if (data && typeof data === 'object') {
    const det = (data as { detail?: string }).detail;
    if (typeof det === 'string') return det;
    const values = Object.values(data).flat();
    const first = values.find((v) => typeof v === 'string');
    if (typeof first === 'string') return first;
    const firstArr = values.find((v) => Array.isArray(v) && typeof v[0] === 'string');
    if (firstArr && Array.isArray(firstArr) && typeof firstArr[0] === 'string') return firstArr[0];
  }

  if (status === 400) {
    const h = hostDaApi(baseUrl);
    return `Requisição recusada (400). Se você mudou de Wi‑Fi, atualize o IP no .env do Django: DJANGO_EXTRA_ALLOWED_HOSTS=${h || 'SEU_IP'} e reinicie o servidor.`;
  }

  if (status === 401 && data && typeof data === 'object' && 'error' in data) {
    return String((data as { error: string }).error);
  }

  if (error.code === 'ECONNABORTED') {
    return 'Tempo esgotado. Verifique se o servidor está rodando e a URL da API.';
  }
  if (error.message?.includes('Network')) {
    return `Sem conexão com a API (${baseUrl}). Rode: python manage.py runserver 0.0.0.0:8000; libere a porta 8000 no firewall; mesmo Wi‑Fi.`;
  }

  return error.message || 'Erro ao fazer login. Verifique CPF e senha.';
}

const LoginScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  useAuthBlueScreen();

  const handleLogin = async () => {
    if (!password.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    const cpfLimpo = apenasDigitosCpf(username);
    if (!cpfLimpo) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    if (cpfLimpo.length !== 11) {
      Alert.alert('Erro', MSG_CPF_11_DIGITOS);
      return;
    }

    try {
      setLoading(true);
      await login(cpfLimpo, password);
      // A navegação será feita automaticamente pelo AuthProvider
    } catch (error: any) {
      const baseUrl = CONFIG.API_BASE_URL || '';
      const msg = mensagemErroLogin(error, baseUrl);
      Alert.alert('Erro no Login', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeScreen style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <LogoSupera variant="hero" />
            <View style={styles.titleUnderline} />
            <Text style={styles.subtitle}>Centro de Treinamento</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>CPF (login)</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={(t) => setUsername(formatarCpfMascara(t))}
              placeholder="000.000.000-00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={14}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Digite sua senha"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              editable={!loading}
              textContentType="password"
              autoComplete="password"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => navigation.navigate('EsqueciSenha')}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Sistema de Gestão CT Supera
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    /** Mesmo azul da navbar do site (#1F6C86) */
    backgroundColor: colors.primary,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 50,
  },
  titleUnderline: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: 8,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'center',
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: colors.surface,
    /** Obrigatório com secureTextEntry: sem `color`, o Android pode desenhar os pontos invisíveis (branco sobre branco). */
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
  },
  forgotPasswordButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen; 