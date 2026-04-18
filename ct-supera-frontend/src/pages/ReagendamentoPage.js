import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { formatApiDateLocale } from '../utils/dateApi';

const styles = {
  container: {
    maxWidth: '500px',
    margin: '40px auto',
    padding: '32px',
    background: '#e3f2fd',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    textAlign: 'center'
  },
  title: {
    color: '#1F6C86',
    fontWeight: 'bold',
    marginBottom: '24px'
  },
  input: {
    width: '100%',
    padding: '10px',
    margin: '10px 0',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '1rem'
  },
  button: {
    backgroundColor: '#1F6C86',
    color: 'white',
    padding: '10px 24px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '10px'
  },
  error: {
    color: '#d32f2f',
    marginBottom: '10px'
  },
  success: {
    color: '#388e3c',
    marginBottom: '10px'
  },
  info: {
    color: '#555',
    marginBottom: '16px',
    fontSize: '0.95rem'
  }
};

function ReagendamentoPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [info, setInfo] = useState(null);
  const [datasDisponiveis, setDatasDisponiveis] = useState([]);
  const [novaData, setNovaData] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Link inválido. Acesse pelo e-mail enviado após o agendamento.');
      setLoading(false);
      return;
    }
    async function carregar() {
      try {
        const resp = await api.get('usuarios/precadastros/reagendar/', { params: { token } });
        setInfo(resp.data.precadastro);
        setDatasDisponiveis(resp.data.datas_disponiveis || []);
      } catch (err) {
        const msg = err.response?.data?.error || 'Link inválido ou expirado.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!novaData) {
      setError('Selecione a nova data.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('usuarios/precadastros/reagendar/', { token, nova_data: novaData });
      setSuccess('Reagendamento realizado com sucesso! Um e-mail de confirmação foi enviado.');
      setNovaData('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao reagendar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p>Carregando...</p>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Reagendar Aula Experimental</h2>
        <div style={styles.error}>{error}</div>
        <p style={styles.info}>Para agendar uma nova aula experimental, acesse a página de agendamento.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Reagendar Aula Experimental</h2>
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}
      {info && (
        <>
          <p style={styles.info}>
            Olá, {info.first_name} {info.last_name || ''}!<br />
            Sua aula está agendada para{' '}
            <strong>
              {info.data_aula_experimental
                ? formatApiDateLocale(info.data_aula_experimental, 'pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })
                : ''}
            </strong>
            <br />
            {info.ct_nome && <>📍 {info.ct_nome}</>}
          </p>
          <form onSubmit={handleSubmit}>
            <select
              style={styles.input}
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              required
            >
              <option value="">
                {datasDisponiveis.length === 0
                  ? 'Nenhuma data disponível (reagendamento com mínimo 24h de antecedência)'
                  : 'Selecione a nova data'}
              </option>
              {datasDisponiveis.map((d) => (
                <option key={d} value={d}>
                  {formatApiDateLocale(d, 'pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                </option>
              ))}
            </select>
            <button type="submit" style={styles.button} disabled={submitting || !novaData}>
              {submitting ? 'Salvando...' : 'Reagendar'}
            </button>
          </form>
          <p style={{ ...styles.info, marginTop: '16px', fontSize: '0.85rem' }}>
            Você possui apenas uma alteração de data. Use-a com sabedoria.
          </p>
        </>
      )}
    </div>
  );
}

export default ReagendamentoPage;
