/**
 * Exportação de relatórios em PDF (gerente — controle financeiro).
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Cores da marca (alinhado ao painel web #1F6C86) */
const COL_PRIMARY = [31, 108, 134];
const COL_PRIMARY_LIGHT = [230, 242, 246];
const COL_ACCENT_BAR = [180, 210, 220];

/** Ordem e rótulos em português para o relatório de alunos (campos administrativos/financeiros) */
const CAMPOS_ALUNO = [
  ['id', 'ID'],
  ['nome_completo', 'Nome completo'],
  ['email', 'E-mail'],
  ['cpf', 'CPF'],
  ['telefone', 'Telefone'],
  ['endereco', 'Endereço'],
  ['data_nascimento', 'Data de nascimento'],
  ['dia_vencimento', 'Dia de vencimento'],
  ['valor_mensalidade', 'Valor mensalidade'],
  ['dias_habilitados_nomes', 'Dias habilitados'],
];

function fmtValor(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  return String(v);
}

function cmpNomeAluno(a, b) {
  const na = String(a.nome_completo || '').trim() || String(a.id);
  const nb = String(b.nome_completo || '').trim() || String(b.id);
  return na.localeCompare(nb, 'pt-BR', { sensitivity: 'base' });
}

/** Rótulo da turma para o PDF (CT já está na secção pai). */
function labelTurma(t) {
  const dias = Array.isArray(t.dias_semana_nomes) ? t.dias_semana_nomes.join(', ') : '';
  const hor = t.horario ? String(t.horario).slice(0, 5) : '';
  const partes = [`Turma #${t.id}`, dias, hor].filter((x) => x && String(x).trim());
  return partes.join(' — ');
}

function horarioOrdenacao(t) {
  if (!t || !t.horario) return '';
  return String(t.horario).slice(0, 8);
}

/**
 * Agrupa por nome do CT → id da turma; alunos ordenados alfabeticamente em cada turma.
 * @param {Array<Record<string, unknown> & { _turmasRaw?: object[] }>} rows
 */
function agruparPorCtETurma(rows) {
  /** @type {Map<string, Map<number, { info: object, alunos: object[] }>>} */
  const porCt = new Map();
  const semTurma = [];

  for (const row of rows) {
    const turmas = row._turmasRaw || [];
    const base = { ...row };
    delete base._turmasRaw;

    if (turmas.length === 0) {
      semTurma.push(base);
      continue;
    }

    const visto = new Set();
    for (const t of turmas) {
      const ctNome = (t.ct_nome && String(t.ct_nome).trim()) || '(Sem Centro de Treinamento)';
      const tid = t.id;
      const dedupe = `${ctNome}|${tid}|${base.id}`;
      if (visto.has(dedupe)) continue;
      visto.add(dedupe);

      if (!porCt.has(ctNome)) porCt.set(ctNome, new Map());
      const porTurma = porCt.get(ctNome);
      if (!porTurma.has(tid)) {
        porTurma.set(tid, { info: t, alunos: [] });
      }
      porTurma.get(tid).alunos.push({ ...base });
    }
  }

  semTurma.sort(cmpNomeAluno);

  const nomesCt = [...porCt.keys()].sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  );

  return { porCt, nomesCt, semTurma };
}

function nomeAlunoMensalidade(m) {
  if (m.aluno_nome) return String(m.aluno_nome).trim();
  const u = m.aluno;
  if (u && typeof u === 'object') {
    const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    if (full) return full;
    if (u.nome_completo) return String(u.nome_completo).trim();
  }
  return '';
}

function cmpMensalidade(a, b) {
  return nomeAlunoMensalidade(a).localeCompare(nomeAlunoMensalidade(b), 'pt-BR', { sensitivity: 'base' });
}

/**
 * Agrupa mensalidades pelo CT/turma do aluno (mesma lógica do relatório de alunos).
 * @param {Array<object>} mensList
 */
function agruparMensalidadesPorCtTurma(mensList) {
  const porCt = new Map();
  const semTurma = [];

  for (const m of mensList) {
    const aluno = typeof m.aluno === 'object' && m.aluno ? m.aluno : null;
    const turmas = aluno && Array.isArray(aluno.turmas_vinculadas) ? aluno.turmas_vinculadas : [];

    if (turmas.length === 0) {
      semTurma.push(m);
      continue;
    }

    const visto = new Set();
    for (const t of turmas) {
      const ctNome = (t.ct_nome && String(t.ct_nome).trim()) || '(Sem Centro de Treinamento)';
      const tid = t.id;
      const dedupe = `${ctNome}|${tid}|${m.id}`;
      if (visto.has(dedupe)) continue;
      visto.add(dedupe);

      if (!porCt.has(ctNome)) porCt.set(ctNome, new Map());
      const porTurma = porCt.get(ctNome);
      if (!porTurma.has(tid)) {
        porTurma.set(tid, { info: t, items: [] });
      }
      porTurma.get(tid).items.push(m);
    }
  }

  semTurma.sort(cmpMensalidade);
  const nomesCt = [...porCt.keys()].sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  );

  return { porCt, nomesCt, semTurma };
}

function linhaMensalidadePdf(m, fmtMoney) {
  const nome = nomeAlunoMensalidade(m) || '—';
  return [
    String(m.id),
    nome,
    fmtMoney(m.valor),
    m.valor_pago != null ? fmtMoney(m.valor_pago) : '—',
    m.data_vencimento || '—',
    String(m.status || ''),
    m.data_pagamento ? String(m.data_pagamento) : '—',
  ];
}

/**
 * Corpo da tabela (rótulo | valor) para um aluno no PDF.
 */
function corpoTabelaAluno(row) {
  return CAMPOS_ALUNO.map(([key, label]) => [label, fmtValor(row[key])]);
}

/**
 * @param {Array<Record<string, unknown> & { _turmasRaw?: object[] }>} rows - rowAlunoCompleto + _turmasRaw
 */
export function downloadPdfRelatorioAlunos(rows) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - 2 * margin;
  let y = 14;

  const desenharFaixaTitulo = () => {
    doc.setFillColor(...COL_PRIMARY);
    doc.rect(0, 0, pageW, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Relatório de alunos', margin, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('CT Supera · Lista administrativa e de contato', margin, 22);
    doc.setTextColor(0, 0, 0);
    y = 32;
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
  };

  desenharFaixaTitulo();

  const tableOptsAluno = {
    theme: 'grid',
    headStyles: {
      fillColor: COL_PRIMARY,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
    },
    styles: {
      fontSize: 8,
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      lineColor: [200, 215, 222],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: 'bold', textColor: [45, 65, 75], fillColor: COL_PRIMARY_LIGHT },
      1: { cellWidth: maxW - 52 },
    },
    margin: { left: margin, right: margin },
  };

  const blocoAlunoTabela = (row, tituloAluno) => {
    autoTable(doc, {
      startY: y,
      head: [[{ content: tituloAluno, colSpan: 2 }]],
      body: corpoTabelaAluno(row),
      ...tableOptsAluno,
    });
    y = doc.lastAutoTable.finalY + 6;
  };

  const secaoCt = (titulo, subtitulo) => {
    if (y + 18 > pageH - 16) {
      doc.addPage();
      y = margin;
    }
    doc.setFillColor(...COL_PRIMARY);
    doc.roundedRect(margin, y, maxW, 9, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(titulo, margin + 3, y + 6.2);
    doc.setTextColor(0, 0, 0);
    y += 11;
    if (subtitulo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(70, 90, 100);
      doc.text(subtitulo, margin + 2, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
    }
  };

  const secaoTurma = (texto) => {
    if (y + 12 > pageH - 16) {
      doc.addPage();
      y = margin;
    }
    doc.setFillColor(...COL_ACCENT_BAR);
    doc.roundedRect(margin + 2, y, maxW - 4, 7, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COL_PRIMARY);
    const linhas = doc.splitTextToSize(texto, maxW - 10);
    doc.text(linhas, margin + 5, y + 5);
    doc.setTextColor(0, 0, 0);
    y += linhas.length * 4 + 4;
  };

  const { porCt, nomesCt, semTurma } = agruparPorCtETurma(rows);

  for (const ctNome of nomesCt) {
    secaoCt(`Centro de Treinamento · ${ctNome}`, null);

    const porTurma = porCt.get(ctNome);
    const entradas = [...porTurma.entries()].sort((a, b) => {
      const [, va] = a;
      const [, vb] = b;
      const ha = horarioOrdenacao(va.info);
      const hb = horarioOrdenacao(vb.info);
      if (ha !== hb) return ha.localeCompare(hb);
      return (va.info?.id || 0) - (vb.info?.id || 0);
    });

    for (const [, { info, alunos }] of entradas) {
      secaoTurma(labelTurma(info));

      const ordenados = [...alunos].sort(cmpNomeAluno);
      ordenados.forEach((aluno, i) => {
        const nome = String(aluno.nome_completo || '').trim() || `#${aluno.id}`;
        blocoAlunoTabela(aluno, `${i + 1}. ${nome}`);
      });
    }
  }

  if (semTurma.length > 0) {
    secaoCt('Alunos sem turma vinculada', null);

    semTurma.forEach((aluno, i) => {
      const nome = String(aluno.nome_completo || '').trim() || `#${aluno.id}`;
      blocoAlunoTabela(aluno, `${i + 1}. ${nome}`);
    });
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  doc.save(`relatorio-alunos-completo-${stamp}.pdf`);
}

/**
 * @param {object} params
 * @param {object} params.dash - resposta financeiro/dashboard/
 * @param {number} params.mes
 * @param {number} params.ano
 * @param {Array} params.mensList
 * @param {Array} params.despList
 * @param {Array} params.salList
 * @param {Map<number,string>} params.nomeProfessorPorId
 */
export function downloadPdfRelatorioFinanceiro({
  dash,
  mes,
  ano,
  mensList,
  despList,
  salList,
  nomeProfessorPorId,
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const mesNome = MESES[mes - 1] || String(mes);
  let y = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Relatório financeiro — ${mesNome} ${ano}`, 14, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, y);
  y += 10;

  const fmtMoney = (n) =>
    Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Valor']],
    body: [
      ['Total recebido (mensalidades pagas)', fmtMoney(dash?.total_pago)],
      ['Total despesas', fmtMoney(dash?.total_despesas)],
      ['Total salários (competência)', fmtMoney(dash?.total_salarios)],
      ['Total salários pagos', fmtMoney(dash?.total_salarios_pagos)],
      ['Saldo final', fmtMoney(dash?.saldo_final)],
      [
        'Novas matrículas (pré-cadastro concluído no mês)',
        String(dash?.matriculas_no_mes ?? 0),
      ],
      [
        'Desistências (inativações registradas no mês)',
        String(dash?.desistencias_no_mes ?? 0),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [31, 108, 134], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  let startY = doc.lastAutoTable.finalY + 10;

  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const headM = ['ID', 'Aluno', 'Valor', 'Valor pago', 'Venc.', 'Status', 'Pagamento'];
  const tableOptsMensalidades = {
    theme: 'striped',
    headStyles: { fillColor: [31, 108, 134], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 1 },
    margin: { left: 14, right: 14 },
  };

  let yPos = startY + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Mensalidades', margin, yPos);
  yPos += 10;

  if (!mensList.length) {
    autoTable(doc, {
      startY: yPos,
      head: [headM],
      body: [['—', 'Nenhuma mensalidade no período', '', '', '', '', '']],
      ...tableOptsMensalidades,
    });
  } else {
    const { porCt, nomesCt, semTurma } = agruparMensalidadesPorCtTurma(mensList);

    for (const ctNome of nomesCt) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const ctLines = doc.splitTextToSize(`Centro de Treinamento: ${ctNome}`, pageW - 2 * margin);
      if (yPos + ctLines.length * 5 > pageH - 15) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(ctLines, margin, yPos);
      yPos += ctLines.length * 5 + 6;

      const porTurma = porCt.get(ctNome);
      const entradas = [...porTurma.entries()].sort((a, b) => {
        const [, va] = a;
        const [, vb] = b;
        const ha = horarioOrdenacao(va.info);
        const hb = horarioOrdenacao(vb.info);
        if (ha !== hb) return ha.localeCompare(hb);
        return (va.info?.id || 0) - (vb.info?.id || 0);
      });

      for (const [, { info, items }] of entradas) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const subLines = doc.splitTextToSize(labelTurma(info), pageW - 2 * margin - 6);
        if (yPos + subLines.length * 4.5 > pageH - 15) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(subLines, margin + 6, yPos);
        yPos += subLines.length * 4.5 + 4;

        const body = [...items].sort(cmpMensalidade).map((m) => linhaMensalidadePdf(m, fmtMoney));
        autoTable(doc, {
          startY: yPos,
          head: [headM],
          body,
          ...tableOptsMensalidades,
        });
        yPos = doc.lastAutoTable.finalY + 8;
      }
    }

    if (semTurma.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const secLines = doc.splitTextToSize('Mensalidades — alunos sem turma vinculada', pageW - 2 * margin);
      if (yPos + secLines.length * 5 > pageH - 15) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(secLines, margin, yPos);
      yPos += secLines.length * 5 + 6;

      const bodySem = [...semTurma].sort(cmpMensalidade).map((m) => linhaMensalidadePdf(m, fmtMoney));
      autoTable(doc, {
        startY: yPos,
        head: [headM],
        body: bodySem,
        ...tableOptsMensalidades,
      });
      yPos = doc.lastAutoTable.finalY + 8;
    }
  }

  startY = doc.lastAutoTable.finalY + 10;

  const headD = ['ID', 'Categoria', 'Descrição', 'Valor', 'Data'];
  const bodyD = despList.map((d) => [
    String(d.id),
    String(d.categoria || ''),
    String(d.descricao || ''),
    fmtMoney(d.valor),
    String(d.data || ''),
  ]);

  doc.setFont('helvetica', 'bold');
  doc.text('Despesas', 14, startY - 2);
  autoTable(doc, {
    startY: startY + 2,
    head: [headD],
    body: bodyD.length ? bodyD : [['—', '', 'Nenhuma despesa no período', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [200, 120, 0], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 1 },
    margin: { left: 14, right: 14 },
  });

  startY = doc.lastAutoTable.finalY + 10;

  const headS = ['ID', 'Professor', 'Valor', 'Competência', 'Pago em', 'Status'];
  const bodyS = salList.map((s) => {
    const prof = typeof s.professor === 'object' && s.professor ? s.professor : null;
    const pid = prof ? prof.id : s.professor;
    const pnome = prof
      ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim()
      : nomeProfessorPorId.get(pid) || nomeProfessorPorId.get(Number(pid)) || '—';
    const pagoEm = s.status === 'pago' && s.data_pagamento ? String(s.data_pagamento) : '—';
    return [
      String(s.id),
      pnome,
      fmtMoney(s.valor),
      String(s.competencia || ''),
      pagoEm,
      String(s.status || ''),
    ];
  });

  doc.setFont('helvetica', 'bold');
  doc.text('Salários', 14, startY - 2);
  autoTable(doc, {
    startY: startY + 2,
    head: [headS],
    body: bodyS.length ? bodyS : [['—', 'Nenhum salário no período', '', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [46, 125, 50], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 1 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`relatorio-financeiro-${ano}-${String(mes).padStart(2, '0')}.pdf`);
}
