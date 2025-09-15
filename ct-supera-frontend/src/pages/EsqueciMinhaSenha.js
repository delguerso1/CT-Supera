import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const EsqueciMinhaSenha = () => {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const formatCPF = (value) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara do CPF
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleCPFChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
  };

  const validateCPF = (cpf) => {
    const numbers = cpf.replace(/\D/g, '');
    return numbers.length === 11;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validateCPF(cpf)) {
      setError('CPF deve ter 11 dígitos');
      return;
    }

    setLoading(true);

    try {
      const cpfNumbers = cpf.replace(/\D/g, '');
      const response = await api.post('/api/usuarios/esqueci-senha/', {
        cpf: cpfNumbers
      });

      setMessage(response.data.message);
      
      // Se retornou o e-mail, mostra confirmação
      if (response.data.email) {
        setMessage(`E-mail de recuperação enviado para: ${response.data.email}`);
      }
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Erro ao solicitar recuperação. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
      maxWidth: '450px',
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
      borderColor: '#667eea',
    },
    button: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none',
    },
    backButton: {
      background: 'transparent',
      color: '#667eea',
      border: '2px solid #667eea',
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

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🔐 Esqueci Minha Senha</h1>
        <p style={styles.subtitle}>
          Digite seu CPF para receber um e-mail com instruções para redefinir sua senha
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
            <label style={styles.label} htmlFor="cpf">
              CPF
            </label>
            <input
              id="cpf"
              type="text"
              value={cpf}
              onChange={handleCPFChange}
              placeholder="000.000.000-00"
              style={styles.input}
              maxLength="14"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !cpf}
            style={{
              ...styles.button,
              ...(loading || !cpf ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? (
              <div style={styles.loading}>
                <div style={styles.spinner}></div>
                Enviando...
              </div>
            ) : (
              'Enviar E-mail de Recuperação'
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

export default EsqueciMinhaSenha;
