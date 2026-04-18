import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { downloadPdfRelatorioAlunos, downloadPdfRelatorioFinanceiro } from '../utils/relatoriosPdf';
import { formatApiDateTimeDisplay, parseApiDateToParts } from '../utils/dateApi';

function todayApiDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}-${m}-${y}`;
}

function firstDayOfMonthApiDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `01-${m}-${y}`;
}

function formatDateBR(iso) {
  if (!iso) return '';
  const p = parseApiDateToParts(iso);
  if (!p) return String(iso);
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString('pt-BR');
}

function turmaOptionLabel(t) {
  const dias = (t.dias_semana_nomes || []).join(', ');
  const horario = t.horario ? String(t.horario).slice(0, 5) : '';
  const base = t.ct_nome ? `${t.ct_nome}${dias ? ` (${dias})` : ''}${horario ? ` - ${horario}` : ''}` : `Turma ${t.id}`;
  return base;
}

/**
 * Relatórios PDF (antes no Controle Financeiro) + presenças e observações de aula (gerente).
 */
function RelatoriosGerente({ user }) {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [dashboardMeses, setDashboardMeses] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const [relatorioGerando, setRelatorioGerando] = useState(false);

  const [turmas, setTurmas] = useState([]);
  /** @type {Record<number, { id: number, nome: string }[]>} */
  const [atrasadosPorTurma, setAtrasadosPorTurma] = useState({});
  const [loadingAtrasos, setLoadingAtrasos] = useState(false);

  const [filtroPresencaInicio, setFiltroPresencaInicio] = useState(() => firstDayOfMonthApiDate());
  const [filtroPresencaFim, setFiltroPresencaFim] = useState(() => todayApiDate());
  const [filtroPresencaTurmaId, setFiltroPresencaTurmaId] = useState('');
  const [filtroPresencaBusca, setFiltroPresencaBusca] = useState('');
  const [filtroObservacaoData, setFiltroObservacaoData] = useState(() => todayApiDate());
  const [presencaRelatorio, setPresencaRelatorio] = useState(null);
  const [loadingPresencaRelatorio, setLoadingPresencaRelatorio] = useState(false);
  const [erroPresenca, setErroPresenca] = useState('');
  const [observacaoGerente, setObservacaoGerente] = useState(null);
  const [loadingObservacao, setLoadingObservacao] = useState(false);

  const fetchAllPages = async (initialUrl) => {
    let resultados = [];
    let nextUrl = initialUrl;
    while (nextUrl) {
      const response = await api.get(nextUrl);
      const data = response.data;
      if (data && data.results) {
        resultados = resultados.concat(data.results);
        nextUrl = data.next || null;
      } else {
        resultados = Array.isArray(data) ? data : [];
        nextUrl = null;
      }
    }
    return resultados;
  };

  const rowAlunoCompleto = (a) => ({
    id: a.id,
    nome_completo: a.nome_completo,
    email: a.email,
    cpf: a.cpf,
    telefone: a.telefone,
    endereco: a.endereco,
    data_nascimento: a.data_nascimento,
    dia_vencimento: a.dia_vencimento,
    valor_mensalidade: a.valor_mensalidade,
    dias_habilitados_nomes: Array.isArray(a.dias_habilitados_nomes) ? a.dias_habilitados_nomes.join(', ') : '',
    nome_responsavel: a.nome_responsavel,
    telefone_responsavel: a.telefone_responsavel,
    telefone_emergencia: a.telefone_emergencia,
  });

  const handleGerarRelatorioAlunos = async () => {
    if (user?.tipo !== 'gerente') return;
    setRelatorioGerando(true);
    try {
      const lista = await fetchAllPages('usuarios/?tipo=aluno&page_size=500');
      if (!Array.isArray(lista) || lista.length === 0) {
        window.alert('Nenhum aluno encontrado.');
        return;
      }
      const rows = lista.map((a) => ({
        ...rowAlunoCompleto(a),
        _turmasRaw: Array.isArray(a.turmas_vinculadas) ? a.turmas_vinculadas : [],
      }));
      downloadPdfRelatorioAlunos(rows);
    } catch (e) {
      window.alert(e.response?.data?.error || 'Erro ao gerar relatório de alunos.');
    } finally {
      setRelatorioGerando(false);
    }
  };

  const handleGerarRelatorioFinanceiro = async () => {
    if (user?.tipo !== 'gerente') return;
    setRelatorioGerando(true);
    try {
      const [{ data: dash }, mensList, despList, salList, profs] = await Promise.all([
        api.get('financeiro/dashboard/', { params: { mes, ano } }),
        fetchAllPages(`financeiro/mensalidades/?mes=${mes}&ano=${ano}&page_size=500`),
        fetchAllPages(`financeiro/despesas/?mes=${mes}&ano=${ano}&page_size=500`),
        fetchAllPages(`financeiro/salarios/?mes=${mes}&ano=${ano}&page_size=500`),
        fetchAllPages('usuarios/?tipo=professor&page_size=500'),
      ]);
      const nomeProfessorPorId = new Map(
        (Array.isArray(profs) ? profs : []).map((p) => [
          p.id,
          `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        ])
      );
      downloadPdfRelatorioFinanceiro({
        dash,
        mes,
        ano,
        mensList,
        despList,
        salList,
        nomeProfessorPorId,
      });
    } catch (e) {
      window.alert(e.response?.data?.error || 'Erro ao gerar relatório financeiro.');
    } finally {
      setRelatorioGerando(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('financeiro/dashboard/', { params: { mes, ano } });
        if (!cancelled && Array.isArray(data?.meses) && data.meses.length) {
          setDashboardMeses(data.meses);
        }
      } catch {
        /* mantém default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mes, ano]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAllPages('turmas/?page_size=500');
        if (!cancelled) setTurmas(Array.isArray(list) ? list.filter((t) => t.ativo !== false) : []);
      } catch {
        if (!cancelled) setTurmas([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!turmas.length) {
      setAtrasadosPorTurma({});
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingAtrasos(true);
      try {
        const entries = await Promise.all(
          turmas.map(async (t) => {
            const list = await fetchAllPages(
              `financeiro/mensalidades/?status=atrasado&turma=${t.id}&page_size=500`
            );
            const byId = new Map();
            for (const m of list) {
              const aid = typeof m.aluno === 'object' && m.aluno ? m.aluno.id : m.aluno;
              const nome =
                m.aluno_nome ||
                (typeof m.aluno === 'object' && m.aluno
                  ? `${m.aluno.first_name || ''} ${m.aluno.last_name || ''}`.trim()
                  : '');
              if (aid != null && nome) byId.set(aid, nome);
            }
            return [t.id, Array.from(byId.entries()).map(([id, nome]) => ({ id, nome }))];
          })
        );
        if (cancelled) return;
        const o = {};
        for (const [tid, arr] of entries) {
          o[tid] = arr;
        }
        setAtrasadosPorTurma(o);
      } catch {
        if (!cancelled) setAtrasadosPorTurma({});
      } finally {
        if (!cancelled) setLoadingAtrasos(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [turmas]);

  const turmaSelecionada = useMemo(() => {
    const id = filtroPresencaTurmaId ? Number(filtroPresencaTurmaId) : null;
    if (id == null || Number.isNaN(id)) return null;
    return turmas.find((t) => t.id === id) || null;
  }, [filtroPresencaTurmaId, turmas]);

  /** Nomes com mensalidade atrasada só se, no relatório gerado, tiverem presença confirmada pelo professor */
  const turmaIdParaNomesAtrasoComPresencaConfirmada = useMemo(() => {
    const map = new Map();
    if (!presencaRelatorio?.presencas) return map;
    for (const p of presencaRelatorio.presencas) {
      if (!p.presenca_confirmada) continue;
      const arr = atrasadosPorTurma[p.turma_id];
      if (!arr?.length) continue;
      const aluno = arr.find((x) => x.id === p.aluno_id);
      if (!aluno) continue;
      const list = map.get(p.turma_id) || [];
      if (!list.some((n) => n === aluno.nome)) list.push(aluno.nome);
      map.set(p.turma_id, list);
    }
    return map;
  }, [presencaRelatorio, atrasadosPorTurma]);

  const atrasadosNaTurmaSelecionadaComPresencaConfirmadaNoRelatorio = useMemo(() => {
    if (!turmaSelecionada || !presencaRelatorio?.presencas) return [];
    const tid = turmaSelecionada.id;
    const confirmados = new Set(
      presencaRelatorio.presencas
        .filter((p) => p.turma_id === tid && p.presenca_confirmada)
        .map((p) => p.aluno_id)
    );
    return (atrasadosPorTurma[tid] || []).filter((a) => confirmados.has(a.id));
  }, [turmaSelecionada, presencaRelatorio, atrasadosPorTurma]);

  useEffect(() => {
    if (!turmaSelecionada || user?.tipo !== 'gerente') {
      setObservacaoGerente(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingObservacao(true);
      try {
        const { data } = await api.get(`funcionarios/observacao-aula/${turmaSelecionada.id}/`, {
          params: { data: filtroObservacaoData },
        });
        if (!cancelled) setObservacaoGerente(data);
      } catch {
        if (!cancelled) setObservacaoGerente(null);
      } finally {
        if (!cancelled) setLoadingObservacao(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [turmaSelecionada, filtroObservacaoData, user?.tipo]);

  const handleGerarRelatorioPresenca = async () => {
    if (user?.tipo !== 'gerente') return;
    setErroPresenca('');
    setLoadingPresencaRelatorio(true);
    setPresencaRelatorio(null);
    try {
      const params = {};
      if (filtroPresencaInicio.trim()) params.data_inicio = filtroPresencaInicio.trim();
      if (filtroPresencaFim.trim()) params.data_fim = filtroPresencaFim.trim();
      if (filtroPresencaTurmaId) params.turma_id = filtroPresencaTurmaId;
      const { data } = await api.get('funcionarios/relatorio-presenca/', { params });
      setPresencaRelatorio(data);
    } catch (e) {
      setErroPresenca(e.response?.data?.error || 'Erro ao gerar relatório de presenças.');
    } finally {
      setLoadingPresencaRelatorio(false);
    }
  };

  const presencasFiltradas = useMemo(() => {
    const list = presencaRelatorio?.presencas;
    if (!Array.isArray(list)) return [];
    const q = filtroPresencaBusca.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => (p.aluno_nome || '').toLowerCase().includes(q));
  }, [presencaRelatorio, filtroPresencaBusca]);

  /** Cabeçalhos por dia de aula: evita parecer “duplicata” quando o período tem várias datas */
  const presencasAgrupadasPorData = useMemo(() => {
    const list = presencasFiltradas;
    if (!list.length) return [];
    const rows = [];
    let ultimaData = null;
    for (const row of list) {
      const d = row.data || '';
      if (d !== ultimaData) {
        ultimaData = d;
        rows.push({ kind: 'data', data: d });
      }
      rows.push({ kind: 'presenca', row });
    }
    return rows;
  }, [presencasFiltradas]);

  const alunoTemMensalidadeAtrasadaNaTurma = (row) => {
    const tid = row.turma_id;
    const aid = row.aluno_id;
    const arr = atrasadosPorTurma[tid];
    if (!arr || !arr.length) return false;
    return arr.some((x) => x.id === aid);
  };

  /** Aviso de atraso só quando o professor confirmou presença neste registro */
  const mostrarAvisoAtrasoNoRegistro = (row) =>
    Boolean(row.presenca_confirmada) && alunoTemMensalidadeAtrasadaNaTurma(row);

  if (user?.tipo !== 'gerente') {
    return <p style={{ color: '#c62828' }}>Acesso restrito a gerentes.</p>;
  }

  return (
    <div
      style={{
        background: '#fff',
        padding: 24,
        borderRadius: 8,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#1F6C86', marginTop: 0, marginBottom: 8, fontSize: '1.15rem' }}>
          Exportar PDF
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#455a64', lineHeight: 1.45 }}>
          O PDF de alunos agrupa por Centro de Treinamento e turma. O PDF financeiro usa o{' '}
          <strong>mês e ano</strong> selecionados abaixo.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Mês:
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc', minHeight: 44, fontSize: 16 }}
            >
              {(dashboardMeses || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).map((m) => (
                <option key={m} value={m}>
                  {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][m - 1]}{' '}
                  ({m})
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
              style={{ width: 100, padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc', minHeight: 44, fontSize: 16 }}
            />
          </label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            disabled={relatorioGerando}
            onClick={handleGerarRelatorioAlunos}
            style={{
              background: '#37474f',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '0.65rem 1rem',
              fontSize: 15,
              cursor: relatorioGerando ? 'not-allowed' : 'pointer',
              minHeight: 44,
            }}
          >
            {relatorioGerando ? 'Gerando…' : 'Relatório de alunos (completo)'}
          </button>
          <button
            type="button"
            disabled={relatorioGerando}
            onClick={handleGerarRelatorioFinanceiro}
            style={{
              background: '#1F6C86',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '0.65rem 1rem',
              fontSize: 15,
              cursor: relatorioGerando ? 'not-allowed' : 'pointer',
              minHeight: 44,
            }}
          >
            {relatorioGerando ? 'Gerando…' : 'Relatório financeiro do período'}
          </button>
        </div>
      </section>

      <section>
        <h3 style={{ color: '#1F6C86', marginTop: 0, marginBottom: 8, fontSize: '1.15rem' }}>
          Presenças e observações do professor
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#455a64', lineHeight: 1.45 }}>
          Gere a lista por período. Selecione uma turma para ler a <strong>observação interna</strong> da aula (mesma
          data do relatório ou outra). O aviso de <strong>mensalidade atrasada</strong> (lista, etiqueta na tabela e
          texto na turma) só aparece para alunos com <strong>presença confirmada pelo professor</strong> no relatório
          gerado.
        </p>

        {loadingAtrasos && (
          <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Carregando indicadores financeiros…</p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12, alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#37474f' }}>De (DD-MM-AAAA)</div>
            <input
              type="text"
              value={filtroPresencaInicio}
              onChange={(e) => setFiltroPresencaInicio(e.target.value)}
              placeholder="01-04-2026"
              style={{ padding: '0.6rem', borderRadius: 4, border: '1px solid #ccc', width: 140, fontSize: 15 }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#37474f' }}>Até</div>
            <input
              type="text"
              value={filtroPresencaFim}
              onChange={(e) => setFiltroPresencaFim(e.target.value)}
              placeholder="16-04-2026"
              style={{ padding: '0.6rem', borderRadius: 4, border: '1px solid #ccc', width: 140, fontSize: 15 }}
            />
          </div>
          <div style={{ flex: '1 1 220px', minWidth: 200 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#37474f' }}>Turma (opcional)</div>
            <select
              value={filtroPresencaTurmaId}
              onChange={(e) => setFiltroPresencaTurmaId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: 4,
                border: '1px solid #ccc',
                minHeight: 44,
                fontSize: 15,
              }}
            >
              <option value="">Todas as turmas</option>
              {turmas.map((t) => {
                const nomesComAtrasoEConfirmacao = turmaIdParaNomesAtrasoComPresencaConfirmada.get(t.id) || [];
                const label = turmaOptionLabel(t);
                const suffix =
                  nomesComAtrasoEConfirmacao.length > 0
                    ? ` — ⚠ mensalidade atrasada: ${nomesComAtrasoEConfirmacao.join(', ')}`
                    : '';
                return (
                  <option key={t.id} value={String(t.id)}>
                    {label}
                    {suffix}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {turmaSelecionada && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              background: '#f5f5f5',
              borderRadius: 8,
              border: '1px solid #e0e0e0',
            }}
          >
            <div style={{ fontWeight: 700, color: '#1F6C86', marginBottom: 6 }}>Observação do professor (leitura)</div>
            {atrasadosNaTurmaSelecionadaComPresencaConfirmadaNoRelatorio.length > 0 && (
              <div
                style={{
                  marginBottom: 10,
                  padding: '8px 10px',
                  background: '#ffebee',
                  border: '1px solid #ef9a9a',
                  borderRadius: 6,
                  color: '#b71c1c',
                  fontSize: 14,
                }}
                role="status"
              >
                <strong>Mensalidade atrasada (com presença confirmada no relatório):</strong>{' '}
                {atrasadosNaTurmaSelecionadaComPresencaConfirmadaNoRelatorio.map((a) => a.nome).join(', ')}
              </div>
            )}
            {turmaSelecionada &&
              presencaRelatorio &&
              atrasadosNaTurmaSelecionadaComPresencaConfirmadaNoRelatorio.length === 0 &&
              (atrasadosPorTurma[turmaSelecionada.id] || []).length > 0 && (
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#666' }}>
                  Há alunos com mensalidade atrasada nesta turma, mas sem presença confirmada pelo professor no período
                  do relatório — não são listados no alerta acima.
                </p>
              )}
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#37474f', marginBottom: 4 }}>
              Data da observação (DD-MM-AAAA)
            </label>
            <input
              type="text"
              value={filtroObservacaoData}
              onChange={(e) => setFiltroObservacaoData(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: 4,
                border: '1px solid #ccc',
                width: 160,
                marginBottom: 10,
                fontSize: 15,
              }}
            />
            {loadingObservacao ? (
              <p style={{ margin: 0, color: '#666' }}>Carregando observação…</p>
            ) : (
              <>
                <p style={{ margin: '0 0 6px', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                  {observacaoGerente?.texto?.trim()
                    ? observacaoGerente.texto
                    : 'Nenhuma observação registrada para esta turma nesta data.'}
                </p>
                {observacaoGerente?.autor_nome && observacaoGerente?.texto?.trim() ? (
                  <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
                    Por {observacaoGerente.autor_nome}
                    {observacaoGerente.atualizado_em
                      ? ` · ${formatApiDateTimeDisplay(observacaoGerente.atualizado_em)}`
                      : ''}
                  </p>
                ) : null}
              </>
            )}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#37474f' }}>
            Filtrar lista por nome (após gerar)
          </div>
          <input
            type="search"
            value={filtroPresencaBusca}
            onChange={(e) => setFiltroPresencaBusca(e.target.value)}
            placeholder="Nome do aluno"
            style={{ maxWidth: 360, width: '100%', padding: '0.6rem', borderRadius: 4, border: '1px solid #ccc', fontSize: 15 }}
          />
        </div>

        <button
          type="button"
          onClick={handleGerarRelatorioPresenca}
          disabled={loadingPresencaRelatorio}
          style={{
            background: '#1F6C86',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '0.65rem 1.2rem',
            fontSize: 15,
            cursor: loadingPresencaRelatorio ? 'not-allowed' : 'pointer',
            minHeight: 44,
            marginBottom: 16,
          }}
        >
          {loadingPresencaRelatorio ? 'Gerando…' : 'Gerar relatório de presenças'}
        </button>

        {erroPresenca && (
          <p style={{ color: '#c62828', marginTop: 0 }}>{erroPresenca}</p>
        )}

        {presencaRelatorio && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
              <div>
                <strong style={{ color: '#666', fontSize: 13 }}>Registros</strong>
                <div style={{ fontSize: 22, color: '#1F6C86' }}>{presencaRelatorio.total_registros}</div>
              </div>
              <div>
                <strong style={{ color: '#666', fontSize: 13 }}>Check-ins</strong>
                <div style={{ fontSize: 22, color: '#2e7d32' }}>{presencaRelatorio.total_checkins}</div>
              </div>
              <div>
                <strong style={{ color: '#666', fontSize: 13 }}>Presenças confirmadas</strong>
                <div style={{ fontSize: 22, color: '#1565c0' }}>{presencaRelatorio.total_confirmadas}</div>
              </div>
              <div>
                <strong style={{ color: '#666', fontSize: 13 }}>Faltas (professor)</strong>
                <div style={{ fontSize: 22, color: '#c62828' }}>
                  {presencaRelatorio.total_faltas ?? 0}
                </div>
              </div>
              <div>
                <strong style={{ color: '#666', fontSize: 13 }}>Sem registro (esperados na aula)</strong>
                <div style={{ fontSize: 22, color: '#757575' }}>
                  {presencaRelatorio.total_sem_registro ?? 0}
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                <thead>
                  <tr style={{ background: '#e3eafc' }}>
                    <th style={{ padding: 10, textAlign: 'left' }}>Aluno</th>
                    <th style={{ padding: 10, textAlign: 'left' }}>Turma</th>
                    <th style={{ padding: 10, textAlign: 'center' }}>Data</th>
                    <th style={{ padding: 10, textAlign: 'center' }}>Check-in</th>
                    <th style={{ padding: 10, textAlign: 'center' }}>Presença</th>
                  </tr>
                </thead>
                <tbody>
                  {presencasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#888' }}>
                        Nenhum registro para os filtros atuais.
                      </td>
                    </tr>
                  )}
                  {presencasAgrupadasPorData.map((item, idx) => {
                    if (item.kind === 'data') {
                      return (
                        <tr key={`data-${item.data}-${idx}`}>
                          <td
                            colSpan={5}
                            style={{
                              padding: '12px 10px 6px',
                              background: '#eceff1',
                              fontWeight: 700,
                              fontSize: 13,
                              color: '#37474f',
                              borderBottom: '1px solid #cfd8dc',
                            }}
                          >
                            Data da aula: {formatDateBR(item.data)}
                          </td>
                        </tr>
                      );
                    }
                    const row = item.row;
                    const atraso = mostrarAvisoAtrasoNoRegistro(row);
                    return (
                      <tr
                        key={row.id != null ? row.id : `s-${row.aluno_id}-${row.data}`}
                        style={{ borderBottom: '1px solid #eee' }}
                      >
                        <td style={{ padding: 10 }}>
                          <span>{row.aluno_nome}</span>
                          {atraso && (
                            <span
                              title="Mensalidade atrasada"
                              style={{
                                marginLeft: 8,
                                display: 'inline-block',
                                background: '#c62828',
                                color: '#fff',
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 4,
                                verticalAlign: 'middle',
                              }}
                            >
                              Atraso
                            </span>
                          )}
                        </td>
                        <td style={{ padding: 10 }}>{row.turma_nome}</td>
                        <td style={{ padding: 10, textAlign: 'center' }}>{formatDateBR(row.data)}</td>
                        <td style={{ padding: 10, textAlign: 'center', color: row.checkin_realizado ? '#2e7d32' : '#c62828' }}>
                          {row.checkin_realizado ? 'Sim' : 'Não'}
                        </td>
                        <td
                          style={{
                            padding: 10,
                            textAlign: 'center',
                            color: row.sem_registro
                              ? '#757575'
                              : row.ausencia_registrada
                                ? '#c62828'
                                : row.presenca_confirmada
                                  ? '#2e7d32'
                                  : '#f9a825',
                          }}
                        >
                          {row.sem_registro
                            ? 'Sem registro'
                            : row.ausencia_registrada
                              ? 'Falta'
                              : row.presenca_confirmada
                                ? 'Confirmada'
                                : 'Pendente'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default RelatoriosGerente;
