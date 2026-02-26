import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  User, 
  LoginResponse, 
  ApiResponse, 
  Turma, 
  Mensalidade, 
  HistoricoPagamentos, 
  PainelAluno,
  Despesa,
  Salario,
  FinanceiroDashboard,
  PixPayment,
  BoletoPayment,
  CheckoutPayment,
  VerificarCheckinResponse,
  RegistrarPresencaResponse,
  PresencaRelatorioResponse,
  PresencaRelatorioItem,
  HistoricoAulasProfessorResponse,
  PreCadastro,
  PainelGerente,
  CentroTreinamento,
  SuperaNews,
  GaleriaFoto
} from '../types';
import CONFIG from '../config';

const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: CONFIG.TIMEOUTS.API_REQUEST,
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Aqui você pode redirecionar para a tela de login
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('usuarios/login/', { cpf: username, password });
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('usuarios/logout/');
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      // Tenta usar o endpoint de profile, se não existir, usa o endpoint de alunos
      const response = await api.get('alunos/painel-aluno/');
      return response.data.usuario;
    } catch (error) {
      return null;
    }
  },

  solicitarRecuperacaoSenha: async (cpf: string): Promise<{ message: string }> => {
    const response = await api.post('usuarios/esqueci-senha/', { cpf });
    return response.data;
  },

  redefinirSenha: async (
    uidb64: string,
    token: string,
    newPassword1: string,
    newPassword2: string
  ): Promise<{ message: string }> => {
    const response = await api.post(`usuarios/redefinir-senha/${uidb64}/${token}/`, {
      new_password1: newPassword1,
      new_password2: newPassword2,
    });
    return response.data;
  },

  ativarConta: async (
    uidb64: string,
    token: string,
    newPassword1: string,
    newPassword2: string
  ): Promise<{ message: string; user: User }> => {
    const response = await api.post(`usuarios/ativar-conta/${uidb64}/${token}/`, {
      new_password1: newPassword1,
      new_password2: newPassword2,
    });
    return response.data;
  },

  reenviarConvite: async (usuarioId: number): Promise<{ message: string }> => {
    const response = await api.post(`usuarios/reenviar-convite/${usuarioId}/`);
    return response.data;
  },
};

export const userService = {
  getProfile: async (): Promise<User> => {
    // Usa o painel do aluno para obter os dados do usuário
    const response = await api.get('alunos/painel-aluno/');
    return response.data.usuario;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put(`usuarios/${data.id}/`, data);
    return response.data;
  },

  uploadPhoto: async (userId: number, photo: any): Promise<User> => {
    const formData = new FormData();
    formData.append('foto_perfil', photo);
    
    const response = await api.put(`usuarios/${userId}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const turmaService = {
  getTurmas: async (params?: any): Promise<Turma[]> => {
    const response = await api.get('turmas/', { params });
    return response.data.results || response.data;
  },

  getTurmaById: async (id: number): Promise<Turma> => {
    const response = await api.get(`turmas/${id}/`);
    return response.data;
  },

  criarTurma: async (data: Partial<Turma>): Promise<Turma> => {
    const response = await api.post('turmas/', data);
    return response.data;
  },

  atualizarTurma: async (id: number, data: Partial<Turma>): Promise<Turma> => {
    const response = await api.put(`turmas/${id}/`, data);
    return response.data;
  },

  excluirTurma: async (id: number): Promise<void> => {
    await api.delete(`turmas/${id}/`);
  },

  getAlunosTurma: async (turmaId: number): Promise<User[]> => {
    const response = await api.get(`turmas/${turmaId}/alunos/`);
    return response.data;
  },

  adicionarAlunos: async (turmaId: number, alunosIds: number[]): Promise<{ message: string }> => {
    const response = await api.post(`turmas/${turmaId}/adicionar-alunos/`, {
      alunos: alunosIds,
    });
    return response.data;
  },

  removerAlunos: async (turmaId: number, alunosIds: number[]): Promise<{ message: string }> => {
    const response = await api.post(`turmas/${turmaId}/remover-alunos/`, {
      alunos: alunosIds,
    });
    return response.data;
  },

  getDiasSemana: async (): Promise<Array<{ id: number; nome: string }>> => {
    const response = await api.get('turmas/diassemana/');
    return response.data;
  },
};

export const ctService = {
  listarCTs: async (): Promise<CentroTreinamento[]> => {
    const response = await api.get('cts/');
    return response.data;
  },

  obterCT: async (id: number): Promise<CentroTreinamento> => {
    const response = await api.get(`cts/${id}/`);
    return response.data;
  },

  criarCT: async (data: Partial<CentroTreinamento>): Promise<CentroTreinamento> => {
    const response = await api.post('cts/criar/', data);
    return response.data;
  },

  atualizarCT: async (id: number, data: Partial<CentroTreinamento>): Promise<CentroTreinamento> => {
    const response = await api.put(`cts/editar/${id}/`, data);
    return response.data;
  },

  excluirCT: async (id: number): Promise<void> => {
    await api.delete(`cts/excluir/${id}/`);
  },
};

export const superaNewsService = {
  listarNoticias: async (): Promise<SuperaNews[]> => {
    const response = await api.get('cts/supera-news/');
    return response.data;
  },

  criarNoticia: async (data: FormData): Promise<SuperaNews> => {
    const response = await api.post('cts/supera-news/criar/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  atualizarNoticia: async (id: number, data: FormData): Promise<SuperaNews> => {
    const response = await api.put(`cts/supera-news/editar/${id}/`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  excluirNoticia: async (id: number): Promise<void> => {
    await api.delete(`cts/supera-news/excluir/${id}/`);
  },
};

export const galeriaService = {
  listarFotos: async (): Promise<GaleriaFoto[]> => {
    const response = await api.get('cts/galeria/');
    return response.data;
  },

  criarFoto: async (data: FormData): Promise<GaleriaFoto> => {
    const response = await api.post('cts/galeria/criar/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  atualizarFoto: async (id: number, data: FormData): Promise<GaleriaFoto> => {
    const response = await api.put(`cts/galeria/editar/${id}/`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  excluirFoto: async (id: number): Promise<void> => {
    await api.delete(`cts/galeria/excluir/${id}/`);
  },
};

export const professorService = {
  listarProfessores: async (): Promise<User[]> => {
    const response = await api.get('usuarios/', { params: { tipo: 'professor' } });
    return response.data.results || response.data;
  },
};

export const presencaService = {
  verificarCheckin: async (turmaId: number): Promise<VerificarCheckinResponse> => {
    const response = await api.get(`funcionarios/verificar-checkin/${turmaId}/`);
    return response.data;
  },

  registrarPresenca: async (turmaId: number, alunosIds: string[]): Promise<RegistrarPresencaResponse> => {
    const response = await api.post(`funcionarios/registrar-presenca/${turmaId}/`, {
      presenca: alunosIds,
    });
    return response.data;
  },

  gerarRelatorioPresenca: async (params?: any): Promise<PresencaRelatorioResponse> => {
    const response = await api.get('funcionarios/relatorio-presenca/', { params });
    return response.data;
  },

  corrigirPresenca: async (
    presencaId: number,
    data: Partial<Pick<PresencaRelatorioItem, 'checkin_realizado' | 'presenca_confirmada'>>
  ): Promise<PresencaRelatorioItem> => {
    const response = await api.patch(`funcionarios/corrigir-presenca/${presencaId}/`, data);
    return response.data;
  },
};

export const financeiroService = {
  getMensalidades: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await api.get('financeiro/mensalidades/', { params });
    return response.data;
  },

  getMensalidadeById: async (id: number): Promise<Mensalidade> => {
    const response = await api.get(`financeiro/mensalidades/${id}/`);
    return response.data;
  },

  criarMensalidade: async (data: Partial<Mensalidade>): Promise<Mensalidade> => {
    const response = await api.post('financeiro/mensalidades/', data);
    return response.data;
  },

  atualizarMensalidade: async (id: number, data: Partial<Mensalidade>): Promise<Mensalidade> => {
    const response = await api.put(`financeiro/mensalidades/${id}/`, data);
    return response.data;
  },

  excluirMensalidade: async (id: number): Promise<void> => {
    await api.delete(`financeiro/mensalidades/${id}/`);
  },

  darBaixaMensalidade: async (id: number): Promise<Mensalidade> => {
    const response = await api.post(`financeiro/mensalidades/${id}/dar-baixa/`);
    return response.data.mensalidade;
  },

  getDashboardStats: async (params?: any): Promise<FinanceiroDashboard> => {
    const response = await api.get('financeiro/dashboard/', { params });
    return response.data;
  },

  getRelatorioFinanceiro: async (params?: any): Promise<any> => {
    const response = await api.get('financeiro/relatorio/', { params });
    return response.data;
  },

  getDespesas: async (params?: any): Promise<Despesa[]> => {
    const response = await api.get('financeiro/despesas/', { params });
    return response.data.results || response.data.despesas || response.data;
  },

  criarDespesa: async (data: Partial<Despesa>): Promise<Despesa> => {
    const response = await api.post('financeiro/despesas/', data);
    return response.data;
  },

  atualizarDespesa: async (id: number, data: Partial<Despesa>): Promise<Despesa> => {
    const response = await api.put(`financeiro/despesas/${id}/`, data);
    return response.data;
  },

  excluirDespesa: async (id: number): Promise<void> => {
    await api.delete(`financeiro/despesas/${id}/`);
  },

  getSalarios: async (params?: any): Promise<Salario[]> => {
    const response = await api.get('financeiro/salarios/', { params });
    return response.data.results || response.data.salarios || response.data;
  },

  marcarSalarioPago: async (id: number): Promise<Salario> => {
    const response = await api.patch(`financeiro/salarios/${id}/`, { status: 'pago' });
    return response.data;
  },
};

export const funcionarioService = {
  getPainelProfessor: async (): Promise<User> => {
    const response = await api.get('funcionarios/painel-professor/');
    return response.data;
  },

  getPainelGerente: async (): Promise<PainelGerente> => {
    const response = await api.get('funcionarios/painel-gerente/');
    return response.data;
  },

  atualizarDadosProfessor: async (data: Partial<User>): Promise<User> => {
    const response = await api.put('funcionarios/atualizar-dados-professor/', data);
    return response.data;
  },

  atualizarDadosGerente: async (data: Partial<User>): Promise<User> => {
    const response = await api.put('funcionarios/atualizar-dados-gerente/', data);
    return response.data;
  },

  listarPrecadastros: async (): Promise<PreCadastro[]> => {
    const response = await api.get('funcionarios/listar-precadastros/');
    return response.data;
  },

  converterPrecadastro: async (precadastroId: number): Promise<{ message: string }> => {
    const response = await api.post(`funcionarios/converter-precadastro/${precadastroId}/`);
    return response.data;
  },

  getHistoricoAulasProfessor: async (): Promise<HistoricoAulasProfessorResponse> => {
    const response = await api.get('funcionarios/historico-aulas-professor/');
    return response.data;
  },
};

export const usuarioService = {
  listarUsuarios: async (params?: any): Promise<ApiResponse<User[]>> => {
    const response = await api.get('usuarios/', { params });
    return response.data;
  },

  listarAlunos: async (params?: any): Promise<User[]> => {
    const response = await api.get('usuarios/', { params: { ...params, tipo: 'aluno' } });
    return response.data.results || response.data;
  },

  obterUsuario: async (id: number): Promise<User> => {
    const response = await api.get(`usuarios/${id}/`);
    return response.data;
  },

  criarUsuario: async (data: Partial<User>): Promise<User> => {
    const response = await api.post('usuarios/', data);
    return response.data;
  },

  atualizarUsuario: async (id: number, data: Partial<User>): Promise<User> => {
    const response = await api.put(`usuarios/${id}/`, data);
    return response.data;
  },

  excluirUsuario: async (id: number): Promise<void> => {
    await api.delete(`usuarios/${id}/`);
  },

  resetParq: async (id: number): Promise<User> => {
    const response = await api.patch(`usuarios/${id}/`, {
      parq_completed: false,
      parq_completion_date: null,
    });
    return response.data;
  },

  listarPrecadastros: async (): Promise<PreCadastro[]> => {
    const response = await api.get('usuarios/precadastros/');
    return response.data.results || response.data;
  },

  criarPrecadastro: async (data: Partial<PreCadastro>): Promise<PreCadastro> => {
    const response = await api.post('usuarios/precadastros/', data);
    return response.data;
  },

  atualizarPrecadastro: async (id: number, data: Partial<PreCadastro>): Promise<PreCadastro> => {
    const response = await api.put(`usuarios/precadastros/${id}/`, data);
    return response.data;
  },

  excluirPrecadastro: async (id: number): Promise<void> => {
    await api.delete(`usuarios/precadastros/${id}/`);
  },

  finalizarAgendamento: async (precadastroId: number, data: any): Promise<{ message: string }> => {
    const response = await api.post(`usuarios/finalizar-agendamento/${precadastroId}/`, data);
    return response.data;
  },
};

export const alunoService = {
  getPainelAluno: async (): Promise<PainelAluno> => {
    const response = await api.get('alunos/painel-aluno/');
    return response.data;
  },

  getHistoricoPagamentos: async (): Promise<HistoricoPagamentos> => {
    const response = await api.get('alunos/historico-pagamentos/');
    return response.data;
  },

  verificarPagamentoEmDia: async (): Promise<{ pagamento_em_dia: boolean }> => {
    const response = await api.get('alunos/pagamento-em-dia/');
    return response.data;
  },

  realizarCheckin: async (): Promise<{ message: string }> => {
    const response = await api.post('alunos/realizar-checkin/');
    return response.data;
  },

  realizarPagamento: async (mensalidadeId: number): Promise<{ message: string; mensalidade: Mensalidade }> => {
    const response = await api.post(`alunos/realizar-pagamento/${mensalidadeId}/`);
    return response.data;
  },
};

export const pagamentoService = {
  gerarPix: async (mensalidadeId: number, expiracaoMinutos?: number): Promise<PixPayment> => {
    const response = await api.post(`financeiro/pix/gerar/${mensalidadeId}/`, {
      expiracao_minutos: expiracaoMinutos || 30,
    });
    return response.data;
  },

  consultarStatusPix: async (transacaoId: number): Promise<any> => {
    const response = await api.get(`financeiro/pix/status/${transacaoId}/`);
    return response.data;
  },

  gerarBoleto: async (mensalidadeId: number): Promise<BoletoPayment> => {
    const response = await api.post(`financeiro/mensalidades/${mensalidadeId}/gerar-boleto/`);
    return response.data;
  },

  consultarBoleto: async (transacaoId: number): Promise<any> => {
    const response = await api.get(`financeiro/boletos/${transacaoId}/consultar/`);
    return response.data;
  },

  downloadBoletoPDF: async (transacaoId: number): Promise<string> => {
    const response = await api.get(`financeiro/boletos/${transacaoId}/pdf/`, {
      responseType: 'blob',
    });
    // Retorna a URL do PDF ou o blob
    return response.data;
  },

  criarCheckout: async (mensalidadeId: number): Promise<CheckoutPayment> => {
    const response = await api.post(`financeiro/pagamento-bancario/gerar/${mensalidadeId}/`);
    return response.data;
  },

  consultarCheckout: async (transacaoId: number): Promise<any> => {
    const response = await api.get(`financeiro/checkout/status/${transacaoId}/`);
    return response.data;
  },
};

export default api; 