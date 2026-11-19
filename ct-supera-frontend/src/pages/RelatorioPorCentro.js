import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const COR_PAGO = '#2e7d32';
const COR_PENDENTE = '#f9a825';
const COR_ATRASADO = '#c62828';
const COR_WELLHUB = '#0d47a1';
const COR_PRESENCA = '#00838f';
const COR_MES = '#1F6C86';
const COR_OUTRO = '#90a4ae';
const LISTA_VAZIA = [];

function mesAnterior(mes, ano) {
  if (mes <= 1) return { mes: 12, ano: ano - 1 };
  return { mes: mes - 1, ano };
}

function nomeMes(mes, ano) {
  const nome = NOMES_MESES[(Number(mes) || 1) - 1] || mes;
  return `${nome} ${ano}`;
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarInteiro(valor) {
  return Number(valor || 0).toLocaleString('pt-BR');
}

function chaveCentro(centro) {
  if (!centro || centro.ct_id == null) return 'none';
  return String(centro.ct_id);
}

function SeloWellhub({ teve, alunos }) {
  const texto = teve ? `Sim${alunos ? ` · ${alunos}` : ''}` : 'Não';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: teve ? '#e3f2fd' : '#eeeeee',
        color: teve ? COR_WELLHUB : '#757575',
        whiteSpace: 'nowrap',
      }}
    >
      {texto}
    </span>
  );
}

function Cartao({ titulo, valor, cor }) {
  return (
    <div
      style={{
        flex: '1 1 140px',
        minWidth: 130,
        padding: '12px 14px',
        background: '#f5f7fa',
        borderRadius: 8,
        border: '1px solid #e0e0e0',
      }}
    >
      <div style={{ fontSize: 12, color: '#607d8b', fontWeight: 600, marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: cor || COR_MES, lineHeight: 1.2 }}>{valor}</div>
    </div>
  );
}

function GraficoBarras({ titulo, descricao, grupos, formatarValor }) {
  const maximo = useMemo(() => {
    let maior = 0;
    for (const grupo of grupos) {
      for (const barra of grupo.barras) {
        const valor = Number(barra.valor) || 0;
        if (valor > maior) maior = valor;
      }
    }
    return maior;
  }, [grupos]);

  if (!grupos.length) {
    return (
      <p style={{ margin: '0 0 16px', color: '#888' }}>Sem dados para este gráfico.</p>
    );
  }

  return (
    <figure
      style={{ margin: '0 0 20px', padding: 0 }}
      aria-label={titulo}
    >
      <figcaption style={{ fontWeight: 700, color: '#37474f', marginBottom: 4 }}>{titulo}</figcaption>
      {descricao ? (
        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#607d8b' }}>{descricao}</p>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
        {grupos[0].barras.map((barra) => (
          <span key={barra.nome} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#455a64' }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: barra.cor, display: 'inline-block' }} />
            {barra.nome}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {grupos.map((grupo) => (
          <div key={grupo.nome}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#263238', marginBottom: 4 }}>{grupo.nome}</div>
            {grupo.barras.map((barra) => {
              const valor = Number(barra.valor) || 0;
              const largura = maximo > 0 ? Math.max(valor > 0 ? 1.5 : 0, (valor / maximo) * 100) : 0;
              return (
                <div key={barra.nome} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <div style={{ width: 88, flex: '0 0 88px', fontSize: 12, color: '#607d8b' }}>{barra.nome}</div>
                  <div style={{ flex: 1, background: '#eceff1', borderRadius: 4, height: 14, minWidth: 40 }}>
                    <div
                      style={{
                        width: `${largura}%`,
                        height: '100%',
                        borderRadius: 4,
                        background: barra.cor,
                      }}
                    />
                  </div>
                  <div style={{ width: 110, flex: '0 0 110px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#37474f' }}>
                    {formatarValor(valor)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </figure>
  );
}

const th = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '2px solid #e0e0e0',
  fontSize: 13,
  color: '#37474f',
};

const td = {
  padding: '10px 12px',
  borderBottom: '1px solid #eee',
  fontSize: 14,
  verticalAlign: 'middle',
};

function barrasFinanceiras(item) {
  return [
    { nome: 'Recebido', valor: Number(item?.pago) || 0, cor: COR_PAGO },
    { nome: 'Pendente', valor: Number(item?.pendente) || 0, cor: COR_PENDENTE },
    { nome: 'Atrasado', valor: Number(item?.atrasado) || 0, cor: COR_ATRASADO },
  ];
}

function RelatorioPorCentro({ mes, ano }) {
  const periodoChave = `${mes}-${ano}`;
  const [comparacaoManual, setComparacaoManual] = useState({ chave: periodoChave, periodo: null });
  let periodoEscolhido = comparacaoManual;
  if (comparacaoManual.chave !== periodoChave) {
    periodoEscolhido = { chave: periodoChave, periodo: null };
    setComparacaoManual(periodoEscolhido);
  }
  const periodoPadrao = mesAnterior(mes, ano);
  const mesComp = periodoEscolhido.periodo?.mes ?? periodoPadrao.mes;
  const anoComp = periodoEscolhido.periodo?.ano ?? periodoPadrao.ano;
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErro('');
      try {
        const { data } = await api.get('financeiro/relatorio/por-centro/', {
          params: {
            mes,
            ano,
            mes_comparacao: mesComp,
            ano_comparacao: anoComp,
          },
        });
        if (!cancelled) setDados(data);
      } catch (e) {
        if (!cancelled) {
          setErro(e.response?.data?.error || 'Erro ao carregar o financeiro por centro de treinamento.');
          setDados(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mes, ano, mesComp, anoComp]);

  const atual = dados?.atual;
  const comparacao = dados?.comparacao;
  const centros = atual?.centros || LISTA_VAZIA;

  const gruposCentros = useMemo(
    () => centros.map((centro) => ({ nome: centro.nome, barras: barrasFinanceiras(centro) })),
    [centros]
  );

  const gruposTurmas = useMemo(() => {
    const grupos = [];
    for (const centro of centros) {
      for (const turma of centro.turmas || []) {
        const total = Number(turma.pago) + Number(turma.pendente) + Number(turma.atrasado);
        if (total <= 0) continue;
        grupos.push({
          nome: `${centro.nome} · ${turma.nome}`,
          barras: barrasFinanceiras(turma),
        });
      }
    }
    return grupos;
  }, [centros]);

  const gruposWellhub = useMemo(
    () => centros
      .filter((centro) => centro.teve_wellhub)
      .map((centro) => ({
        nome: centro.nome,
        barras: [
          { nome: 'Reservas', valor: Number(centro.wellhub_reservas) || 0, cor: COR_WELLHUB },
          { nome: 'Presenças', valor: Number(centro.wellhub_presencas) || 0, cor: COR_PRESENCA },
        ],
      })),
    [centros]
  );

  const linhasComparacao = useMemo(() => {
    const mapaOutro = new Map((comparacao?.centros || []).map((centro) => [chaveCentro(centro), centro]));
    const vistos = new Set();
    const linhas = [];
    for (const centro of centros) {
      const chave = chaveCentro(centro);
      vistos.add(chave);
      linhas.push({ nome: centro.nome, atual: centro, outro: mapaOutro.get(chave) || null });
    }
    for (const centro of comparacao?.centros || []) {
      const chave = chaveCentro(centro);
      if (vistos.has(chave)) continue;
      linhas.push({ nome: centro.nome, atual: null, outro: centro });
    }
    return linhas;
  }, [centros, comparacao]);

  const gruposComparacao = useMemo(
    () => linhasComparacao.map((linha) => ({
      nome: linha.nome,
      barras: [
        { nome: nomeMes(mes, ano), valor: Number(linha.atual?.pago) || 0, cor: COR_MES },
        { nome: nomeMes(mesComp, anoComp), valor: Number(linha.outro?.pago) || 0, cor: COR_OUTRO },
      ],
    })),
    [linhasComparacao, mes, ano, mesComp, anoComp]
  );

  const tituloAtual = nomeMes(mes, ano);
  const tituloOutro = nomeMes(mesComp, anoComp);

  return (
    <section style={{ marginBottom: 36 }}>
      <h3 style={{ color: COR_MES, marginTop: 0, marginBottom: 8, fontSize: '1.15rem' }}>
        Financeiro por centro de treinamento — {tituloAtual}
      </h3>
      <p style={{ margin: '0 0 12px', fontSize: 14, color: '#455a64', lineHeight: 1.45 }}>
        Mensalidades do mês separado pelo centro e pela turma do aluno. A coluna Wellhub diz se
        aquele centro ou aquela turma teve aluno Wellhub no período.
        Quando o aluno está em mais de uma turma do mesmo centro, o valor entra inteiro no centro
        e é dividido entre as turmas. Quando treina em centros diferentes, o valor é dividido entre os centros.
      </p>

      {loading && (
        <p style={{ color: '#607d8b', marginTop: 0 }} role="status">Carregando centros e turmas…</p>
      )}
      {erro && (
        <div style={{ color: '#c62828', background: '#ffebee', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          {erro}
        </div>
      )}

      {atual && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <Cartao titulo="Recebido" valor={formatarMoeda(atual.totais?.pago)} cor={COR_PAGO} />
            <Cartao titulo="Pendente" valor={formatarMoeda(atual.totais?.pendente)} cor={COR_PENDENTE} />
            <Cartao titulo="Atrasado" valor={formatarMoeda(atual.totais?.atrasado)} cor={COR_ATRASADO} />
            <Cartao titulo="Alunos com mensalidade" valor={formatarInteiro(atual.totais?.alunos)} />
            <Cartao
              titulo="Centros com Wellhub"
              valor={`${formatarInteiro(atual.centros_com_wellhub)} de ${formatarInteiro(centros.length)}`}
              cor={COR_WELLHUB}
            />
          </div>

          <GraficoBarras
            titulo="Mensalidades por centro"
            descricao="Recebido, pendente e atrasado em cada centro de treinamento."
            grupos={gruposCentros}
            formatarValor={formatarMoeda}
          />

          {gruposTurmas.length > 0 && (
            <GraficoBarras
              titulo="Mensalidades por turma"
              descricao="Turmas com mensalidade no mês. O nome começa pelo centro de treinamento."
              grupos={gruposTurmas}
              formatarValor={formatarMoeda}
            />
          )}

          {centros.map((centro) => (
            <div
              key={chaveCentro(centro)}
              style={{
                marginBottom: 18,
                padding: 14,
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ margin: 0, color: '#263238', fontSize: '1.05rem' }}>{centro.nome}</h4>
                <span style={{ fontSize: 13, color: '#607d8b' }}>
                  Wellhub: <SeloWellhub teve={centro.teve_wellhub} alunos={centro.wellhub_alunos} />
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <Cartao titulo="Recebido" valor={formatarMoeda(centro.pago)} cor={COR_PAGO} />
                <Cartao titulo="Pendente" valor={formatarMoeda(centro.pendente)} cor={COR_PENDENTE} />
                <Cartao titulo="Atrasado" valor={formatarMoeda(centro.atrasado)} cor={COR_ATRASADO} />
                <Cartao titulo="Alunos" valor={formatarInteiro(centro.alunos)} />
                <Cartao titulo="Reservas Wellhub" valor={formatarInteiro(centro.wellhub_reservas)} cor={COR_WELLHUB} />
                <Cartao titulo="Presenças Wellhub" valor={formatarInteiro(centro.wellhub_presencas)} cor={COR_PRESENCA} />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      <th style={th}>Turma</th>
                      <th style={{ ...th, textAlign: 'center' }}>Alunos</th>
                      <th style={{ ...th, textAlign: 'right' }}>Recebido</th>
                      <th style={{ ...th, textAlign: 'right' }}>Pendente</th>
                      <th style={{ ...th, textAlign: 'right' }}>Atrasado</th>
                      <th style={{ ...th, textAlign: 'center' }}>Wellhub</th>
                      <th style={{ ...th, textAlign: 'center' }}>Reservas</th>
                      <th style={{ ...th, textAlign: 'center' }}>Presenças</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(centro.turmas || []).length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ ...td, color: '#888' }}>Nenhuma turma neste centro.</td>
                      </tr>
                    )}
                    {(centro.turmas || []).map((turma) => (
                      <tr key={turma.turma_id == null ? 'sem-turma' : turma.turma_id}>
                        <td style={td}>{turma.nome}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{formatarInteiro(turma.alunos)}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{formatarMoeda(turma.pago)}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{formatarMoeda(turma.pendente)}</td>
                        <td style={{ ...td, textAlign: 'right', color: Number(turma.atrasado) > 0 ? COR_ATRASADO : undefined }}>
                          {formatarMoeda(turma.atrasado)}
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <SeloWellhub teve={turma.teve_wellhub} alunos={turma.wellhub_alunos} />
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>{formatarInteiro(turma.wellhub_reservas)}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{formatarInteiro(turma.wellhub_presencas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <h3 style={{ color: COR_MES, marginTop: 8, marginBottom: 8, fontSize: '1.15rem' }}>
              Alunos Wellhub — {tituloAtual}
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: '#455a64', lineHeight: 1.45 }}>
              Cada linha é um aluno Wellhub em uma turma. Reservas canceladas entram na conta.
              Reservas rejeitadas ficam de fora.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <Cartao titulo="Alunos" valor={formatarInteiro(atual.totais?.wellhub_alunos)} cor={COR_WELLHUB} />
              <Cartao titulo="Reservas" valor={formatarInteiro(atual.totais?.wellhub_reservas)} cor={COR_WELLHUB} />
              <Cartao titulo="Confirmadas" valor={formatarInteiro(atual.totais?.wellhub_confirmadas)} />
              <Cartao titulo="Canceladas" valor={formatarInteiro(atual.totais?.wellhub_canceladas)} cor={COR_ATRASADO} />
              <Cartao titulo="Presenças" valor={formatarInteiro(atual.totais?.wellhub_presencas)} cor={COR_PRESENCA} />
              <Cartao titulo="Faltas" valor={formatarInteiro(atual.totais?.wellhub_faltas)} cor={COR_ATRASADO} />
              <Cartao titulo="Check-ins" valor={formatarInteiro(atual.totais?.wellhub_checkins)} />
            </div>

            {gruposWellhub.length > 0 && (
              <GraficoBarras
                titulo="Wellhub por centro"
                descricao="Reservas e presenças confirmadas pelo professor, por centro de treinamento."
                grupos={gruposWellhub}
                formatarValor={formatarInteiro}
              />
            )}

            {(atual.wellhub_alunos || []).length === 0 ? (
              <p style={{ margin: '0 0 8px', color: '#888' }}>Nenhum aluno Wellhub neste mês.</p>
            ) : (
              <div style={{ overflowX: 'auto', marginBottom: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                  <thead>
                    <tr style={{ background: '#e3f2fd' }}>
                      <th style={th}>Aluno</th>
                      <th style={th}>Centro de treinamento</th>
                      <th style={th}>Turma</th>
                      <th style={{ ...th, textAlign: 'center' }}>Reservas</th>
                      <th style={{ ...th, textAlign: 'center' }}>Confirmadas</th>
                      <th style={{ ...th, textAlign: 'center' }}>Canceladas</th>
                      <th style={{ ...th, textAlign: 'center' }}>Presenças</th>
                      <th style={{ ...th, textAlign: 'center' }}>Faltas</th>
                      <th style={{ ...th, textAlign: 'center' }}>Check-ins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atual.wellhub_alunos.map((linha) => (
                      <tr key={linha.linha_id || `${linha.cadastro_id || linha.nome}-${linha.turma_id}`}>
                        <td style={td}>{linha.nome}</td>
                        <td style={td}>{linha.ct_nome}</td>
                        <td style={td}>{linha.turma_nome}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{formatarInteiro(linha.reservas)}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{formatarInteiro(linha.confirmadas)}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{formatarInteiro(linha.canceladas)}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{formatarInteiro(linha.presencas)}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{formatarInteiro(linha.faltas)}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{formatarInteiro(linha.checkins)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ marginTop: 28 }}>
            <h3 style={{ color: COR_MES, marginTop: 0, marginBottom: 8, fontSize: '1.15rem' }}>
              Comparativo entre meses
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: '#455a64', lineHeight: 1.45 }}>
              {tituloAtual} comparado com outro mês. A diferença é o mês selecionado no relatório menos o mês de comparação.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Comparar com:
                <select
                  value={mesComp}
                  onChange={(e) => setComparacaoManual({
                    chave: periodoChave,
                    periodo: { mes: Number(e.target.value), ano: anoComp },
                  })}
                  aria-label="Mês de comparação"
                  style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc', minHeight: 44, fontSize: 16 }}
                >
                  {NOMES_MESES.map((nome, indice) => (
                    <option key={nome} value={indice + 1}>
                      {nome}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Ano:
                <input
                  type="number"
                  value={anoComp}
                  aria-label="Ano de comparação"
                  onChange={(e) => setComparacaoManual({
                    chave: periodoChave,
                    periodo: { mes: mesComp, ano: Number(e.target.value) },
                  })}
                  style={{ width: 100, padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc', minHeight: 44, fontSize: 16 }}
                />
              </label>
            </div>

            {Number(mes) === Number(mesComp) && Number(ano) === Number(anoComp) && (
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#e65100' }}>
                Os dois períodos são o mesmo mês. Escolha outro mês para ver a diferença.
              </p>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <Cartao
                titulo={`Recebido em ${tituloAtual}`}
                valor={formatarMoeda(atual.totais?.pago)}
                cor={COR_MES}
              />
              <Cartao
                titulo={`Recebido em ${tituloOutro}`}
                valor={formatarMoeda(comparacao?.totais?.pago)}
                cor="#546e7a"
              />
              <Cartao
                titulo="Diferença do recebido"
                valor={formatarMoeda((Number(atual.totais?.pago) || 0) - (Number(comparacao?.totais?.pago) || 0))}
                cor={((Number(atual.totais?.pago) || 0) - (Number(comparacao?.totais?.pago) || 0)) >= 0 ? COR_PAGO : COR_ATRASADO}
              />
              <Cartao
                titulo={`Wellhub em ${tituloAtual}`}
                valor={formatarInteiro(atual.totais?.wellhub_alunos)}
                cor={COR_WELLHUB}
              />
              <Cartao
                titulo={`Wellhub em ${tituloOutro}`}
                valor={formatarInteiro(comparacao?.totais?.wellhub_alunos)}
                cor={COR_WELLHUB}
              />
            </div>

            <GraficoBarras
              titulo="Recebido por centro, lado a lado"
              descricao={`${tituloAtual} e ${tituloOutro}.`}
              grupos={gruposComparacao}
              formatarValor={formatarMoeda}
            />

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={th}>Centro de treinamento</th>
                    <th style={{ ...th, textAlign: 'right' }}>Recebido {tituloAtual}</th>
                    <th style={{ ...th, textAlign: 'right' }}>Recebido {tituloOutro}</th>
                    <th style={{ ...th, textAlign: 'right' }}>Diferença</th>
                    <th style={{ ...th, textAlign: 'center' }}>Wellhub {tituloAtual}</th>
                    <th style={{ ...th, textAlign: 'center' }}>Wellhub {tituloOutro}</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasComparacao.map((linha) => {
                    const recebidoAtual = Number(linha.atual?.pago) || 0;
                    const recebidoOutro = Number(linha.outro?.pago) || 0;
                    const diferenca = recebidoAtual - recebidoOutro;
                    return (
                      <tr key={linha.nome}>
                        <td style={td}>{linha.nome}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{formatarMoeda(recebidoAtual)}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{formatarMoeda(recebidoOutro)}</td>
                        <td style={{ ...td, textAlign: 'right', color: diferenca >= 0 ? COR_PAGO : COR_ATRASADO, fontWeight: 700 }}>
                          {formatarMoeda(diferenca)}
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <SeloWellhub teve={Boolean(linha.atual?.teve_wellhub)} alunos={linha.atual?.wellhub_alunos || 0} />
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <SeloWellhub teve={Boolean(linha.outro?.teve_wellhub)} alunos={linha.outro?.wellhub_alunos || 0} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default RelatorioPorCentro;
