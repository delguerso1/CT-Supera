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
    color: '#1a237e',
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
    color: '#1a237e',
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
    backgroundColor: '#4caf50',
    color: 'white',
    padding: '1rem 2rem',
    borderRadius: '4px',
    textDecoration: 'none',
    fontSize: '1.1rem',
    transition: 'background-color 0.3s',
    '&:hover': {
      backgroundColor: '#45a049',
    },
  },
};

function HomePage() {
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
    color: '#1a237e',
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
    </div>
  );
}

export default HomePage; 