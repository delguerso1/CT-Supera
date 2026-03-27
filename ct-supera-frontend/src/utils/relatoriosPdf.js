/**
 * Exportação de relatórios em PDF (gerente — controle financeiro).
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

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
  ['nome_responsavel', 'Nome do responsável'],
  ['telefone_responsavel', 'Telefone do responsável'],
  ['telefone_emergencia', 'Telefone de emergência'],
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
 * @param {Array<Record<string, unknown> & { _turmasRaw?: object[] }>} rows - rowAlunoCompleto + _turmasRaw
 */
export function downloadPdfRelatorioAlunos(rows) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = doc.internal.pageSize.getWidth() - 2 * margin;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Relatório de alunos — CT Supera', margin, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, y);
  y += 10;

  const { porCt, nomesCt, semTurma } = agruparPorCtETurma(rows);

  const blocoCampos = (row, tituloAluno) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const tl = doc.splitTextToSize(tituloAluno, maxW);
    if (y + tl.length * 4 + 40 > pageH - 12) {
      doc.addPage();
      y = margin;
    }
    doc.text(tl, margin, y);
    y += tl.length * 4 + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    CAMPOS_ALUNO.forEach(([key, label]) => {
      const val = fmtValor(row[key]);
      const texto = `${label}: ${val}`;
      const linhas = doc.splitTextToSize(texto, maxW);
      if (y + linhas.length * 3.5 > pageH - 12) {
        doc.addPage();
        y = margin;
      }
      doc.text(linhas, margin, y);
      y += linhas.length * 3.5 + 1.5;
    });
    y += 5;
  };

  for (const ctNome of nomesCt) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const ctLinhas = doc.splitTextToSize(`Centro de Treinamento: ${ctNome}`, maxW);
    if (y + ctLinhas.length * 5 + 20 > pageH - 12) {
      doc.addPage();
      y = margin;
    }
    doc.text(ctLinhas, margin, y);
    y += ctLinhas.length * 5 + 4;

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
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const sub = doc.splitTextToSize(labelTurma(info), maxW);
      if (y + sub.length * 4.5 + 15 > pageH - 12) {
        doc.addPage();
        y = margin;
      }
      doc.text(sub, margin + 3, y);
      y += sub.length * 4.5 + 3;

      const ordenados = [...alunos].sort(cmpNomeAluno);
      ordenados.forEach((aluno, i) => {
        const nome = String(aluno.nome_completo || '').trim() || `#${aluno.id}`;
        blocoCampos(aluno, `${i + 1}. ${nome}`);
      });
    }
  }

  if (semTurma.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const sec = doc.splitTextToSize('Alunos sem turma vinculada', maxW);
    if (y + sec.length * 5 + 20 > pageH - 12) {
      doc.addPage();
      y = margin;
    }
    doc.text(sec, margin, y);
    y += sec.length * 5 + 4;

    semTurma.forEach((aluno, i) => {
      const nome = String(aluno.nome_completo || '').trim() || `#${aluno.id}`;
      blocoCampos(aluno, `${i + 1}. ${nome}`);
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

  const headS = ['ID', 'Professor', 'Valor', 'Data pagamento', 'Status'];
  const bodyS = salList.map((s) => {
    const prof = typeof s.professor === 'object' && s.professor ? s.professor : null;
    const pid = prof ? prof.id : s.professor;
    const pnome = prof
      ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim()
      : nomeProfessorPorId.get(pid) || nomeProfessorPorId.get(Number(pid)) || '—';
    return [
      String(s.id),
      pnome,
      fmtMoney(s.valor),
      String(s.data_pagamento || ''),
      String(s.status || ''),
    ];
  });

  doc.setFont('helvetica', 'bold');
  doc.text('Salários', 14, startY - 2);
  autoTable(doc, {
    startY: startY + 2,
    head: [headS],
    body: bodyS.length ? bodyS : [['—', 'Nenhum salário no período', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [46, 125, 50], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 1 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`relatorio-financeiro-${ano}-${String(mes).padStart(2, '0')}.pdf`);
}
