import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const RedefinirSenha = () => {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    new_password1: '',
    new_password2: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    // Verifica se os parâmetros estão presentes
    if (!uidb64 || !token) {
      setError('Link de recuperação inválido');
    }
  }, [uidb64, token]);

  const validatePassword = (password) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'new_password1') {
      setPasswordStrength(validatePassword(value));
    }
  };

  const isPasswordValid = () => {
    return Object.values(passwordStrength).every(Boolean);
  };

  const passwordsMatch = () => {
    return formData.new_password1 === formData.new_password2 && formData.new_password2 !== '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isPasswordValid()) {
      setError('A senha não atende aos requisitos de segurança');
      return;
    }

    if (!passwordsMatch()) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      await api.post(`/usuarios/redefinir-senha/${uidb64}/${token}/`, formData);
      
      setMessage('Senha redefinida com sucesso! Redirecionando para o login...');
      
      // Redireciona para login após 2 segundos
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.details) {
        // Mostra erros de validação específicos
        const details = err.response.data.details;
        const errorMessages = Object.values(details).flat();
        setError(errorMessages.join(', '));
      } else {
        setError('Erro ao redefinir senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    },
    card: {
      background: 'white',
      borderRadius: '12px',
      padding: '40px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
      width: '100%',
      maxWidth: '500px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#2c3e50',
      textAlign: 'center',
      marginBottom: '10px',
    },
    subtitle: {
      fontSize: '16px',
      color: '#666',
      textAlign: 'center',
      marginBottom: '30px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#2c3e50',
    },
    input: {
      padding: '12px 16px',
      border: '2px solid #e1e8ed',
      borderRadius: '8px',
      fontSize: '16px',
      transition: 'border-color 0.3s ease',
      outline: 'none',
    },
    inputFocus: {
      borderColor: '#e74c3c',
    },
    button: {
      background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
      color: 'white',
      border: 'none',
      padding: '14px 24px',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      marginTop: '10px',
    },
    buttonHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(231, 76, 60, 0.4)',
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none',
    },
    backButton: {
      background: 'transparent',
      color: '#e74c3c',
      border: '2px solid #e74c3c',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textDecoration: 'none',
      textAlign: 'center',
      display: 'block',
    },
    message: {
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '14px',
      textAlign: 'center',
    },
    successMessage: {
      background: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb',
    },
    errorMessage: {
      background: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb',
    },
    passwordStrength: {
      marginTop: '8px',
      padding: '12px',
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef',
    },
    strengthTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '8px',
    },
    strengthItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
      marginBottom: '4px',
    },
    strengthValid: {
      color: '#28a745',
    },
    strengthInvalid: {
      color: '#dc3545',
    },
    loading: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },
    spinner: {
      width: '20px',
      height: '20px',
      border: '2px solid #ffffff',
      borderTop: '2px solid transparent',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    '@keyframes spin': {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' },
    },
  };

  if (!uidb64 || !token) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>❌ Link Inválido</h1>
          <p style={styles.subtitle}>
            O link de recuperação de senha é inválido ou expirado.
          </p>
          <button
            onClick={() => navigate('/esqueci-senha')}
            style={styles.backButton}
          >
            Solicitar Novo Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🔑 Redefinir Senha</h1>
        <p style={styles.subtitle}>
          Defina uma nova senha segura para sua conta
        </p>

        {message && (
          <div style={{...styles.message, ...styles.successMessage}}>
            {message}
          </div>
        )}

        {error && (
          <div style={{...styles.message, ...styles.errorMessage}}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="new_password1">
              Nova Senha
            </label>
            <input
              id="new_password1"
              name="new_password1"
              type="password"
              value={formData.new_password1}
              onChange={handleInputChange}
              placeholder="Digite sua nova senha"
              style={styles.input}
              required
            />
            
            {formData.new_password1 && (
              <div style={styles.passwordStrength}>
                <div style={styles.strengthTitle}>Requisitos de Segurança:</div>
                <div style={styles.strengthItem}>
                  <span style={passwordStrength.length ? styles.strengthValid : styles.strengthInvalid}>
                    {passwordStrength.length ? '✓' : '✗'}
                  </span>
                  Mínimo 8 caracteres
                </div>
                <div style={styles.strengthItem}>
                  <span style={passwordStrength.uppercase ? styles.strengthValid : styles.strengthInvalid}>
                    {passwordStrength.uppercase ? '✓' : '✗'}
                  </span>
                  Pelo menos 1 letra maiúscula
                </div>
                <div style={styles.strengthItem}>
                  <span style={passwordStrength.lowercase ? styles.strengthValid : styles.strengthInvalid}>
                    {passwordStrength.lowercase ? '✓' : '✗'}
                  </span>
                  Pelo menos 1 letra minúscula
                </div>
                <div style={styles.strengthItem}>
                  <span style={passwordStrength.number ? styles.strengthValid : styles.strengthInvalid}>
                    {passwordStrength.number ? '✓' : '✗'}
                  </span>
                  Pelo menos 1 número
                </div>
                <div style={styles.strengthItem}>
                  <span style={passwordStrength.special ? styles.strengthValid : styles.strengthInvalid}>
                    {passwordStrength.special ? '✓' : '✗'}
                  </span>
                  Pelo menos 1 caractere especial
                </div>
              </div>
            )}
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="new_password2">
              Confirmar Nova Senha
            </label>
            <input
              id="new_password2"
              name="new_password2"
              type="password"
              value={formData.new_password2}
              onChange={handleInputChange}
              placeholder="Confirme sua nova senha"
              style={{
                ...styles.input,
                ...(formData.new_password2 && !passwordsMatch() ? { borderColor: '#dc3545' } : {}),
                ...(formData.new_password2 && passwordsMatch() ? { borderColor: '#28a745' } : {}),
              }}
              required
            />
            {formData.new_password2 && !passwordsMatch() && (
              <div style={{...styles.strengthItem, ...styles.strengthInvalid}}>
                ✗ As senhas não coincidem
              </div>
            )}
            {formData.new_password2 && passwordsMatch() && (
              <div style={{...styles.strengthItem, ...styles.strengthValid}}>
                ✓ As senhas coincidem
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isPasswordValid() || !passwordsMatch()}
            style={{
              ...styles.button,
              ...(loading || !isPasswordValid() || !passwordsMatch() ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? (
              <div style={styles.loading}>
                <div style={styles.spinner}></div>
                Redefinindo...
              </div>
            ) : (
              'Redefinir Senha'
            )}
          </button>
        </form>

        <button
          onClick={() => navigate('/login')}
          style={styles.backButton}
        >
          ← Voltar para Login
        </button>
      </div>
    </div>
  );
};

export default RedefinirSenha;
