import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { downloadPdfRelatorioAlunos, downloadPdfRelatorioFinanceiro, downloadPdfRelatorioWellhub, downloadPdfRelatorioExAlunosPendencias } from '../utils/relatoriosPdf';
import { formatApiDateDisplay, formatApiDateTimeDisplay } from '../utils/dateApi';

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function agregarMensalidades(lista) {
  const acc = {
    pago: { n: 0, v: 0 },
    pendente: { n: 0, v: 0 },
    atrasado: { n: 0, v: 0 },
  };
  for (const m of Array.isArray(lista) ? lista : []) {
    const st = m.status === 'pago' || m.status === 'pendente' || m.status === 'atrasado' ? m.status : 'pendente';
    const valor = Number(m.valor_efetivo ?? m.valor_pago ?? m.valor) || 0;
    acc[st].n += 1;
    acc[st].v += valor;
  }
  return acc;
}

function CartaoIndicador({ titulo, valor, cor }) {
  return (
    <div
      style={{
        flex: '1 1 170px',
        minWidth: 160,
        padding: '16px 18px',
        background: '#f5f7fa',
        borderRadius: 8,
        border: '1px solid #e0e0e0',
      }}
    >
      <div style={{ fontSize: 13, color: '#607d8b', fontWeight: 600, marginBottom: 6 }}>{titulo}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: cor || '#1F6C86', lineHeight: 1.2 }}>{valor}</div>
    </div>
  );
}

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
  const [dashMensal, setDashMensal] = useState(null);
  const [wellhubMensal, setWellhubMensal] = useState(null);
  const [mensalidadesResumo, setMensalidadesResumo] = useState(null);
  const [presencaMensal, setPresencaMensal] = useState(null);
  const [exAlunosPendencias, setExAlunosPendencias] = useState(null);
  const [loadingMensal, setLoadingMensal] = useState(false);
  const [erroMensal, setErroMensal] = useState('');

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

  const handleGerarRelatorioWellhub = async () => {
    if (user?.tipo !== 'gerente') return;
    setRelatorioGerando(true);
    try {
      const { data } = await api.get('wellhub/relatorio/', { params: { mes, ano } });
      downloadPdfRelatorioWellhub({
        mes: data?.mes ?? mes,
        ano: data?.ano ?? ano,
        totais: data?.totais || {},
        reservas: Array.isArray(data?.reservas) ? data.reservas : [],
      });
    } catch (e) {
      window.alert(e.response?.data?.error || 'Erro ao gerar relatório Wellhub.');
    } finally {
      setRelatorioGerando(false);
    }
  };

  const handleGerarRelatorioExAlunosPendencias = async () => {
    if (user?.tipo !== 'gerente') return;
    setRelatorioGerando(true);
    try {
      const { data } = await api.get('financeiro/relatorio/ex-alunos-pendencias/');
      downloadPdfRelatorioExAlunosPendencias({
        total_ex_alunos: data?.total_ex_alunos ?? 0,
        total_parcelas: data?.total_parcelas ?? 0,
        valor_total: data?.valor_total ?? 0,
        itens: Array.isArray(data?.itens) ? data.itens : [],
      });
    } catch (e) {
      window.alert(e.response?.data?.error || 'Erro ao gerar relatório de pendências de ex-alunos.');
    } finally {
      setRelatorioGerando(false);
    }
  };

  useEffect(() => {
    if (user?.tipo !== 'gerente') return undefined;
    let cancelled = false;
    (async () => {
      setLoadingMensal(true);
      setErroMensal('');
      const dataInicio = `01-${pad2(mes)}-${ano}`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const dataFim = `${pad2(ultimoDia)}-${pad2(mes)}-${ano}`;
      try {
        const [dashRes, wellRes, mensList, presRes, exAlunosRes] = await Promise.all([
          api.get('financeiro/dashboard/', { params: { mes, ano } }),
          api.get('wellhub/relatorio/', { params: { mes, ano } }).catch(() => ({ data: null })),
          fetchAllPages(`financeiro/mensalidades/?mes=${mes}&ano=${ano}&page_size=500`),
          api
            .get('funcionarios/relatorio-presenca/', {
              params: { data_inicio: dataInicio, data_fim: dataFim, incluir_faltantes: 'false' },
            })
            .catch(() => ({ data: null })),
          api.get('financeiro/relatorio/ex-alunos-pendencias/').catch(() => ({ data: null })),
        ]);
        if (cancelled) return;
        if (Array.isArray(dashRes.data?.meses) && dashRes.data.meses.length) {
          setDashboardMeses(dashRes.data.meses);
        }
        setDashMensal(dashRes.data || null);
        setWellhubMensal(wellRes.data || null);
        setMensalidadesResumo(agregarMensalidades(mensList));
        setPresencaMensal(presRes.data || null);
        setExAlunosPendencias(exAlunosRes.data || null);
      } catch (e) {
        if (!cancelled) {
          setErroMensal(e.response?.data?.error || 'Erro ao carregar o relatório mensal.');
          setDashMensal(null);
          setWellhubMensal(null);
          setMensalidadesResumo(null);
          setPresencaMensal(null);
          setExAlunosPendencias(null);
        }
      } finally {
        if (!cancelled) setLoadingMensal(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mes, ano, user?.tipo]);

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

  const inadimplentesComPresencaNoMes = useMemo(() => {
    const list = presencaMensal?.presencas;
    if (!Array.isArray(list) || !list.length) return [];
    const byKey = new Map();
    for (const p of list) {
      if (!p.presenca_confirmada) continue;
      const atrasados = atrasadosPorTurma[p.turma_id];
      if (!atrasados?.length) continue;
      const inad = atrasados.find((x) => x.id === p.aluno_id);
      if (!inad) continue;
      const key = `${p.aluno_id}-${p.turma_id}`;
      const turma = turmas.find((t) => t.id === p.turma_id);
      const existing = byKey.get(key);
      if (existing) {
        if (p.data && !existing.datas.includes(p.data)) existing.datas.push(p.data);
      } else {
        byKey.set(key, {
          aluno_id: p.aluno_id,
          nome: inad.nome || p.aluno_nome,
          turma_id: p.turma_id,
          turma_label: turma ? turmaOptionLabel(turma) : (p.turma_nome || `Turma ${p.turma_id}`),
          datas: p.data ? [p.data] : [],
        });
      }
    }
    return Array.from(byKey.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [presencaMensal, atrasadosPorTurma, turmas]);

  const totalAlunosInadimplentesComPresenca = useMemo(
    () => new Set(inadimplentesComPresencaNoMes.map((x) => x.aluno_id)).size,
    [inadimplentesComPresencaNoMes]
  );

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
      <section style={{ marginBottom: 36 }}>
        <h3 style={{ color: '#1F6C86', marginTop: 0, marginBottom: 8, fontSize: '1.15rem' }}>
          Relatório mensal — {NOMES_MESES[mes - 1] || mes} {ano}
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#455a64', lineHeight: 1.45 }}>
          Resumo do mês na tela. Os PDFs abaixo usam o mesmo período.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Mês:
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc', minHeight: 44, fontSize: 16 }}
            >
              {(dashboardMeses || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).map((m) => (
                <option key={m} value={m}>
                  {NOMES_MESES[m - 1]} ({m})
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

        {loadingMensal && (
          <p style={{ color: '#607d8b', marginTop: 0 }} role="status">Carregando relatório do mês…</p>
        )}
        {erroMensal && (
          <div style={{ color: '#c62828', background: '#ffebee', padding: 12, borderRadius: 6, marginBottom: 16 }}>
            {erroMensal}
          </div>
        )}

        {!loadingMensal && dashMensal && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <CartaoIndicador titulo="Recebido" valor={formatarMoeda(dashMensal.total_pago)} cor="#2e7d32" />
              <CartaoIndicador titulo="Despesas" valor={formatarMoeda(dashMensal.total_despesas)} cor="#c62828" />
              <CartaoIndicador titulo="Salários da competência" valor={formatarMoeda(dashMensal.total_salarios)} cor="#1976d2" />
              <CartaoIndicador titulo="Salários pagos" valor={formatarMoeda(dashMensal.total_salarios_pagos)} cor="#1976d2" />
              <CartaoIndicador
                titulo="Saldo final"
                valor={formatarMoeda(dashMensal.saldo_final)}
                cor={(Number(dashMensal.saldo_final) || 0) >= 0 ? '#2e7d32' : '#c62828'}
              />
              <CartaoIndicador titulo="Novas matrículas" valor={String(dashMensal.matriculas_no_mes ?? 0)} />
              <CartaoIndicador titulo="Desistências" valor={String(dashMensal.desistencias_no_mes ?? 0)} cor="#c62828" />
              <CartaoIndicador
                titulo="Pendências de ex-alunos"
                valor={formatarMoeda(exAlunosPendencias?.valor_total)}
                cor="#b71c1c"
              />
              <CartaoIndicador
                titulo="Inadimplentes com presença"
                valor={String(totalAlunosInadimplentesComPresenca)}
                cor="#e65100"
              />
            </div>

            {mensalidadesResumo && (
              <div style={{ marginBottom: 20, overflowX: 'auto' }}>
                <h4 style={{ margin: '0 0 8px', color: '#37474f' }}>Mensalidades do mês</h4>
                <table style={{ width: '100%', maxWidth: 520, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e0e0e0' }}>Status</th>
                      <th style={{ textAlign: 'center', padding: '10px 12px', borderBottom: '2px solid #e0e0e0' }}>Quantidade</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '2px solid #e0e0e0' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Pago', mensalidadesResumo.pago],
                      ['Pendente', mensalidadesResumo.pendente],
                      ['Atrasado', mensalidadesResumo.atrasado],
                    ].map(([label, row]) => (
                      <tr key={label}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee' }}>{label}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{row.n}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{formatarMoeda(row.v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 20 }}>
              {wellhubMensal?.totais && (
                <div style={{ flex: '1 1 280px' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#37474f' }}>Wellhub no mês</h4>
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: '#333' }}>
                    <li>Reservas: {wellhubMensal.totais.reservas ?? 0}</li>
                    <li>Confirmadas: {wellhubMensal.totais.confirmadas ?? 0}</li>
                    <li>Canceladas: {wellhubMensal.totais.canceladas ?? 0}</li>
                    <li>Presenças: {wellhubMensal.totais.presencas ?? 0}</li>
                    <li>Faltas: {wellhubMensal.totais.faltas ?? 0}</li>
                    <li>Check-ins validados: {wellhubMensal.totais.checkins_validados ?? 0}</li>
                  </ul>
                </div>
              )}
              {presencaMensal && (
                <div style={{ flex: '1 1 280px' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#37474f' }}>Presenças nas turmas</h4>
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: '#333' }}>
                    <li>Registros: {presencaMensal.total_registros ?? 0}</li>
                    <li>Presenças confirmadas: {presencaMensal.total_confirmadas ?? 0}</li>
                    <li>Check-ins: {presencaMensal.total_checkins ?? 0}</li>
                    <li>Faltas: {presencaMensal.total_faltas ?? 0}</li>
                  </ul>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20, overflowX: 'auto' }}>
              <h4 style={{ margin: '0 0 8px', color: '#37474f' }}>
                Alunos inadimplentes com presença confirmada pelo professor
              </h4>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#607d8b' }}>
                Mensalidade atrasada e presença confirmada pelo professor no mês selecionado.
                {loadingAtrasos ? ' Carregando indicadores financeiros…' : ''}
              </p>
              {inadimplentesComPresencaNoMes.length === 0 ? (
                <p style={{ margin: 0, color: '#888' }}>
                  Nenhum aluno inadimplente com presença confirmada neste mês.
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fff3e0' }}>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #ffe0b2' }}>Aluno</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #ffe0b2' }}>Turma</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #ffe0b2' }}>Datas com presença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inadimplentesComPresencaNoMes.map((item) => (
                      <tr key={`${item.aluno_id}-${item.turma_id}`}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee' }}>{item.nome}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee' }}>{item.turma_label}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee' }}>
                          {item.datas.map((d) => formatApiDateDisplay(d) || d).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {exAlunosPendencias && (
              <div style={{ marginBottom: 20, overflowX: 'auto' }}>
                <h4 style={{ margin: '0 0 8px', color: '#37474f' }}>Pendências de ex-alunos (situação atual)</h4>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#607d8b' }}>
                  {exAlunosPendencias.total_ex_alunos ?? 0} ex-aluno(s) · {exAlunosPendencias.total_parcelas ?? 0} parcela(s)
                  em aberto · total {formatarMoeda(exAlunosPendencias.valor_total)}
                </p>
                {Array.isArray(exAlunosPendencias.itens) && exAlunosPendencias.itens.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e0e0e0' }}>Ex-aluno</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e0e0e0' }}>Inativação</th>
                        <th style={{ textAlign: 'center', padding: '10px 12px', borderBottom: '2px solid #e0e0e0' }}>Parcelas</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '2px solid #e0e0e0' }}>Valor em aberto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exAlunosPendencias.itens.map((item) => (
                        <tr key={item.aluno_id}>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee' }}>{item.nome}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee' }}>
                            {item.data_inativacao ? formatApiDateDisplay(item.data_inativacao) : '—'}
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                            {Array.isArray(item.parcelas) ? item.parcelas.length : 0}
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                            {formatarMoeda(item.valor_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ margin: 0, color: '#888' }}>Nenhuma pendência de ex-aluno.</p>
                )}
              </div>
            )}

            {Array.isArray(dashMensal.desistencias_alunos) && dashMensal.desistencias_alunos.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <h4 style={{ margin: '0 0 8px', color: '#37474f' }}>Alunos inativados no mês</h4>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                  {dashMensal.desistencias_alunos.map((a) => (
                    <li key={a.id}>
                      {a.nome}
                      {a.data_inativacao ? ` — ${formatApiDateDisplay(a.data_inativacao)}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#1F6C86', marginTop: 0, marginBottom: 8, fontSize: '1.15rem' }}>
          Exportar PDF
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#455a64', lineHeight: 1.45 }}>
          O PDF de alunos agrupa por Centro de Treinamento e turma. O financeiro e o Wellhub usam o{' '}
          <strong>mês e ano</strong> selecionados acima. As pendências de ex-alunos mostram a situação atual
          (parcelas em aberto de quem já encerrou o contrato).
        </p>
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
          <button
            type="button"
            disabled={relatorioGerando}
            onClick={handleGerarRelatorioWellhub}
            style={{
              background: '#0d47a1',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '0.65rem 1rem',
              fontSize: 15,
              cursor: relatorioGerando ? 'not-allowed' : 'pointer',
              minHeight: 44,
            }}
          >
            {relatorioGerando ? 'Gerando…' : 'Relatório Wellhub do período'}
          </button>
          <button
            type="button"
            disabled={relatorioGerando}
            onClick={handleGerarRelatorioExAlunosPendencias}
            style={{
              background: '#b71c1c',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '0.65rem 1rem',
              fontSize: 15,
              cursor: relatorioGerando ? 'not-allowed' : 'pointer',
              minHeight: 44,
            }}
          >
            {relatorioGerando ? 'Gerando…' : 'Pendências de ex-alunos'}
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
                            Data da aula: {formatApiDateDisplay(item.data)}
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
                        <td style={{ padding: 10, textAlign: 'center' }}>{formatApiDateDisplay(row.data)}</td>
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
