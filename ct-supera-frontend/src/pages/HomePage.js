import React from 'react';
import { Link } from 'react-router-dom';

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  },
  hero: {
    textAlign: 'center',
    padding: '4rem 0',
    backgroundColor: '#f5f5f5',
    marginBottom: '3rem',
  },
  title: {
    fontSize: '2.5rem',
    color: '#1F6C86',
    marginBottom: '1rem',
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#666',
    marginBottom: '2rem',
  },
  quemSomos: {
    marginBottom: '3rem',
  },
  sectionTitle: {
    fontSize: '2rem',
    color: '#1F6C86',
    marginBottom: '1.5rem',
  },
  content: {
    fontSize: '1.1rem',
    lineHeight: '1.6',
    color: '#444',
    marginBottom: '2rem',
  },
  agendamentoButton: {
    display: 'inline-block',
    backgroundColor: '#E0CC98',
    color: '#1F6C86',
    padding: '1rem 2rem',
    borderRadius: '4px',
    textDecoration: 'none !important',
    fontSize: '1.1rem',
    fontWeight: '600',
    transition: 'background-color 0.3s',
  },
  whatsappButton: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '60px',
    height: '60px',
    backgroundColor: '#25D366',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)',
    cursor: 'pointer',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease',
    textDecoration: 'none',
    zIndex: 99999,
  },
};

function HomePage() {
  // Número do WhatsApp (apenas números, sem espaços ou caracteres especiais)
  // Formato: 5521964835368 (código do país + DDD + número)
  const whatsappNumber = '5521964835368';
  
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;
  
  return (
    <div>
      <div className="hero" style={styles.hero}>
        <h1 className="hero-title" style={styles.title}>Bem-vindo ao CT Supera</h1>
        <p className="hero-subtitle" style={styles.subtitle}>
          Formando campeões dentro e fora das quadras
        </p>
        <Link to="/agendamento" className="agendamento-button" style={styles.agendamentoButton}>
          Agendar Aula Experimental
        </Link>
      </div>

      <div style={styles.container}>
        <section style={styles.quemSomos}>
          <h2 className="section-title" style={styles.sectionTitle}>Quem Somos</h2>
          <div className="content" style={styles.content}>
            <p>
              O CT Supera é um centro de treinamento dedicado ao desenvolvimento de atletas de todas as idades, com foco especial no Vôlei de Praia.

Nossa missão é transformar vidas por meio do esporte, promovendo saúde, bem-estar, espírito esportivo e conexões genuínas entre pessoas que compartilham a paixão pelo vôlei e por um estilo de vida mais ativo e equilibrado.

No CT Supera, acreditamos que o esporte vai muito além da competição. Ele é uma ferramenta poderosa de transformação, que fortalece o corpo, a mente e as relações humanas. Por isso, nosso ambiente é cuidadosamente pensado para:</p>
<div
  style={{
    background: '#e3f2fd', // azul claro
    color: '#1F6C86',
    fontWeight: 'bold',
    maxWidth: 600,
    margin: '40px auto',
    padding: '24px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
  }}
>
  <p>✅ Promover o condicionamento físico com treinos técnicos, funcionais e personalizados;</p>
  <p>✅ Estimular a saúde e o equilíbrio emocional com atividades ao ar livre e contato com a natureza;</p>
  <p>✅ Construir amizades verdadeiras, com base no companheirismo e na paixão pelo jogo;</p>
  <p>✅ Estimular uma competição saudável, onde o desafio é superar a si mesmo, com ética e alegria.</p>
</div>

Nosso espaço é mais do que uma quadra: é um ponto de encontro para quem busca viver melhor, superar limites e fazer parte de uma comunidade vibrante e inspiradora.

No CT Supera, você não entra apenas para jogar, entra para fazer parte de um estilo de vida.

            <p>
              Nossa equipe é composta por profissionais altamente qualificados,
              com vasta experiência no cenário esportivo nacional e internacional.
              Oferecemos estrutura de primeira linha, com quadras de alta
              qualidade, equipamentos modernos e um ambiente propício para o
              desenvolvimento dos nossos atletas.
            </p>
            <p>
              Venha conhecer nossa metodologia e fazer parte da família Supera!
              Agende uma aula experimental e descubra por que somos referência
              em formação de atletas.
            </p>
          </div>
          <Link to="/agendamento" className="agendamento-button" style={styles.agendamentoButton}>
            Agendar Aula Experimental
          </Link>
        </section>
      </div>

      {/* Botão flutuante do WhatsApp */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float-button"
        style={styles.whatsappButton}
        title="Fale conosco no WhatsApp"
        aria-label="Fale conosco no WhatsApp"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 211, 102, 0.6)';
          e.currentTarget.style.backgroundColor = '#20BA5A';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 211, 102, 0.4)';
          e.currentTarget.style.backgroundColor = '#25D366';
        }}
      >
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" 
            fill="white"
          />
        </svg>
      </a>
    </div>
  );
}

export default HomePage; 