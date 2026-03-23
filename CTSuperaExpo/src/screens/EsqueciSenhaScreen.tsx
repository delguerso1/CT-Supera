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
import { authService } from '../services/api';
import { NavigationProps } from '../types';
import { formatarCpfMascara, apenasDigitosCpf, MSG_CPF_11_DIGITOS } from '../utils/cpf';
import SafeScreen from '../components/SafeScreen';
import LogoSupera from '../components/LogoSupera';
import { colors } from '../theme';
import { useAuthBlueScreen } from '../hooks/useAuthBlueScreen';

const EsqueciSenhaScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  useAuthBlueScreen();

  const handleSolicitarRecuperacao = async () => {
    const cpfLimpo = apenasDigitosCpf(cpf);
    if (!cpfLimpo) {
      Alert.alert('Erro', 'Por favor, informe seu CPF.');
      return;
    }

    if (cpfLimpo.length !== 11) {
      Alert.alert('Erro', MSG_CPF_11_DIGITOS);
      return;
    }

    try {
      setLoading(true);
      await authService.solicitarRecuperacaoSenha(cpfLimpo);
      
      Alert.alert(
        'E-mail Enviado',
        'Um e-mail com instruções para redefinir sua senha foi enviado para o endereço cadastrado.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao solicitar recuperação de senha.';
      const errorCode = error.response?.data?.code;

      if (errorCode === 'NO_EMAIL') {
        Alert.alert(
          'E-mail Não Cadastrado',
          'Não foi possível enviar o e-mail de recuperação. Verifique se você possui um e-mail válido cadastrado no sistema.'
        );
      } else {
        Alert.alert('Erro', errorMessage);
      }
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
            <Text style={styles.title}>Esqueci minha senha</Text>
            <Text style={styles.subtitle}>
              Informe seu CPF para receber um e-mail com instruções para redefinir sua senha.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>CPF</Text>
            <TextInput
              style={styles.input}
              value={cpf}
              onChangeText={(text) => setCpf(formatarCpfMascara(text))}
              placeholder="000.000.000-00"
              keyboardType="numeric"
              maxLength={14}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSolicitarRecuperacao}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.buttonText}>Enviar E-mail</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.linkText}>Voltar para o login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.onPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    textAlign: 'center',
  },
  form: {
    backgroundColor: colors.surface,
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
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EsqueciSenhaScreen;

