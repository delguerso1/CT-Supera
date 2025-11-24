import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { authService } from '../services/api';
import { useAuth } from '../utils/AuthContext';
import { NavigationProps } from '../types';

interface AtivarContaScreenProps extends NavigationProps {
  route: {
    params?: {
      uidb64?: string;
      token?: string;
    };
  };
}

const AtivarContaScreen: React.FC<AtivarContaScreenProps> = ({ navigation, route }) => {
  const { login } = useAuth();
  const [newPassword1, setNewPassword1] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const uidb64 = route.params?.uidb64;
  const token = route.params?.token;

  useEffect(() => {
    if (!uidb64 || !token) {
      Alert.alert(
        'Link Inválido',
        'O link de ativação de conta é inválido ou expirou.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    }
  }, [uidb64, token, navigation]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'A senha deve ter pelo menos 8 caracteres.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'A senha deve conter pelo menos uma letra maiúscula.';
    }
    if (!/[a-z]/.test(password)) {
      return 'A senha deve conter pelo menos uma letra minúscula.';
    }
    if (!/[0-9]/.test(password)) {
      return 'A senha deve conter pelo menos um número.';
    }
    return null;
  };

  const handleAtivarConta = async () => {
    if (!newPassword1.trim() || !newPassword2.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    if (newPassword1 !== newPassword2) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    const validationError = validatePassword(newPassword1);
    if (validationError) {
      Alert.alert('Senha Inválida', validationError);
      return;
    }

    if (!uidb64 || !token) {
      Alert.alert('Erro', 'Link inválido.');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.ativarConta(uidb64, token, newPassword1, newPassword2);
      
      Alert.alert(
        'Conta Ativada',
        'Sua conta foi ativada com sucesso! Você será redirecionado para o login.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Tenta fazer login automaticamente
              try {
                await login(response.user.username, newPassword1);
              } catch (error) {
                // Se falhar, apenas navega para login
                navigation.navigate('Login');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao ativar conta.';
      const errorCode = error.response?.data?.code;

      if (errorCode === 'INVALID_TOKEN' || errorCode === 'EXPIRED_TOKEN') {
        Alert.alert(
          'Link Inválido ou Expirado',
          'O link de ativação é inválido ou expirou. Entre em contato com o administrador para solicitar um novo convite.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else if (errorCode === 'VALIDATION_ERROR') {
        const details = error.response?.data?.details;
        if (details?.new_password2) {
          Alert.alert('Erro', details.new_password2[0] || 'As senhas não coincidem.');
        } else if (details?.new_password1) {
          Alert.alert('Erro', details.new_password1[0] || 'Senha inválida.');
        } else {
          Alert.alert('Erro', errorMessage);
        }
      } else {
        Alert.alert('Erro', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!uidb64 || !token) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Ativar Conta</Text>
            <Text style={styles.subtitle}>
              Defina uma senha para ativar sua conta e começar a usar o sistema.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Nova Senha</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword1}
                onChangeText={setNewPassword1}
                placeholder="Digite sua senha"
                secureTextEntry={!showPassword1}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword1(!showPassword1)}
              >
                <Text style={styles.eyeText}>{showPassword1 ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              Mínimo 8 caracteres, com letras maiúsculas, minúsculas e números.
            </Text>

            <Text style={styles.label}>Confirmar Senha</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword2}
                onChangeText={setNewPassword2}
                placeholder="Confirme sua senha"
                secureTextEntry={!showPassword2}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword2(!showPassword2)}
              >
                <Text style={styles.eyeText}>{showPassword2 ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAtivarConta}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Ativar Conta</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={styles.linkText}>Voltar para o login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
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
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
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
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  eyeButton: {
    padding: 16,
  },
  eyeText: {
    fontSize: 20,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: -12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#1a237e',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#1a237e',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AtivarContaScreen;

