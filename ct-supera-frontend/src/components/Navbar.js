import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const styles = {
  navbar: {
    backgroundColor: '#1F6C86',
    padding: '1rem',
    color: 'white',
    position: 'relative',
  },
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    zIndex: 11,
  },
  logoImage: {
    height: '60px',
    width: 'auto',
    maxWidth: '200px',
    objectFit: 'contain',
  },
  navLinks: {
    display: 'flex',
    gap: '2rem',
  },
  navLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '1rem',
    transition: 'color 0.3s ease',
    '&:hover': {
      color: '#90caf9',
    },
  },
  loginButton: {
    backgroundColor: '#E0CC98',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.3s ease',
    '&:hover': {
      backgroundColor: '#D4C088',
    },
  },
  dropdown: {
    position: 'absolute',
    top: '110%',
    right: 0,
    background: 'white',
    color: '#1F6C86',
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
    color: '#1F6C86',
    fontSize: '1rem',
    transition: 'background-color 0.3s ease',
    '&:hover': {
      backgroundColor: '#f5f5f5',
    },
  },
  // Estilos para mobile
  mobileMenuButton: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.5rem',
    zIndex: 11,
  },
  mobileNavLinks: {
    display: 'none',
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1F6C86',
    flexDirection: 'column',
    padding: '1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 10,
  },
  mobileNavLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '1.1rem',
    padding: '0.75rem 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    transition: 'color 0.3s ease',
    '&:hover': {
      color: '#90caf9',
    },
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  // Media queries para responsividade
  '@media (max-width: 768px)': {
    navLinks: {
      display: 'none',
    },
    mobileMenuButton: {
      display: 'block',
    },
    mobileNavLinks: {
      display: 'flex',
    },
    container: {
      padding: '0 1rem',
    },
  },
};

function Navbar() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    // Só considera o usuário logado se tiver tanto user quanto token
    return (storedUser && token) ? JSON.parse(storedUser) : null;
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef();

  // Verificar autenticação sempre que o componente monta
  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (storedUser && token) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } catch (error) {
          console.error('Erro ao parsear dados do usuário:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    // Verificar imediatamente
    checkAuth();

    // Verificar quando o storage muda
    const onStorage = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', onStorage);
    
    // Verificar periodicamente (a cada 5 segundos) para garantir consistência
    const interval = setInterval(checkAuth, 5000);
    
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
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


  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setShowDropdown(false);
    // Forçar atualização do estado
    window.dispatchEvent(new Event('storage'));
    navigate('/');
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        <Link to="/" className="logo" style={styles.logo}>
          <img 
            src="/logo-supera-principal.png" 
            alt="CT Supera - Centro de Treinamento" 
            style={styles.logoImage}
          />
        </Link>
        
        {/* Menu desktop */}
        <div className="nav-links" style={styles.navLinks}>
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

        {/* Botão de login desktop */}
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
          <Link to="/login" style={styles.loginButton}>
            Login
          </Link>
        )}

        {/* Botão menu mobile */}
        <button
          className="mobile-menu-button"
          style={styles.mobileMenuButton}
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          ☰
        </button>
      </div>

      {/* Menu mobile */}
      {showMobileMenu && (
        <div className="mobile-nav-links" style={styles.mobileNavLinks}>
          <Link 
            to="/quem-somos" 
            style={styles.mobileNavLink}
            onClick={() => setShowMobileMenu(false)}
          >
            Quem Somos
          </Link>
          <Link 
            to="/supera-news" 
            style={styles.mobileNavLink}
            onClick={() => setShowMobileMenu(false)}
          >
            Supera News
          </Link>
          <Link 
            to="/formacao-atletas" 
            style={styles.mobileNavLink}
            onClick={() => setShowMobileMenu(false)}
          >
            Formação de Atletas
          </Link>
          <Link 
            to="/galeria" 
            style={styles.mobileNavLink}
            onClick={() => setShowMobileMenu(false)}
          >
            Galeria de Fotos
          </Link>
          {user ? (
            <>
              <button
                style={{...styles.mobileNavLink, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer'}}
                onClick={() => {
                  setShowMobileMenu(false);
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
                style={{...styles.mobileNavLink, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer'}}
                onClick={() => {
                  setShowMobileMenu(false);
                  handleLogout();
                }}
              >
                Sair
              </button>
            </>
          ) : (
            <Link 
              to="/login" 
              style={styles.mobileNavLink}
              onClick={() => setShowMobileMenu(false)}
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar; 