import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatarCpfMascara, apenasDigitosCpf, MSG_CPF_11_DIGITOS } from '../utils/cpf';
import { normalizarTelefoneBrParaApi } from '../utils/telefone';
import { inputDateToApiDate } from '../utils/dateApi';

/** Mesma base visual de AgendamentoPage (aula experimental). */
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
    marginBottom: '12px',
    fontSize: '1.5rem'
  },
  subtitle: {
    color: '#555',
    marginBottom: '20px',
    fontSize: '0.95rem',
    lineHeight: 1.5,
    textAlign: 'left'
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
    marginBottom: '10px',
    textAlign: 'left'
  },
  success: {
    color: '#388e3c',
    marginBottom: '10px',
    textAlign: 'left'
  }
};

function FormacaoAtletas() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    cpf: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    turma: ''
  });
  const [turmas, setTurmas] = useState([]);
  const [loadingTurmas, setLoadingTurmas] = useState(true);
  const [turmasError, setTurmasError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /** Segue todas as páginas da API (DRF pagina turmas/; antes só vinha a 1ª página). */
  const fetchAllPages = async (initialUrl) => {
    let resultados = [];
    let nextUrl = initialUrl;
    while (nextUrl) {
      const response = await api.get(nextUrl);
      const data = response.data;
      if (data && Array.isArray(data.results)) {
        resultados = resultados.concat(data.results);
        nextUrl = data.next || null;
      } else {
        resultados = Array.isArray(data) ? data : [];
        nextUrl = null;
      }
    }
    return resultados;
  };

  useEffect(() => {
    const fetchTurmas = async () => {
      setLoadingTurmas(true);
      setTurmasError('');
      try {
        const todas = await fetchAllPages('turmas/?page_size=500');
        setTurmas(todas);
      } catch (err) {
        console.error('Erro ao carregar turmas:', err);
        setTurmas([]);
        setTurmasError('Não foi possível carregar a lista de turmas. Atualize a página ou tente mais tarde.');
      } finally {
        setLoadingTurmas(false);
      }
    };
    fetchTurmas();
  }, []);

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

  const formatarTelefone = (telefone) => {
    const numeros = telefone.replace(/\D/g, '').slice(0, 11);
    if (numeros.length >= 2 && numeros.length <= 6) {
      return `(${numeros.slice(0, 2)})${numeros.slice(2)}`;
    }
    if (numeros.length >= 7) {
      return `(${numeros.slice(0, 2)})${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    }
    return numeros;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let valorFormatado = value;
    // Não formatar nome durante a digitação — formatarNome remove espaços à direita e impede "Maria Silva".
    if (name === 'telefone') {
      valorFormatado = formatarTelefone(value);
    }
    if (name === 'cpf') {
      valorFormatado = formatarCpfMascara(value);
    }
    setFormData(prev => ({
      ...prev,
      [name]: valorFormatado
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const cpfDig = apenasDigitosCpf(formData.cpf);
    if (cpfDig.length > 0 && cpfDig.length !== 11) {
      setError(MSG_CPF_11_DIGITOS);
      return;
    }
    const telefoneDigitos = normalizarTelefoneBrParaApi(formData.telefone);
    if (telefoneDigitos.length !== 10 && telefoneDigitos.length !== 11) {
      setError(
        'Informe o telefone com DDD (10 ou 11 dígitos). Você pode colar com +55 ou máscara; o sistema ajusta automaticamente.'
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        first_name: formatarNome(formData.first_name),
        last_name: formatarNome(formData.last_name),
        cpf: cpfDig || undefined,
        email: formData.email,
        telefone: telefoneDigitos,
        data_nascimento: formData.data_nascimento
          ? inputDateToApiDate(formData.data_nascimento) || formData.data_nascimento
          : formData.data_nascimento
      };
      if (formData.turma) payload.turma = parseInt(formData.turma, 10);
      payload.origem = 'formulario';
      await api.post('usuarios/precadastros/', payload);
      setSuccess('Cadastro enviado com sucesso! Em breve entraremos em contato.');
      setFormData({
        first_name: '',
        last_name: '',
        cpf: '',
        email: '',
        telefone: '',
        data_nascimento: '',
        turma: ''
      });
    } catch (err) {
      const data = err.response?.data;
      let message = data?.error || data?.detail;

      if (!message && data && typeof data === 'object') {
        for (const v of Object.values(data)) {
          const msg = Array.isArray(v) ? v[0] : v;
          if (msg && typeof msg === 'string') {
            message = msg;
            break;
          }
        }
      }

      setError(
        message
          ? (Array.isArray(message) ? message[0] : message)
          : 'Erro ao enviar cadastro. Verifique os dados e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatarHorario = (horario) => {
    if (!horario) return '';
    const s = typeof horario === 'string' ? horario : String(horario);
    try {
      const partes = s.split(':');
      const h = partes[0] || '0';
      const m = partes[1] || '00';
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    } catch {
      return s;
    }
  };

  const turmasAtivas = turmas.filter(t => t.ativo !== false);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Alunos</h2>
      <p style={styles.subtitle}>
        Se você já é aluno do CT Supera, preencha o cadastro abaixo e selecione a turma de sua preferência.
      </p>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.fieldGroup}>
          <label htmlFor="alunos-first_name" style={styles.label}>Nome</label>
          <input
            id="alunos-first_name"
            style={styles.input}
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            autoComplete="given-name"
            required
          />
        </div>
        <div style={styles.fieldGroup}>
          <label htmlFor="alunos-last_name" style={styles.label}>Sobrenome</label>
          <input
            id="alunos-last_name"
            style={styles.input}
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            autoComplete="family-name"
          />
        </div>
        <div style={styles.fieldGroup}>
          <label htmlFor="alunos-cpf" style={styles.label}>CPF</label>
          <input
            id="alunos-cpf"
            style={styles.input}
            type="text"
            name="cpf"
            value={formData.cpf}
            onChange={handleChange}
            placeholder="000.000.000-00"
            maxLength={14}
            inputMode="numeric"
            autoComplete="off"
            required
          />
        </div>
        <div style={styles.fieldGroup}>
          <label htmlFor="alunos-email" style={styles.label}>E-mail</label>
          <input
            id="alunos-email"
            style={styles.input}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </div>
        <div style={styles.fieldGroup}>
          <label htmlFor="alunos-telefone" style={styles.label}>Telefone</label>
          <input
            id="alunos-telefone"
            style={styles.input}
            type="tel"
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            placeholder="(21) 99999-9999"
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </div>
        <div style={styles.fieldGroup}>
          <label htmlFor="alunos-data_nascimento" style={styles.label}>Data de nascimento</label>
          <input
            id="alunos-data_nascimento"
            style={styles.input}
            type="date"
            name="data_nascimento"
            value={formData.data_nascimento}
            onChange={handleChange}
            autoComplete="bday"
            max={new Date().toISOString().slice(0, 10)}
            required
          />
          <p style={styles.hint}>
            Necessário para o cadastro e para indicar a turma adequada à sua idade, quando aplicável.
          </p>
        </div>

        <div style={styles.fieldGroup}>
          <label htmlFor="alunos-turma" style={styles.label}>
            Turma
            {!loadingTurmas && turmasAtivas.length > 0 && (
              <span style={{ fontWeight: 'normal', color: '#666' }}>
                {' '}
                ({turmasAtivas.length === 1 ? '1 disponível' : `${turmasAtivas.length} disponíveis`})
              </span>
            )}
          </label>
          <select
            id="alunos-turma"
            style={{
              ...styles.input,
              backgroundColor: loadingTurmas || turmasError ? '#f5f5f5' : '#fff'
            }}
            name="turma"
            value={formData.turma}
            onChange={handleChange}
            disabled={loadingTurmas || !!turmasError}
          >
            <option value="">{loadingTurmas ? 'Carregando turmas…' : 'Selecione a turma'}</option>
            {turmasAtivas.map(turma => (
              <option key={turma.id} value={turma.id}>
                {turma.ct_nome || 'CT'} - {Array.isArray(turma.dias_semana_nomes) ? turma.dias_semana_nomes.join(', ') : '-'} às {formatarHorario(turma.horario)}
              </option>
            ))}
          </select>
          {turmasError && (
            <p style={{ ...styles.hint, color: '#c62828', marginTop: '8px' }}>{turmasError}</p>
          )}
          {!loadingTurmas && !turmasError && turmasAtivas.length === 0 && (
            <p style={{ ...styles.hint, color: '#757575', marginTop: '8px' }}>Nenhuma turma ativa no momento.</p>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.85 : 1
            }}
          >
            {loading ? 'Enviando...' : 'Enviar cadastro'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormacaoAtletas;
