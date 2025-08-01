import React, { useEffect, useState } from 'react';
import api from '../services/api';

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
  const [mensalidadeBusca, setMensalidadeBusca] = useState('');
  const [mensalidadeStatus, setMensalidadeStatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const [showDespesaModal, setShowDespesaModal] = useState(false);
  const [editDespesa, setEditDespesa] = useState(null);
  const [despesaForm, setDespesaForm] = useState({ descricao: '', valor: '', data: '' });
  const [editingUser] = useState(null);
  const [formData] = useState({});
  const [alunos, setAlunos] = useState([]);
  const itensPorPagina = 10;

  useEffect(() => {
    fetchDashboard();
    fetchMensalidades();
    fetchDespesas();
    fetchSalarios();
    fetchAlunos();
    // eslint-disable-next-line
  }, [mes, ano]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('financeiro/dashboard/', { params: { mes, ano } });
      setDashboard(data);
      setLoading(false);
    } catch {
      setErro('Erro ao carregar painel financeiro.');
      setLoading(false);
    }
  };

  const fetchMensalidades = async () => {
    try {
      const { data } = await api.get('financeiro/mensalidades/', { params: { mes, ano } });
      setMensalidades(Array.isArray(data) ? data : data.results || data.mensalidades || []);
    } catch {
      setErro('Erro ao carregar mensalidades.');
    }
  };

  const fetchDespesas = async () => {
    try {
      const { data } = await api.get('financeiro/despesas/', { params: { mes, ano } });
      setDespesas(Array.isArray(data) ? data : data.results || data.despesas || []);
    } catch {
      setErro('Erro ao carregar despesas.');
    }
  };

  const fetchSalarios = async () => {
    try {
      const { data } = await api.get('financeiro/salarios/', { params: { mes, ano } });
      setSalarios(Array.isArray(data) ? data : data.results || data.salarios || []);
    } catch {
      setErro('Erro ao carregar salários.');
    }
  };

  const fetchAlunos = async () => {
    try {
      const { data } = await api.get('usuarios/?tipo=aluno');
      setAlunos(Array.isArray(data) ? data : data.results || []);
    } catch {
      setErro('Erro ao carregar alunos.');
    }
  };

  // Filtro e busca
  const mensalidadesFiltradas = mensalidades
    .filter(m => {
      const nome = typeof m.aluno === 'object'
        ? `${m.aluno.first_name} ${m.aluno.last_name}`.toLowerCase()
        : String(m.aluno).toLowerCase();
      return nome.includes(mensalidadeBusca.toLowerCase());
    })
    .filter(m => !mensalidadeStatus || m.status === mensalidadeStatus);

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
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  }

  function formatCurrency(value) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Função para abrir modal de nova despesa
  function handleNovaDespesa() {
    setEditDespesa(null);
    setDespesaForm({ descricao: '', valor: '', data: '' });
    setShowDespesaModal(true);
  }

  // Função para abrir modal de edição
  function handleEditarDespesa(despesa) {
    setEditDespesa(despesa);
    setDespesaForm({ descricao: despesa.descricao, valor: despesa.valor, data: despesa.data });
    setShowDespesaModal(true);
  }

  // Função para salvar (criar/editar)
  async function handleSalvarDespesa(e) {
    e.preventDefault();
    try {
      if (editDespesa) {
        await api.put(`financeiro/despesas/${editDespesa.id}/`, despesaForm);
      } else {
        await api.post('financeiro/despesas/', despesaForm);
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
    <div style={styles?.card || { background: '#fff', padding: 24, borderRadius: 8 }}>
      <h2 style={styles?.cardTitle || { color: '#1a237e' }}>Painel Financeiro</h2>
      <div style={{ marginBottom: 16 }}>
        <label>
          Mês:
          <select value={mes} onChange={e => setMes(Number(e.target.value))} style={{ marginLeft: 8, marginRight: 16 }}>
            {dashboard?.meses?.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Ano:
          <input type="number" value={ano} onChange={e => setAno(Number(e.target.value))} style={{ width: 80, marginLeft: 8 }} />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
        <div>
          <strong>Total Recebido:</strong>
          <div style={{ color: '#2e7d32', fontSize: 20 }}>R$ {dashboard?.total_pago?.toFixed(2)}</div>
        </div>
        <div>
          <strong>Total Despesas:</strong>
          <div style={{ color: '#c62828', fontSize: 20 }}>R$ {dashboard?.total_despesas?.toFixed(2)}</div>
        </div>
        <div>
          <strong>Total Salários:</strong>
          <div style={{ color: '#1976d2', fontSize: 20 }}>
            R$ {dashboard?.total_salarios?.toFixed(2)}
            <span style={{ color: '#2e7d32', fontSize: 14, marginLeft: 8 }}>
              (Pagos: R$ {dashboard?.total_salarios_pagos?.toFixed(2)})
            </span>
          </div>
        </div>
        <div>
          <strong>Saldo Final:</strong>
          <div style={{ color: dashboard?.saldo_final >= 0 ? '#2e7d32' : '#c62828', fontSize: 20 }}>
            R$ {dashboard?.saldo_final?.toFixed(2)}
          </div>
        </div>
      </div>

      <h3 style={{ color: '#1a237e', marginTop: 32 }}>Mensalidades</h3>
      <div style={{ marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar aluno..."
          value={mensalidadeBusca}
          onChange={e => { setMensalidadeBusca(e.target.value); setPagina(1); }}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', minWidth: 180 }}
        />
        <select
          value={mensalidadeStatus}
          onChange={e => { setMensalidadeStatus(e.target.value); setPagina(1); }}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        >
          <option value="">Todos os status</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
          <option value="atrasado">Atrasado</option>
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
            </tr>
          </thead>
          <tbody>
            {mensalidadesPaginadas.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: '#888', textAlign: 'center', padding: 16 }}>Nenhuma mensalidade encontrada.</td>
              </tr>
            )}
            {mensalidadesPaginadas.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>
                  {typeof m.aluno === 'object'
                    ? `${m.aluno.first_name} ${m.aluno.last_name}`.trim()
                    : getNomeAluno(m.aluno)}
                </td>
                <td style={{ padding: 10, textAlign: 'right' }}>{formatCurrency(m.valor)}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>{formatDate(m.data_vencimento)}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>{formatStatus(m.status)}</td>
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

      <h3 style={{ color: '#1a237e', marginTop: 32 }}>Despesas</h3>
      <button
        style={{ marginBottom: 12, background: '#1a237e', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}
        onClick={handleNovaDespesa}
      >
        Nova Despesa
      </button>
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead>
            <tr style={{ background: '#ffe0b2' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>Descrição</th>
              <th style={{ padding: 10, textAlign: 'right' }}>Valor</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Data</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {despesas.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: '#888', textAlign: 'center', padding: 16 }}>Nenhuma despesa encontrada.</td>
              </tr>
            )}
            {despesas.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
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

      <h3 style={{ color: '#1a237e', marginTop: 32 }}>Salários</h3>
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead>
            <tr style={{ background: '#c8e6c9' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>Professor</th>
              <th style={{ padding: 10, textAlign: 'right' }}>Valor</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Data Pagamento</th>
              <th style={{ padding: 10, textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {salarios.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: '#888', textAlign: 'center', padding: 16 }}>
                  Nenhum salário encontrado para este mês.
                  <br />
                  <small style={{ fontSize: '12px' }}>
                    Salários são criados automaticamente quando professores são cadastrados com salário definido.
                  </small>
                </td>
              </tr>
            )}
            {salarios.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>{typeof s.professor === 'object' ? s.professor.first_name + ' ' + s.professor.last_name : s.professor}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{formatCurrency(s.valor)}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>{formatDate(s.data_pagamento)}</td>
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
              <button type="submit" style={{ background: '#1a237e', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px' }}>
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