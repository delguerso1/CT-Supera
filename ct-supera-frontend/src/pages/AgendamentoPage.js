import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { formatarCpfMascara, apenasDigitosCpf, MSG_CPF_11_DIGITOS } from '../utils/cpf';
import { normalizarTelefoneBrParaApi } from '../utils/telefone';
import { inputDateToApiDate, parseApiDateToParts } from '../utils/dateApi';

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
  form: {
    textAlign: 'left',
    width: '100%'
  },
  fieldGroup: {
    marginBottom: '16px',
    width: '100%'
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#37474f',
    marginBottom: '6px',
    lineHeight: 1.35
  },
  hint: {
    fontSize: '0.8rem',
    fontWeight: 'normal',
    color: '#607d8b',
    marginTop: '4px',
    lineHeight: 1.35
  },
  input: {
    width: '100%',
    padding: '10px',
    margin: 0,
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '1rem',
    boxSizing: 'border-box'
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

    if (!form.data_nascimento) {
      setError('Informe sua data de nascimento.');
      return;
    }

    const cpfLimpo = apenasDigitosCpf(form.cpf);
    if (cpfLimpo.length > 0 && cpfLimpo.length !== 11) {
      setError(MSG_CPF_11_DIGITOS);
      return;
    }
    const telefoneDigitos = normalizarTelefoneBrParaApi(form.telefone);
    if (telefoneDigitos.length !== 10 && telefoneDigitos.length !== 11) {
      setError(
        'Informe o telefone com DDD (10 ou 11 dígitos). Você pode colar com +55; o sistema ajusta automaticamente.'
      );
      return;
    }
    const dados = {
      first_name: formatarNome(form.first_name),
      last_name: formatarNome(form.last_name),
      email: form.email,
      telefone: telefoneDigitos,
      data_nascimento: inputDateToApiDate(form.data_nascimento) || form.data_nascimento,
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

  const hojeRef = new Date();
  const anoAtual = hojeRef.getFullYear();
  const mesAtual0 = hojeRef.getMonth();
  const anoProx = mesAtual0 === 11 ? anoAtual + 1 : anoAtual;
  const mesProx0 = mesAtual0 === 11 ? 0 : mesAtual0 + 1;

  const datasSet = new Set(datasDisponiveis);
  const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const pad2 = (n) => String(n).padStart(2, '0');

  const renderCalendarioMes = (ano, mes0, keyPrefix) => {
    const primeiroDia = new Date(ano, mes0, 1);
    const ultimoDia = new Date(ano, mes0 + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const primeiroDiaSemana = primeiroDia.getDay();
    const celulas = [];
    for (let i = 0; i < primeiroDiaSemana; i++) {
      celulas.push(
        <div key={`${keyPrefix}-empty-${i}`} style={{ ...styles.calendarDay, ...styles.calendarDayEmpty }} />
      );
    }
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataStrApi = `${pad2(dia)}-${pad2(mes0 + 1)}-${ano}`;
      const disponivel = datasSet.has(dataStrApi);
      const selecionado = form.data_aula_experimental === dataStrApi;
      const dataObj = new Date(ano, mes0, dia);
      const passou = dataObj < new Date(hojeRef.getFullYear(), hojeRef.getMonth(), hojeRef.getDate());
      const podeClicar = disponivel && !passou;
      celulas.push(
        <div
          key={`${keyPrefix}-${dia}`}
          style={{
            ...styles.calendarDay,
            ...(selecionado ? styles.calendarDaySelected : null),
            ...(podeClicar ? styles.calendarDayAvailable : styles.calendarDayDisabled)
          }}
          onClick={() => podeClicar && setForm(prev => ({ ...prev, data_aula_experimental: dataStrApi }))}
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
    return (
      <div key={keyPrefix} style={{ marginBottom: keyPrefix === 'atual' ? '20px' : 0 }}>
        <div style={styles.calendarHeader}>
          {meses[mes0]} {ano}
        </div>
        <div style={styles.calendarWeekdays}>
          {nomesDias.map(d => (
            <div key={`${keyPrefix}-wd-${d}`} style={styles.calendarWeekday}>
              {d}
            </div>
          ))}
        </div>
        <div style={styles.calendarGrid}>{celulas}</div>
      </div>
    );
  };

  return (
    <>
      
      <div style={styles.container}>
        <h2 style={styles.title}>Agende sua Aula Experimental</h2>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label htmlFor="agendamento-first_name" style={styles.label}>Nome</label>
            <input
              id="agendamento-first_name"
              style={styles.input}
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              autoComplete="given-name"
              required
            />
          </div>
          <div style={styles.fieldGroup}>
            <label htmlFor="agendamento-last_name" style={styles.label}>Sobrenome</label>
            <input
              id="agendamento-last_name"
              style={styles.input}
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              autoComplete="family-name"
              required
            />
          </div>
          <div style={styles.fieldGroup}>
            <label htmlFor="agendamento-email" style={styles.label}>E-mail</label>
            <input
              id="agendamento-email"
              style={styles.input}
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>
          <div style={styles.fieldGroup}>
            <label htmlFor="agendamento-telefone" style={styles.label}>Telefone</label>
            <input
              id="agendamento-telefone"
              style={styles.input}
              name="telefone"
              value={form.telefone}
              onChange={e => setForm({ ...form, telefone: formatTelefone(e.target.value) })}
              placeholder="(21) 99999-9999"
              inputMode="tel"
              autoComplete="tel"
              required
            />
          </div>
          <div style={styles.fieldGroup}>
            <label htmlFor="agendamento-data_nascimento" style={styles.label}>
              Data de nascimento
            </label>
            <input
              id="agendamento-data_nascimento"
              style={styles.input}
              name="data_nascimento"
              type="date"
              value={form.data_nascimento}
              onChange={handleChange}
              autoComplete="bday"
              max={new Date().toISOString().slice(0, 10)}
              required
            />
            <p style={styles.hint}>
              Usamos sua idade para mostrar apenas turmas adequadas à sua faixa etária (crianças, adolescentes ou adultos).
            </p>
          </div>
          <div style={styles.fieldGroup}>
            <label htmlFor="agendamento-cpf" style={styles.label}>CPF (opcional)</label>
            <input
              id="agendamento-cpf"
              style={styles.input}
              name="cpf"
              value={form.cpf}
              onChange={handleChange}
              placeholder="000.000.000-00"
              maxLength={14}
              inputMode="numeric"
              autoComplete="off"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label htmlFor="agendamento-ct" style={styles.label}>Centro de Treinamento</label>
            <select
              id="agendamento-ct"
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
          </div>
          <div style={styles.fieldGroup}>
            <label htmlFor="agendamento-turma" style={styles.label}>Turma</label>
            <select
              id="agendamento-turma"
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
          </div>
          {form.turma && (
            <div style={{ ...styles.fieldGroup, marginTop: '8px' }}>
              <label style={{ ...styles.label, marginBottom: '8px' }}>
                Data da aula experimental
              </label>
              {turmaSelecionada?.horario && datasDisponiveis.length > 0 && (
                <div style={{ marginBottom: '8px', padding: '8px 12px', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem', color: '#2e7d32', fontWeight: '500' }}>
                  Horário das aulas: {formatarHorario(turmaSelecionada.horario)}
                </div>
              )}
              {!form.turma || datasDisponiveis.length === 0 ? (
                <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '6px', color: '#757575', fontSize: '0.9rem' }}>
                  {!form.turma
                    ? 'Selecione a turma primeiro'
                    : 'Nenhuma data disponível no mês atual nem no próximo (feriados nacionais e dias fora da turma são excluídos).'}
                </div>
              ) : (
                <div style={styles.calendar}>
                  {renderCalendarioMes(anoAtual, mesAtual0, 'atual')}
                  {renderCalendarioMes(anoProx, mesProx0, 'proximo')}
                  {form.data_aula_experimental && (
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#1565c0' }}>
                      Selecionado:{' '}
                      {(() => {
                        const p = parseApiDateToParts(form.data_aula_experimental);
                        return p
                          ? new Date(p.y, p.m - 1, p.d).toLocaleDateString('pt-BR', {
                              weekday: 'long',
                              day: '2-digit',
                              month: 'long',
                            })
                          : '';
                      })()}
                      {turmaSelecionada?.horario && ` às ${formatarHorario(turmaSelecionada.horario)}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <button type="submit" style={styles.button}>Agendar</button>
          </div>
        </form>
      </div>
    </>
  );
}

export default AgendamentoPage;