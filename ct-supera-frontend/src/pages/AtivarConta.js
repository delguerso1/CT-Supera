import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const AtivarConta = () => {
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
      setError('Link de ativação inválido');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Validações
    if (!isPasswordValid()) {
      setError('A senha não atende aos critérios de segurança');
      setLoading(false);
      return;
    }

    if (formData.new_password1 !== formData.new_password2) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    try {
      console.log('[DEBUG] Ativando conta...');
      const response = await api.post(`/usuarios/ativar-conta/${uidb64}/${token}/`, {
        new_password1: formData.new_password1,
        new_password2: formData.new_password2
      });

      console.log('[DEBUG] Conta ativada:', response.data);
      setMessage('Conta ativada com sucesso! Redirecionando para o login...');
      
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      console.error('[DEBUG] Erro na ativação:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          'Erro ao ativar conta. Verifique se o link é válido e não expirou.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    },
    card: {
      background: 'white',
      borderRadius: '15px',
      padding: '40px',
      maxWidth: '500px',
      width: '100%',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    },
    header: {
      textAlign: 'center',
      marginBottom: '30px',
    },
    title: {
      color: '#333',
      fontSize: '28px',
      fontWeight: 'bold',
      marginBottom: '10px',
    },
    subtitle: {
      color: '#666',
      fontSize: '16px',
      lineHeight: '1.5',
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
      color: '#333',
      fontWeight: '600',
      fontSize: '14px',
    },
    input: {
      padding: '12px 15px',
      border: '2px solid #e1e5e9',
      borderRadius: '8px',
      fontSize: '16px',
      transition: 'border-color 0.3s ease',
    },
    inputFocus: {
      borderColor: '#667eea',
      outline: 'none',
    },
    passwordStrength: {
      marginTop: '10px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef',
    },
    strengthTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '10px',
    },
    strengthList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    strengthItem: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '13px',
      marginBottom: '5px',
      gap: '8px',
    },
    button: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      padding: '15px 30px',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'transform 0.2s ease',
      marginTop: '10px',
    },
    buttonDisabled: {
      background: '#ccc',
      cursor: 'not-allowed',
    },
    message: {
      background: '#d4edda',
      color: '#155724',
      padding: '15px',
      borderRadius: '8px',
      border: '1px solid #c3e6cb',
      textAlign: 'center',
      fontWeight: '500',
    },
    error: {
      background: '#f8d7da',
      color: '#721c24',
      padding: '15px',
      borderRadius: '8px',
      border: '1px solid #f5c6cb',
      textAlign: 'center',
      fontWeight: '500',
    },
    backToLogin: {
      textAlign: 'center',
      marginTop: '20px',
    },
    link: {
      color: '#667eea',
      textDecoration: 'none',
      fontWeight: '500',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>🎯 Ativar Conta</h1>
          <p style={styles.subtitle}>
            Defina sua senha para ativar sua conta no CT Supera
          </p>
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nova Senha</label>
              <input
                type="password"
                name="new_password1"
                value={formData.new_password1}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="Digite sua nova senha"
                required
              />
              
              {formData.new_password1 && (
                <div style={styles.passwordStrength}>
                  <div style={styles.strengthTitle}>Critérios de Segurança:</div>
                  <ul style={styles.strengthList}>
                    <li style={styles.strengthItem}>
                      <span style={{color: passwordStrength.length ? '#28a745' : '#dc3545'}}>
                        {passwordStrength.length ? '✅' : '❌'}
                      </span>
                      Mínimo 8 caracteres
                    </li>
                    <li style={styles.strengthItem}>
                      <span style={{color: passwordStrength.uppercase ? '#28a745' : '#dc3545'}}>
                        {passwordStrength.uppercase ? '✅' : '❌'}
                      </span>
                      Letra maiúscula
                    </li>
                    <li style={styles.strengthItem}>
                      <span style={{color: passwordStrength.lowercase ? '#28a745' : '#dc3545'}}>
                        {passwordStrength.lowercase ? '✅' : '❌'}
                      </span>
                      Letra minúscula
                    </li>
                    <li style={styles.strengthItem}>
                      <span style={{color: passwordStrength.number ? '#28a745' : '#dc3545'}}>
                        {passwordStrength.number ? '✅' : '❌'}
                      </span>
                      Número
                    </li>
                    <li style={styles.strengthItem}>
                      <span style={{color: passwordStrength.special ? '#28a745' : '#dc3545'}}>
                        {passwordStrength.special ? '✅' : '❌'}
                      </span>
                      Caractere especial (!@#$%^&*)
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirmar Nova Senha</label>
              <input
                type="password"
                name="new_password2"
                value={formData.new_password2}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="Confirme sua nova senha"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid() || formData.new_password1 !== formData.new_password2}
              style={{
                ...styles.button,
                ...(loading || !isPasswordValid() || formData.new_password1 !== formData.new_password2 ? styles.buttonDisabled : {})
              }}
            >
              {loading ? '🔄 Ativando...' : '🎯 Ativar Conta'}
            </button>
          </form>
        )}

        <div style={styles.backToLogin}>
          <a href="/login" style={styles.link}>
            ← Voltar para o Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default AtivarConta;
