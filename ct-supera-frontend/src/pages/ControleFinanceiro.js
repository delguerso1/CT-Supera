import React, { useEffect, useState, useRef } from 'react';
import api, { normalizeDrfNextUrl } from '../services/api';
import { apiDateToInputDate, formatApiDateDisplay, inputDateToApiDate } from '../utils/dateApi';

function isTimeoutError(err) {
  return (
    err?.code === 'ECONNABORTED' ||
    String(err?.message || '').toLowerCase().includes('timeout')
  );
}

function mensagemErroCarregamento(err) {
  if (isTimeoutError(err)) {
    return 'O servidor demorou demais para responder. Verifique sua conexão ou tente novamente em instantes.';
  }
  return err?.response?.data?.error || err?.message || 'Erro ao carregar dados.';
}

const styles = {
  formGroup: { marginBottom: '1rem' },
  label: { fontWeight: 'bold' },
  input: { width: '100%', padding: '0.5rem' }
};

function ControleFinanceiro({ user, onDataChange }) {
  const [dashboard, setDashboard] = useState(null);
  const [mensalidades, setMensalidades] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [salarios, setSalarios] = useState([]);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [turmaFiltro, setTurmaFiltro] = useState('');
  const [mensalidadeStatus, setMensalidadeStatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const [aumentoIncremento, setAumentoIncremento] = useState('');
  const [aumentoAplicando, setAumentoAplicando] = useState(false);
  const [showDespesaModal, setShowDespesaModal] = useState(false);
  const [editDespesa, setEditDespesa] = useState(null);
  const [despesaForm, setDespesaForm] = useState({ categoria: 'outros', descricao: '', valor: '', data: '' });
  const [editingUser] = useState(null);
  const [formData] = useState({});
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  /** Listas (mensalidades, turmas, etc.) ainda carregando em segundo plano após o dashboard. */
  const [carregandoListas, setCarregandoListas] = useState(false);
  const itensPorPagina = 10;
  /** Evita segundo GET de mensalidades no mount (já carregado no efeito de mes/ano). */
  const skipMensalidadesFilterEffect = useRef(true);

  const fetchAllPages = async (initialUrl) => {
    let resultados = [];
    let nextUrl = initialUrl;
    while (nextUrl) {
      const response = await api.get(nextUrl);
      const data = response.data;
      if (data && data.results) {
        resultados = resultados.concat(data.results);
        nextUrl = normalizeDrfNextUrl(data.next);
      } else {
        resultados = Array.isArray(data) ? data : [];
        nextUrl = null;
      }
    }
    return resultados;
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setErro('');
      setLoading(true);
      setCarregandoListas(false);
      try {
        const { data } = await api.get('financeiro/dashboard/', { params: { mes, ano } });
        if (!cancelled) setDashboard(data);
      } catch (err) {
        if (!cancelled) setErro(mensagemErroCarregamento(err));
      } finally {
        // Libera a tela assim que o painel responde; listas pesadas vêm em paralelo abaixo.
        if (!cancelled) setLoading(false);
      }

      if (!cancelled) setCarregandoListas(true);
      const resultados = await Promise.allSettled([
        fetchAllPages(`financeiro/mensalidades/?mes=${mes}&ano=${ano}&page_size=500`),
        fetchAllPages(`financeiro/despesas/?mes=${mes}&ano=${ano}&page_size=500`),
        fetchAllPages(`financeiro/salarios/?mes=${mes}&ano=${ano}&page_size=500`),
        fetchAllPages('usuarios/?tipo=aluno'),
        fetchAllPages('turmas/?page_size=500'),
      ]);

      if (cancelled) return;

      const labels = ['mensalidades', 'despesas', 'salários', 'alunos', 'turmas'];
      const erros = [];
      resultados.forEach((r, i) => {
        if (r.status === 'rejected') {
          erros.push(`${labels[i]}: ${mensagemErroCarregamento(r.reason)}`);
        }
      });

      if (resultados[0].status === 'fulfilled') {
        const d = resultados[0].value;
        setMensalidades(Array.isArray(d) ? d : []);
      } else {
        setMensalidades([]);
      }
      if (resultados[1].status === 'fulfilled') {
        const d = resultados[1].value;
        setDespesas(Array.isArray(d) ? d : []);
      } else {
        setDespesas([]);
      }
      if (resultados[2].status === 'fulfilled') {
        const d = resultados[2].value;
        setSalarios(Array.isArray(d) ? d : []);
      } else {
        setSalarios([]);
      }
      if (resultados[3].status === 'fulfilled') {
        const d = resultados[3].value;
        setAlunos(Array.isArray(d) ? d : []);
      } else {
        setAlunos([]);
      }
      if (resultados[4].status === 'fulfilled') {
        const d = resultados[4].value;
        setTurmas(Array.isArray(d) ? d : []);
      } else {
        setTurmas([]);
      }

      if (erros.length) {
        setErro((prev) => (prev ? `${prev} ${erros.join(' ')}` : erros.join(' ')));
      }
      if (!cancelled) setCarregandoListas(false);
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line
  }, [mes, ano]);

  useEffect(() => {
    if (skipMensalidadesFilterEffect.current) {
      skipMensalidadesFilterEffect.current = false;
      return;
    }
    fetchMensalidades();
    // eslint-disable-next-line
  }, [turmaFiltro, mensalidadeStatus]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('financeiro/dashboard/', { params: { mes, ano } });
      setDashboard(data);
    } catch (err) {
      setErro(mensagemErroCarregamento(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchMensalidades = async () => {
    try {
      let url = `financeiro/mensalidades/?mes=${mes}&ano=${ano}&page_size=500`;
      if (turmaFiltro) url += `&turma=${turmaFiltro}`;
      const data = await fetchAllPages(url);
      setMensalidades(Array.isArray(data) ? data : []);
    } catch (err) {
      setErro(mensagemErroCarregamento(err));
    }
  };

  const fetchDespesas = async () => {
    try {
      const data = await fetchAllPages(`financeiro/despesas/?mes=${mes}&ano=${ano}&page_size=500`);
      setDespesas(Array.isArray(data) ? data : []);
    } catch (err) {
      setErro(mensagemErroCarregamento(err));
    }
  };

  const fetchSalarios = async () => {
    try {
      const data = await fetchAllPages(`financeiro/salarios/?mes=${mes}&ano=${ano}&page_size=500`);
      setSalarios(Array.isArray(data) ? data : []);
    } catch (err) {
      setErro(mensagemErroCarregamento(err));
    }
  };

  const fetchAlunos = async () => {
    try {
      const data = await fetchAllPages('usuarios/?tipo=aluno');
      setAlunos(Array.isArray(data) ? data : []);
    } catch (err) {
      setErro(mensagemErroCarregamento(err));
    }
  };

  /** Nome completo para exibição e ordenação (API pode vir com aluno nested ou só id). */
  const nomeAlunoMensalidade = (m) => {
    if (typeof m.aluno === 'object' && m.aluno) {
      return `${m.aluno.first_name || ''} ${m.aluno.last_name || ''}`.trim();
    }
    const aluno = alunos.find(a => a.id === m.aluno || String(a.id) === String(m.aluno));
    return aluno
      ? `${aluno.first_name || ''} ${aluno.last_name || ''}`.trim()
      : '';
  };

  // Status já filtrado na API quando há seleção; mantém filtro local como redundância
  const mensalidadesFiltradas = mensalidades
    .filter(m => !mensalidadeStatus || m.status === mensalidadeStatus)
    .sort((a, b) =>
      nomeAlunoMensalidade(a).localeCompare(nomeAlunoMensalidade(b), 'pt-BR', { sensitivity: 'base' })
    );

  // Paginação
  const totalPaginas = Math.ceil(mensalidadesFiltradas.length / itensPorPagina);
  const mensalidadesPaginadas = mensalidadesFiltradas.slice(
    (pagina - 1) * itensPorPagina,
    pagina * itensPorPagina
  );

  const statusColors = {
    pago: '#2e7d32',
    pendente: '#f9a825',
    atrasado: '#c62828',
    default: '#888'
  };

  function formatStatus(status) {
    const color = statusColors[status] || statusColors.default;
    return <span style={{ color, fontWeight: 600, textTransform: 'capitalize' }}>{status}</span>;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return formatApiDateDisplay(dateStr);
  }

  /** Data e hora do pagamento (mensalidade com data_pagamento ISO). */
  function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatCurrency(value) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Função para abrir modal de nova despesa
  const CATEGORIAS_DESPESAS = [
    { value: 'salario', label: 'Salário de Funcionário' },
    { value: 'aluguel', label: 'Aluguel' },
    { value: 'materiais', label: 'Compra de Materiais' },
    { value: 'outros', label: 'Outros' },
  ];

  function handleNovaDespesa() {
    setEditDespesa(null);
    setDespesaForm({ categoria: 'outros', descricao: '', valor: '', data: '' });
    setShowDespesaModal(true);
  }

  // Função para abrir modal de edição
  function handleEditarDespesa(despesa) {
    setEditDespesa(despesa);
    setDespesaForm({
      categoria: despesa.categoria || 'outros',
      descricao: despesa.descricao,
      valor: despesa.valor,
      data: apiDateToInputDate(despesa.data || '') || '',
    });
    setShowDespesaModal(true);
  }

  // Função para salvar (criar/editar)
  async function handleSalvarDespesa(e) {
    e.preventDefault();
    try {
      const payload = {
        ...despesaForm,
        data: despesaForm.data ? inputDateToApiDate(despesaForm.data) || despesaForm.data : despesaForm.data,
      };
      if (editDespesa) {
        await api.put(`financeiro/despesas/${editDespesa.id}/`, payload);
      } else {
        await api.post('financeiro/despesas/', payload);
      }
      setShowDespesaModal(false);
      fetchDespesas();
      // Atualiza o dashboard se a função foi fornecida
      if (onDataChange) {
        onDataChange();
      }
    } catch {
      alert('Erro ao salvar despesa.');
    }
  }

  // Função para excluir
  async function handleExcluirDespesa(id) {
    if (window.confirm('Deseja excluir esta despesa?')) {
      try {
        await api.delete(`financeiro/despesas/${id}/`);
        fetchDespesas();
        // Atualiza o dashboard se a função foi fornecida
        if (onDataChange) {
          onDataChange();
        }
      } catch {
        alert('Erro ao excluir despesa.');
      }
    }
  };

  // Função para dar baixa em mensalidade (pagamento em dinheiro, transferência, etc.)
  const handleDarBaixaMensalidade = async (mensalidadeId) => {
    if (window.confirm('Dar baixa nesta mensalidade? O pagamento foi recebido em dinheiro ou outra forma?')) {
      try {
        await api.post(`financeiro/mensalidades/${mensalidadeId}/dar-baixa/`);
        fetchMensalidades();
        fetchDashboard();
        if (onDataChange) onDataChange();
      } catch (err) {
        alert(err.response?.data?.error || 'Erro ao dar baixa na mensalidade.');
      }
    }
  };

  // Função para marcar salário como pago
  const handlePagarSalario = async (salarioId) => {
    if (window.confirm('Deseja marcar este salário como pago?')) {
      try {
        await api.patch(`financeiro/salarios/${salarioId}/`, { status: 'pago' });
        fetchSalarios();
        fetchDashboard();
        // Atualiza o dashboard se a função foi fornecida
        if (onDataChange) {
          onDataChange();
        }
      } catch {
        alert('Erro ao marcar salário como pago.');
      }
    }
  };

  const getNomeAluno = (alunoId) => {
    const aluno = alunos.find(a => a.id === alunoId);
    return aluno ? `${aluno.first_name} ${aluno.last_name}` : alunoId;
  };

  if (loading) return <div>Carregando...</div>;
  if (erro) return <div style={{ color: 'red' }}>{erro}</div>;

  return (
    <div className="controle-financeiro-container" style={{...styles?.card, background: '#fff', padding: 24, borderRadius: 8, width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden'}}>
      <h2 style={styles?.cardTitle || { color: '#1F6C86' }}>Painel Financeiro</h2>
      {carregandoListas && (
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#607d8b' }} role="status">
          Carregando tabelas, filtros e vínculos…
        </p>
      )}
      <div className="controle-financeiro-filtros" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Mês:
          <select value={mes} onChange={e => setMes(Number(e.target.value))} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc', minHeight: '44px', fontSize: '16px' }}>
            {(dashboard?.meses || [1,2,3,4,5,6,7,8,9,10,11,12]).map(m => (
              <option key={m} value={m}>{['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m-1]} ({m})</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Ano:
          <input type="number" value={ano} onChange={e => setAno(Number(e.target.value))} style={{ width: 100, padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc', minHeight: '44px', fontSize: '16px' }} />
        </label>
      </div>
      <div className="controle-financeiro-stats" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: 24 }}>
        <div>
          <strong>Total Recebido:</strong>
          <div style={{ color: '#2e7d32', fontSize: 20 }}>R$ {(Number(dashboard?.total_pago) || 0).toFixed(2)}</div>
        </div>
        <div>
          <strong>Total Despesas:</strong>
          <div style={{ color: '#c62828', fontSize: 20 }}>R$ {(Number(dashboard?.total_despesas) || 0).toFixed(2)}</div>
        </div>
        <div>
          <strong>Total Salários:</strong>
          <div style={{ color: '#1976d2', fontSize: 20 }}>
            R$ {(Number(dashboard?.total_salarios) || 0).toFixed(2)}
            <span style={{ color: '#2e7d32', fontSize: 14, marginLeft: 8 }}>
              (Pagos: R$ {(Number(dashboard?.total_salarios_pagos) || 0).toFixed(2)})
            </span>
          </div>
        </div>
        <div>
          <strong>Saldo Final:</strong>
          <div style={{ color: (Number(dashboard?.saldo_final) || 0) >= 0 ? '#2e7d32' : '#c62828', fontSize: 20 }}>
            R$ {(Number(dashboard?.saldo_final) || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {user?.tipo === 'gerente' && (
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            background: '#e3f2fd',
            borderRadius: 8,
            border: '1px solid #90caf9',
            maxWidth: 480,
          }}
        >
          <h3 style={{ color: '#1F6C86', marginTop: 0, marginBottom: 8, fontSize: '1.1rem' }}>
            Aumento de mensalidade (todos os alunos ativos)
          </h3>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#455a64', lineHeight: 1.45 }}>
            O valor será <strong>somado</strong> ao valor de mensalidade no cadastro de cada aluno ativo que já tem valor
            (ex.: R$ 150,00 + R$ 10,00 = R$ 160,00). <strong>Só mensalidades com vencimento futuro</strong> passam a esse
            novo valor; <strong>parcelas já vencidas</strong> permanecem como estão. Alunos sem valor no cadastro não entram.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, color: '#37474f' }}>Incremento (R$)</span>
              <input
                type="text"
                inputMode="decimal"
                value={aumentoIncremento}
                onChange={e => setAumentoIncremento(e.target.value)}
                placeholder="ex: 10 ou 10,50"
                disabled={aumentoAplicando}
                style={{
                  width: 140,
                  padding: '0.6rem',
                  borderRadius: 4,
                  border: '1px solid #ccc',
                  fontSize: 16,
                }}
              />
            </label>
            <button
              type="button"
              disabled={aumentoAplicando}
              onClick={async () => {
                const t = String(aumentoIncremento).trim().replace(',', '.');
                const v = parseFloat(t);
                if (!Number.isFinite(v) || v <= 0) {
                  window.alert('Informe um valor maior que zero.');
                  return;
                }
                const msg = `Somar R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ao valor de mensalidade de todos os alunos ativos que já têm valor cadastrado?\n\nEsta alteração é permanente.`;
                if (!window.confirm(msg)) return;
                try {
                  setAumentoAplicando(true);
                  await api.post('financeiro/aumento-mensalidade-global/', { incremento: t });
                  setAumentoIncremento('');
                  await fetchMensalidades();
                  await fetchDashboard();
                  await fetchAlunos();
                  if (onDataChange) onDataChange();
                  window.alert('Aumento aplicado com sucesso.');
                } catch (e) {
                  window.alert(e.response?.data?.error || 'Erro ao aplicar aumento.');
                } finally {
                  setAumentoAplicando(false);
                }
              }}
              style={{
                background: '#1F6C86',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '0.6rem 1rem',
                fontSize: 15,
                cursor: aumentoAplicando ? 'not-allowed' : 'pointer',
                minHeight: 44,
              }}
            >
              {aumentoAplicando ? 'Aplicando…' : 'Aplicar aumento'}
            </button>
          </div>
        </div>
      )}

      <h3 style={{ color: '#1F6C86', marginTop: 32 }}>Mensalidades</h3>
      <div className="controle-financeiro-busca" style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <select
          value={turmaFiltro}
          onChange={e => { setTurmaFiltro(e.target.value); setPagina(1); }}
          style={{ padding: '0.75rem', borderRadius: 4, border: '1px solid #ccc', minHeight: '44px', fontSize: '16px', flex: '1 1 auto', minWidth: 200 }}
        >
          <option value="">Todas as turmas</option>
          {turmas.filter(t => t.ativo !== false).map(t => {
            const dias = (t.dias_semana_nomes || []).join(', ');
            const horario = t.horario ? String(t.horario).slice(0, 5) : '';
            const label = t.ct_nome ? `${t.ct_nome}${dias ? ` (${dias})` : ''}${horario ? ` - ${horario}` : ''}` : `Turma ${t.id}`;
            return (
              <option key={t.id} value={t.id}>
                {label}
              </option>
            );
          })}
        </select>
        <select
          value={mensalidadeStatus}
          onChange={e => { setMensalidadeStatus(e.target.value); setPagina(1); }}
          style={{ padding: '0.75rem', borderRadius: 4, border: '1px solid #ccc', minHeight: '44px', fontSize: '16px', flex: '1 1 auto' }}
        >
          <option value="">Todos os status</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente (não vencida)</option>
          <option value="atrasado">Atrasada (vencida e não paga)</option>
        </select>
      </div>
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead>
            <tr style={{ background: '#e3eafc' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>Aluno</th>
              <th style={{ padding: 10, textAlign: 'right' }}>Valor</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Vencimento</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Status</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Pago em</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Forma de pagamento</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {mensalidadesPaginadas.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: '#888', textAlign: 'center', padding: 16 }}>Nenhuma mensalidade encontrada.</td>
              </tr>
            )}
            {mensalidadesPaginadas.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>
                  {nomeAlunoMensalidade(m) || (typeof m.aluno !== 'object' ? getNomeAluno(m.aluno) : '')}
                </td>
                <td style={{ padding: 10, textAlign: 'right' }}>{formatCurrency(m.valor_efetivo ?? m.valor)}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>{formatDate(m.data_vencimento)}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>{formatStatus(m.status)}</td>
                <td style={{ padding: 10, textAlign: 'center', fontSize: 13 }}>
                  {m.status === 'pago' && m.data_pagamento ? formatDateTime(m.data_pagamento) : '—'}
                </td>
                <td style={{ padding: 10, fontSize: 13 }}>
                  {m.status === 'pago' && m.forma_pagamento_label ? m.forma_pagamento_label : '—'}
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  {(m.status === 'pendente' || m.status === 'atrasado') && (
                    <button
                      onClick={() => handleDarBaixaMensalidade(m.id)}
                      style={{
                        background: '#2e7d32',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 10px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                      title="Registrar pagamento em dinheiro ou outra forma"
                    >
                      Dar baixa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Paginação */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
            style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid #ccc', background: pagina === 1 ? '#eee' : '#fff' }}
          >Anterior</button>
          <span style={{ alignSelf: 'center' }}>Página {pagina} de {totalPaginas}</span>
          <button
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid #ccc', background: pagina === totalPaginas ? '#eee' : '#fff' }}
          >Próxima</button>
        </div>
      )}

      <h3 style={{ color: '#1F6C86', marginTop: 32 }}>Despesas</h3>
      <button
        style={{ marginBottom: 12, background: '#1F6C86', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}
        onClick={handleNovaDespesa}
      >
        Nova Despesa
      </button>
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead>
            <tr style={{ background: '#ffe0b2' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>Categoria</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Descrição</th>
              <th style={{ padding: 10, textAlign: 'right' }}>Valor</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Data</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {despesas.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: '#888', textAlign: 'center', padding: 16 }}>Nenhuma despesa encontrada.</td>
              </tr>
            )}
            {despesas.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>{(CATEGORIAS_DESPESAS.find(c => c.value === d.categoria) || { label: d.categoria }).label}</td>
                <td style={{ padding: 10 }}>{d.descricao}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{formatCurrency(d.valor)}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>{formatDate(d.data)}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <button onClick={() => handleEditarDespesa(d)} style={{ marginRight: 8 }}>Editar</button>
                  <button onClick={() => handleExcluirDespesa(d.id)} style={{ color: '#c62828' }}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ color: '#1F6C86', marginTop: 32 }}>Salários</h3>
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead>
            <tr style={{ background: '#c8e6c9' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>Professor</th>
              <th style={{ padding: 10, textAlign: 'right' }}>Valor</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Competência</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Pago em</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {salarios.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: '#888', textAlign: 'center', padding: 16 }}>
                  Nenhum salário encontrado para este mês.
                  <br />
                  <small style={{ fontSize: '12px' }}>
                    Ao abrir o mês no financeiro, o sistema gera parcelas pendentes para professores ativos com
                    salário cadastrado.
                  </small>
                </td>
              </tr>
            )}
            {salarios.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>{typeof s.professor === 'object' ? s.professor.first_name + ' ' + s.professor.last_name : s.professor}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{formatCurrency(s.valor)}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  {s.competencia ? formatDate(s.competencia) : '—'}
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  {s.status === 'pago' && s.data_pagamento ? formatDate(s.data_pagamento) : '—'}
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  {formatStatus(s.status)}
                  {s.status === 'pendente' && (
                    <button
                      onClick={() => handlePagarSalario(s.id)}
                      style={{
                        marginLeft: 8,
                        background: '#2e7d32',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Marcar como Pago
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal para criar/editar despesa */}
      {showDespesaModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <form onSubmit={handleSalvarDespesa} style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320 }}>
            <h4>{editDespesa ? 'Editar' : 'Nova'} Despesa</h4>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Categoria</label>
              <select
                value={despesaForm.categoria}
                onChange={e => setDespesaForm(f => ({ ...f, categoria: e.target.value }))}
                required
                style={{ width: '100%', padding: 8, marginBottom: 8 }}
              >
                {CATEGORIAS_DESPESAS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Descrição"
                value={despesaForm.descricao}
                onChange={e => setDespesaForm(f => ({ ...f, descricao: e.target.value }))}
                required
                style={{ width: '100%', padding: 8, marginBottom: 8 }}
              />
              <input
                type="number"
                placeholder="Valor"
                value={despesaForm.valor}
                onChange={e => setDespesaForm(f => ({ ...f, valor: e.target.value }))}
                required
                style={{ width: '100%', padding: 8, marginBottom: 8 }}
              />
              <input
                type="date"
                value={despesaForm.data}
                onChange={e => setDespesaForm(f => ({ ...f, data: e.target.value }))}
                required
                style={{ width: '100%', padding: 8 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={{ background: '#1F6C86', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px' }}>
                Salvar
              </button>
              <button type="button" onClick={() => setShowDespesaModal(false)} style={{ border: 'none', background: '#eee', borderRadius: 4, padding: '8px 16px' }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {editingUser && formData.tipo === 'aluno' && (
        <div>
          <label>Aluno</label>
          <input
            type="text"
            value={`${editingUser.first_name} ${editingUser.last_name}`.trim()}
            disabled
            readOnly
          />
        </div>
      )}
    </div>
  );
}

export default ControleFinanceiro;