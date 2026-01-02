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
    color: '#1F6C86',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    fontWeight: '600',
    transition: 'background-color 0.3s ease',
    textDecoration: 'none',
    '&:hover': {
      backgroundColor: '#D4C088',
    },
  },
  buttonsContainer: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  instagramButton: {
    backgroundColor: '#E4405F',
    color: 'white',
    width: '40px',
    height: '40px',
    padding: '0',
    border: 'none',
    borderRadius: '50%',
    fontSize: '1.2rem',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
  },
  instagramButtonMobile: {
    backgroundColor: '#E4405F',
    color: 'white',
    width: '44px',
    height: '44px',
    padding: '0',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
    margin: '0.5rem auto',
    minHeight: '44px',
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
    zIndex: 1000,
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
    minWidth: '44px',
    minHeight: '44px',
    borderRadius: '6px',
    zIndex: 11,
    transition: 'background-color 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
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
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 10,
    animation: 'slideDown 0.3s ease-out',
  },
  mobileNavLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '1.1rem',
    padding: '0.875rem 0',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    transition: 'background-color 0.2s ease, opacity 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
    '&:active': {
      backgroundColor: 'rgba(255,255,255,0.1)',
      opacity: 0.9,
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
  const mobileMenuRef = useRef();

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
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && 
          event.target.className !== 'mobile-menu-button') {
        setShowMobileMenu(false);
      }
    }
    if (showDropdown || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showDropdown, showMobileMenu]);


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

        {/* Botões desktop */}
        <div style={styles.buttonsContainer}>
          <a 
            href="https://www.instagram.com/ctsupera?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
            target="_blank" 
            rel="noopener noreferrer"
            style={styles.instagramButton}
            title="Instagram"
            aria-label="Instagram"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.backgroundColor = '#C13584';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(225, 64, 95, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.backgroundColor = '#E4405F';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block' }}
            >
              <path 
                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" 
                fill="currentColor"
              />
            </svg>
          </a>
        {user ? (
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              style={styles.loginButton}
              onClick={() => setShowDropdown((prev) => !prev)}
            >
              {user.first_name}
            </button>
            {showDropdown && (
              <div className="navbar-dropdown" style={styles.dropdown}>
                <button
                  className="navbar-dropdown-item"
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
                  className="navbar-dropdown-item"
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
        </div>

        {/* Botão menu mobile */}
        <button
          className="mobile-menu-button"
          style={{
            ...styles.mobileMenuButton,
            backgroundColor: showMobileMenu ? 'rgba(255,255,255,0.1)' : 'transparent'
          }}
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          aria-label={showMobileMenu ? "Fechar menu" : "Abrir menu"}
          aria-expanded={showMobileMenu}
        >
          {showMobileMenu ? '✕' : '☰'}
        </button>
      </div>

      {/* Menu mobile */}
      {showMobileMenu && (
        <div 
          ref={mobileMenuRef}
          className="mobile-nav-links" 
          style={styles.mobileNavLinks}
          role="menu"
        >
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
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
            <a 
              href="https://www.instagram.com/ctsupera?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
              target="_blank" 
              rel="noopener noreferrer"
              style={styles.instagramButtonMobile}
              title="Instagram"
              aria-label="Instagram"
              onClick={() => setShowMobileMenu(false)}
            >
              <svg 
                width="22" 
                height="22" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block' }}
              >
                <path 
                  d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" 
                  fill="currentColor"
                />
              </svg>
            </a>
          </div>
          {user ? (
            <>
              <button
                style={{...styles.mobileNavLink, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%'}}
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
                style={{...styles.mobileNavLink, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%'}}
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