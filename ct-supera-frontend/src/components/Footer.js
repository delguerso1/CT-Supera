import React from 'react';

const styles = {
  footer: {
    backgroundColor: '#1F6C86',
    color: 'white',
    textAlign: 'center',
    padding: '2rem 1rem 1rem 1rem',
    marginTop: '3rem',
    fontSize: '1rem',
    borderTopLeftRadius: '16px',
    borderTopRightRadius: '16px',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.07)'
  },
  links: {
    margin: '0.5rem 0',
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    flexWrap: 'wrap'
  },
  link: {
    color: '#90caf9',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: '1rem'
  },
  copyright: {
    marginTop: '1rem',
    color: '#b0bec5',
    fontSize: '0.9rem'
  }
};

function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.links}>
        <a href="/quem-somos" style={styles.link}>Quem Somos</a>
        <a href="/supera-news" style={styles.link}>Supera News</a>
        <a href="/formacao-atletas" style={styles.link}>Formação de Atletas</a>
        <a href="/galeria" style={styles.link}>Galeria de Fotos</a>
        <a href="/agendamento" style={styles.link}>Agende sua Aula</a>
      </div>
      <div style={styles.copyright}>
        © {new Date().getFullYear()} CT Supera. Todos os direitos reservados.
      </div>
    </footer>
  );
}

export default Footer; 