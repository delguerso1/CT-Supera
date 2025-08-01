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
  ficha_medica?: string;
  foto_perfil?: string;
  salario_professor?: number;
  pix_professor?: string;
  dia_vencimento?: number;
  valor_mensalidade?: number;
}

export interface Turma {
  id: number;
  professor: number;
  professor_nome: string;
  ct: number;
  ct_nome: string;
  horario: string;
  dias_semana: string[];
  dias_semana_nomes: string[];
  capacidade_maxima: number;
  alunos_count: number;
  ativo: boolean;
  alunos?: User[];
}

export interface CentroTreinamento {
  id: number;
  nome: string;
  endereco: string;
  telefone: string;
  email: string;
  ativo: boolean;
}

export interface Mensalidade {
  id: number;
  aluno: number;
  aluno_nome: string;
  valor: number;
  data_vencimento: string;
  status: 'pendente' | 'pago' | 'atrasado';
  data_pagamento?: string;
}

export interface Presenca {
  id: number;
  usuario: number;
  turma: number;
  data: string;
  checkin_realizado: boolean;
  presenca_confirmada: boolean;
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