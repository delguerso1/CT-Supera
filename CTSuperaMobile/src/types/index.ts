export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  tipo: 'aluno' | 'professor' | 'gerente';
  ativo: boolean;
  telefone?: string;
  endereco?: string;
  data_nascimento?: string;
  nome_responsavel?: string;
  telefone_responsavel?: string;
  telefone_emergencia?: string;
  ficha_medica?: string;
  foto_perfil?: string;
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
}

export interface Turma {
  id?: number;
  professor?: number | null;
  professor_nome?: string;
  ct: number;
  ct_nome?: string;
  horario: string;
  dias_semana: number[] | string[];
  dias_semana_nomes?: string[];
  capacidade_maxima: number;
  alunos_count?: number;
  ativo?: boolean;
  alunos?: User[];
}

export interface CentroTreinamento {
  id?: number;
  nome: string;
  endereco?: string;
  telefone?: string;
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

export interface Mensalidade {
  id: number;
  aluno: number;
  aluno_nome?: string;
  valor: number;
  data_vencimento: string;
  status: 'pendente' | 'pago' | 'atrasado';
  data_pagamento?: string;
}

export interface Despesa {
  id: number;
  descricao: string;
  valor: number;
  data: string;
}

export interface Salario {
  id: number;
  professor: number | User;
  valor: number;
  status: 'pendente' | 'pago';
  data_pagamento?: string;
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
    codigo_barras: string;
    linha_digitavel: string;
    data_vencimento: string;
    pdf_url?: string;
  };
}

export interface CheckoutPayment {
  message: string;
  checkout: {
    id: string;
    valor: string;
    status: string;
    payment_url: string;
    expires_at: string;
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
  id: number;
  nome: string;
  username: string;
  checkin_realizado: boolean;
  presenca_confirmada: boolean;
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
  criado_em: string;
  data_nascimento?: string;
}

export interface PainelGerente {
  alunos_ativos: number;
  professores: number;
  mensalidades_pendentes: number;
  mensalidades_atrasadas: number;
  mensalidades_pagas: number;
  precadastros: number;
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
  data: T;
  message?: string;
  error?: string;
}

export interface NavigationProps {
  navigation: any;
  route: any;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
} 