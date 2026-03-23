import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { formatarCpfMascara, apenasDigitosCpf, MSG_CPF_11_DIGITOS } from '../utils/cpf';

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
  calendar: {
    margin: '16px 0',
    padding: '16px',
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #90caf9'
  },
  calendarHeader: {
    textAlign: 'center',
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#1F6C86',
    marginBottom: '12px'
  },
  calendarWeekdays: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    marginBottom: '4px'
  },
  calendarWeekday: {
    textAlign: 'center',
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#546e7a'
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px'
  },
  calendarDay: {
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    borderRadius: '6px',
    cursor: 'pointer',
    minHeight: '32px'
  },
  calendarDayAvailable: {
    background: '#e3f2fd',
    color: '#1565c0',
    fontWeight: '600'
  },
  calendarDaySelected: {
    background: '#1F6C86',
    color: '#fff',
    fontWeight: '600'
  },
  calendarDayDisabled: {
    color: '#b0bec5',
    cursor: 'default'
  },
  calendarDayEmpty: {
    visibility: 'hidden'
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
    if (name === 'cpf') {
      update = { cpf: formatarCpfMascara(value) };
    }
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
    const turma = turmasFiltradas.find(t => t.id === parseInt(form.turma));
    if (turma && !turma.tem_vagas) {
      setError('Esta turma não possui mais vagas disponíveis.');
      return;
    }
    if (!form.data_aula_experimental) {
      setError('Selecione a data da aula experimental no calendário.');
      return;
    }

    const cpfLimpo = apenasDigitosCpf(form.cpf);
    if (cpfLimpo.length > 0 && cpfLimpo.length !== 11) {
      setError(MSG_CPF_11_DIGITOS);
      return;
    }
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
  const turmaSelecionada = turmasFiltradas.find(t => t.id === parseInt(form.turma));

  // Calendário do mês atual
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasNoMes = ultimoDia.getDate();
  const primeiroDiaSemana = primeiroDia.getDay(); // 0=dom, 1=seg, ...
  const datasSet = new Set(datasDisponiveis);
  const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const renderCalendarioDias = () => {
    const celulas = [];
    const espacosInicio = primeiroDiaSemana;
    for (let i = 0; i < espacosInicio; i++) {
      celulas.push(<div key={`empty-${i}`} style={{ ...styles.calendarDay, ...styles.calendarDayEmpty }} />);
    }
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const disponivel = datasSet.has(dataStr);
      const selecionado = form.data_aula_experimental === dataStr;
      const dataObj = new Date(ano, mes, dia);
      const passou = dataObj < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      const podeClicar = disponivel && !passou;
      celulas.push(
        <div
          key={dia}
          style={{
            ...styles.calendarDay,
            ...(selecionado ? styles.calendarDaySelected : null),
            ...(podeClicar ? styles.calendarDayAvailable : styles.calendarDayDisabled)
          }}
          onClick={() => podeClicar && setForm(prev => ({ ...prev, data_aula_experimental: dataStr }))}
          onMouseEnter={(e) => {
            if (podeClicar && !selecionado) e.currentTarget.style.background = '#bbdefb';
          }}
          onMouseLeave={(e) => {
            if (podeClicar && !selecionado) e.currentTarget.style.background = '#e3f2fd';
          }}
        >
          {dia}
        </div>
      );
    }
    return celulas;
  };

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
            placeholder="CPF (opcional) — 000.000.000-00"
            maxLength={14}
            inputMode="numeric"
            autoComplete="off"
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
          {form.turma && (
            <div style={{ marginTop: '8px', marginBottom: '8px' }}>
              <label style={{ display: 'block', textAlign: 'left', marginBottom: '4px', fontWeight: '500', color: '#333' }}>
                Data da aula experimental
              </label>
              {turmaSelecionada?.horario && datasDisponiveis.length > 0 && (
                <div style={{ marginBottom: '8px', padding: '8px 12px', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem', color: '#2e7d32', fontWeight: '500' }}>
                  Horário das aulas: {formatarHorario(turmaSelecionada.horario)}
                </div>
              )}
              {!form.turma || datasDisponiveis.length === 0 ? (
                <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '6px', color: '#757575', fontSize: '0.9rem' }}>
                  {!form.turma ? 'Selecione a turma primeiro' : 'Nenhuma data disponível neste mês'}
                </div>
              ) : (
                <div style={styles.calendar}>
                  <div style={styles.calendarHeader}>{meses[mes]} {ano}</div>
                  <div style={styles.calendarWeekdays}>
                    {nomesDias.map(d => <div key={d} style={styles.calendarWeekday}>{d}</div>)}
                  </div>
                  <div style={styles.calendarGrid}>
                    {renderCalendarioDias()}
                  </div>
                  {form.data_aula_experimental && (
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#1565c0' }}>
                      Selecionado: {new Date(form.data_aula_experimental + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                      {turmaSelecionada?.horario && ` às ${formatarHorario(turmaSelecionada.horario)}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <button type="submit" style={styles.button}>Agendar</button>
        </form>
      </div>
    </>
  );
}

export default AgendamentoPage;