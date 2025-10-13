import React, { useEffect, useState } from 'react';
import api from '../services/api';

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
    color: '#1a237e',
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
    backgroundColor: '#1a237e',
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
  }
};

function AgendamentoPage() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    cpf: '',
    ct: '',
    turma: ''
  });
  const [cts, setCts] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Buscar CTs ao carregar a página
  useEffect(() => {
    async function fetchCts() {
      try {
        const resp = await api.get('cts/');
        setCts(Array.isArray(resp.data) ? resp.data : resp.data.results || []);
      } catch {
        setCts([]);
      }
    }
    fetchCts();
  }, []);

  // Buscar turmas ao selecionar um CT
  useEffect(() => {
    async function fetchTurmas() {
      if (!form.ct) {
        setTurmas([]);
        setForm(f => ({ ...f, turma: '' }));
        return;
      }
      try {
        const resp = await api.get(`turmas/?ct=${form.ct}`);
        setTurmas(resp.data.results || []);
      } catch {
        setTurmas([]);
      }
    }
    fetchTurmas();
  }, [form.ct]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Se mudou o CT, limpa a turma selecionada
    if (name === 'ct') {
      setForm(prev => ({ ...prev, turma: '' }));
    }
  };

  function formatTelefone(value) {
    value = value.replace(/\D/g, '');
    if (value.length > 2) value = `(${value.slice(0,2)})${value.slice(2)}`;
    if (value.length > 9) value = `${value.slice(0,9)}-${value.slice(9,13)}`;
    return value.slice(0,14);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validação da turma selecionada
    const turmaSelecionada = turmas.find(t => t.id === parseInt(form.turma));
    if (turmaSelecionada && !turmaSelecionada.tem_vagas) {
      setError('Esta turma não possui mais vagas disponíveis.');
      return;
    }

    const dados = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      telefone: form.telefone,
      data_nascimento: form.data_nascimento,
      turma: form.turma || undefined
    };
    if (form.cpf && form.cpf.trim() !== '') {
      dados.cpf = form.cpf;
    }

    try {
      await api.post('usuarios/precadastros/', dados);
      setSuccess('Pré-cadastro realizado com sucesso!');
      setForm({
        first_name: '',
        last_name: '',
        email: '',
        telefone: '',
        data_nascimento: '',
        cpf: '',
        ct: '',
        turma: ''
      });
    } catch (err) {
      setError(
        err.response?.data?.email?.[0] ||
        err.response?.data?.telefone?.[0] ||
        err.response?.data?.nome?.[0] ||
        err.response?.data?.cpf?.[0] ||
        err.response?.data?.data_nascimento?.[0] ||
        err.response?.data?.turma?.[0] ||
        'Erro ao realizar pré-cadastro.'
      );
    }
  };

  const formatarHorario = (horario) => {
    if (!horario) return '';
    return new Date(`2000-01-01T${horario}`).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const ctSelecionado = cts.find(ct => String(ct.id) === String(form.ct));

  return (
    <>
      
      <div style={styles.container}>
        <h2 style={styles.title}>Agende sua Aula Experimental</h2>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}
        <form onSubmit={handleSubmit}>
          <input
            style={styles.input}
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            placeholder="Nome"
            required
          />
          <input
            style={styles.input}
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            placeholder="Sobrenome"
            required
          />
          <input
            style={styles.input}
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="E-mail"
            required
          />
          <input
            style={styles.input}
            name="telefone"
            value={form.telefone}
            onChange={e => setForm({ ...form, telefone: formatTelefone(e.target.value) })}
            placeholder="Telefone (ex: (21)99999-9999)"
            required
          />
          <input
            style={styles.input}
            name="data_nascimento"
            type="date"
            value={form.data_nascimento}
            onChange={handleChange}
            placeholder="Data de nascimento"
            required
          />
          <input
            style={styles.input}
            name="cpf"
            value={form.cpf}
            onChange={handleChange}
            placeholder="CPF (opcional)"
            maxLength={11}
          />
          <select
            style={styles.input}
            name="ct"
            value={form.ct}
            onChange={handleChange}
            required
          >
            <option value="">Selecione o Centro de Treinamento</option>
            {cts.map(ct => (
              <option key={ct.id} value={ct.id}>{ct.nome}</option>
            ))}
          </select>
          <select
            style={styles.input}
            name="turma"
            value={form.turma}
            onChange={handleChange}
            required
            disabled={!form.ct}
          >
            <option value="">Selecione a Turma</option>
            {Array.isArray(turmas) && turmas.map(turma => {
              if (!turma) return null;
              const vagasInfo = turma.tem_vagas 
                ? `(${turma.vagas_disponiveis} vaga${turma.vagas_disponiveis !== 1 ? 's' : ''} ${turma.vagas_disponiveis !== 1 ? 'disponíveis' : 'disponível'})`
                : '(Turma lotada)';
              return (
                <option 
                  key={turma.id} 
                  value={turma.id}
                  disabled={!turma.tem_vagas}
                >
                  {ctSelecionado?.nome || 'CT não reconhecido'} - 
                  {Array.isArray(turma.dias_semana_nomes) ? turma.dias_semana_nomes.join(', ') : ''} - 
                  {formatarHorario(turma.horario)} - {vagasInfo}
                </option>
              );
            })}
          </select>
          <button type="submit" style={styles.button}>Agendar</button>
        </form>
      </div>
    </>
  );
}

export default AgendamentoPage;