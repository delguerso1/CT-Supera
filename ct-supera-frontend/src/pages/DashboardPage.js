import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  title: {
    color: '#333',
    marginBottom: '30px',
    borderBottom: '2px solid #eee',
    paddingBottom: '10px',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  infoItem: {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #eee',
  },
  label: {
    color: '#666',
    marginBottom: '5px',
    display: 'block',
  },
  value: {
    color: '#333',
    fontWeight: '500',
  },
};

function DashboardPage() {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
          navigate('/login');
          return;
        }

        console.log('[DEBUG] Buscando dados do usuário:', user);
        const response = await api.get(`api/usuarios/usuarios/${user.id}/`);
        console.log('[DEBUG] Resposta da API:', response.data);
        setUserData(response.data);
      } catch (error) {
        console.error('[DEBUG] Erro ao buscar dados:', error);
        setError('Erro ao carregar dados do usuário');
        if (error.response?.status === 401) {
          navigate('/login');
        }
      }
    };

    fetchData();
  }, []);

  if (error) {
    return <div style={{ color: 'red', padding: '20px' }}>{error}</div>;
  }

  if (!userData) {
    return <div style={{ padding: '20px' }}>Carregando...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>
        Bem-vindo, {userData.first_name} {userData.last_name}!
      </h1>
      <div style={styles.infoSection}>
        <h2 style={{ color: '#444', marginBottom: '20px' }}>Informações Pessoais</h2>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.label}>Tipo de usuário</span>
            <span style={styles.value}>
              {userData.tipo === 'aluno' ? 'Aluno' : userData.tipo === 'professor' ? 'Professor' : 'Gerente'}
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Email</span>
            <span style={styles.value}>{userData.email}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>Telefone</span>
            <span style={styles.value}>{userData.telefone || 'Não informado'}</span>
          </div>
          {userData.tipo === 'aluno' && (
            <>
              <div style={styles.infoItem}>
                <span style={styles.label}>Nome do Responsável</span>
                <span style={styles.value}>{userData.nome_responsavel || 'Não informado'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.label}>Telefone do Responsável</span>
                <span style={styles.value}>{userData.telefone_responsavel || 'Não informado'}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;