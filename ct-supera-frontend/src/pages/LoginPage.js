import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const styles = {
  container: {
    maxWidth: '400px',
    margin: '50px auto',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    color: '#1a237e',
    textAlign: 'center',
    marginBottom: '30px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  input: {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '16px',
    width: '100%',
  },
  button: {
    backgroundColor: '#1a237e',
    color: 'white',
    padding: '12px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#151b60',
    },
  },
  error: {
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: '10px',
  },
  forgotPassword: {
    textAlign: 'center',
    marginTop: '15px',
  },
  forgotPasswordLink: {
    color: '#1a237e',
    textDecoration: 'none',
    fontSize: '14px',
    '&:hover': {
      textDecoration: 'underline',
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
    <div style={styles.container}>
      <h1 style={styles.title}>Login</h1>
      <form style={styles.form} onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Digite seu CPF (apenas números)"
          value={cpf}
          onChange={(e) => setCpf(formatarCPF(e.target.value))}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '1rem' }}
          required
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
          autoComplete="current-password"
        />
        <button type="submit" style={styles.button}>
          Entrar
        </button>
        {error && <div style={styles.error}>{error}</div>}
      </form>
      
      <div style={styles.forgotPassword}>
        <Link to="/esqueci-senha" style={styles.forgotPasswordLink}>
          Esqueci minha senha
        </Link>
      </div>
    </div>
  );
}

export default LoginPage;