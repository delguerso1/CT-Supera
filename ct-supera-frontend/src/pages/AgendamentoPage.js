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
    turma: '',
    data_aula_experimental: ''
  });
  const [cts, setCts] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [datasDisponiveis, setDatasDisponiveis] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calcula a idade em anos completos a partir da data de nascimento
  const calcularIdade = (dataNascimento) => {
    if (!dataNascimento) return null;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  // Retorna a faixa etária com base na idade: kids (até 12), teen (13-18), adultos (>18)
  const obterFaixaEtaria = (idade) => {
    if (idade === null || idade === undefined) return null;
    if (idade <= 12) return 'kids';
    if (idade <= 18) return 'teen';
    return 'adultos';
  };

  // Turmas filtradas pela faixa etária do usuário (baseada na data de nascimento)
  const idadeUsuario = calcularIdade(form.data_nascimento);
  const faixaUsuario = obterFaixaEtaria(idadeUsuario);
  const turmasFiltradas = Array.isArray(turmas)
    ? (faixaUsuario
        ? turmas.filter((t) => {
            if (!t) return false;
            if (faixaUsuario === 'kids') return t.aceita_kids;
            if (faixaUsuario === 'teen') return t.aceita_teen;
            if (faixaUsuario === 'adultos') return t.aceita_adultos !== false;
            return false;
          })
        : [])
    : [];

  const formatarNome = (valor) => {
    if (!valor) return '';
    return valor
      .toLowerCase()
      .split(' ')
      .filter(part => part.trim() !== '')
      .map(part => part
        .split('-')
        .map(p => (p ? p.charAt(0).toUpperCase() + p.slice(1) : ''))
        .join('-'))
      .join(' ');
  };

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
        setForm(f => ({ ...f, turma: '', data_aula_experimental: '' }));
        return;
      }
      try {
        const resp = await api.get(`turmas/?ct=${form.ct}`);
        setTurmas(resp.data.results || []);
      } catch {
        setTurmas([]);
      }
      setDatasDisponiveis([]);
    }
    fetchTurmas();
  }, [form.ct]);

  // Buscar datas disponíveis ao selecionar turma
  useEffect(() => {
    async function fetchDatas() {
      if (!form.turma) {
        setDatasDisponiveis([]);
        setForm(f => ({ ...f, data_aula_experimental: '' }));
        return;
      }
      try {
        const resp = await api.get(`turmas/${form.turma}/datas-aula-experimental/`);
        setDatasDisponiveis(resp.data.datas || []);
      } catch {
        setDatasDisponiveis([]);
      }
    }
    fetchDatas();
  }, [form.turma]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let update = { [name]: value };
    if (name === 'ct') {
      update.turma = '';
      update.data_aula_experimental = '';
    }
    if (name === 'data_nascimento') {
      update.turma = '';
      update.data_aula_experimental = '';
    }
    if (name === 'turma') {
      update.data_aula_experimental = '';
    }
    setForm(prev => ({ ...prev, ...update }));
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
    const turmaSelecionada = turmasFiltradas.find(t => t.id === parseInt(form.turma));
    if (turmaSelecionada && !turmaSelecionada.tem_vagas) {
      setError('Esta turma não possui mais vagas disponíveis.');
      return;
    }

    const cpfLimpo = form.cpf ? form.cpf.replace(/\D/g, '') : '';
    const dados = {
      first_name: formatarNome(form.first_name),
      last_name: formatarNome(form.last_name),
      email: form.email,
      telefone: form.telefone,
      data_nascimento: form.data_nascimento,
      cpf: cpfLimpo,
      turma: form.turma || undefined,
      data_aula_experimental: form.data_aula_experimental || undefined,
      origem: 'aula_experimental'
    };

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
        turma: '',
        data_aula_experimental: ''
      });
    } catch (err) {
      const data = err.response?.data || {};
      setError(
        data.cpf?.[0] ||
        data.email?.[0] ||
        data.telefone?.[0] ||
        data.nome?.[0] ||
        data.data_nascimento?.[0] ||
        data.data_aula_experimental?.[0] ||
        data.turma?.[0] ||
        data.error ||
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
            placeholder="CPF (obrigatório para aula experimental)"
            maxLength={14}
            required
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
            disabled={!form.ct || !form.data_nascimento}
          >
            <option value="">
              {!form.data_nascimento
                ? 'Informe a data de nascimento para ver as turmas'
                : turmasFiltradas.length === 0
                ? 'Nenhuma turma disponível para sua faixa etária'
                : 'Selecione a Turma'}
            </option>
            {turmasFiltradas.map(turma => {
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
                  {ctSelecionado?.nome || 'CT não reconhecido'} -{' '}
                  {Array.isArray(turma.dias_semana_nomes) ? turma.dias_semana_nomes.join(', ') : ''} -{' '}
                  {formatarHorario(turma.horario)} - {vagasInfo}
                </option>
              );
            })}
          </select>
          <select
            style={styles.input}
            name="data_aula_experimental"
            value={form.data_aula_experimental}
            onChange={handleChange}
            required
            disabled={!form.turma || datasDisponiveis.length === 0}
          >
            <option value="">
              {!form.turma
                ? 'Selecione a turma primeiro'
                : datasDisponiveis.length === 0
                  ? 'Nenhuma data disponível neste mês'
                  : 'Selecione a data da aula experimental'}
            </option>
            {datasDisponiveis.map(d => (
              <option key={d} value={d}>
                {new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long'
                })}
              </option>
            ))}
          </select>
          <button type="submit" style={styles.button}>Agendar</button>
        </form>
      </div>
    </>
  );
}

export default AgendamentoPage;