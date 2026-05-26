import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import {
  formatarLabelSemana,
  podeSemanaAnterior,
  podeSemanaProxima,
  semanaAnteriorIso,
  semanaInicioPadrao,
  semanaPadraoAtual,
  semanaProximaIso,
} from '../utils/wellhubSemana';

const styles = {
  container: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    color: '#1F6C86',
    margin: 0,
  },
  button: {
    backgroundColor: '#1F6C86',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  buttonSecondary: {
    backgroundColor: '#E0CC98',
    color: '#333',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    minWidth: '720px',
    borderCollapse: 'collapse',
    marginTop: '1rem',
  },
  th: {
    backgroundColor: '#f5f5f5',
    padding: '1rem',
    textAlign: 'left',
    borderBottom: '2px solid #ddd',
    color: '#333',
  },
  td: {
    padding: '1rem',
    borderBottom: '1px solid #ddd',
    color: '#666',
  },
  actionButton: {
    padding: '0.3rem 0.6rem',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    marginRight: '0.5rem',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
  },
  editButton: {
    backgroundColor: '#2196f3',
    color: 'white',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
    paddingBottom: '16px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    zIndex: 1000,
    boxSizing: 'border-box',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    width: '500px',
    maxWidth: 'min(92vw, 500px)',
    maxHeight: 'min(92vh, calc(100vh - max(12px, env(safe-area-inset-top, 0px)) - 24px))',
    overflowY: 'auto',
    flexShrink: 0,
  },
  form: {
    display: 'grid',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    color: '#333',
    fontWeight: '500',
  },
  input: {
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '1rem',
  },
  select: {
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    backgroundColor: '#fff',
    minWidth: '200px',
  },
  error: {
    color: '#d32f2f',
    marginTop: '0.5rem',
    marginBottom: '0.5rem',
  },
  success: {
    color: '#2e7d32',
    marginTop: '0.5rem',
    marginBottom: '0.5rem',
  },
};

const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const filtroSelectStyle = {
  padding: '0.5rem',
  borderRadius: 4,
  border: '1px solid #ccc',
  minHeight: '44px',
  fontSize: '16px',
};

const filtroAnoStyle = {
  width: 100,
  padding: '0.5rem',
  borderRadius: 4,
  border: '1px solid #ccc',
  minHeight: '44px',
  fontSize: '16px',
};

function GerenciarCadastrosWellhub() {
  const agora = new Date();
  const [lista, setLista] = useState([]);
  const [turmasOpcoes, setTurmasOpcoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [success, setSuccess] = useState('');
  const [buscaInput, setBuscaInput] = useState('');
  const [termoBusca, setTermoBusca] = useState('');
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [ano, setAno] = useState(agora.getFullYear());
  const [semanaInicio, setSemanaInicio] = useState(() => semanaPadraoAtual());
  const [turmaFiltro, setTurmaFiltro] = useState('');
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefone: '',
    observacoes: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const mesApi = `${ano}-${String(mes).padStart(2, '0')}`;

  const buildParams = useCallback(() => {
    const params = { mes: mesApi, semana_inicio: semanaInicio };
    if (termoBusca.trim()) params.q = termoBusca.trim();
    if (turmaFiltro) params.turma_id = turmaFiltro;
    return params;
  }, [termoBusca, mesApi, semanaInicio, turmaFiltro]);

  const filtrosForaDoPadrao = () => {
    const n = new Date();
    return (
      mes !== n.getMonth() + 1 ||
      ano !== n.getFullYear() ||
      semanaInicio !== semanaInicioPadrao(ano, mes) ||
      !!turmaFiltro ||
      !!termoBusca
    );
  };

  useEffect(() => {
    setSemanaInicio(semanaInicioPadrao(ano, mes));
  }, [ano, mes]);

  const carregar = useCallback(async () => {
    setErro('');
    setLoading(true);
    try {
      const { data } = await api.get('wellhub/cadastros/', { params: buildParams() });
      setLista(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      setLista([]);
      setErro(
        e.response?.data?.error ||
          'Não foi possível carregar os cadastros Wellhub.'
      );
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('wellhub/turmas-opcoes/');
        setTurmasOpcoes(Array.isArray(data) ? data : []);
      } catch {
        setTurmasOpcoes([]);
      }
    })();
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const aplicarBusca = () => {
    setTermoBusca(buscaInput.trim());
  };

  const limparBusca = () => {
    setBuscaInput('');
    setTermoBusca('');
  };

  const limparFiltros = () => {
    const n = new Date();
    const m = n.getMonth() + 1;
    const y = n.getFullYear();
    setMes(m);
    setAno(y);
    setSemanaInicio(semanaInicioPadrao(y, m));
    setTurmaFiltro('');
    setBuscaInput('');
    setTermoBusca('');
  };

  const abrirEdicao = async (id) => {
    setErro('');
    setSuccess('');
    try {
      const { data } = await api.get(`wellhub/cadastros/${id}/`, { params: buildParams() });
      setEditando(data);
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        telefone: data.telefone || '',
        observacoes: data.observacoes || '',
      });
    } catch {
      setErro('Não foi possível abrir o cadastro.');
    }
  };

  const salvar = async (e) => {
    e?.preventDefault();
    if (!editando?.id) return;
    setSalvando(true);
    setErro('');
    setSuccess('');
    try {
      await api.patch(`wellhub/cadastros/${editando.id}/`, form);
      setEditando(null);
      setSuccess('Cadastro atualizado com sucesso.');
      await carregar();
    } catch (e) {
      setErro(
        e.response?.data?.error ||
          Object.values(e.response?.data || {}).flat().join(' ') ||
          'Erro ao salvar.'
      );
    } finally {
      setSalvando(false);
    }
  };

  const sincronizarSlots = async () => {
    setSyncing(true);
    setSuccess('');
    setErro('');
    try {
      const { data } = await api.post('wellhub/sync/slots/');
      setSuccess(data.message || 'Sincronização concluída.');
    } catch (e) {
      setErro(e.response?.data?.error || 'Falha ao sincronizar slots.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Gerenciar Cadastros Wellhub</h2>
        <button
          type="button"
          onClick={sincronizarSlots}
          disabled={syncing}
          style={{
            ...styles.buttonSecondary,
            cursor: syncing ? 'wait' : 'pointer',
            opacity: syncing ? 0.7 : 1,
          }}
        >
          {syncing ? 'Sincronizando…' : 'Sincronizar slots Wellhub'}
        </button>
      </div>

      <div
        className="controle-financeiro-filtros"
        style={{
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Mês:
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            style={filtroSelectStyle}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                {MESES_NOMES[m - 1]} ({m})
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Ano:
          <input
            type="number"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            style={filtroAnoStyle}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Turma:
          <select
            id="turma_wellhub"
            value={turmaFiltro}
            onChange={(e) => setTurmaFiltro(e.target.value)}
            style={{ ...filtroSelectStyle, minWidth: '200px' }}
          >
            <option value="">Todas as turmas Wellhub</option>
            {turmasOpcoes.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {filtrosForaDoPadrao() && (
          <button
            type="button"
            onClick={limparFiltros}
            style={{
              ...styles.actionButton,
              backgroundColor: '#757575',
              color: '#fff',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              minHeight: '44px',
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div
        className="controle-financeiro-filtros"
        style={{
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 500, color: '#333' }}>Semana:</span>
        <button
          type="button"
          onClick={() => setSemanaInicio(semanaAnteriorIso(semanaInicio))}
          disabled={!podeSemanaAnterior(semanaInicio, ano, mes)}
          style={{
            ...styles.button,
            minHeight: '44px',
            padding: '0.5rem 0.75rem',
            opacity: podeSemanaAnterior(semanaInicio, ano, mes) ? 1 : 0.45,
          }}
          aria-label="Semana anterior"
        >
          ◀
        </button>
        <span style={{ fontWeight: 600, color: '#1F6C86', minWidth: '120px', textAlign: 'center' }}>
          {formatarLabelSemana(semanaInicio)}
        </span>
        <button
          type="button"
          onClick={() => setSemanaInicio(semanaProximaIso(semanaInicio))}
          disabled={!podeSemanaProxima(semanaInicio, ano, mes)}
          style={{
            ...styles.button,
            minHeight: '44px',
            padding: '0.5rem 0.75rem',
            opacity: podeSemanaProxima(semanaInicio, ano, mes) ? 1 : 0.45,
          }}
          aria-label="Próxima semana"
        >
          ▶
        </button>
      </div>

      <div
        className="controle-financeiro-busca"
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <label style={{ fontWeight: '500', color: '#333', whiteSpace: 'nowrap' }} htmlFor="busca_wellhub">
          Buscar:
        </label>
        <input
          id="busca_wellhub"
          type="search"
          placeholder="Nome, e-mail ou telefone"
          value={buscaInput}
          onChange={(e) => setBuscaInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') aplicarBusca();
          }}
          style={{
            padding: '0.75rem',
            borderRadius: 4,
            border: '1px solid #ccc',
            minHeight: '44px',
            fontSize: '16px',
            flex: '2 1 auto',
            minWidth: 200,
          }}
          autoComplete="off"
        />
        <button
          type="button"
          style={{ ...styles.button, minHeight: '44px' }}
          onClick={aplicarBusca}
        >
          Buscar
        </button>
        {termoBusca && (
          <button
            type="button"
            onClick={limparBusca}
            style={{
              ...styles.actionButton,
              backgroundColor: '#757575',
              color: '#fff',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
            }}
          >
            Limpar busca
          </button>
        )}
      </div>

      {erro && <div style={styles.error}>{erro}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          Carregando...
        </div>
      ) : (
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="gestao-usuarios-table" style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nome</th>
                <th style={styles.th}>E-mail</th>
                <th style={styles.th}>Telefone</th>
                <th style={styles.th}>Turma</th>
                <th style={styles.th}>Última reserva na semana</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...styles.td, textAlign: 'center', fontStyle: 'italic' }}>
                    {filtrosForaDoPadrao()
                      ? 'Nenhum cadastro encontrado para os filtros selecionados.'
                      : 'Nenhum cadastro Wellhub encontrado.'}
                  </td>
                </tr>
              )}
              {lista.map((c) => (
                <tr key={c.id}>
                  <td style={styles.td}>{c.nome_completo || '—'}</td>
                  <td style={styles.td}>{c.email || '—'}</td>
                  <td style={styles.td}>{c.telefone || '—'}</td>
                  <td style={styles.td}>{c.ultima_reserva?.horario || '—'}</td>
                  <td style={styles.td}>
                    {c.ultima_reserva
                      ? `${c.ultima_reserva.data_aula} — ${c.ultima_reserva.status_display || c.ultima_reserva.status}`
                      : '—'}
                  </td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      onClick={() => abrirEdicao(c.id)}
                      style={{ ...styles.actionButton, ...styles.editButton }}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <div style={styles.modal} onClick={() => !salvando && setEditando(null)} role="presentation">
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="wellhub-modal-title"
          >
            <h2 id="wellhub-modal-title" style={styles.title}>
              Editar cadastro Wellhub
            </h2>
            <form style={styles.form} onSubmit={salvar}>
              {['first_name', 'last_name', 'email', 'telefone'].map((field) => (
                <div key={field} style={styles.formGroup}>
                  <label style={styles.label} htmlFor={`wellhub_${field}`}>
                    {field === 'first_name'
                      ? 'Nome'
                      : field === 'last_name'
                        ? 'Sobrenome'
                        : field === 'email'
                          ? 'E-mail'
                          : 'Telefone'}
                  </label>
                  <input
                    id={`wellhub_${field}`}
                    type={field === 'email' ? 'email' : 'text'}
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    style={styles.input}
                  />
                </div>
              ))}
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="wellhub_observacoes">
                  Observações
                </label>
                <textarea
                  id="wellhub_observacoes"
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                  style={styles.input}
                />
              </div>
              {editando.reservas?.length > 0 && (
                <div style={{ fontSize: '0.9rem', color: '#555' }}>
                  <strong>Reservas recentes:</strong>
                  <ul style={{ paddingLeft: '18px', margin: '8px 0 0' }}>
                    {editando.reservas.slice(0, 10).map((r) => (
                      <li key={r.id}>
                        {r.data_aula} {r.turma_horario} — {r.status_display || r.status}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  disabled={salvando}
                  style={{
                    ...styles.button,
                    backgroundColor: '#f5f5f5',
                    color: '#333',
                    flex: 1,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  style={{
                    ...styles.button,
                    flex: 1,
                    opacity: salvando ? 0.7 : 1,
                    cursor: salvando ? 'wait' : 'pointer',
                  }}
                >
                  {salvando ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GerenciarCadastrosWellhub;
