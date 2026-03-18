// Componente para registrar presença em uma turma
import React, { useEffect, useState } from 'react';
import api from '../services/api';

function RegistrarPresenca({ turmaId, onSuccess }) {
  const [alunos, setAlunos] = useState([]);
  const [presenca, setPresenca] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    async function fetchAlunos() {
      try {
        setLoading(true);
        // Busca alunos da turma com status de check-in
        const resp = await api.get(`funcionarios/verificar-checkin/${turmaId}/`);
        setAlunos(resp.data.alunos || []);
      } catch (err) {
        console.error('Erro ao carregar alunos:', err);
        setErro('Erro ao carregar alunos da turma.');
      } finally {
        setLoading(false);
      }
    }
    fetchAlunos();
  }, [turmaId]);

  const handleToggle = (alunoId) => {
    setPresenca(prev =>
      prev.includes(alunoId)
        ? prev.filter(id => id !== alunoId)
        : [...prev, alunoId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSuccess('');
    setWarning('');
    try {
      const response = await api.post(`funcionarios/registrar-presenca/${turmaId}/`, {
        presenca: presenca.map(String), // IDs como string
      });
      setSuccess(response.data.message);
      if (response.data.warning) {
        setWarning(response.data.warning);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erro ao registrar presença:', err);
      setErro('Erro ao registrar presença.');
    }
  };

  if (loading) return <div>Carregando alunos...</div>;
  if (erro) return <div style={{ color: 'red' }}>{erro}</div>;

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 20, borderRadius: 8 }}>
      <h3>Registrar Presença</h3>
      {success && <div style={{ color: 'green', marginBottom: 10 }}>{success}</div>}
      {warning && <div style={{ color: 'orange', marginBottom: 10 }}>{warning}</div>}
      
      <div style={{ marginBottom: 15 }}>
        <small style={{ color: '#666' }}>
          💡 Alunos: só é possível registrar presença para quem fez check-in. Aula experimental: marque comparecimento.
        </small>
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {alunos.map(aluno => {
          const isAulaExperimental = aluno.tipo === 'aula_experimental';
          return (
            <li key={aluno.id} style={{
              marginBottom: 8,
              padding: 8,
              border: '1px solid #eee',
              borderRadius: 4,
              backgroundColor: isAulaExperimental ? '#fff8e1' : (aluno.checkin_realizado ? '#f0f8ff' : '#fff5f5')
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={presenca.includes(aluno.id)}
                  onChange={() => handleToggle(aluno.id)}
                  disabled={!aluno.pode_confirmar_presenca}
                />
                <span style={{ flex: 1 }}>
                  {aluno.nome}{aluno.username ? ` (${aluno.username})` : ''}
                </span>
                {isAulaExperimental ? (
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 6px',
                    borderRadius: 3,
                    backgroundColor: '#ff9800',
                    color: 'white'
                  }}>
                    Aula experimental
                  </span>
                ) : (
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 6px',
                    borderRadius: 3,
                    backgroundColor: aluno.checkin_realizado ? '#4caf50' : '#ff9800',
                    color: 'white'
                  }}>
                    {aluno.checkin_realizado ? '✅ Check-in' : '⏳ Sem check-in'}
                  </span>
                )}
                {aluno.presenca_confirmada && (
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 6px',
                    borderRadius: 3,
                    backgroundColor: '#2196f3',
                    color: 'white'
                  }}>
                    ✅ {isAulaExperimental ? 'Compareceu' : 'Presente'}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      <button 
        type="submit" 
        style={{ 
          marginTop: 12, 
          background: '#1F6C86', 
          color: '#fff', 
          border: 'none', 
          borderRadius: 4, 
          padding: '8px 16px',
          cursor: 'pointer'
        }}
      >
        Registrar Presença
      </button>
    </form>
  );
}

export default RegistrarPresenca;