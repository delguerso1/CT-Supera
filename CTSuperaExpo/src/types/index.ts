export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  cpf?: string;
  tipo: 'aluno' | 'professor' | 'gerente';
  ativo: boolean;
  telefone?: string;
  endereco?: string;
  data_nascimento?: string;
  nome_responsavel?: string;
  telefone_responsavel?: string;
  telefone_emergencia?: string;
  foto_perfil?: string | null;
  parq_question_1?: boolean;
  parq_question_2?: boolean;
  parq_question_3?: boolean;
  parq_question_4?: boolean;
  parq_question_5?: boolean;
  parq_question_6?: boolean;
  parq_question_7?: boolean;
  parq_question_8?: boolean;
  parq_question_9?: boolean;
  parq_question_10?: boolean;
  parq_completed?: boolean;
  parq_completion_date?: string;
  contrato_aceito?: boolean;
  contrato_aceito_em?: string;
  salario_professor?: number;
  pix_professor?: string;
  dia_vencimento?: number;
  valor_mensalidade?: number;
  plano?: string | null;
  dias_habilitados?: number[];
  dias_habilitados_nomes?: string[];
  /** Só para alunos: IDs das turmas vinculadas (até 2 na API) */
  turmas?: number[];
  /** Só para alunos: turmas vinculadas (CT, dias e horário) */
  turmas_vinculadas?: Array<{
    id: number;
    ct_nome: string;
    horario: string;
    dias_semana_nomes: string[];
    ativo?: boolean;
  }>;
}

export interface Turma {
  id?: number;
  /** Formulário local: um professor selecionado */
  professor?: number | null;
  /** Resposta da API (M2M) */
  professores?: number[] | Array<{ id: number }>;
  professor_nomes?: string[];
  /** Legado; preferir professor_nomes */
  professor_nome?: string;
  ct: number;
  ct_nome?: string;
  horario: string;
  dias_semana: number[] | string[];
  dias_semana_nomes?: string[];
  /** Legado / formulário gerencial */
  faixa_etaria?: string;
  capacidade_maxima: number;
  aceita_kids?: boolean;
  aceita_teen?: boolean;
  aceita_adultos?: boolean;
  alunos_count?: number;
  ativo?: boolean;
  alunos?: User[];
  /** Gerente: aluno inadimplente com presença confirmada pelo professor na janela recente (API) */
  alerta_inadimplente_presenca?: boolean;
}

export interface CentroTreinamento {
  id?: number;
  nome: string;
  endereco?: string;
  telefone?: string;
  sem_financeiro?: boolean;
  /** IDs dos dias (API `turmas/diassemana/`) — obrigatório na criação do CT */
  dias_semana?: number[];
  dias_semana_nomes?: string[];
}

export interface SuperaNews {
  id?: number;
  titulo: string;
  descricao: string;
  imagem?: string;
  autor?: number;
  autor_nome?: string;
  data_criacao?: string;
  data_atualizacao?: string;
  ativo?: boolean;
}

export interface GaleriaFoto {
  id?: number;
  titulo: string;
  descricao?: string;
  imagem?: string;
  autor?: number;
  autor_nome?: string;
  data_criacao?: string;
  data_atualizacao?: string;
  ativo?: boolean;
}

/** Candidatura — Trabalhe conosco (lista para gerente) */
export interface CandidaturaTrabalho {
  id: number;
  nome_completo: string;
  email: string;
  telefone: string;
  tipo_vaga: string;
  tipo_vaga_display?: string;
  interesse_praia: boolean;
  interesse_quadra: boolean;
  periodo_ed_fis?: string;
  mensagem?: string;
  data_envio: string;
  curriculo_url?: string | null;
}

export interface Mensalidade {
  id: number;
  /** ID ou objeto (API aninha UsuarioSerializer em listagens) */
  aluno: number | (Pick<User, 'id' | 'first_name' | 'last_name'> & { nome_completo?: string });
  aluno_nome?: string;
  valor: number | string;
  /** Valor com desconto/multa quando exposto pelo backend */
  valor_efetivo?: number | string;
  data_vencimento: string;
  status: 'pendente' | 'pago' | 'atrasado';
  data_pagamento?: string;
  /** Rótulo amigável: PIX, Boleto, Cartão ou Baixa manual (API). */
  forma_pagamento_label?: string;
}

export interface Despesa {
  id: number;
  categoria?: string;
  descricao: string;
  valor: number | string;
  data: string;
}

export interface Salario {
  id: number;
  professor: number | User;
  valor: number;
  status: 'pendente' | 'pago';
  /** Primeiro dia do mês de competência (yyyy-mm-dd). */
  competencia: string;
  /** Preenchido ao marcar como pago. */
  data_pagamento?: string | null;
  mes?: number;
  ano?: number;
}

export interface HistoricoPagamentos {
  mensalidades_vencidas: Mensalidade[];
  mensalidades_vincendas: Mensalidade[];
  mensalidades_pagas: Mensalidade[];
}

export interface PainelAluno {
  usuario: User;
  historico_aulas: any[];
  historico_pagamentos: Mensalidade[];
  pagamento_ok: boolean;
  idade?: number;
  turma?: string;
  status_hoje: {
    checkin_realizado: boolean;
    presenca_confirmada: boolean;
    pode_fazer_checkin: boolean;
    motivo_checkin_bloqueado?: string | null;
    data_aula_checkin?: string | null;
    horario_aula_checkin?: string | null;
  };
}

export interface PixPayment {
  message: string;
  transacao: {
    id: number;
    txid: string;
    valor: string;
    status: string;
    qr_code: string;
    codigo_pix: string;
    data_criacao: string;
    data_expiracao: string;
    descricao: string;
  };
}

export interface BoletoPayment {
  message: string;
  transacao: {
    id: number;
    valor: string;
    status: string;
    boleto_codigo?: string;
    boleto_url?: string;
    data_vencimento?: string;
  };
  boleto?: {
    id?: string;
    digitable_line?: string;
    bar_code?: string;
  };
}

export interface CheckoutPayment {
  message?: string;
  payment_url?: string;
  transacao?: {
    id: number;
    status?: string;
    payment_url?: string;
    data_expiracao?: string;
  };
  checkout?: {
    id?: string;
    status?: string;
    payment_url?: string;
    expires_at?: string;
  };
}

export interface Presenca {
  id: number;
  usuario: number;
  turma: number;
  data: string;
  checkin_realizado: boolean;
  presenca_confirmada: boolean;
}

export interface AlunoPresenca {
  /** ID do aluno (string) ou `precadastro_<id>` para aula experimental */
  id: number | string;
  nome: string;
  username: string;
  tipo?: 'aluno' | 'aula_experimental';
  checkin_realizado: boolean;
  presenca_confirmada: boolean;
  ausencia_registrada?: boolean;
  /** Pode alternar presente/falta no dia (não depende de check-in no app) */
  pode_confirmar_presenca: boolean;
}

export interface VerificarCheckinResponse {
  turma: string;
  data: string;
  alunos: AlunoPresenca[];
}

export interface RegistrarPresencaResponse {
  message: string;
  warning?: string;
  alunos_sem_checkin?: string[];
}

/** Observação interna por turma/dia (professor escreve; gerente lê) */
export interface ObservacaoAulaResponse {
  turma_id: number;
  data: string;
  texto: string | null;
  autor_nome: string | null;
  atualizado_em: string | null;
  pode_editar: boolean;
}

export interface PresencaRelatorioItem {
  id: number;
  aluno_id: number;
  aluno_nome: string;
  turma_id: number;
  turma_nome: string;
  data: string;
  checkin_realizado: boolean;
  presenca_confirmada: boolean;
  ausencia_registrada?: boolean;
}

export interface PresencaRelatorioResponse {
  total_registros: number;
  total_checkins: number;
  total_confirmadas: number;
  total_faltas?: number;
  presencas: PresencaRelatorioItem[];
}

export interface HistoricoAulasProfessorItem {
  turma: Turma;
  datas: string[];
}

export interface HistoricoAulasProfessorResponse {
  historico: HistoricoAulasProfessorItem[];
}

export interface DashboardStats {
  alunosAtivos: number;
  professores: number;
  mensalidadesPendentes: number;
  mensalidadesAtrasadas: number;
  mensalidadesPagas: number;
  precadastros: number;
  turmas: Turma[];
  atividades_recentes: Activity[];
}

export interface PreCadastro {
  id: number;
  nome?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  telefone?: string;
  cpf?: string;
  status: 'pendente' | 'matriculado' | 'cancelado';
  origem?: 'aula_experimental' | 'ex_aluno' | 'formulario';
  origem_display?: string;
  criado_em: string;
  data_nascimento?: string;
  data_aula_experimental?: string;
}

export interface PainelGerente {
  alunos_ativos: number;
  alunos_inativos: number;
  professores: number;
  mensalidades_pendentes: number;
  mensalidades_atrasadas_mes_corrente: number;
  mensalidades_atrasadas_mais_30_dias: number;
  mensalidades_pagas: number;
  precadastros: number;
  aulas_experimentais_futuras: number;
  aulas_experimentais_ocorridas: number;
  aulas_experimentais_futuras_nomes?: string[];
  aulas_experimentais_ocorridas_nomes?: string[];
  mensalidades_atrasadas_mes_corrente_nomes?: string[];
  mensalidades_atrasadas_mais_30_dias_nomes?: string[];
  turmas: Turma[];
  atividades_recentes: Activity[];
  first_name: string;
  last_name: string;
  email: string;
  cpf?: string;
  username?: string;
  telefone?: string;
  endereco?: string;
  data_nascimento?: string;
  foto_perfil?: string;
  ativo: boolean;
  id: number;
}

export interface FinanceiroDashboard {
  total_pago: number;
  total_despesas: number;
  total_salarios: number;
  total_salarios_pagos: number;
  saldo_final: number;
  meses?: number[];
}

export interface Activity {
  id: string;
  type: 'aluno' | 'mensalidade';
  description: string;
  data: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  data?: T;
  /** Respostas paginadas (Django REST) */
  results?: T extends (infer U)[] ? U[] : never;
  message?: string;
  error?: string;
}

export interface NavigationProps {
  navigation: any;
  route: any;
  /** Renderização dentro do shell do gerente (sem SafeScreen próprio). */
  embedded?: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void | Promise<void>;
  loading: boolean;
} 