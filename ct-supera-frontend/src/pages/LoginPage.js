import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1F6C86 0%, #155a6e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '15px',
    padding: '40px',
    maxWidth: '450px',
    width: '100%',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  },
  title: {
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: '10px',
    fontSize: '28px',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: '30px',
    fontSize: '16px',
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
    borderRadius: '8px',
    border: '2px solid #e1e8ed',
    fontSize: '16px',
    width: '100%',
    transition: 'border-color 0.3s ease',
    outline: 'none',
    '&:focus': {
      borderColor: '#1F6C86',
    },
  },
  button: {
    backgroundColor: '#E0CC98',
    color: '#1F6C86',
    padding: '14px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
    marginTop: '10px',
    '&:hover': {
      transform: 'translateY(-2px)',
      backgroundColor: '#D4C088',
      boxShadow: '0 6px 20px rgba(224, 204, 152, 0.4)',
    },
  },
  error: {
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#fdf2f2',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    fontSize: '14px',
  },
  forgotPassword: {
    textAlign: 'center',
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  forgotPasswordText: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '8px',
  },
  forgotPasswordLink: {
    color: '#1F6C86',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    padding: '8px 16px',
    borderRadius: '6px',
    backgroundColor: 'white',
    border: '1px solid #1F6C86',
    display: 'inline-block',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: '#1F6C86',
      color: 'white',
    },
  },
  buttonContainer: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px',
  },
  instagramButton: {
    backgroundColor: '#E4405F',
    color: 'white',
    padding: '14px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    '&:hover': {
      transform: 'translateY(-2px)',
      backgroundColor: '#C13584',
      boxShadow: '0 6px 20px rgba(225, 64, 95, 0.4)',
    },
  },
};

function LoginPage() {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const formatarCPF = (value) => {
    const cpfNumeros = value.replace(/\D/g, '');
    if (cpfNumeros.length <= 11) {
      return cpfNumeros;
    }
    return cpfNumeros.slice(0, 11);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      console.log('[DEBUG] Iniciando tentativa de login...');
      console.log('[DEBUG] CPF:', cpf);
      
      const cpfNumeros = cpf.replace(/\D/g, '');
      if (cpfNumeros.length !== 11) {
        setError('CPF deve conter 11 dígitos');
        return;
      }

      const response = await api.post('usuarios/login/', { 
        cpf: cpfNumeros,
        password: password 
      });
      
      console.log('[DEBUG] Resposta recebida:', response.data);
      
      if (response.data.token) {
        console.log('[DEBUG] Login bem-sucedido, armazenando dados...');
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Redireciona com base no tipo de usuário
        const userType = response.data.user.tipo;
        if (userType === 'gerente') {
          navigate('/dashboard/gerente');
        } else if (userType === 'professor') {
          navigate('/dashboard/professor');
        } else if (userType === 'aluno') {
          navigate('/dashboard/aluno');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Erro ao realizar login. Tente novamente.');
      }
    } catch (error) {
      console.error('[DEBUG] Erro no login:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Erro ao realizar login. Tente novamente.';
      setError(errorMessage);
    }
  };

  return (
    <div className="login-container" style={styles.container}>
      <div className="login-card" style={styles.card}>
        <h1 className="login-title" style={styles.title}>🔐 Login</h1>
        <p className="login-subtitle" style={styles.subtitle}>
          Acesse sua conta do CT Supera
        </p>
        
        <form className="login-form" style={styles.form} onSubmit={handleLogin}>
          <div className="form-group" style={styles.inputGroup}>
            <label style={styles.label} htmlFor="cpf">
              CPF
            </label>
            <input
              id="cpf"
              type="text"
              placeholder="Digite seu CPF (apenas números)"
              value={cpf}
              onChange={(e) => setCpf(formatarCPF(e.target.value))}
              style={styles.input}
              required
              autoComplete="username"
            />
          </div>
          
          <div className="form-group" style={styles.inputGroup}>
            <label style={styles.label} htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              autoComplete="current-password"
            />
          </div>
          
          <div style={styles.buttonContainer}>
            <button type="submit" className="btn btn-primary" style={{...styles.button, flex: 1}}>
              🚀 Entrar
            </button>
            <a 
              href="https://www.instagram.com/ctsupera?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
              target="_blank" 
              rel="noopener noreferrer"
              style={styles.instagramButton}
            >
              📷 Instagram
            </a>
          </div>
          
          {error && <div className="alert alert-danger" style={styles.error}>{error}</div>}
        </form>
        
        <div style={styles.forgotPassword}>
          <div style={styles.forgotPasswordText}>
            Esqueceu sua senha?
          </div>
          <a href="/esqueci-senha" style={styles.forgotPasswordLink}>
            🔑 Recuperar Senha
          </a>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;