import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { funcionarioService, financeiroService, turmaService, usuarioService, userService, presencaService } from '../services/api';
import {
  User,
  PainelGerente,
  Mensalidade,
  Despesa,
  Salario,
  FinanceiroDashboard,
  Turma,
  PresencaRelatorioResponse,
  PresencaRelatorioItem,
  ObservacaoAulaResponse,
} from '../types';
import { NavigationProps } from '../types';
import CONFIG from '../config';
import { pickImageFromLibrary } from '../utils/pickImageFromLibrary';
import SafeScreen from '../components/SafeScreen';
import { colors } from '../theme';
import { nomeAlunoMensalidade } from '../utils/nomeAlunoMensalidade';
import { formatarErroApi } from '../utils/apiError';
import {
  formatarDataBrMascara,
  isoParaBrDisplay,
  normalizarDataNascimentoParaApi,
} from '../utils/dataNascimento';

/** Navegação a partir do dashboard embutido no shell do gerente (abas topo/fundo). */
export type GerenteNavigateTarget =
  | {
      area: 'top';
      tab: 'dashboard' | 'perfil' | 'usuarios' | 'financeiro' | 'relatorios';
      usuariosTab?: 'alunos' | 'professores' | 'gerentes' | 'precadastros';
      openRelatorioPanel?: 'presenca' | 'alunos' | 'turmas';
    }
  | {
      area: 'bottom';
      tab: 'cts' | 'turmas' | 'news' | 'galeria' | 'candidatos';
    };

type DashboardGerenteProps = NavigationProps & {
  embedded?: boolean;
  shellActiveTop?: 'dashboard' | 'perfil' | 'financeiro' | 'relatorios';
  onGerenteNavigate?: (target: GerenteNavigateTarget) => void;
  /** Definido pelo shell ao abrir Relatórios a partir de um card do dashboard */
  pendingRelatorioPanel?: 'presenca' | 'alunos' | 'turmas' | null;
  onPendingRelatorioPanelConsumed?: () => void;
};

const DashboardGerenteScreen: React.FC<DashboardGerenteProps> = ({
  navigation,
  route,
  embedded,
  shellActiveTop,
  onGerenteNavigate,
  pendingRelatorioPanel,
  onPendingRelatorioPanelConsumed,
}) => {
  const { user, logout } = useAuth();
  const [painelGerente, setPainelGerente] = useState<PainelGerente | null>(null);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [salarios, setSalarios] = useState<Salario[]>([]);
  const [dashboardFinanceiro, setDashboardFinanceiro] = useState<FinanceiroDashboard | null>(null);
  const [alunos, setAlunos] = useState<User[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingFinanceiro, setLoadingFinanceiro] = useState(false);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'financeiro' | 'relatorios' | 'perfil'>('dashboard');
  const prevActiveSectionRef = useRef<typeof activeSection | null>(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [presencaRelatorio, setPresencaRelatorio] = useState<PresencaRelatorioResponse | null>(null);
  const [loadingPresencaRelatorio, setLoadingPresencaRelatorio] = useState(false);
  const [loadingRelatorios, setLoadingRelatorios] = useState(false);
  const [filtroPresencaInicio, setFiltroPresencaInicio] = useState('');
  const [filtroPresencaFim, setFiltroPresencaFim] = useState('');
  const [filtroPresencaTurmaId, setFiltroPresencaTurmaId] = useState<number | null>(null);
  const [filtroPresencaBusca, setFiltroPresencaBusca] = useState('');
  const [showPresencaTurmaModal, setShowPresencaTurmaModal] = useState(false);
  const [corrigindoPresenca, setCorrigindoPresenca] = useState<{ [key: number]: boolean }>({});
  const [filtroObservacaoData, setFiltroObservacaoData] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [observacaoGerente, setObservacaoGerente] = useState<ObservacaoAulaResponse | null>(null);
  const [loadingObservacaoGerente, setLoadingObservacaoGerente] = useState(false);
  const [filtroAlunoBusca, setFiltroAlunoBusca] = useState('');
  const [filtroTurmaBusca, setFiltroTurmaBusca] = useState('');
  /** Acordeão na aba Relatórios: uma seção aberta por vez reduz poluição visual */
  const [relatorioPainelAberto, setRelatorioPainelAberto] = useState<'presenca' | 'alunos' | 'turmas' | null>(
    'presenca'
  );
  const [showDespesaModal, setShowDespesaModal] = useState(false);
  const [editDespesa, setEditDespesa] = useState<Despesa | null>(null);
  const [savingDespesa, setSavingDespesa] = useState(false);
  const [despesaForm, setDespesaForm] = useState({
    categoria: 'outros',
    descricao: '',
    valor: '',
    data: '',
  });
  const CATEGORIAS_DESPESAS = [
    { value: 'salario', label: 'Salário' },
    { value: 'aluguel', label: 'Aluguel' },
    { value: 'materiais', label: 'Materiais' },
    { value: 'outros', label: 'Outros' },
  ];
  const [editProfile, setEditProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [fotoPerfil, setFotoPerfil] = useState<any>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefone: '',
    endereco: '',
    data_nascimento: '',
  });
  const [notifTitulo, setNotifTitulo] = useState('');
  const [notifMensagem, setNotifMensagem] = useState('');
  const [notifStats, setNotifStats] = useState<{
    alunos_com_app: number;
    tokens_registrados: number;
    dispositivos_no_servidor?: number;
  } | null>(null);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [aumentoMensalidadeValor, setAumentoMensalidadeValor] = useState('');
  const [aumentoMensalidadeLoading, setAumentoMensalidadeLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadGerenteData();
    }
  }, [user]);

  useEffect(() => {
    const prev = prevActiveSectionRef.current;
    prevActiveSectionRef.current = activeSection;
    if (
      prev != null &&
      activeSection === 'dashboard' &&
      prev !== 'dashboard' &&
      user
    ) {
      void loadGerenteData({ silent: true, suppressErrorAlert: true });
    }
  }, [activeSection, user]);

  // Shell do gerente ou Tab Navigator: mesma seção (Dashboard / Perfil / Financeiro / Relatórios)
  useEffect(() => {
    if (shellActiveTop) {
      setActiveSection(shellActiveTop);
      return;
    }
    const n = route?.name as string | undefined;
    if (!n) return;
    if (n === 'Dashboard') setActiveSection('dashboard');
    else if (n === 'Perfil') setActiveSection('perfil');
    else if (n === 'Financeiro') setActiveSection('financeiro');
    else if (n === 'Relatórios') setActiveSection('relatorios');
  }, [route?.name, shellActiveTop]);

  /** Abre o painel correto em Relatórios quando o utilizador toca num card no dashboard */
  useEffect(() => {
    if (pendingRelatorioPanel && activeSection === 'relatorios') {
      setRelatorioPainelAberto(pendingRelatorioPanel);
      onPendingRelatorioPanelConsumed?.();
    }
  }, [pendingRelatorioPanel, activeSection, onPendingRelatorioPanelConsumed]);

  useEffect(() => {
    if (activeSection === 'financeiro' && user) {
      loadFinanceiroData();
    }
    if (activeSection === 'relatorios' && user) {
      loadRelatoriosData();
    }
  }, [activeSection, user, mes, ano]);

  useEffect(() => {
    if (
      activeSection !== 'relatorios' ||
      relatorioPainelAberto !== 'presenca' ||
      filtroPresencaTurmaId == null ||
      !user
    ) {
      setObservacaoGerente(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingObservacaoGerente(true);
        const r = await presencaService.getObservacaoAula(filtroPresencaTurmaId, filtroObservacaoData);
        if (!cancelled) setObservacaoGerente(r);
      } catch {
        if (!cancelled) setObservacaoGerente(null);
      } finally {
        if (!cancelled) setLoadingObservacaoGerente(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSection, relatorioPainelAberto, filtroPresencaTurmaId, filtroObservacaoData, user]);

  const loadNotifStats = async () => {
    try {
      const s = await usuarioService.getNotificacaoAppEstatisticas();
      setNotifStats(s);
    } catch {
      setNotifStats(null);
    }
  };

  const loadGerenteData = async (opts?: { silent?: boolean; suppressErrorAlert?: boolean }) => {
    const silent = Boolean(opts?.silent);
    try {
      if (!silent) {
        setLoading(true);
      }
      const painelData = await funcionarioService.getPainelGerente();
      setPainelGerente(painelData);
      setProfileForm({
        first_name: painelData.first_name || '',
        last_name: painelData.last_name || '',
        email: painelData.email || '',
        telefone: painelData.telefone || '',
        endereco: painelData.endereco || '',
        data_nascimento: isoParaBrDisplay(painelData.data_nascimento),
      });
      await loadNotifStats();
    } catch (error: any) {
      console.error('Erro ao carregar painel do gerente:', error);
      if (!opts?.suppressErrorAlert) {
        Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar dados do gerente.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const buildFinanceiroParams = () => ({ mes, ano });

  const loadMensalidades = async () => {
    try {
      const response = await financeiroService.getMensalidades({ ...buildFinanceiroParams(), page_size: 500 });
      const data = response as any;
      const resolved = Array.isArray(data) ? data : data.results || data.mensalidades || data.data || [];
      setMensalidades(resolved);
    } catch (error: any) {
      console.error('Erro ao carregar mensalidades:', error);
    }
  };

  const loadDashboardFinanceiro = async () => {
    try {
      const dashboardData = await financeiroService.getDashboardStats(buildFinanceiroParams());
      setDashboardFinanceiro(dashboardData);
    } catch (error: any) {
      console.error('Erro ao carregar dashboard financeiro:', error);
    }
  };

  const loadDespesas = async () => {
    try {
      const despesasData = await financeiroService.getDespesas(buildFinanceiroParams());
      setDespesas(despesasData);
    } catch (error: any) {
      console.error('Erro ao carregar despesas:', error);
    }
  };

  const loadSalarios = async () => {
    try {
      const salariosData = await financeiroService.getSalarios(buildFinanceiroParams());
      setSalarios(salariosData);
    } catch (error: any) {
      console.error('Erro ao carregar salários:', error);
    }
  };

  const loadFinanceiroData = async () => {
    try {
      setLoadingFinanceiro(true);
      await Promise.all([
        loadDashboardFinanceiro(),
        loadMensalidades(),
        loadDespesas(),
        loadSalarios(),
      ]);
    } finally {
      setLoadingFinanceiro(false);
    }
  };

  const loadAlunos = async () => {
    try {
      const alunosData = await usuarioService.listarAlunos();
      setAlunos(alunosData);
    } catch (error: any) {
      console.error('Erro ao carregar alunos:', error);
    }
  };

  const loadTurmas = async () => {
    try {
      const turmasData = await turmaService.getTurmas();
      setTurmas(turmasData);
    } catch (error: any) {
      console.error('Erro ao carregar turmas:', error);
      setTurmas([]);
    }
  };

  const loadRelatoriosData = async () => {
    try {
      setLoadingRelatorios(true);
      await Promise.all([loadTurmas(), loadAlunos()]);
    } finally {
      setLoadingRelatorios(false);
    }
  };

  const handleEnviarNotificacaoApp = async () => {
    const t = notifTitulo.trim();
    const m = notifMensagem.trim();
    if (!t) {
      Alert.alert('Validação', 'Informe o título da notificação.');
      return;
    }
    if (!m) {
      Alert.alert('Validação', 'Informe o texto da mensagem.');
      return;
    }
    try {
      setSendingNotif(true);
      const r = await usuarioService.enviarNotificacaoAlunosApp(t, m);
      const okCount = (r as any).tickets_enviados_ok ?? r.destinatarios_tokens ?? 0;
      Alert.alert(
        'Enviado',
        `Notificação aceita pela Expo para ${okCount} envio(s). Dispositivos com token: ${r.destinatarios_tokens ?? 0}.`
      );
      setNotifTitulo('');
      setNotifMensagem('');
      await loadNotifStats();
    } catch (e: any) {
      Alert.alert('Erro', formatarErroApi(e));
    } finally {
      setSendingNotif(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGerenteData({ silent: true });
    if (activeSection === 'financeiro') await loadFinanceiroData();
    if (activeSection === 'relatorios') await loadRelatoriosData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair do aplicativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', onPress: logout, style: 'destructive' }
      ]
    );
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatCurrency = (value: number | string | undefined | null) => {
    const safeValue = Number(value || 0);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(safeValue);
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const parts = String(value).split('-');
    if (parts.length === 3 && parts.every(part => part.length > 0)) {
      const [year, month, day] = parts.map(Number);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
      }
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('pt-BR');
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const normalizeSearch = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const getProfessorNome = (professor: number | User) => {
    if (typeof professor === 'object') {
      const nome = `${professor.first_name || ''} ${professor.last_name || ''}`.trim();
      return nome || `Professor #${professor.id}`;
    }
    return `Professor #${professor}`;
  };

  const handleMesAnterior = () => {
    setMes(prev => {
      if (prev === 1) {
        setAno(current => current - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const handleMesProximo = () => {
    setMes(prev => {
      if (prev === 12) {
        setAno(current => current + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  const handleNovaDespesa = () => {
    setEditDespesa(null);
    setDespesaForm({ categoria: 'outros', descricao: '', valor: '', data: '' });
    setShowDespesaModal(true);
  };

  const handleEditarDespesa = (despesa: Despesa) => {
    setEditDespesa(despesa);
    setDespesaForm({
      categoria: despesa.categoria || 'outros',
      descricao: despesa.descricao,
      valor: String(despesa.valor ?? ''),
      data: despesa.data,
    });
    setShowDespesaModal(true);
  };

  const handleSalvarDespesa = async () => {
    if (!despesaForm.categoria || !despesaForm.descricao.trim() || !despesaForm.valor || !despesaForm.data) {
      Alert.alert('Erro', 'Preencha categoria, descrição, valor e data.');
      return;
    }

    try {
      setSavingDespesa(true);
      const payload = {
        categoria: despesaForm.categoria,
        descricao: despesaForm.descricao.trim(),
        valor: Number(despesaForm.valor),
        data: despesaForm.data,
      };

      if (editDespesa) {
        await financeiroService.atualizarDespesa(editDespesa.id, payload);
      } else {
        await financeiroService.criarDespesa(payload);
      }

      setShowDespesaModal(false);
      await loadDespesas();
      await loadDashboardFinanceiro();
      Alert.alert('Sucesso', 'Despesa salva com sucesso.');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao salvar despesa.');
    } finally {
      setSavingDespesa(false);
    }
  };

  const handleExcluirDespesa = (despesa: Despesa) => {
    Alert.alert(
      'Excluir despesa',
      `Deseja excluir a despesa "${despesa.descricao}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await financeiroService.excluirDespesa(despesa.id);
              await loadDespesas();
              await loadDashboardFinanceiro();
              Alert.alert('Sucesso', 'Despesa excluída com sucesso.');
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao excluir despesa.');
            }
          },
        },
      ]
    );
  };

  const handlePagarSalario = (salario: Salario) => {
    if (salario.status === 'pago') return;
    Alert.alert(
      'Marcar salário como pago',
      `Deseja marcar o salário de ${getProfessorNome(salario.professor)} como pago?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await financeiroService.marcarSalarioPago(salario.id);
              await loadSalarios();
              await loadDashboardFinanceiro();
              Alert.alert('Sucesso', 'Salário marcado como pago.');
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao atualizar salário.');
            }
          },
        },
      ]
    );
  };

  const handleDarBaixaMensalidade = (mensalidade: Mensalidade) => {
    if (mensalidade.status === 'pago') return;
    Alert.alert(
      'Dar baixa na mensalidade',
      'O pagamento foi recebido em dinheiro ou outra forma?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await financeiroService.darBaixaMensalidade(mensalidade.id);
              await loadMensalidades();
              await loadDashboardFinanceiro();
              Alert.alert('Sucesso', 'Mensalidade dada baixa com sucesso!');
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao dar baixa na mensalidade.');
            }
          },
        },
      ]
    );
  };

  const handleAplicarAumentoMensalidadeGlobal = () => {
    const t = aumentoMensalidadeValor.trim().replace(',', '.');
    const v = parseFloat(t);
    if (!Number.isFinite(v) || v <= 0) {
      Alert.alert('Atenção', 'Informe um valor maior que zero.');
      return;
    }
    const valorFmt = v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    Alert.alert(
      'Confirmar aumento global',
      `Somar R$ ${valorFmt} ao valor de mensalidade no cadastro de cada aluno ativo que já tem valor definido. ` +
        'Mensalidades futuras serão atualizadas; parcelas já vencidas não mudam.\n\nDeseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aplicar',
          onPress: async () => {
            try {
              setAumentoMensalidadeLoading(true);
              await financeiroService.aplicarAumentoMensalidadeGlobal(t);
              setAumentoMensalidadeValor('');
              await loadFinanceiroData();
              await loadAlunos();
              Alert.alert('Sucesso', 'Aumento aplicado com sucesso.');
            } catch (error: any) {
              Alert.alert('Erro', formatarErroApi(error));
            } finally {
              setAumentoMensalidadeLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSelecionarFoto = async () => {
    const res = await pickImageFromLibrary({ quality: 0.8 });
    if (!res.ok) {
      if (res.reason === 'permission') {
        Alert.alert('Permissão', 'É necessário permitir o acesso à galeria de fotos.');
      }
      return;
    }
    const asset = res.asset;
    if (!asset?.uri) return;
    setFotoPerfil(asset);
    setFotoPreview(asset.uri);
  };

  const handleUploadFoto = async () => {
    if (!painelGerente || !fotoPerfil) return;
    try {
      setUploadingFoto(true);
      const photo = {
        uri: fotoPerfil.uri,
        type: fotoPerfil.type || 'image/jpeg',
        name: fotoPerfil.fileName || `foto_${Date.now()}.jpg`,
      };
      await userService.uploadPhoto(painelGerente.id, photo);
      Alert.alert('Sucesso', 'Foto atualizada com sucesso!');
      setFotoPerfil(null);
      setFotoPreview(null);
      await loadGerenteData();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao enviar foto.');
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleCancelarFoto = () => {
    setFotoPerfil(null);
    setFotoPreview(null);
  };

  const handleEditProfile = () => {
    setEditProfile(true);
  };

  const handleCancelEdit = () => {
    setEditProfile(false);
    if (painelGerente) {
      setProfileForm({
        first_name: painelGerente.first_name || '',
        last_name: painelGerente.last_name || '',
        email: painelGerente.email || '',
        telefone: painelGerente.telefone || '',
        endereco: painelGerente.endereco || '',
        data_nascimento: isoParaBrDisplay(painelGerente.data_nascimento),
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!painelGerente) return;
    if (profileForm.data_nascimento.trim()) {
      const isoDigitada = normalizarDataNascimentoParaApi(profileForm.data_nascimento);
      if (!isoDigitada) {
        Alert.alert('Atenção', 'Informe a data de nascimento completa e válida (DD/MM/AAAA).');
        return;
      }
    }
    try {
      setSavingProfile(true);
      const dnIso = normalizarDataNascimentoParaApi(profileForm.data_nascimento);
      const payload: Partial<User> = {
        id: painelGerente.id,
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email,
        telefone: profileForm.telefone,
        endereco: profileForm.endereco,
        data_nascimento: dnIso ?? undefined,
        username: painelGerente.username || painelGerente.cpf || painelGerente.email,
        cpf: painelGerente.cpf,
        tipo: 'gerente',
        ativo: painelGerente.ativo,
      };
      await usuarioService.atualizarUsuario(painelGerente.id, payload);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      setEditProfile(false);
      await loadGerenteData();
    } catch (error: any) {
      Alert.alert('Erro', formatarErroApi(error) || 'Erro ao atualizar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const renderDashboard = () => {
    if (!painelGerente) return null;

    const StatShell: React.FC<{
      children: React.ReactNode;
      onPress?: () => void;
      accessibilityLabel?: string;
    }> = ({ children, onPress, accessibilityLabel }) => {
      if (onGerenteNavigate && onPress) {
        return (
          <TouchableOpacity
            style={[styles.statCard, styles.statCardTouchable]}
            onPress={onPress}
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
          >
            {children}
          </TouchableOpacity>
        );
      }
      return <View style={styles.statCard}>{children}</View>;
    };

    return (
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsGrid}>
          <StatShell
            onPress={() =>
              onGerenteNavigate?.({
                area: 'top',
                tab: 'relatorios',
                openRelatorioPanel: 'alunos',
              })
            }
            accessibilityLabel="Ver relatório de alunos com resumo ativos e inativos"
          >
            <Text style={styles.statTitle}>Alunos</Text>
            <Text style={styles.statValue}>{painelGerente.alunos_ativos || 0}</Text>
            <Text style={styles.statSubtitle}>Ativos</Text>
            <Text style={[styles.statSubtitle, { marginTop: 4 }]}>{painelGerente.alunos_inativos || 0} inativos</Text>
          </StatShell>

          <StatShell
            onPress={() =>
              onGerenteNavigate?.({
                area: 'top',
                tab: 'usuarios',
                usuariosTab: 'professores',
              })
            }
            accessibilityLabel="Abrir gestão de professores"
          >
            <Text style={styles.statTitle}>Professores</Text>
            <Text style={styles.statValue}>{painelGerente.professores || 0}</Text>
          </StatShell>

          <StatShell
            onPress={() =>
              onGerenteNavigate?.({
                area: 'top',
                tab: 'relatorios',
                openRelatorioPanel: 'turmas',
              })
            }
            accessibilityLabel="Ver relatório de turmas com resumo e lista"
          >
            <Text style={styles.statTitle}>Turmas</Text>
            <Text style={styles.statValue}>{painelGerente.turmas?.length || 0}</Text>
          </StatShell>
        </View>

        <View style={styles.statsGrid}>
          <StatShell
            onPress={() => onGerenteNavigate?.({ area: 'top', tab: 'financeiro' })}
            accessibilityLabel="Abrir financeiro e mensalidades pendentes"
          >
            <Text style={styles.statTitle}>Mensalidades Pendentes</Text>
            <Text style={styles.statValue}>{painelGerente.mensalidades_pendentes || 0}</Text>
            <Text style={styles.statSubtitle}>Mês corrente</Text>
          </StatShell>

          <StatShell
            onPress={() => onGerenteNavigate?.({ area: 'top', tab: 'financeiro' })}
            accessibilityLabel="Abrir financeiro e mensalidades atrasadas"
          >
            <Text style={styles.statTitle}>Mensalidades Atrasadas</Text>
            <Text style={[styles.statValue, { color: '#f44336' }]}>
              {painelGerente.mensalidades_atrasadas_mes_corrente || 0} /{' '}
              {painelGerente.mensalidades_atrasadas_mais_30_dias || 0}
            </Text>
            <Text style={styles.statSubtitle}>Mês corrente / +30 dias</Text>
          </StatShell>

          <StatShell
            onPress={() => onGerenteNavigate?.({ area: 'top', tab: 'financeiro' })}
            accessibilityLabel="Abrir financeiro e mensalidades pagas"
          >
            <Text style={styles.statTitle}>Mensalidades Pagas</Text>
            <Text style={[styles.statValue, { color: '#4caf50' }]}>
              {painelGerente.mensalidades_pagas || 0}
            </Text>
            <Text style={styles.statSubtitle}>Mês corrente</Text>
          </StatShell>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificação no app (alunos)</Text>
          <Text style={styles.notifHint}>
            E-mails de cobrança e avisos oficiais continuam pelo sistema web. Aqui você envia um aviso por push para
            todos os perfis de aluno com aparelho registrado (inclui aluno inativado no CT ou conta desativada no
            sistema, se ainda houver token salvo). É preciso ter instalado o app (APK/AAB de produção), ter feito login
            como aluno e aceitado notificações. O registro do aparelho ocorre ao abrir o painel do aluno (ou logo após o
            login).
          </Text>
          {notifStats == null && (
            <Text style={styles.notifStatsWarn}>
              Não foi possível carregar a contagem (rede ou permissão). Puxe para atualizar o painel.
            </Text>
          )}
          {notifStats != null && (
            <>
              <Text style={styles.notifStatsText}>
                Alunos com app registrado: {notifStats.alunos_com_app} ({notifStats.tokens_registrados}{' '}
                dispositivo(s))
              </Text>
              {typeof notifStats.dispositivos_no_servidor === 'number' && (
                <Text style={styles.notifStatsText}>
                  Registros de dispositivo no servidor (qualquer perfil): {notifStats.dispositivos_no_servidor}
                </Text>
              )}
              {notifStats.alunos_com_app === 0 &&
                typeof notifStats.dispositivos_no_servidor === 'number' &&
                notifStats.dispositivos_no_servidor > 0 && (
                  <Text style={styles.notifStatsWarn}>
                    Há tokens salvos, mas nenhum vinculado a perfil de aluno. Quem abriu o app precisa estar logado como
                    aluno (não professor/gerente).
                  </Text>
                )}
            </>
          )}
          <TextInput
            style={styles.input}
            placeholder="Título (ex.: Aula cancelada)"
            value={notifTitulo}
            onChangeText={setNotifTitulo}
            editable={!sendingNotif}
          />
          <TextInput
            style={[styles.input, styles.notifMensagemInput]}
            placeholder="Mensagem"
            value={notifMensagem}
            onChangeText={setNotifMensagem}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!sendingNotif}
          />
          <TouchableOpacity
            style={[styles.notifSendButton, sendingNotif && styles.notifSendButtonDisabled]}
            onPress={handleEnviarNotificacaoApp}
            disabled={sendingNotif}
          >
            {sendingNotif ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.notifSendButtonText}>Enviar para alunos com app</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <StatShell
            onPress={() =>
              onGerenteNavigate?.({
                area: 'top',
                tab: 'usuarios',
                usuariosTab: 'precadastros',
              })
            }
            accessibilityLabel="Abrir pré-cadastros"
          >
            <Text style={styles.statTitle}>Pré-cadastros</Text>
            <Text style={styles.statValue}>{painelGerente.precadastros || 0}</Text>
          </StatShell>

          <StatShell
            onPress={() =>
              onGerenteNavigate?.({
                area: 'top',
                tab: 'usuarios',
                usuariosTab: 'precadastros',
              })
            }
            accessibilityLabel="Abrir pré-cadastros e aulas experimentais"
          >
            <Text style={styles.statTitle}>Aulas Experimentais</Text>
            <Text style={styles.statValue}>
              {painelGerente.aulas_experimentais_futuras || 0} / {painelGerente.aulas_experimentais_ocorridas || 0}
            </Text>
            <Text style={styles.statSubtitle}>Futuras / Já ocorreram</Text>
          </StatShell>
        </View>

        {painelGerente.precadastros > 0 && (
          <View style={styles.section}>
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>
                ⚠️ {painelGerente.precadastros} Pré-cadastro(s) pendente(s)
              </Text>
              <Text style={styles.warningText}>
                Existem pré-cadastros aguardando conversão em alunos. Use a aba Usuários (pré-cadastros) para
                gerenciar.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Atividades Recentes</Text>
          {painelGerente.atividades_recentes?.length === 0 ? (
            <Text style={styles.noData}>Nenhuma atividade recente.</Text>
          ) : (
            painelGerente.atividades_recentes?.slice(0, 5).map(activity => (
              <View key={activity.id} style={styles.activityCard}>
                <Text style={styles.activityDescription}>{activity.description}</Text>
                <Text style={styles.activityDate}>
                  {activity.data && !Number.isNaN(new Date(activity.data).getTime())
                    ? new Date(activity.data).toLocaleDateString('pt-BR')
                    : '-'}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  const renderFinanceiro = () => {
    const totalPendente = mensalidades
      .filter(m => m.status === 'pendente')
      .reduce((total, m) => total + Number(m.valor || 0), 0);
    const totalAtrasado = mensalidades
      .filter(m => m.status === 'atrasado')
      .reduce((total, m) => total + Number(m.valor || 0), 0);
    const totalPago = mensalidades
      .filter(m => m.status === 'pago')
      .reduce((total, m) => total + Number(m.valor || 0), 0);

    return (
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Financeiro</Text>

          <View style={styles.monthControls}>
            <TouchableOpacity style={styles.monthButton} onPress={handleMesAnterior}>
              <Text style={styles.monthButtonText}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {String(mes).padStart(2, '0')}/{ano}
            </Text>
            <TouchableOpacity style={styles.monthButton} onPress={handleMesProximo}>
              <Text style={styles.monthButtonText}>▶</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.yearInput}
              value={String(ano)}
              onChangeText={(value) => {
                const parsed = Number(value);
                if (!Number.isNaN(parsed)) {
                  setAno(parsed);
                }
              }}
              keyboardType="numeric"
              placeholder="Ano"
              maxLength={4}
            />
          </View>

          {loadingFinanceiro && (
            <View style={styles.loadingInline}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingInlineText}>Atualizando dados...</Text>
            </View>
          )}
          
          <View style={styles.financialStats}>
            <View style={styles.financialCard}>
              <Text style={styles.financialTitle}>Total Pendente</Text>
              <Text style={styles.financialValue}>
                {formatCurrency(totalPendente)}
              </Text>
            </View>
            
            <View style={styles.financialCard}>
              <Text style={styles.financialTitle}>Total Atrasado</Text>
              <Text style={[styles.financialValue, { color: '#f44336' }]}>
                {formatCurrency(totalAtrasado)}
              </Text>
            </View>
          </View>

          <View style={styles.financialStats}>
            <View style={[styles.financialCard, { backgroundColor: '#e8f5e9' }]}>
              <Text style={styles.financialTitle}>Total Pago</Text>
              <Text style={[styles.financialValue, { color: '#4caf50' }]}>
                {formatCurrency(totalPago)}
              </Text>
            </View>
            
            <View style={[styles.financialCard, { backgroundColor: '#fff3e0' }]}>
              <Text style={styles.financialTitle}>Total Recebido</Text>
              <Text style={styles.financialValue}>
                {formatCurrency(dashboardFinanceiro?.total_pago)}
              </Text>
            </View>
          </View>

          <View style={styles.financialStats}>
            <View style={[styles.financialCard, { backgroundColor: '#ffebee' }]}>
              <Text style={styles.financialTitle}>Total Despesas</Text>
              <Text style={[styles.financialValue, { color: '#c62828' }]}>
                {formatCurrency(dashboardFinanceiro?.total_despesas)}
              </Text>
            </View>

            <View style={[styles.financialCard, { backgroundColor: '#e3f2fd' }]}>
              <Text style={styles.financialTitle}>Total Salários</Text>
              <Text style={[styles.financialValue, { color: '#1976d2' }]}>
                {formatCurrency(dashboardFinanceiro?.total_salarios)}
              </Text>
              <Text style={styles.financialSubtitle}>
                Pagos: {formatCurrency(dashboardFinanceiro?.total_salarios_pagos)}
              </Text>
            </View>
          </View>

          <View style={styles.financialStats}>
            <View style={[styles.financialCard, { backgroundColor: '#f1f8e9' }]}>
              <Text style={styles.financialTitle}>Saldo Final</Text>
              <Text style={[
                styles.financialValue,
                { color: (dashboardFinanceiro?.saldo_final || 0) >= 0 ? '#2e7d32' : '#c62828' },
              ]}>
                {formatCurrency(dashboardFinanceiro?.saldo_final)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, styles.aumentoMensalidadeSection]}>
          <Text style={styles.sectionTitle}>Aumento de mensalidade (global)</Text>
          <Text style={styles.aumentoMensalidadeHint}>
            O valor será somado ao cadastro de cada aluno ativo que já tem mensalidade definida. Afeta apenas
            mensalidades futuras; parcelas vencidas não são alteradas.
          </Text>
          <View style={styles.aumentoMensalidadeRow}>
            <TextInput
              style={styles.aumentoMensalidadeInput}
              value={aumentoMensalidadeValor}
              onChangeText={setAumentoMensalidadeValor}
              placeholder="Ex.: 10 ou 10,50"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              editable={!aumentoMensalidadeLoading}
            />
            <TouchableOpacity
              style={[styles.aumentoMensalidadeButton, aumentoMensalidadeLoading && styles.buttonDisabled]}
              onPress={handleAplicarAumentoMensalidadeGlobal}
              disabled={aumentoMensalidadeLoading}
            >
              {aumentoMensalidadeLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.aumentoMensalidadeButtonText}>Aplicar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mensalidades</Text>
          {mensalidades.length === 0 ? (
            <Text style={styles.noData}>Nenhuma mensalidade encontrada.</Text>
          ) : (
            mensalidades.map(mensalidade => (
              <View key={mensalidade.id} style={styles.mensalidadeCard}>
                <View style={styles.mensalidadeHeader}>
                  <View style={styles.mensalidadeInfo}>
                    <Text style={styles.mensalidadeAluno}>
                      {nomeAlunoMensalidade(mensalidade)}
                    </Text>
                    <Text style={styles.mensalidadeValue}>
                      {formatCurrency(mensalidade.valor_efetivo ?? mensalidade.valor)}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: mensalidade.status === 'pago' ? '#4caf50' : 
                                    mensalidade.status === 'atrasado' ? '#f44336' : '#ff9800' }
                  ]}>
                    <Text style={styles.statusText}>
                      {mensalidade.status === 'pago' ? 'Pago' :
                       mensalidade.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.mensalidadeDate}>
                  Vencimento: {formatDate(mensalidade.data_vencimento)}
                </Text>
                {mensalidade.status === 'pago' && mensalidade.data_pagamento && (
                  <Text style={styles.mensalidadeDate}>
                    Pago em: {formatDateTime(mensalidade.data_pagamento)}
                  </Text>
                )}
                {mensalidade.status === 'pago' && mensalidade.forma_pagamento_label ? (
                  <Text style={styles.mensalidadeDate}>
                    Forma: {mensalidade.forma_pagamento_label}
                  </Text>
                ) : null}
                {(mensalidade.status === 'pendente' || mensalidade.status === 'atrasado') && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.payButton, { marginTop: 8 }]}
                    onPress={() => handleDarBaixaMensalidade(mensalidade)}
                  >
                    <Text style={styles.actionButtonText}>Dar baixa</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Despesas</Text>
            <TouchableOpacity style={styles.addButtonSmall} onPress={handleNovaDespesa}>
              <Text style={styles.addButtonSmallText}>+ Nova</Text>
            </TouchableOpacity>
          </View>
          {despesas.length === 0 ? (
            <Text style={styles.noData}>Nenhuma despesa encontrada.</Text>
          ) : (
            despesas.map(despesa => (
              <View key={despesa.id} style={styles.despesaCard}>
                <View style={styles.despesaInfo}>
                  <Text style={styles.despesaTitle}>{despesa.descricao}</Text>
                  <Text style={styles.despesaDate}>{formatDate(despesa.data)}</Text>
                </View>
                <Text style={styles.despesaValor}>{formatCurrency(despesa.valor)}</Text>
                <View style={styles.despesaActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editActionButton, styles.inlineButton]}
                    onPress={() => handleEditarDespesa(despesa)}
                  >
                    <Text style={styles.actionButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton, styles.inlineButton, styles.inlineButtonLast]}
                    onPress={() => handleExcluirDespesa(despesa)}
                  >
                    <Text style={styles.actionButtonText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salários</Text>
          {salarios.length === 0 ? (
            <Text style={styles.noData}>Nenhum salário encontrado para este mês.</Text>
          ) : (
            salarios.map(salario => (
              <View key={salario.id} style={styles.salarioCard}>
                <View style={styles.salarioInfo}>
                  <Text style={styles.salarioTitle}>{getProfessorNome(salario.professor)}</Text>
                  <Text style={styles.salarioDate}>
                    {salario.competencia ? `Competência: ${formatDate(salario.competencia)}\n` : ''}
                    {salario.status === 'pago' && salario.data_pagamento
                      ? `Pago em ${formatDate(salario.data_pagamento)}`
                      : 'Pagamento pendente'}
                  </Text>
                </View>
                <Text style={styles.salarioValor}>{formatCurrency(salario.valor)}</Text>
                <View style={styles.salarioActions}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: salario.status === 'pago' ? '#4caf50' : '#ff9800' }
                  ]}>
                    <Text style={styles.statusText}>
                      {salario.status === 'pago' ? 'Pago' : 'Pendente'}
                    </Text>
                  </View>
                  {salario.status !== 'pago' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.payButton, styles.inlineButton]}
                      onPress={() => handlePagarSalario(salario)}
                    >
                      <Text style={styles.actionButtonText}>Marcar pago</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  const renderPerfil = () => {
    if (!painelGerente) return null;
    const baseUrl = CONFIG.API_BASE_URL.replace('/api/', '');

    return (
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foto de Perfil</Text>
          <View style={styles.photoRow}>
            <View style={styles.profilePhotoLarge}>
              {fotoPreview ? (
                <Image source={{ uri: fotoPreview }} style={styles.profileImageLarge} />
              ) : painelGerente.foto_perfil ? (
                <Image source={{ uri: `${baseUrl}${painelGerente.foto_perfil}` }} style={styles.profileImageLarge} />
              ) : (
                <Text style={styles.profileInitialsLarge}>
                  {getInitials(`${painelGerente.first_name} ${painelGerente.last_name}`)}
                </Text>
              )}
            </View>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoButton} onPress={handleSelecionarFoto}>
                <Text style={styles.photoButtonText}>Selecionar Foto</Text>
              </TouchableOpacity>
              {fotoPerfil && (
                <View style={styles.photoActionRow}>
                  <TouchableOpacity
                    style={[styles.photoButton, styles.photoSaveButton]}
                    onPress={handleUploadFoto}
                    disabled={uploadingFoto}
                  >
                    <Text style={styles.photoButtonText}>
                      {uploadingFoto ? 'Enviando...' : 'Salvar Foto'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoButton, styles.photoCancelButton]}
                    onPress={handleCancelarFoto}
                    disabled={uploadingFoto}
                  >
                    <Text style={styles.photoButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.photoHint}>
            Dica: use imagens quadradas para melhor resultado (JPG/PNG).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Gerente</Text>
          {editProfile ? (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nome</Text>
                <TextInput
                  style={styles.formInput}
                  value={profileForm.first_name}
                  onChangeText={(value) => setProfileForm(prev => ({ ...prev, first_name: value }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sobrenome</Text>
                <TextInput
                  style={styles.formInput}
                  value={profileForm.last_name}
                  onChangeText={(value) => setProfileForm(prev => ({ ...prev, last_name: value }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="email-address"
                  value={profileForm.email}
                  onChangeText={(value) => setProfileForm(prev => ({ ...prev, email: value }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Telefone</Text>
                <TextInput
                  style={styles.formInput}
                  value={profileForm.telefone}
                  onChangeText={(value) => setProfileForm(prev => ({ ...prev, telefone: value }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Endereço</Text>
                <TextInput
                  style={styles.formInput}
                  value={profileForm.endereco}
                  onChangeText={(value) => setProfileForm(prev => ({ ...prev, endereco: value }))}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Data de nascimento</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                  value={profileForm.data_nascimento}
                  onChangeText={(value) =>
                    setProfileForm((prev) => ({ ...prev, data_nascimento: formatarDataBrMascara(value) }))
                  }
                />
              </View>
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.formButton, styles.formButtonSecondary]}
                  onPress={handleCancelEdit}
                  disabled={savingProfile}
                >
                  <Text style={styles.formButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, styles.formButtonPrimary]}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  <Text style={styles.formButtonText}>
                    {savingProfile ? 'Salvando...' : 'Salvar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{painelGerente.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Telefone:</Text>
                <Text style={styles.infoValue}>{painelGerente.telefone || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Endereço:</Text>
                <Text style={styles.infoValue}>{painelGerente.endereco || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Data de Nascimento:</Text>
                <Text style={styles.infoValue}>{formatDate(painelGerente.data_nascimento)}</Text>
              </View>
              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                <Text style={styles.editButtonText}>Editar Perfil</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    );
  };

  const handleGerarRelatorioFinanceiro = async () => {
    try {
      const relatorio = await financeiroService.getRelatorioFinanceiro();
      Alert.alert(
        'Relatório Financeiro',
        `Receitas: ${formatCurrency(relatorio.receitas || 0)}\n` +
        `Despesas: ${formatCurrency(relatorio.despesas || 0)}\n` +
        `Saldo: ${formatCurrency((relatorio.receitas || 0) - (relatorio.despesas || 0))}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao gerar relatório financeiro.');
    }
  };

  const handleGerarRelatorioPresenca = async () => {
    try {
      setLoadingPresencaRelatorio(true);
      const params: any = {};
      if (filtroPresencaInicio) params.data_inicio = filtroPresencaInicio;
      if (filtroPresencaFim) params.data_fim = filtroPresencaFim;
      if (filtroPresencaTurmaId) params.turma_id = filtroPresencaTurmaId;
      const response = await presencaService.gerarRelatorioPresenca(params);
      setPresencaRelatorio(response);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao gerar relatório de presença.');
    } finally {
      setLoadingPresencaRelatorio(false);
    }
  };

  const atualizarItemRelatorio = (itemAtualizado: PresencaRelatorioItem) => {
    setPresencaRelatorio(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        presencas: prev.presencas.map(item =>
          item.id === itemAtualizado.id ? itemAtualizado : item
        ),
      };
    });
  };

  const handleCorrigirPresenca = async (item: PresencaRelatorioItem, confirmar: boolean) => {
    if (corrigindoPresenca[item.id]) return;

    const executar = async (payload: { checkin_realizado?: boolean; presenca_confirmada?: boolean }) => {
      try {
        setCorrigindoPresenca(prev => ({ ...prev, [item.id]: true }));
        const atualizado = await presencaService.corrigirPresenca(item.id, payload);
        atualizarItemRelatorio(atualizado);
      } catch (error: any) {
        Alert.alert('Erro', error.response?.data?.error || 'Erro ao corrigir presença.');
      } finally {
        setCorrigindoPresenca(prev => ({ ...prev, [item.id]: false }));
      }
    };

    if (confirmar && !item.checkin_realizado) {
      Alert.alert(
        'Confirmar presença',
        'Este aluno não realizou check-in. Deseja marcar o check-in junto com a presença?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: () => executar({ checkin_realizado: true, presenca_confirmada: true }),
          },
        ]
      );
      return;
    }

    await executar({ presenca_confirmada: confirmar });
  };

  const renderRelatorios = () => {
    const buscaNormalizada = normalizeSearch(filtroPresencaBusca);
    const presencasFiltradas =
      presencaRelatorio?.presencas.filter(item =>
        normalizeSearch(item.aluno_nome).includes(buscaNormalizada)
      ) || [];
    const alunosFiltrados = alunos.filter(aluno =>
      normalizeSearch(`${aluno.first_name} ${aluno.last_name}`.trim()).includes(
        normalizeSearch(filtroAlunoBusca)
      )
    );
    const turmasFiltradas = turmas.filter(turma =>
      normalizeSearch(
        `${turma.ct_nome || ''} ${turma.horario || ''} ${turma.dias_semana_nomes?.join(' ') || ''}`
      ).includes(normalizeSearch(filtroTurmaBusca))
    );
    const alunosAtivos = alunos.filter(aluno => aluno.ativo).length;
    const alunosInativos = alunos.filter(aluno => !aluno.ativo).length;
    const turmasAtivas = turmas.filter((t) => t.ativo !== false).length;
    const turmasInativas = turmas.length - turmasAtivas;

    const toggleRelatorioPainel = (k: 'presenca' | 'alunos' | 'turmas') => {
      setRelatorioPainelAberto((prev) => (prev === k ? null : k));
    };

    const cabecalhoPainel = (
      k: 'presenca' | 'alunos' | 'turmas',
      titulo: string,
      subtitulo: string
    ) => {
      const aberto = relatorioPainelAberto === k;
      return (
        <TouchableOpacity
          style={styles.relatorioPainelHead}
          onPress={() => toggleRelatorioPainel(k)}
          activeOpacity={0.75}
        >
          <View style={styles.relatorioPainelHeadText}>
            <Text style={styles.relatorioPainelTitle}>{titulo}</Text>
            <Text style={styles.relatorioPainelSubtitle}>{subtitulo}</Text>
          </View>
          <MaterialIcons
            name={aberto ? 'expand-less' : 'expand-more'}
            size={28}
            color={colors.primary}
          />
        </TouchableOpacity>
      );
    };

    return (
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.relatorioScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.relatorioPageTitle}>Relatórios</Text>
        <Text style={styles.relatorioPageHint}>
          Toque em cada bloco para abrir ou fechar. O financeiro gera PDF; presenças exige datas e o botão
          &quot;Gerar&quot;.
        </Text>

        <TouchableOpacity
          style={styles.relatorioFinanceCard}
          onPress={handleGerarRelatorioFinanceiro}
          activeOpacity={0.85}
        >
          <MaterialIcons name="picture-as-pdf" size={26} color={colors.primary} />
          <View style={styles.relatorioFinanceTextWrap}>
            <Text style={styles.relatorioFinanceTitle}>Relatório financeiro</Text>
            <Text style={styles.relatorioFinanceSub}>PDF com receitas, despesas e salários</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.relatorioPainel}>
          {cabecalhoPainel('presenca', 'Presenças', 'Filtros, totais e correção de registros')}
          {relatorioPainelAberto === 'presenca' && (
            <View style={styles.relatorioPainelBody}>
              <Text style={styles.relatorioBlockLabel}>Período</Text>
              <View style={styles.relatorioDatesRow}>
                <View style={styles.relatorioDateCol}>
                  <Text style={styles.relatorioMiniLabel}>De</Text>
                  <TextInput
                    style={styles.relatorioInput}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#999"
                    value={filtroPresencaInicio}
                    onChangeText={setFiltroPresencaInicio}
                  />
                </View>
                <View style={styles.relatorioDateCol}>
                  <Text style={styles.relatorioMiniLabel}>Até</Text>
                  <TextInput
                    style={styles.relatorioInput}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#999"
                    value={filtroPresencaFim}
                    onChangeText={setFiltroPresencaFim}
                  />
                </View>
              </View>

              <Text style={[styles.relatorioBlockLabel, styles.relatorioBlockLabelSpaced]}>Turma</Text>
              <View style={styles.relatorioTurmaRow}>
                <TouchableOpacity
                  style={styles.relatorioPrimaryOutlineBtn}
                  onPress={() => setShowPresencaTurmaModal(true)}
                >
                  <Text style={styles.relatorioPrimaryOutlineBtnText}>
                    {filtroPresencaTurmaId ? `Turma ${filtroPresencaTurmaId}` : 'Todas as turmas'}
                  </Text>
                </TouchableOpacity>
                {filtroPresencaTurmaId != null && (
                  <TouchableOpacity
                    style={styles.relatorioGhostBtn}
                    onPress={() => setFiltroPresencaTurmaId(null)}
                  >
                    <Text style={styles.relatorioGhostBtnText}>Limpar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {filtroPresencaTurmaId != null && (
                <View style={styles.relatorioObservacaoBox}>
                  <Text style={[styles.relatorioBlockLabel, styles.relatorioBlockLabelSpaced]}>
                    Observação do professor (leitura)
                  </Text>
                  <Text style={styles.relatorioMiniLabel}>Data (AAAA-MM-DD)</Text>
                  <TextInput
                    style={styles.relatorioInput}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#999"
                    value={filtroObservacaoData}
                    onChangeText={setFiltroObservacaoData}
                    autoCapitalize="none"
                  />
                  {loadingObservacaoGerente ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
                  ) : (
                    <Text style={styles.relatorioObservacaoText}>
                      {observacaoGerente?.texto?.trim()
                        ? observacaoGerente.texto
                        : 'Nenhuma observação para esta turma nesta data.'}
                    </Text>
                  )}
                  {observacaoGerente?.autor_nome && observacaoGerente?.texto?.trim() ? (
                    <Text style={styles.relatorioObservacaoMeta}>
                      Por {observacaoGerente.autor_nome}
                      {observacaoGerente.atualizado_em
                        ? ` · ${new Date(observacaoGerente.atualizado_em).toLocaleString('pt-BR')}`
                        : ''}
                    </Text>
                  ) : null}
                </View>
              )}

              <Text style={[styles.relatorioBlockLabel, styles.relatorioBlockLabelSpaced]}>
                Filtrar lista por nome
              </Text>
              <TextInput
                style={styles.relatorioInput}
                placeholder="Nome do aluno (após gerar o relatório)"
                placeholderTextColor="#999"
                value={filtroPresencaBusca}
                onChangeText={setFiltroPresencaBusca}
              />

              <TouchableOpacity style={styles.relatorioGerarBtn} onPress={handleGerarRelatorioPresenca}>
                {loadingPresencaRelatorio ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.relatorioGerarBtnText}>Gerar relatório de presenças</Text>
                )}
              </TouchableOpacity>

              {presencaRelatorio && (
                <>
                  <View style={styles.relatorioDivider} />
                  <Text style={styles.relatorioResultsTitle}>
                    Resultados
                    {presencaRelatorio.presencas.length !== presencasFiltradas.length
                      ? ` (${presencasFiltradas.length} de ${presencaRelatorio.presencas.length})`
                      : ` (${presencasFiltradas.length})`}
                  </Text>
                  <View style={styles.relatorioKpiRow}>
                    <View style={styles.relatorioKpi}>
                      <Text style={styles.relatorioKpiVal}>{presencaRelatorio.total_registros}</Text>
                      <Text style={styles.relatorioKpiLbl}>Registros</Text>
                    </View>
                    <View style={styles.relatorioKpi}>
                      <Text style={styles.relatorioKpiVal}>{presencaRelatorio.total_checkins}</Text>
                      <Text style={styles.relatorioKpiLbl}>Check-ins</Text>
                    </View>
                    <View style={styles.relatorioKpi}>
                      <Text style={styles.relatorioKpiVal}>{presencaRelatorio.total_confirmadas}</Text>
                      <Text style={styles.relatorioKpiLbl}>Confirmadas</Text>
                    </View>
                  </View>

                  {presencasFiltradas.length === 0 ? (
                    <Text style={styles.noData}>Nenhum registro para os filtros atuais.</Text>
                  ) : (
                    presencasFiltradas.map((item) => (
                      <View key={item.id} style={styles.presencaCard}>
                        <View style={styles.presencaHeader}>
                          <Text style={styles.presencaAluno}>{item.aluno_nome}</Text>
                          <Text style={styles.presencaData}>{formatDate(item.data)}</Text>
                        </View>
                        <Text style={styles.presencaTurma}>Turma: {item.turma_nome}</Text>
                        <View style={styles.presencaStatusRow}>
                          <View style={styles.presencaStatusItem}>
                            <Text style={styles.presencaStatusLabel}>Check-in</Text>
                            <Text
                              style={[
                                styles.presencaStatusValue,
                                { color: item.checkin_realizado ? '#4caf50' : '#f44336' },
                              ]}
                            >
                              {item.checkin_realizado ? 'Sim' : 'Não'}
                            </Text>
                          </View>
                          <View style={styles.presencaStatusItem}>
                            <Text style={styles.presencaStatusLabel}>Presença</Text>
                            <Text
                              style={[
                                styles.presencaStatusValue,
                                { color: item.presenca_confirmada ? '#4caf50' : '#f44336' },
                              ]}
                            >
                              {item.presenca_confirmada ? 'Confirmada' : 'Pendente'}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.corrigirButton,
                            item.presenca_confirmada && styles.corrigirButtonOutline,
                          ]}
                          onPress={() => handleCorrigirPresenca(item, !item.presenca_confirmada)}
                          disabled={corrigindoPresenca[item.id]}
                        >
                          <Text
                            style={[
                              styles.corrigirButtonText,
                              item.presenca_confirmada && styles.corrigirButtonOutlineText,
                            ]}
                          >
                            {corrigindoPresenca[item.id]
                              ? 'Atualizando...'
                              : item.presenca_confirmada
                                ? 'Desfazer presença'
                                : 'Confirmar presença'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.relatorioPainel}>
          {cabecalhoPainel('alunos', 'Alunos', 'Resumo e lista para consulta (até 20)')}
          {relatorioPainelAberto === 'alunos' && (
            <View style={styles.relatorioPainelBody}>
              {loadingRelatorios && (
                <View style={styles.loadingInline}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingInlineText}>Carregando alunos...</Text>
                </View>
              )}
              <View style={styles.relatorioKpiRow}>
                <View style={styles.relatorioKpi}>
                  <Text style={styles.relatorioKpiVal}>{alunos.length}</Text>
                  <Text style={styles.relatorioKpiLbl}>Total</Text>
                </View>
                <View style={styles.relatorioKpi}>
                  <Text style={styles.relatorioKpiVal}>{alunosAtivos}</Text>
                  <Text style={styles.relatorioKpiLbl}>Ativos</Text>
                </View>
                <View style={styles.relatorioKpi}>
                  <Text style={styles.relatorioKpiVal}>{alunosInativos}</Text>
                  <Text style={styles.relatorioKpiLbl}>Inativos</Text>
                </View>
              </View>
              <Text style={[styles.relatorioBlockLabel, styles.relatorioBlockLabelSpaced]}>Buscar</Text>
              <TextInput
                style={styles.relatorioInput}
                placeholder="Nome ou e-mail"
                placeholderTextColor="#999"
                value={filtroAlunoBusca}
                onChangeText={setFiltroAlunoBusca}
              />
              <View style={styles.relatorioListShell}>
                {alunosFiltrados.length === 0 ? (
                  <Text style={styles.noData}>Nenhum aluno encontrado.</Text>
                ) : (
                  alunosFiltrados.slice(0, 20).map((aluno) => (
                    <View key={aluno.id} style={styles.reportListItem}>
                      <Text style={styles.reportListTitle}>
                        {aluno.first_name} {aluno.last_name}
                      </Text>
                      <Text style={styles.reportListSubtitle}>
                        {aluno.ativo ? 'Ativo' : 'Inativo'} • {aluno.email}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.relatorioPainel}>
          {cabecalhoPainel('turmas', 'Turmas', 'Resumo e lista para consulta (até 20)')}
          {relatorioPainelAberto === 'turmas' && (
            <View style={styles.relatorioPainelBody}>
              {loadingRelatorios && (
                <View style={styles.loadingInline}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingInlineText}>Carregando turmas...</Text>
                </View>
              )}
              <View style={styles.relatorioKpiRow}>
                <View style={styles.relatorioKpi}>
                  <Text style={styles.relatorioKpiVal}>{turmas.length}</Text>
                  <Text style={styles.relatorioKpiLbl}>Total</Text>
                </View>
                <View style={styles.relatorioKpi}>
                  <Text style={styles.relatorioKpiVal}>{turmasAtivas}</Text>
                  <Text style={styles.relatorioKpiLbl}>Ativas</Text>
                </View>
                <View style={styles.relatorioKpi}>
                  <Text style={styles.relatorioKpiVal}>{turmasInativas}</Text>
                  <Text style={styles.relatorioKpiLbl}>Inativas</Text>
                </View>
              </View>
              <Text style={[styles.relatorioBlockLabel, styles.relatorioBlockLabelSpaced]}>Buscar</Text>
              <TextInput
                style={styles.relatorioInput}
                placeholder="CT, horário ou dias"
                placeholderTextColor="#999"
                value={filtroTurmaBusca}
                onChangeText={setFiltroTurmaBusca}
              />
              <View style={styles.relatorioListShell}>
                {turmasFiltradas.length === 0 ? (
                  <Text style={styles.noData}>Nenhuma turma encontrada.</Text>
                ) : (
                  turmasFiltradas.slice(0, 20).map((turma) => (
                    <View key={turma.id} style={styles.reportListItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Text style={[styles.reportListTitle, { marginRight: 8 }]}>
                          Turma {turma.id} • {turma.ct_nome || 'CT'}
                        </Text>
                        {turma.alerta_inadimplente_presenca ? (
                          <View style={styles.alertaInadimplenteBadge}>
                            <Text style={styles.alertaInadimplenteBadgeText}>
                              Inadimplente + presença
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.reportListSubtitle}>
                        {turma.horario} • {turma.alunos_count || 0} alunos •{' '}
                        {turma.ativo !== false ? 'Ativa' : 'Inativa'}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const ScreenRoot = embedded ? View : SafeScreen;
  const screenRootProps = embedded
    ? { style: styles.container }
    : { tabScreen: true as const, style: styles.container };

  if (loading) {
    return (
      <ScreenRoot {...screenRootProps}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </ScreenRoot>
    );
  }

  return (
    <ScreenRoot {...screenRootProps}>
      {/* Header — no shell embutido o cabeçalho fica em GerenteShellScreen */}
      {!embedded && painelGerente && (
        <View style={styles.mainHeader}>
          <View style={styles.headerContent}>
            <View style={styles.profilePhoto}>
              {painelGerente.foto_perfil ? (
                <Image
                  source={{ uri: `${CONFIG.API_BASE_URL.replace('/api/', '')}${painelGerente.foto_perfil}` }}
                  style={styles.profileImageHeader}
                />
              ) : (
                <View style={styles.profileInitialsHeader}>
                  <Text style={styles.profileInitialsTextHeader}>
                    {getInitials(`${painelGerente.first_name} ${painelGerente.last_name}`)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>
                {painelGerente.first_name} {painelGerente.last_name}
              </Text>
              <Text style={styles.headerRole}>Gerente</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Conteúdo por seção */}
      {activeSection === 'dashboard' && renderDashboard()}
      {activeSection === 'financeiro' && renderFinanceiro()}
      {activeSection === 'relatorios' && renderRelatorios()}
      {activeSection === 'perfil' && renderPerfil()}

      <Modal visible={showDespesaModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editDespesa ? 'Editar despesa' : 'Nova despesa'}
            </Text>
            <Text style={styles.inputLabel}>Categoria</Text>
            <View style={styles.pickerContainer}>
              {CATEGORIAS_DESPESAS.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.pickerOption,
                    despesaForm.categoria === c.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => setDespesaForm(prev => ({ ...prev, categoria: c.value }))}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    despesaForm.categoria === c.value && styles.pickerOptionTextSelected,
                  ]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Descrição"
              value={despesaForm.descricao}
              onChangeText={(value) => setDespesaForm(prev => ({ ...prev, descricao: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Valor"
              keyboardType="numeric"
              value={despesaForm.valor}
              onChangeText={(value) => setDespesaForm(prev => ({ ...prev, valor: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Data (AAAA-MM-DD)"
              value={despesaForm.data}
              onChangeText={(value) => setDespesaForm(prev => ({ ...prev, data: value }))}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton, styles.inlineButton]}
                onPress={() => setShowDespesaModal(false)}
                disabled={savingDespesa}
              >
                <Text style={styles.actionButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton, styles.inlineButton, styles.inlineButtonLast]}
                onPress={handleSalvarDespesa}
                disabled={savingDespesa}
              >
                <Text style={styles.actionButtonText}>
                  {savingDespesa ? 'Salvando...' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showPresencaTurmaModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar turma</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setFiltroPresencaTurmaId(null);
                  setShowPresencaTurmaModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>Todas as turmas</Text>
              </TouchableOpacity>
              {turmas.map(turma => (
                <TouchableOpacity
                  key={turma.id}
                  style={styles.modalOption}
                  onPress={() => {
                    setFiltroPresencaTurmaId(turma.id ?? null);
                    setShowPresencaTurmaModal(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>
                    Turma {turma.id} - {turma.ct_nome || 'CT'} - {turma.horario}
                  </Text>
                </TouchableOpacity>
              ))}
              {turmas.length === 0 && (
                <Text style={styles.noData}>Nenhuma turma cadastrada.</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, styles.inlineButton]}
              onPress={() => setShowPresencaTurmaModal(false)}
            >
              <Text style={styles.actionButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenRoot>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  profilePhotoLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    marginRight: 16,
    marginBottom: 12,
  },
  profileImageLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileInitialsLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  photoActions: {
    flex: 1,
    minWidth: 200,
  },
  photoActionRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  photoButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  photoSaveButton: {
    backgroundColor: '#4caf50',
    flex: 1,
    marginRight: 8,
  },
  photoCancelButton: {
    backgroundColor: '#9e9e9e',
    flex: 1,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  photoHint: {
    fontSize: 12,
    color: '#856404',
    marginTop: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profileInitials: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInitialsText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  profileRole: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardTouchable: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${colors.primary}33`,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statSubtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notifHint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    lineHeight: 18,
  },
  notifStatsText: {
    fontSize: 13,
    color: colors.primary,
    marginBottom: 10,
    fontWeight: '600',
  },
  notifStatsWarn: {
    fontSize: 12,
    color: '#856404',
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    lineHeight: 17,
  },
  notifMensagemInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  notifSendButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  notifSendButtonDisabled: {
    opacity: 0.65,
  },
  notifSendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  aumentoMensalidadeSection: {
    marginBottom: 8,
  },
  aumentoMensalidadeHint: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
    marginBottom: 12,
  },
  aumentoMensalidadeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aumentoMensalidadeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
  },
  aumentoMensalidadeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aumentoMensalidadeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#333',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  formButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  formButtonPrimary: {
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  formButtonSecondary: {
    backgroundColor: '#9e9e9e',
    marginRight: 8,
  },
  formButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  activityCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  activityDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: '#666',
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
  },
  financialStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  financialCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
  },
  financialTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  financialValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  financialSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  monthButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  monthLabel: {
    marginHorizontal: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  yearInput: {
    marginLeft: 8,
    width: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    color: '#333',
    backgroundColor: '#fff',
  },
  loadingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingInlineText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 12,
  },
  mensalidadeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  mensalidadeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mensalidadeAluno: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  mensalidadeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  mensalidadeDate: {
    fontSize: 12,
    color: '#666',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonSmall: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addButtonSmallText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  despesaCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  despesaInfo: {
    marginBottom: 8,
  },
  despesaTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  despesaDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  despesaValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 8,
  },
  despesaActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salarioCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  salarioInfo: {
    marginBottom: 8,
  },
  salarioTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  salarioDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  salarioValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  salarioActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  inlineButton: {
    flex: 1,
    paddingVertical: 10,
    marginBottom: 0,
  },
  inlineButtonLast: {
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editActionButton: {
    backgroundColor: '#2196f3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  payButton: {
    backgroundColor: '#2e7d32',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 14,
    color: '#333',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  filterLabel: {
    flex: 1,
    color: '#333',
    fontSize: 14,
  },
  filterButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clearFilterButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  clearFilterText: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerOptionText: {
    color: '#333',
    fontSize: 14,
  },
  pickerOptionTextSelected: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#9e9e9e',
    flex: 1,
  },
  saveButton: {
    backgroundColor: colors.primary,
    flex: 1,
  },
  relatorioScrollContent: {
    paddingBottom: 32,
  },
  relatorioPageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  relatorioPageHint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
  },
  relatorioFinanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  relatorioFinanceTextWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  relatorioFinanceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  relatorioFinanceSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  relatorioPainel: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  relatorioPainelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.primaryMuted,
  },
  relatorioPainelHeadText: {
    flex: 1,
    paddingRight: 8,
  },
  relatorioPainelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  relatorioPainelSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },
  relatorioPainelBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.surface,
  },
  relatorioBlockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  relatorioBlockLabelSpaced: {
    marginTop: 16,
  },
  relatorioDatesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  relatorioDateCol: {
    flex: 1,
  },
  relatorioMiniLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  relatorioInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#fff',
  },
  relatorioTurmaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  relatorioObservacaoBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f5f9fc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  relatorioObservacaoText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  relatorioObservacaoMeta: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textMuted,
  },
  relatorioPrimaryOutlineBtn: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  relatorioPrimaryOutlineBtnText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  relatorioGhostBtn: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  relatorioGhostBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  relatorioGerarBtn: {
    backgroundColor: colors.primary,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  relatorioGerarBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  relatorioDivider: {
    height: 1,
    backgroundColor: colors.borderStrong,
    marginVertical: 18,
  },
  relatorioResultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  relatorioKpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  relatorioKpi: {
    flex: 1,
    backgroundColor: colors.primaryMuted,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  relatorioKpiVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  relatorioKpiLbl: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  relatorioListShell: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  reportDescription: {
    fontSize: 14,
    color: '#666',
  },
  reportFilters: {
    marginTop: 12,
  },
  reportSummary: {
    marginTop: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  reportSummaryText: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  reportListItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reportListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  reportListSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  alertaInadimplenteBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c62828',
  },
  alertaInadimplenteBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b71c1c',
  },
  presencaCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  presencaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  presencaAluno: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  presencaData: {
    fontSize: 12,
    color: '#666',
  },
  presencaTurma: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  presencaStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  presencaStatusItem: {
    flex: 1,
  },
  presencaStatusLabel: {
    fontSize: 12,
    color: '#666',
  },
  presencaStatusValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  corrigirButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  corrigirButtonOutline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  corrigirButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  corrigirButtonOutlineText: {
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  mainHeader: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileImageHeader: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profileInitialsHeader: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitialsTextHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRole: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
  },
  mensalidadeInfo: {
    flex: 1,
  },
  precadastroCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  precadastroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  precadastroInfo: {
    flex: 1,
    marginRight: 12,
  },
  precadastroNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  precadastroEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  precadastroTelefone: {
    fontSize: 14,
    color: '#666',
  },
  precadastroDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  converterButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  converterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  alunoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  alunoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alunoInfo: {
    flex: 1,
    marginRight: 12,
  },
  alunoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  alunoEmail: {
    fontSize: 14,
    color: '#666',
  },
});

export default DashboardGerenteScreen; 