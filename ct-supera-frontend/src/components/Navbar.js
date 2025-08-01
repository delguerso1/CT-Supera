import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const styles = {
  navbar: {
    backgroundColor: '#1a237e',
    padding: '1rem',
    color: 'white',
  },
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'white',
    textDecoration: 'none',
  },
  navLinks: {
    display: 'flex',
    gap: '2rem',
  },
  navLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '1rem',
    '&:hover': {
      color: '#90caf9',
    },
  },
  loginButton: {
    backgroundColor: '#4caf50',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    '&:hover': {
      backgroundColor: '#45a049',
    },
  },
  dropdown: {
    position: 'absolute',
    top: '110%',
    right: 0,
    background: 'white',
    color: '#1a237e',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    minWidth: '120px',
    zIndex: 10,
    padding: '0.5rem 0',
  },
  dropdownItem: {
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    color: '#1a237e',
    fontSize: '1rem',
  },
};

function Navbar() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')));
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef();

  useEffect(() => {
    const onStorage = () => {
      setUser(JSON.parse(localStorage.getItem('user')));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('usuarios/login/', { cpf, password });
      if (response.data.message === "Login realizado com sucesso!") {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        setShowLoginModal(false);
        if (response.data.user.tipo === 'gerente') {
          navigate('/dashboard/gerente');
        } else if (response.data.user.tipo === 'professor') {
          navigate('/dashboard/professor');
        } else {
          navigate('/dashboard/aluno');
        }
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao realizar login. Tente novamente.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setShowDropdown(false);
    navigate('/');
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        <Link to="/" style={styles.logo}>
          CT Supera
        </Link>
        <div style={styles.navLinks}>
          <Link to="/quem-somos" style={styles.navLink}>
            Quem Somos
          </Link>
          <Link to="/supera-news" style={styles.navLink}>
            Supera News
          </Link>
          <Link to="/formacao-atletas" style={styles.navLink}>
            Formação de Atletas
          </Link>
          <Link to="/galeria" style={styles.navLink}>
            Galeria de Fotos
          </Link>
        </div>
        {user ? (
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              style={styles.loginButton}
              onClick={() => setShowDropdown((prev) => !prev)}
            >
              {user.first_name}
            </button>
            {showDropdown && (
              <div style={styles.dropdown}>
                <button
                  style={styles.dropdownItem}
                  onClick={() => {
                    setShowDropdown(false);
                    navigate(
                      user.tipo === 'gerente'
                        ? '/dashboard/gerente'
                        : user.tipo === 'professor'
                        ? '/dashboard/professor'
                        : '/dashboard/aluno'
                    );
                  }}
                >
                  Meu Painel
                </button>
                <button
                  style={styles.dropdownItem}
                  onClick={handleLogout}
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            style={styles.loginButton}
            onClick={() => setShowLoginModal(true)}
          >
            Login
          </button>
        )}
      </div>
      {showLoginModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            width: '400px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <h2 style={{
                color: '#1a237e',
                marginBottom: '0.5rem',
                fontSize: '1.5rem'
              }}>
                Bem-vindo ao CT Supera
              </h2>
              <p style={{
                color: '#666',
                fontSize: '0.9rem'
              }}>
                Faça login para acessar sua conta
              </p>
            </div>
            {error && (
              <div style={{
                color: 'white',
                backgroundColor: '#f44336',
                padding: '0.75rem',
                borderRadius: '4px',
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}
            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#333',
                  fontWeight: '500'
                }}>
                  CPF:
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="Digite seu CPF (apenas números)"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    '&:focus': {
                      borderColor: '#1a237e',
                      outline: 'none'
                    }
                  }}
                  required
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#333',
                  fontWeight: '500'
                }}>
                  Senha:
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    '&:focus': {
                      borderColor: '#1a237e',
                      outline: 'none'
                    }
                  }}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    backgroundColor: '#f5f5f5',
                    color: '#333',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    flex: 1,
                    '&:hover': {
                      backgroundColor: '#e0e0e0'
                    }
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#1a237e',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    flex: 1,
                    '&:hover': {
                      backgroundColor: '#151b60'
                    }
                  }}
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar; 