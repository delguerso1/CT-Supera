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
        const lista = resp.data.alunos || [];
        setAlunos(lista);
        setPresenca(
          lista
            .filter((a) => a.presenca_confirmada && !a.ausencia_registrada)
            .map((a) => String(a.id))
        );
      } catch (err) {
        console.error('Erro ao carregar alunos:', err);
        setErro('Erro ao carregar alunos da turma.');
      } finally {
        setLoading(false);
      }
    }
    fetchAlunos();
  }, [turmaId]);

  const normId = (id) => String(id);

  const handleToggle = (alunoId) => {
    const id = normId(alunoId);
    setPresenca(prev =>
      prev.some((x) => normId(x) === id)
        ? prev.filter((x) => normId(x) !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSuccess('');
    setWarning('');
    try {
      const presencaIds = presenca.map(String);
      const faltasIds = alunos
        .filter((a) => !presenca.some((x) => normId(x) === normId(a.id)))
        .map((a) => String(a.id));
      const response = await api.post(`funcionarios/registrar-presenca/${turmaId}/`, {
        presenca: presencaIds,
        faltas: faltasIds,
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
        <small style={{ color: '#666', lineHeight: 1.45, display: 'block' }}>
          💡 O check-in no app é feito pelo aluno. Aqui você confirma quem compareceu à aula; pode marcar presença
          mesmo sem check-in no app (ex.: sem celular ou inadimplente). Desmarcar grava falta. Aula experimental:
          marque o comparecimento.
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
                  checked={presenca.some((x) => normId(x) === normId(aluno.id))}
                  onChange={() => handleToggle(aluno.id)}
                  disabled={false}
                  aria-label={`Presença: ${aluno.nome || ''}`}
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
                    {aluno.checkin_realizado ? '✅ Check-in no app' : '⏳ Sem check-in no app'}
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