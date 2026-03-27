/**
 * Exportação de relatórios em PDF (gerente — controle financeiro).
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Ordem e rótulos em português para o relatório de alunos */
const CAMPOS_ALUNO = [
  ['id', 'ID'],
  ['username', 'Usuário (login)'],
  ['email', 'E-mail'],
  ['first_name', 'Nome'],
  ['last_name', 'Sobrenome'],
  ['nome_completo', 'Nome completo'],
  ['tipo', 'Tipo (código)'],
  ['tipo_display', 'Tipo'],
  ['telefone', 'Telefone'],
  ['endereco', 'Endereço'],
  ['data_nascimento', 'Data de nascimento'],
  ['ativo', 'Ativo (cadastro CT)'],
  ['is_active', 'Conta liberada (login)'],
  ['cpf', 'CPF'],
  ['dia_vencimento', 'Dia de vencimento'],
  ['valor_mensalidade', 'Valor mensalidade'],
  ['plano', 'Plano'],
  ['dias_habilitados_nomes', 'Dias habilitados'],
  ['centros_treinamento', 'Centros de treinamento'],
  ['turmas_vinculadas', 'Turmas vinculadas'],
  ['nome_responsavel', 'Nome do responsável'],
  ['telefone_responsavel', 'Telefone do responsável'],
  ['telefone_emergencia', 'Telefone de emergência'],
  ['ficha_medica', 'Ficha médica'],
  ['foto_perfil', 'Foto (URL/caminho)'],
  ['parq_question_1', 'PAR-Q pergunta 1'],
  ['parq_question_2', 'PAR-Q pergunta 2'],
  ['parq_question_3', 'PAR-Q pergunta 3'],
  ['parq_question_4', 'PAR-Q pergunta 4'],
  ['parq_question_5', 'PAR-Q pergunta 5'],
  ['parq_question_6', 'PAR-Q pergunta 6'],
  ['parq_question_7', 'PAR-Q pergunta 7'],
  ['parq_question_8', 'PAR-Q pergunta 8'],
  ['parq_question_9', 'PAR-Q pergunta 9'],
  ['parq_question_10', 'PAR-Q pergunta 10'],
  ['parq_completed', 'PAR-Q concluído'],
  ['parq_completion_date', 'Data conclusão PAR-Q'],
  ['contrato_aceito', 'Contrato aceito'],
  ['contrato_aceito_em', 'Data aceite do contrato'],
];

function fmtValor(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  return String(v);
}

/**
 * @param {Array<Record<string, unknown>>} rows - linhas já achatadas (rowAlunoCompleto)
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

  const total = rows.length;
  rows.forEach((row, idx) => {
    const titulo = `Aluno ${idx + 1} / ${total} — ${row.nome_completo || `${row.first_name || ''} ${row.last_name || ''}`.trim() || `#${row.id}`}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const tituloLinhas = doc.splitTextToSize(titulo, maxW);
    const altTitulo = tituloLinhas.length * 4.5 + 3;
    if (y + altTitulo > pageH - 12) {
      doc.addPage();
      y = margin;
    }
    doc.text(tituloLinhas, margin, y);
    y += tituloLinhas.length * 4.5 + 3;

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
    y += 6;
  });

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

  const headM = ['ID', 'Aluno', 'Valor', 'Valor pago', 'Venc.', 'Status', 'Pagamento'];
  const bodyM = mensList.map((m) => {
    const nome =
      m.aluno_nome ||
      (typeof m.aluno === 'object' && m.aluno
        ? `${m.aluno.first_name || ''} ${m.aluno.last_name || ''}`.trim()
        : '');
    return [
      String(m.id),
      nome,
      fmtMoney(m.valor),
      m.valor_pago != null ? fmtMoney(m.valor_pago) : '—',
      m.data_vencimento || '—',
      String(m.status || ''),
      m.data_pagamento ? String(m.data_pagamento) : '—',
    ];
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Mensalidades', 14, startY - 2);
  autoTable(doc, {
    startY: startY + 2,
    head: [headM],
    body: bodyM.length ? bodyM : [['—', 'Nenhuma mensalidade no período', '', '', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: [31, 108, 134], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 1 },
    margin: { left: 14, right: 14 },
  });

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
