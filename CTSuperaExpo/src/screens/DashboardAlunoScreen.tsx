import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  TextInput,
  Switch,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { userService, alunoService, pagamentoService } from '../services/api';
import { User, PainelAluno, Mensalidade, HistoricoPagamentos } from '../types';
import { NavigationProps } from '../types';
import CONFIG from '../config';
import SafeScreen from '../components/SafeScreen';
import * as Clipboard from 'expo-clipboard';
import { downloadAsync, cacheDirectory, documentDirectory } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickImageFromLibrary } from '../utils/pickImageFromLibrary';
import { colors } from '../theme';
import {
  formatarDataBrMascara,
  isoParaBrDisplay,
  normalizarDataNascimentoParaApi,
  calcularIdade,
} from '../utils/dataNascimento';
import {
  registrarPushTokenAluno,
  iniciarListenerRegistroPushEmForeground,
} from '../utils/registerExpoPush';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DashboardAlunoScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [painelAluno, setPainelAluno] = useState<PainelAluno | null>(null);
  const [historicoPagamentos, setHistoricoPagamentos] = useState<HistoricoPagamentos | null>(null);
  const [mensalidadesPendentes, setMensalidadesPendentes] = useState<Mensalidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'perfil' | 'parq' | 'checkin' | 'pagamentos'>('dashboard');
  const [editMode, setEditMode] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [fotoPerfil, setFotoPerfil] = useState<any>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [loadingFotoPerfil, setLoadingFotoPerfil] = useState(false);
  const [pixModalVisible, setPixModalVisible] = useState(false);
  const [pixData, setPixData] = useState<{
    transacao_id: number;
    codigo_pix: string;
    qr_code?: string;
    valor?: string;
    data_expiracao?: string;
  } | null>(null);
  const [pixStatusLoading, setPixStatusLoading] = useState(false);
  /** Polling de status PIX (igual ao site); limpar ao fechar modal ou desmontar. */
  const pixPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pixPollMaxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boletoPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const boletoPollMaxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkoutPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkoutPollMaxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [boletoModalVisible, setBoletoModalVisible] = useState(false);
  const [boletoData, setBoletoData] = useState<{
    transacao_id: number;
    linha_digitavel: string;
    valor?: string;
    data_vencimento?: string;
  } | null>(null);
  const [boletoStatusLoading, setBoletoStatusLoading] = useState(false);
  const [boletoDownloading, setBoletoDownloading] = useState(false);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    transacao_id: number;
    payment_url: string;
    status?: string;
  } | null>(null);
  const [checkoutStatusLoading, setCheckoutStatusLoading] = useState(false);
  /** Android: Alert aceita no máx. 3 botões — cartão sumia. Modal lista todas as opções. */
  const [formaPagamentoModalVisible, setFormaPagamentoModalVisible] = useState(false);
  const [mensalidadeFormaPagamento, setMensalidadeFormaPagamento] = useState<Mensalidade | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefone: '',
    endereco: '',
    data_nascimento: '',
    nome_responsavel: '',
    telefone_responsavel: '',
    telefone_emergencia: '',
    parq_question_1: false,
    parq_question_2: false,
    parq_question_3: false,
    parq_question_4: false,
    parq_question_5: false,
    parq_question_6: false,
    parq_question_7: false,
    parq_question_8: false,
    parq_question_9: false,
    parq_question_10: false,
  });

  // Detectar seção ativa baseada na rota
  useEffect(() => {
    if (route?.name) {
      const normalized = route.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z]/g, '');
      setActiveSection(normalized as any);
    }
  }, [route?.name]);

  useEffect(() => {
    if (user) {
      loadAlunoData();
    }
  }, [user]);

  useEffect(() => {
    if (user?.tipo === 'aluno') {
      registrarPushTokenAluno();
    }
  }, [user?.id, user?.tipo]);

  /** Depois do painel carregar, o token de auth já está no Axios; reforça registro do push. */
  useEffect(() => {
    if (user?.tipo !== 'aluno' || !painelAluno) return;
    const t = setTimeout(() => {
      void registrarPushTokenAluno();
    }, 800);
    return () => clearTimeout(t);
  }, [user?.tipo, user?.id, painelAluno?.usuario?.id]);

  useEffect(() => {
    if (user?.tipo !== 'aluno') return;
    return iniciarListenerRegistroPushEmForeground();
  }, [user?.tipo]);

  useEffect(() => {
    return () => {
      if (pixPollIntervalRef.current) {
        clearInterval(pixPollIntervalRef.current);
        pixPollIntervalRef.current = null;
      }
      if (pixPollMaxTimeoutRef.current) {
        clearTimeout(pixPollMaxTimeoutRef.current);
        pixPollMaxTimeoutRef.current = null;
      }
      if (boletoPollIntervalRef.current) {
        clearInterval(boletoPollIntervalRef.current);
        boletoPollIntervalRef.current = null;
      }
      if (boletoPollMaxTimeoutRef.current) {
        clearTimeout(boletoPollMaxTimeoutRef.current);
        boletoPollMaxTimeoutRef.current = null;
      }
      if (checkoutPollIntervalRef.current) {
        clearInterval(checkoutPollIntervalRef.current);
        checkoutPollIntervalRef.current = null;
      }
      if (checkoutPollMaxTimeoutRef.current) {
        clearTimeout(checkoutPollMaxTimeoutRef.current);
        checkoutPollMaxTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (activeSection === 'pagamentos' && user) {
      loadHistoricoPagamentos();
    }
  }, [activeSection, user]);

  /** Idade para o perfil: data do formulário (edição) ou cadastro / campo idade do painel. */
  const idadePerfilAluno = useMemo(() => {
    if (!painelAluno) return null;
    const isoForm = normalizarDataNascimentoParaApi(form.data_nascimento);
    if (isoForm) return calcularIdade(isoForm);
    const saved = painelAluno.usuario.data_nascimento;
    if (saved) {
      const m = String(saved).match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) return calcularIdade(m[1]);
    }
    if (typeof painelAluno.idade === 'number') return painelAluno.idade;
    return null;
  }, [painelAluno, form.data_nascimento]);

  /** Perfil: rolar até o campo focado para não ficar atrás do teclado. */
  const perfilScrollRef = useRef<ScrollView>(null);
  const perfilInfoSectionY = useRef(0);
  const perfilFieldY = useRef<Record<string, number>>({});

  const scrollPerfilFieldIntoView = useCallback((fieldKey: string) => {
    const rel = perfilFieldY.current[fieldKey];
    if (rel === undefined) return;
    const y = perfilInfoSectionY.current + rel;
    const doScroll = () => {
      perfilScrollRef.current?.scrollTo({
        y: Math.max(0, y - 16),
        animated: true,
      });
    };
    requestAnimationFrame(() => {
      doScroll();
      setTimeout(doScroll, 120);
      setTimeout(doScroll, 320);
    });
  }, []);

  const loadAlunoData = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) {
        setLoading(true);
      }
      const painelData = await alunoService.getPainelAluno();
      setPainelAluno(painelData);
      const usuario = painelData.usuario;
      const parqRespondido = Boolean(usuario.parq_completed || usuario.parq_completion_date);
      const getParqValue = (value?: boolean) => (parqRespondido ? Boolean(value) : false);
      setForm({
        first_name: usuario.first_name || '',
        last_name: usuario.last_name || '',
        email: usuario.email || '',
        telefone: usuario.telefone || '',
        endereco: usuario.endereco || '',
        data_nascimento: isoParaBrDisplay(usuario.data_nascimento),
        nome_responsavel: usuario.nome_responsavel || '',
        telefone_responsavel: usuario.telefone_responsavel || '',
        telefone_emergencia: usuario.telefone_emergencia || '',
        parq_question_1: getParqValue(usuario.parq_question_1),
        parq_question_2: getParqValue(usuario.parq_question_2),
        parq_question_3: getParqValue(usuario.parq_question_3),
        parq_question_4: getParqValue(usuario.parq_question_4),
        parq_question_5: getParqValue(usuario.parq_question_5),
        parq_question_6: getParqValue(usuario.parq_question_6),
        parq_question_7: getParqValue(usuario.parq_question_7),
        parq_question_8: getParqValue(usuario.parq_question_8),
        parq_question_9: getParqValue(usuario.parq_question_9),
        parq_question_10: getParqValue(usuario.parq_question_10),
      });
    } catch (error: any) {
      console.error('Erro ao carregar painel do aluno:', error);
      if (!opts?.silent) {
        Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar dados do aluno.');
      }
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  };

  const loadHistoricoPagamentos = async () => {
    try {
      const historico = await alunoService.getHistoricoPagamentos();
      setHistoricoPagamentos(historico);
    } catch (error: any) {
      console.error('Erro ao carregar histórico de pagamentos:', error);
    }
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

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const str = String(value).split('T')[0];
    const parts = str.split('-');
    if (parts.length === 3 && parts.every((p) => p.length > 0)) {
      const [year, month, day] = parts.map(Number);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
      }
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('pt-BR');
  };

  const formatMonthYear = (value?: string) => {
    if (!value) return '-';
    const [year, month] = value.split('-').map(Number);
    if (!year || !month) return formatDate(value);
    return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  };

  const canFillParqAgain = () => {
    if (!painelAluno?.usuario.parq_completed || !painelAluno?.usuario.parq_completion_date) {
      return true;
    }
    const filledAt = new Date(painelAluno.usuario.parq_completion_date);
    const oneYearLater = new Date(filledAt);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    return new Date() >= oneYearLater;
  };

  const getDaysUntilCanFillParq = () => {
    if (!painelAluno?.usuario.parq_completed || !painelAluno?.usuario.parq_completion_date) {
      return 0;
    }
    const filledAt = new Date(painelAluno.usuario.parq_completion_date);
    const oneYearLater = new Date(filledAt);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const diffTime = oneYearLater.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const formatParqDate = (value?: string) => {
    if (!value) return 'Data não disponível';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Data inválida';
    return parsed.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleParqChange = (field: string, value: boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    if (painelAluno) {
      const usuario = painelAluno.usuario;
      setForm(prev => ({
        ...prev,
        first_name: usuario.first_name || '',
        last_name: usuario.last_name || '',
        email: usuario.email || '',
        telefone: usuario.telefone || '',
        endereco: usuario.endereco || '',
        data_nascimento: isoParaBrDisplay(usuario.data_nascimento),
        nome_responsavel: usuario.nome_responsavel || '',
        telefone_responsavel: usuario.telefone_responsavel || '',
        telefone_emergencia: usuario.telefone_emergencia || '',
      }));
    }
  };

  const handleSaveProfile = async () => {
    if (!painelAluno) return;
    if (form.data_nascimento.trim()) {
      const isoDigitada = normalizarDataNascimentoParaApi(form.data_nascimento);
      if (!isoDigitada) {
        Alert.alert('Atenção', 'Informe a data de nascimento completa e válida (DD/MM/AAAA).');
        return;
      }
    }
    const isoForm = normalizarDataNascimentoParaApi(form.data_nascimento);
    const saved = painelAluno.usuario.data_nascimento;
    const isoSalva = saved ? String(saved).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] : undefined;
    const isoEfetivo = isoForm || isoSalva || null;
    const idade = isoEfetivo ? calcularIdade(isoEfetivo) : null;
    if (idade !== null && idade < 18) {
      if (!form.nome_responsavel?.trim() || !form.telefone_responsavel?.trim()) {
        Alert.alert('Atenção', 'Para menores de 18 anos, informe nome e telefone do responsável.');
        return;
      }
    }
    if (idade !== null && idade >= 18 && !form.telefone_emergencia?.trim()) {
      Alert.alert('Atenção', 'Informe o telefone de emergência.');
      return;
    }
    try {
      setSavingProfile(true);
      const usuario = painelAluno.usuario;
      const dnIso = normalizarDataNascimentoParaApi(form.data_nascimento);
      const payload: Partial<User> = {
        id: usuario.id,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        telefone: form.telefone,
        endereco: form.endereco,
        data_nascimento: dnIso ?? undefined,
        nome_responsavel: form.nome_responsavel || '',
        telefone_responsavel: form.telefone_responsavel || '',
        telefone_emergencia: form.telefone_emergencia || '',
        username: usuario.username,
        tipo: usuario.tipo,
        cpf: usuario.cpf,
        ativo: usuario.ativo,
      };
      await userService.updateProfile(payload);
      Alert.alert('Sucesso', 'Dados atualizados com sucesso!');
      setEditMode(false);
      await loadAlunoData();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao atualizar dados.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSelecionarFoto = async () => {
    const res = await pickImageFromLibrary({ quality: 0.7 });
    if (!res.ok) {
      if (res.reason === 'permission') {
        Alert.alert('Permissão', 'É necessário permitir o acesso à galeria de fotos.');
      }
      return;
    }
    const asset = res.asset;
    if (!asset?.uri) return;
    const allowedTypes = ['image/jpeg', 'image/png'];
    const fileSize = asset.fileSize || 0;
    const maxSize = 5 * 1024 * 1024;
    if (asset.type && !allowedTypes.includes(asset.type)) {
      Alert.alert('Erro', 'Formato inválido. Use JPG ou PNG.');
      return;
    }
    if (fileSize > maxSize) {
      Alert.alert('Erro', 'Arquivo muito grande. Limite de 5MB.');
      return;
    }
    setFotoPerfil(asset);
    setFotoPreview(asset.uri);
  };

  const handleUploadFoto = async () => {
    if (!painelAluno || !fotoPerfil) return;
    try {
      setUploadingFoto(true);
      const photo = {
        uri: fotoPerfil.uri,
        type: fotoPerfil.type || 'image/jpeg',
        name: fotoPerfil.fileName || `foto_${Date.now()}.jpg`,
      };
      await userService.uploadPhoto(painelAluno.usuario.id, photo);
      Alert.alert('Sucesso', 'Foto atualizada com sucesso!');
      setFotoPerfil(null);
      setFotoPreview(null);
      await loadAlunoData();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao enviar foto.');
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleRemoverFoto = async () => {
    if (!painelAluno) return;
    Alert.alert(
      'Remover foto',
      'Deseja remover sua foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploadingFoto(true);
              await userService.updateProfile({ id: painelAluno.usuario.id, foto_perfil: null });
              setFotoPerfil(null);
              setFotoPreview(null);
              await loadAlunoData();
              Alert.alert('Sucesso', 'Foto removida com sucesso!');
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao remover foto.');
            } finally {
              setUploadingFoto(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelarFoto = () => {
    setFotoPerfil(null);
    setFotoPreview(null);
  };

  const handleParqSubmit = async () => {
    if (!painelAluno) return;
    try {
      if (!canFillParqAgain()) {
        Alert.alert('Atenção', 'O PAR-Q só pode ser preenchido novamente após 1 ano.');
        return;
      }
      const payload: Partial<User> = {
        id: painelAluno.usuario.id,
        parq_question_1: form.parq_question_1,
        parq_question_2: form.parq_question_2,
        parq_question_3: form.parq_question_3,
        parq_question_4: form.parq_question_4,
        parq_question_5: form.parq_question_5,
        parq_question_6: form.parq_question_6,
        parq_question_7: form.parq_question_7,
        parq_question_8: form.parq_question_8,
        parq_question_9: form.parq_question_9,
        parq_question_10: form.parq_question_10,
      };
      await userService.updateProfile(payload);
      Alert.alert('Sucesso', 'Questionário PAR-Q atualizado com sucesso!');
      await loadAlunoData();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao atualizar PAR-Q.');
    }
  };

  const renderDashboard = () => {
    if (!painelAluno) return null;
    const aluno = painelAluno.usuario;

    return (
      <ScrollView style={styles.content}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Status</Text>
            <Text style={[styles.statValue, { color: aluno.ativo ? '#4caf50' : '#f44336' }]}>
              {aluno.ativo ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Pagamento</Text>
            <Text style={[styles.statValue, { color: painelAluno.pagamento_ok ? '#4caf50' : '#f44336' }]}>
              {painelAluno.pagamento_ok ? 'Em Dia' : 'Pendente'}
            </Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Turma</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {painelAluno.turma || '-'}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Aulas Realizadas</Text>
            <Text style={styles.statValue}>
              {painelAluno.historico_aulas?.length || 0}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Mensalidades</Text>
            <Text style={styles.statValue}>
              {painelAluno.historico_pagamentos?.length || 0}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status de Hoje</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Check-in realizado:</Text>
              <Text style={[styles.statusValue, { color: painelAluno.status_hoje.checkin_realizado ? '#4caf50' : '#666' }]}>
                {painelAluno.status_hoje.checkin_realizado ? 'Sim' : 'Não'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Presença confirmada:</Text>
              <Text style={[styles.statusValue, { color: painelAluno.status_hoje.presenca_confirmada ? '#4caf50' : '#666' }]}>
                {painelAluno.status_hoje.presenca_confirmada ? 'Sim' : 'Não'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Pode fazer check-in:</Text>
              <Text style={[styles.statusValue, { color: painelAluno.status_hoje.pode_fazer_checkin ? '#4caf50' : '#f44336' }]}>
                {painelAluno.status_hoje.pode_fazer_checkin ? 'Sim' : 'Não'}
              </Text>
            </View>
          </View>
        </View>

        {!painelAluno.status_hoje.checkin_realizado && painelAluno.status_hoje.pode_fazer_checkin && (
          <View style={styles.checkinHighlight}>
            <Text style={styles.checkinHighlightTitle}>✅ Check-in disponível</Text>
            <Text style={styles.checkinHighlightText}>
              Você pode realizar o check-in para a aula de hoje.
            </Text>
          </View>
        )}

        {painelAluno.status_hoje.checkin_realizado && (
          <View style={styles.checkinHighlight}>
            <Text style={styles.checkinHighlightTitle}>✅ Check-in realizado</Text>
            <Text style={styles.checkinHighlightText}>
              Você já realizou o check-in de hoje.
            </Text>
          </View>
        )}

        {!painelAluno.status_hoje.pode_fazer_checkin && (
          <View style={[styles.checkinHighlight, styles.checkinBlocked]}>
            <Text style={[styles.checkinHighlightTitle, styles.checkinBlockedTitle]}>⚠️ Check-in bloqueado</Text>
            <Text style={styles.checkinHighlightText}>
              {painelAluno.status_hoje.motivo_checkin_bloqueado || 'Você não pode realizar check-in hoje.'}
            </Text>
          </View>
        )}

        {painelAluno.historico_pagamentos && painelAluno.historico_pagamentos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Últimas Mensalidades</Text>
            {painelAluno.historico_pagamentos.slice(0, 3).map((mensalidade) => (
              <View key={mensalidade.id} style={styles.mensalidadeCard}>
                <View style={styles.mensalidadeHeader}>
                  <Text style={styles.mensalidadeValue}>
                    R$ {Number(mensalidade.valor_efetivo ?? mensalidade.valor).toFixed(2)}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: mensalidade.status === 'pago' ? '#4caf50' : 
                                    mensalidade.status === 'atrasado' ? '#f44336' : '#ff9800' }
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {mensalidade.status === 'pago' ? 'Pago' :
                       mensalidade.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.mensalidadeDate}>
                  Vencimento: {new Date(mensalidade.data_vencimento).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico de Aulas</Text>
          {painelAluno.historico_aulas && painelAluno.historico_aulas.length > 0 ? (
            painelAluno.historico_aulas.map((aula: any) => {
              const turmaLabel = aula.turma_nome || aula.turma || aula.turma_id || '-';
              const professorLabel = aula.professor || aula.professor_nome || '-';
              const presente = aula.presenca_confirmada ?? aula.presente ?? false;
              return (
                <View key={aula.id} style={styles.aulaCard}>
                  <View style={styles.aulaRow}>
                    <Text style={styles.aulaLabel}>Data</Text>
                    <Text style={styles.aulaValue}>{formatDate(aula.data)}</Text>
                  </View>
                  <View style={styles.aulaRow}>
                    <Text style={styles.aulaLabel}>Turma</Text>
                    <Text style={styles.aulaValue}>{turmaLabel}</Text>
                  </View>
                  <View style={styles.aulaRow}>
                    <Text style={styles.aulaLabel}>Professor</Text>
                    <Text style={styles.aulaValue}>{professorLabel}</Text>
                  </View>
                  <View style={styles.aulaRow}>
                    <Text style={styles.aulaLabel}>Status</Text>
                    <View style={[
                      styles.aulaBadge,
                      presente ? styles.aulaBadgePresent : styles.aulaBadgeAbsent,
                    ]}>
                      <Text style={styles.aulaBadgeText}>
                        {presente ? 'Presente' : 'Ausente'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.noData}>Nenhuma aula registrada.</Text>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderPerfil = () => {
    if (!painelAluno) return null;
    const aluno = painelAluno.usuario;
    const baseUrl = CONFIG.API_BASE_URL.replace('/api/', '');
    /** Header (~90) + abas (~50): compensação do teclado no iOS. */
    const perfilKeyboardOffsetIOS = insets.top + 118;

    return (
      <KeyboardAvoidingView
        style={styles.perfilKeyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? perfilKeyboardOffsetIOS : 0}
      >
        <ScrollView
          ref={perfilScrollRef}
          style={styles.perfilScrollView}
          contentContainerStyle={styles.perfilScrollInner}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator
        >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foto de Perfil</Text>
          <View style={styles.photoRow}>
            <View style={styles.profilePhotoLarge}>
              {fotoPreview ? (
                <Image
                  source={{ uri: fotoPreview }}
                  style={styles.profileImageLarge}
                  onLoadStart={() => setLoadingFotoPerfil(true)}
                  onLoadEnd={() => setLoadingFotoPerfil(false)}
                />
              ) : aluno.foto_perfil ? (
                <Image
                  source={{ uri: `${baseUrl}${aluno.foto_perfil}` }}
                  style={styles.profileImageLarge}
                  onLoadStart={() => setLoadingFotoPerfil(true)}
                  onLoadEnd={() => setLoadingFotoPerfil(false)}
                />
              ) : (
                <Text style={styles.profileInitialsLarge}>
                  {getInitials(`${aluno.first_name} ${aluno.last_name}`)}
                </Text>
              )}
              {loadingFotoPerfil && (
                <View style={styles.photoLoadingOverlay}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoButton} onPress={handleSelecionarFoto}>
                <Text style={styles.photoButtonText}>Selecionar Foto</Text>
              </TouchableOpacity>
              {aluno.foto_perfil && !fotoPerfil && (
                <TouchableOpacity
                  style={[styles.photoButton, styles.photoRemoveButton]}
                  onPress={handleRemoverFoto}
                  disabled={uploadingFoto}
                >
                  <Text style={styles.photoButtonText}>Remover Foto</Text>
                </TouchableOpacity>
              )}
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

        <View style={styles.profileSection}>
          <View style={styles.profilePhoto}>
            {aluno.foto_perfil ? (
              <Image
                source={{ uri: `${baseUrl}${aluno.foto_perfil}` }}
                style={styles.profileImage}
                onLoadStart={() => setLoadingFotoPerfil(true)}
                onLoadEnd={() => setLoadingFotoPerfil(false)}
              />
            ) : (
              <Text style={styles.profileInitials}>
                {getInitials(`${aluno.first_name} ${aluno.last_name}`)}
              </Text>
            )}
          </View>
          
          <Text style={styles.profileName}>
            {aluno.first_name} {aluno.last_name}
          </Text>
          <Text style={styles.profileEmail}>{aluno.email}</Text>
          {painelAluno.idade && (
            <Text style={styles.profileAge}>{painelAluno.idade} anos</Text>
          )}
        </View>

        <View
          style={styles.section}
          onLayout={(e) => {
            perfilInfoSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.sectionTitle}>Informações Pessoais</Text>
          {editMode ? (
            <>
              <View
                style={styles.formGroup}
                onLayout={(e) => {
                  perfilFieldY.current.nome = e.nativeEvent.layout.y;
                }}
              >
                <Text style={styles.formLabel}>Nome</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.first_name}
                  onChangeText={(value) => handleFormChange('first_name', value)}
                  onFocus={() => scrollPerfilFieldIntoView('nome')}
                />
              </View>
              <View
                style={styles.formGroup}
                onLayout={(e) => {
                  perfilFieldY.current.sobrenome = e.nativeEvent.layout.y;
                }}
              >
                <Text style={styles.formLabel}>Sobrenome</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.last_name}
                  onChangeText={(value) => handleFormChange('last_name', value)}
                  onFocus={() => scrollPerfilFieldIntoView('sobrenome')}
                />
              </View>
              <View
                style={styles.formGroup}
                onLayout={(e) => {
                  perfilFieldY.current.email = e.nativeEvent.layout.y;
                }}
              >
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="email-address"
                  value={form.email}
                  onChangeText={(value) => handleFormChange('email', value)}
                  onFocus={() => scrollPerfilFieldIntoView('email')}
                />
              </View>
              <View
                style={styles.formGroup}
                onLayout={(e) => {
                  perfilFieldY.current.telefone = e.nativeEvent.layout.y;
                }}
              >
                <Text style={styles.formLabel}>Telefone</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.telefone}
                  onChangeText={(value) => handleFormChange('telefone', value)}
                  onFocus={() => scrollPerfilFieldIntoView('telefone')}
                />
              </View>
              <View
                style={styles.formGroup}
                onLayout={(e) => {
                  perfilFieldY.current.endereco = e.nativeEvent.layout.y;
                }}
              >
                <Text style={styles.formLabel}>Endereço</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.endereco}
                  onChangeText={(value) => handleFormChange('endereco', value)}
                  onFocus={() => scrollPerfilFieldIntoView('endereco')}
                />
              </View>
              <View
                style={styles.formGroup}
                onLayout={(e) => {
                  perfilFieldY.current.dataNascimento = e.nativeEvent.layout.y;
                }}
              >
                <Text style={styles.formLabel}>Data de Nascimento (DD/MM/AAAA)</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="DD/MM/AAAA"
                  value={form.data_nascimento}
                  onChangeText={(value) =>
                    setForm((prev) => ({ ...prev, data_nascimento: formatarDataBrMascara(value) }))
                  }
                  onFocus={() => scrollPerfilFieldIntoView('dataNascimento')}
                />
              </View>
              {idadePerfilAluno === null && (
                <Text style={styles.perfilIdadeHint}>
                  Informe a data de nascimento para cadastrar dados do responsável (menores) ou telefone de
                  emergência (18 anos ou mais).
                </Text>
              )}
              {idadePerfilAluno !== null && idadePerfilAluno < 18 && (
                <Text style={styles.perfilIdadeHint}>
                  Menor de idade — informe nome e telefone do responsável.
                </Text>
              )}
              {idadePerfilAluno !== null && idadePerfilAluno >= 18 && (
                <Text style={styles.perfilIdadeHint}>
                  Maior de idade — informe um telefone de emergência.
                </Text>
              )}
              {idadePerfilAluno !== null && idadePerfilAluno < 18 && (
                <>
                  <View
                    style={styles.formGroup}
                    onLayout={(e) => {
                      perfilFieldY.current.nomeResp = e.nativeEvent.layout.y;
                    }}
                  >
                    <Text style={styles.formLabel}>Nome do Responsável</Text>
                    <TextInput
                      style={styles.formInput}
                      value={form.nome_responsavel}
                      onChangeText={(value) => handleFormChange('nome_responsavel', value)}
                      onFocus={() => scrollPerfilFieldIntoView('nomeResp')}
                    />
                  </View>
                  <View
                    style={styles.formGroup}
                    onLayout={(e) => {
                      perfilFieldY.current.telResp = e.nativeEvent.layout.y;
                    }}
                  >
                    <Text style={styles.formLabel}>Telefone do Responsável</Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="phone-pad"
                      value={form.telefone_responsavel}
                      onChangeText={(value) => handleFormChange('telefone_responsavel', value)}
                      onFocus={() => scrollPerfilFieldIntoView('telResp')}
                    />
                  </View>
                </>
              )}
              {idadePerfilAluno !== null && idadePerfilAluno >= 18 && (
                <View
                  style={styles.formGroup}
                  onLayout={(e) => {
                    perfilFieldY.current.telEmerg = e.nativeEvent.layout.y;
                  }}
                >
                  <Text style={styles.formLabel}>Telefone de Emergência</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="phone-pad"
                    value={form.telefone_emergencia}
                    onChangeText={(value) => handleFormChange('telefone_emergencia', value)}
                    onFocus={() => scrollPerfilFieldIntoView('telEmerg')}
                  />
                </View>
              )}
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
                <Text style={styles.infoLabel}>Telefone:</Text>
                <Text style={styles.infoValue}>{aluno.telefone || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Endereço:</Text>
                <Text style={styles.infoValue}>{aluno.endereco || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Data de Nascimento:</Text>
                <Text style={styles.infoValue}>
                  {isoParaBrDisplay(aluno.data_nascimento) || '-'}
                </Text>
              </View>
              {idadePerfilAluno !== null && idadePerfilAluno < 18 && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Nome do Responsável:</Text>
                    <Text style={styles.infoValue}>{aluno.nome_responsavel || '-'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Telefone do Responsável:</Text>
                    <Text style={styles.infoValue}>{aluno.telefone_responsavel || '-'}</Text>
                  </View>
                </>
              )}
              {idadePerfilAluno !== null && idadePerfilAluno >= 18 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Telefone de Emergência:</Text>
                  <Text style={styles.infoValue}>{aluno.telefone_emergencia || '-'}</Text>
                </View>
              )}
              {painelAluno.turma && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Turma:</Text>
                  <Text style={styles.infoValue}>{painelAluno.turma}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Text style={styles.editButtonText}>Editar Perfil</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const handleCheckin = async () => {
    if (!painelAluno) return;

    if (!painelAluno.status_hoje.pode_fazer_checkin) {
      Alert.alert(
        'Check-in não disponível',
        painelAluno.status_hoje.motivo_checkin_bloqueado ||
          'Você não pode realizar check-in hoje. Verifique suas pendências.'
      );
      return;
    }

    if (painelAluno.status_hoje.checkin_realizado) {
      Alert.alert('Check-in já realizado', 'Você já realizou o check-in para hoje.');
      return;
    }

    Alert.alert(
      'Confirmar Check-in',
      'Deseja realizar o check-in para hoje?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setCheckinLoading(true);
              setMensalidadesPendentes([]);
              await alunoService.realizarCheckin();
              Alert.alert('Sucesso', 'Check-in realizado com sucesso!');
              await loadAlunoData(); // Recarrega os dados
            } catch (error: any) {
              const errorMessage =
                error.response?.data?.error || error.response?.data?.message || 'Erro ao realizar check-in.';
              if (errorMessage.includes('pendências de pagamento') && error.response?.data?.mensalidades_pendentes) {
                setMensalidadesPendentes(error.response.data.mensalidades_pendentes);
              }
              Alert.alert('Erro', errorMessage);
            } finally {
              setCheckinLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderParq = () => {
    if (!painelAluno) return null;
    const perguntasParq = [
      { field: 'parq_question_1', text: 'Algum médico já disse que você possui algum problema de coração ou pressão arterial, e que somente deveria realizar atividade física supervisionado por profissionais de saúde?' },
      { field: 'parq_question_2', text: 'Você sente dores no peito quando pratica atividade física?' },
      { field: 'parq_question_3', text: 'No último mês, você sentiu dores no peito ao praticar atividade física?' },
      { field: 'parq_question_4', text: 'Você apresenta algum desequilíbrio devido à tontura e/ou perda momentânea da consciência?' },
      { field: 'parq_question_5', text: 'Você possui algum problema ósseo ou articular, que pode ser afetado ou agravado pela atividade física?' },
      { field: 'parq_question_6', text: 'Você toma atualmente algum tipo de medicação de uso contínuo?' },
      { field: 'parq_question_7', text: 'Você realiza algum tipo de tratamento médico para pressão arterial ou problemas cardíacos?' },
      { field: 'parq_question_8', text: 'Você realiza algum tratamento médico contínuo, que possa ser afetado ou prejudicado com a atividade física?' },
      { field: 'parq_question_9', text: 'Você já se submeteu a algum tipo de cirurgia, que comprometa de alguma forma a atividade física?' },
      { field: 'parq_question_10', text: 'Sabe de alguma outra razão pela qual a atividade física possa eventualmente comprometer sua saúde?' },
    ];

    const canFillAgain = canFillParqAgain();
    const daysUntil = getDaysUntilCanFillParq();

    return (
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Questionário PAR-Q</Text>
          {painelAluno.usuario.parq_completed && (
            <Text style={styles.parqInfo}>
              Último preenchimento: {formatParqDate(painelAluno.usuario.parq_completion_date)}
            </Text>
          )}
          {!canFillAgain && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Você poderá preencher novamente em {daysUntil} dia(s).
              </Text>
            </View>
          )}
          {perguntasParq.map((pergunta) => (
            <View key={pergunta.field} style={styles.parqRow}>
              <Text style={styles.parqQuestion}>{pergunta.text}</Text>
              <View style={styles.parqSwitchRow}>
                <Text style={styles.parqSwitchLabel}>Não</Text>
                <Switch
                  value={(form as any)[pergunta.field]}
                  onValueChange={(value) => handleParqChange(pergunta.field, value)}
                  disabled={!canFillAgain}
                  trackColor={{ false: '#ccc', true: '#4caf50' }}
                  thumbColor={(form as any)[pergunta.field] ? '#fff' : '#f4f3f4'}
                />
                <Text style={styles.parqSwitchLabel}>Sim</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.parqButton, !canFillAgain && styles.parqButtonDisabled]}
            onPress={handleParqSubmit}
            disabled={!canFillAgain}
          >
            <Text style={styles.parqButtonText}>Salvar PAR-Q</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderCheckin = () => {
    if (!painelAluno) return null;

    return (
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Check-in de Presença</Text>
          
          <View style={styles.checkinCard}>
            <Text style={styles.checkinTitle}>Status de Hoje</Text>
            
            <View style={styles.checkinStatusRow}>
              <Text style={styles.checkinLabel}>Check-in realizado:</Text>
              <Text style={[
                styles.checkinStatus,
                { color: painelAluno.status_hoje.checkin_realizado ? '#4caf50' : '#666' }
              ]}>
                {painelAluno.status_hoje.checkin_realizado ? '✓ Sim' : '✗ Não'}
              </Text>
            </View>

            <View style={styles.checkinStatusRow}>
              <Text style={styles.checkinLabel}>Presença confirmada:</Text>
              <Text style={[
                styles.checkinStatus,
                { color: painelAluno.status_hoje.presenca_confirmada ? '#4caf50' : '#666' }
              ]}>
                {painelAluno.status_hoje.presenca_confirmada ? '✓ Sim' : '✗ Não'}
              </Text>
            </View>

            {painelAluno.turma && (
              <View style={styles.checkinStatusRow}>
                <Text style={styles.checkinLabel}>Turma:</Text>
                <Text style={styles.checkinStatus}>{painelAluno.turma}</Text>
              </View>
            )}

            {!painelAluno.status_hoje.pode_fazer_checkin && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ {painelAluno.status_hoje.motivo_checkin_bloqueado ||
                    'Você possui pendências de pagamento. Regularize suas mensalidades para fazer o check-in.'}
                </Text>
              </View>
            )}

            {mensalidadesPendentes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mensalidades Pendentes</Text>
                {mensalidadesPendentes.map((mensalidade) => (
                  <View key={mensalidade.id} style={styles.mensalidadeCard}>
                    <View style={styles.mensalidadeHeader}>
                      <Text style={styles.mensalidadeValue}>
                        R$ {Number(mensalidade.valor_efetivo ?? mensalidade.valor).toFixed(2)}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: mensalidade.status === 'atrasado' ? '#f44336' : '#ff9800' }
                      ]}>
                        <Text style={styles.statusBadgeText}>
                          {mensalidade.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.mensalidadeDate}>
                      Mês/Ano: {formatMonthYear(mensalidade.data_vencimento)}
                    </Text>
                    <Text style={styles.mensalidadeDate}>
                      Vencimento: {formatDate(mensalidade.data_vencimento)}
                    </Text>
                    <TouchableOpacity
                      style={styles.pagarButton}
                      onPress={() => handlePagarMensalidade(mensalidade)}
                    >
                      <Text style={styles.pagarButtonText}>Pagar Agora</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.checkinButton,
                (!painelAluno.status_hoje.pode_fazer_checkin || 
                 painelAluno.status_hoje.checkin_realizado || 
                 checkinLoading) && styles.checkinButtonDisabled
              ]}
              onPress={handleCheckin}
              disabled={
                !painelAluno.status_hoje.pode_fazer_checkin ||
                painelAluno.status_hoje.checkin_realizado ||
                checkinLoading
              }
            >
              {checkinLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.checkinButtonText}>
                  {painelAluno.status_hoje.checkin_realizado 
                    ? 'Check-in já realizado' 
                    : 'Realizar Check-in'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  const handlePagarMensalidade = (mensalidade: Mensalidade) => {
    setMensalidadeFormaPagamento(mensalidade);
    setFormaPagamentoModalVisible(true);
  };

  const escolherFormaPagamento = (acao: 'pix' | 'boleto' | 'cartao') => {
    const m = mensalidadeFormaPagamento;
    setFormaPagamentoModalVisible(false);
    setMensalidadeFormaPagamento(null);
    if (!m) return;
    if (acao === 'pix') void gerarPix(m);
    else if (acao === 'boleto') void gerarBoleto(m);
    else void criarCheckout(m);
  };

  const pararPollingPix = () => {
    if (pixPollIntervalRef.current) {
      clearInterval(pixPollIntervalRef.current);
      pixPollIntervalRef.current = null;
    }
    if (pixPollMaxTimeoutRef.current) {
      clearTimeout(pixPollMaxTimeoutRef.current);
      pixPollMaxTimeoutRef.current = null;
    }
  };

  const pararPollingBoleto = () => {
    if (boletoPollIntervalRef.current) {
      clearInterval(boletoPollIntervalRef.current);
      boletoPollIntervalRef.current = null;
    }
    if (boletoPollMaxTimeoutRef.current) {
      clearTimeout(boletoPollMaxTimeoutRef.current);
      boletoPollMaxTimeoutRef.current = null;
    }
  };

  const pararPollingCheckout = () => {
    if (checkoutPollIntervalRef.current) {
      clearInterval(checkoutPollIntervalRef.current);
      checkoutPollIntervalRef.current = null;
    }
    if (checkoutPollMaxTimeoutRef.current) {
      clearTimeout(checkoutPollMaxTimeoutRef.current);
      checkoutPollMaxTimeoutRef.current = null;
    }
  };

  const aplicarRespostaStatusPix = async (
    transacao: { status?: string } | undefined,
    statusTopo: string | undefined
  ) => {
    const st = transacao?.status || statusTopo;
    if (st === 'aprovado') {
      pararPollingPix();
      setPixModalVisible(false);
      setPixData(null);
      Alert.alert('Pagamento confirmado', 'Sua mensalidade foi registrada como paga.');
      await loadHistoricoPagamentos();
      await loadAlunoData({ silent: true });
      return true;
    }
    if (st === 'expirado') {
      pararPollingPix();
      setPixModalVisible(false);
      setPixData(null);
      Alert.alert('PIX expirado', 'Gere um novo PIX para pagar.');
      await loadHistoricoPagamentos();
      return true;
    }
    return false;
  };

  const consultarStatusPixUmaVez = async (transacaoId: number) => {
    const data = await pagamentoService.consultarStatusPix(transacaoId);
    return aplicarRespostaStatusPix(data.transacao, data.status);
  };

  const aplicarRespostaBoleto = async (data: {
    transacao?: { status?: string };
    status?: string;
  }): Promise<boolean> => {
    const st = (data.transacao?.status || data.status || '').toLowerCase();
    if (st === 'aprovado') {
      pararPollingBoleto();
      setBoletoModalVisible(false);
      setBoletoData(null);
      Alert.alert('Pagamento confirmado', 'Boleto compensado. Mensalidade registrada como paga.');
      await loadHistoricoPagamentos();
      await loadAlunoData({ silent: true });
      return true;
    }
    if (st === 'cancelado') {
      pararPollingBoleto();
      setBoletoModalVisible(false);
      setBoletoData(null);
      Alert.alert('Boleto cancelado', 'Gere um novo boleto se precisar pagar de novo.');
      await loadHistoricoPagamentos();
      await loadAlunoData({ silent: true });
      return true;
    }
    if (st === 'expirado') {
      pararPollingBoleto();
      setBoletoModalVisible(false);
      setBoletoData(null);
      Alert.alert('Boleto expirado', 'Gere um novo boleto para pagar.');
      await loadHistoricoPagamentos();
      await loadAlunoData({ silent: true });
      return true;
    }
    return false;
  };

  const aplicarRespostaCheckout = async (data: {
    transacao?: { status?: string };
    status?: string;
  }): Promise<boolean> => {
    const st = (data.transacao?.status || data.status || '').toLowerCase();
    if (st === 'aprovado') {
      pararPollingCheckout();
      setCheckoutModalVisible(false);
      setCheckoutData(null);
      Alert.alert('Pagamento confirmado', 'Cartão aprovado. Mensalidade registrada como paga.');
      await loadHistoricoPagamentos();
      await loadAlunoData({ silent: true });
      return true;
    }
    if (st === 'cancelado') {
      pararPollingCheckout();
      setCheckoutModalVisible(false);
      setCheckoutData(null);
      Alert.alert('Pagamento cancelado', 'Você pode iniciar um novo pagamento com cartão.');
      await loadHistoricoPagamentos();
      await loadAlunoData({ silent: true });
      return true;
    }
    if (st === 'expirado') {
      pararPollingCheckout();
      setCheckoutModalVisible(false);
      setCheckoutData(null);
      Alert.alert('Checkout expirado', 'Gere um novo link de pagamento.');
      await loadHistoricoPagamentos();
      await loadAlunoData({ silent: true });
      return true;
    }
    return false;
  };

  const consultarBoletoUmaVez = async (transacaoId: number) => {
    const data = await pagamentoService.consultarBoleto(transacaoId);
    return aplicarRespostaBoleto(data);
  };

  const consultarCheckoutUmaVez = async (transacaoId: number) => {
    const data = await pagamentoService.consultarCheckout(transacaoId);
    return aplicarRespostaCheckout(data);
  };

  const gerarPix = async (mensalidade: Mensalidade) => {
    try {
      const response = await pagamentoService.gerarPix(mensalidade.id);
      const transacaoId = response.transacao?.id;
      if (transacaoId == null || Number.isNaN(Number(transacaoId))) {
        Alert.alert('Erro', 'Resposta incompleta ao gerar PIX. Tente novamente.');
        return;
      }
      pararPollingPix();
      setPixData({
        transacao_id: transacaoId,
        codigo_pix: response.transacao.codigo_pix,
        qr_code: response.transacao.qr_code,
        valor: response.transacao.valor,
        data_expiracao: response.transacao.data_expiracao,
      });
      setPixModalVisible(true);
      await loadHistoricoPagamentos();

      const intervalo = setInterval(() => {
        void (async () => {
          try {
            await consultarStatusPixUmaVez(transacaoId);
          } catch (err) {
            console.error('Erro ao verificar status do PIX:', err);
          }
        })();
      }, 5000);
      pixPollIntervalRef.current = intervalo;
      pixPollMaxTimeoutRef.current = setTimeout(() => {
        pararPollingPix();
      }, 30 * 60 * 1000);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao gerar PIX.');
    }
  };

  const gerarBoleto = async (mensalidade: Mensalidade) => {
    try {
      const response = await pagamentoService.gerarBoleto(mensalidade.id);
      const transacaoId = response.transacao?.id;
      const linhaDigitavel =
        response.boleto?.digitable_line || response.transacao?.boleto_codigo;
      if (!linhaDigitavel) {
        Alert.alert('Boleto Gerado', 'Boleto criado, mas a linha digitável não foi retornada.');
      } else if (transacaoId == null || Number.isNaN(Number(transacaoId))) {
        Alert.alert('Erro', 'Resposta incompleta ao gerar boleto. Tente novamente.');
      } else {
        pararPollingBoleto();
        setBoletoData({
          transacao_id: transacaoId,
          linha_digitavel: linhaDigitavel,
          valor: response.transacao?.valor,
          data_vencimento: response.transacao?.data_vencimento,
        });
        setBoletoModalVisible(true);
        const intervalo = setInterval(() => {
          void (async () => {
            try {
              await consultarBoletoUmaVez(transacaoId);
            } catch (err) {
              console.error('Erro ao verificar status do boleto:', err);
            }
          })();
        }, 15000);
        boletoPollIntervalRef.current = intervalo;
        boletoPollMaxTimeoutRef.current = setTimeout(() => {
          pararPollingBoleto();
        }, 30 * 60 * 1000);
      }
      await loadHistoricoPagamentos();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao gerar boleto.');
    }
  };

  const criarCheckout = async (mensalidade: Mensalidade) => {
    try {
      const response = await pagamentoService.criarCheckout(mensalidade.id);
      const paymentUrl =
        response.payment_url ||
        response.checkout?.payment_url ||
        response.transacao?.payment_url;
      const transacaoId = response.transacao?.id;

      if (!paymentUrl || !transacaoId) {
        Alert.alert('Checkout Criado', 'Checkout gerado, mas o link não foi retornado.');
      } else if (Number.isNaN(Number(transacaoId))) {
        Alert.alert('Erro', 'Resposta incompleta ao criar checkout. Tente novamente.');
      } else {
        pararPollingCheckout();
        setCheckoutData({
          transacao_id: transacaoId,
          payment_url: paymentUrl,
          status: response.transacao?.status || response.checkout?.status,
        });
        setCheckoutModalVisible(true);
        const intervalo = setInterval(() => {
          void (async () => {
            try {
              await consultarCheckoutUmaVez(transacaoId);
            } catch (err) {
              console.error('Erro ao verificar status do checkout:', err);
            }
          })();
        }, 5000);
        checkoutPollIntervalRef.current = intervalo;
        checkoutPollMaxTimeoutRef.current = setTimeout(() => {
          pararPollingCheckout();
        }, 30 * 60 * 1000);
      }
      await loadHistoricoPagamentos();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao criar checkout.');
    }
  };

  const handleCopiarPix = async () => {
    if (!pixData?.codigo_pix) return;
    await Clipboard.setStringAsync(pixData.codigo_pix);
    Alert.alert('Sucesso', 'Código PIX copiado.');
  };

  const handleConsultarPixStatus = async () => {
    if (!pixData?.transacao_id) return;
    try {
      setPixStatusLoading(true);
      const ok = await consultarStatusPixUmaVez(pixData.transacao_id);
      if (!ok) {
        Alert.alert(
          'Status',
          'Pagamento ainda pendente ou em processamento. Aguarde alguns segundos e toque de novo, ou pague o PIX e aguarde a confirmação automática.'
        );
      }
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao consultar status do PIX.');
    } finally {
      setPixStatusLoading(false);
    }
  };

  const fecharModalPix = async () => {
    pararPollingPix();
    setPixModalVisible(false);
    setPixData(null);
    await loadHistoricoPagamentos();
    await loadAlunoData({ silent: true });
  };

  const fecharModalBoleto = async () => {
    pararPollingBoleto();
    setBoletoModalVisible(false);
    setBoletoData(null);
    await loadHistoricoPagamentos();
    await loadAlunoData({ silent: true });
  };

  const fecharModalCheckout = async () => {
    pararPollingCheckout();
    setCheckoutModalVisible(false);
    setCheckoutData(null);
    await loadHistoricoPagamentos();
    await loadAlunoData({ silent: true });
  };

  const handleCopiarLinhaDigitavel = async () => {
    if (!boletoData?.linha_digitavel) return;
    await Clipboard.setStringAsync(boletoData.linha_digitavel);
    Alert.alert('Sucesso', 'Linha digitável copiada.');
  };

  const handleConsultarBoletoStatus = async () => {
    if (!boletoData?.transacao_id) return;
    try {
      setBoletoStatusLoading(true);
      const response = await pagamentoService.consultarBoleto(boletoData.transacao_id);
      const ok = await aplicarRespostaBoleto(response);
      if (!ok) {
        const label = response.status || response.transacao?.status || 'indisponível';
        Alert.alert(
          'Status do boleto',
          `Status: ${label}. Se já pagou, aguarde a compensação ou toque de novo em alguns minutos.`
        );
      }
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao consultar boleto.');
    } finally {
      setBoletoStatusLoading(false);
    }
  };

  const handleDownloadBoletoPdf = async () => {
    if (!boletoData?.transacao_id) return;
    try {
      setBoletoDownloading(true);
      const token = await AsyncStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
      const url = `${CONFIG.API_BASE_URL}financeiro/boletos/${boletoData.transacao_id}/pdf/`;
      const fileName = `boleto_${boletoData.transacao_id}.pdf`;
      const baseDir = cacheDirectory ?? documentDirectory;
      if (!baseDir) {
        Alert.alert('Erro', 'Armazenamento indisponível.');
        return;
      }
      const path = `${baseDir}${fileName}`;
      const download = await downloadAsync(url, path, {
        headers: token ? { Authorization: `Token ${token}` } : {},
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(download.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Boleto',
        });
      } else {
        Alert.alert('Download', 'Arquivo salvo. Abra pelos arquivos do app.');
      }
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Erro ao baixar boleto.');
    } finally {
      setBoletoDownloading(false);
    }
  };

  const handleConsultarCheckoutStatus = async () => {
    if (!checkoutData?.transacao_id) return;
    try {
      setCheckoutStatusLoading(true);
      const response = await pagamentoService.consultarCheckout(checkoutData.transacao_id);
      const ok = await aplicarRespostaCheckout(response);
      if (!ok) {
        const status = response.status || response.checkout?.status || response.transacao?.status;
        Alert.alert(
          'Status do pagamento',
          `Status: ${status || 'indisponível'}. Após pagar no navegador, toque de novo para atualizar.`
        );
        await loadHistoricoPagamentos();
        await loadAlunoData({ silent: true });
      }
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao consultar checkout.');
    } finally {
      setCheckoutStatusLoading(false);
    }
  };

  const renderPagamentos = () => {
    if (!historicoPagamentos) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      );
    }

    const todasMensalidades = [
      ...historicoPagamentos.mensalidades_vencidas,
      ...historicoPagamentos.mensalidades_vincendas,
      ...historicoPagamentos.mensalidades_pagas,
    ];

    return (
      <ScrollView style={styles.content}>
        {mensalidadesPendentes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mensalidades Pendentes</Text>
            {mensalidadesPendentes.map((mensalidade) => (
              <View key={mensalidade.id} style={styles.mensalidadeCard}>
                <View style={styles.mensalidadeHeader}>
                  <Text style={styles.mensalidadeValue}>
                    R$ {Number(mensalidade.valor_efetivo ?? mensalidade.valor).toFixed(2)}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: mensalidade.status === 'atrasado' ? '#f44336' : '#ff9800' }
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {mensalidade.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.mensalidadeDate}>
                  Mês/Ano: {formatMonthYear(mensalidade.data_vencimento)}
                </Text>
                <Text style={styles.mensalidadeDate}>
                  Vencimento: {formatDate(mensalidade.data_vencimento)}
                </Text>
                <TouchableOpacity
                  style={styles.pagarButton}
                  onPress={() => handlePagarMensalidade(mensalidade)}
                >
                  <Text style={styles.pagarButtonText}>Pagar Agora</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {historicoPagamentos.mensalidades_vencidas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mensalidades Vencidas</Text>
            {historicoPagamentos.mensalidades_vencidas.map((mensalidade) => (
              <View key={mensalidade.id} style={styles.mensalidadeCard}>
                <View style={styles.mensalidadeHeader}>
                  <Text style={styles.mensalidadeValue}>
                    R$ {Number(mensalidade.valor_efetivo ?? mensalidade.valor).toFixed(2)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#f44336' }]}>
                    <Text style={styles.statusBadgeText}>Vencida</Text>
                  </View>
                </View>
                <Text style={styles.mensalidadeDate}>
                  Vencimento: {new Date(mensalidade.data_vencimento).toLocaleDateString('pt-BR')}
                </Text>
                <TouchableOpacity
                  style={styles.pagarButton}
                  onPress={() => handlePagarMensalidade(mensalidade)}
                >
                  <Text style={styles.pagarButtonText}>Pagar Agora</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {historicoPagamentos.mensalidades_vincendas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mensalidades a Vencer</Text>
            {historicoPagamentos.mensalidades_vincendas.map((mensalidade) => (
              <View key={mensalidade.id} style={styles.mensalidadeCard}>
                <View style={styles.mensalidadeHeader}>
                  <Text style={styles.mensalidadeValue}>
                    R$ {Number(mensalidade.valor_efetivo ?? mensalidade.valor).toFixed(2)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#ff9800' }]}>
                    <Text style={styles.statusBadgeText}>Pendente</Text>
                  </View>
                </View>
                <Text style={styles.mensalidadeDate}>
                  Vencimento: {new Date(mensalidade.data_vencimento).toLocaleDateString('pt-BR')}
                </Text>
                <TouchableOpacity
                  style={styles.pagarButton}
                  onPress={() => handlePagarMensalidade(mensalidade)}
                >
                  <Text style={styles.pagarButtonText}>Pagar Agora</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {historicoPagamentos.mensalidades_pagas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mensalidades Pagas</Text>
            {historicoPagamentos.mensalidades_pagas.map((mensalidade) => (
              <View key={mensalidade.id} style={styles.mensalidadeCard}>
                <View style={styles.mensalidadeHeader}>
                  <Text style={styles.mensalidadeValue}>
                    R$ {Number(mensalidade.valor_efetivo ?? mensalidade.valor).toFixed(2)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#4caf50' }]}>
                    <Text style={styles.statusBadgeText}>Pago</Text>
                  </View>
                </View>
                <Text style={styles.mensalidadeDate}>
                  Vencimento: {new Date(mensalidade.data_vencimento).toLocaleDateString('pt-BR')}
                </Text>
                {mensalidade.data_pagamento && (
                  <Text style={styles.mensalidadeDate}>
                    Pago em: {new Date(mensalidade.data_pagamento).toLocaleDateString('pt-BR')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {todasMensalidades.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.noData}>Nenhuma mensalidade encontrada.</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeScreen tabScreen style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen tabScreen style={styles.container}>
      {/* Header */}
      {painelAluno && (
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.profilePhoto}>
              {painelAluno.usuario.foto_perfil ? (
                <Image
                  source={{ uri: `${CONFIG.API_BASE_URL.replace('/api/', '')}${painelAluno.usuario.foto_perfil}` }}
                  style={styles.profileImage}
                />
              ) : (
                <Text style={styles.profileInitials}>
                  {getInitials(`${painelAluno.usuario.first_name} ${painelAluno.usuario.last_name}`)}
                </Text>
              )}
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>
                {painelAluno.usuario.first_name} {painelAluno.usuario.last_name}
              </Text>
              <Text style={styles.headerStatus}>
                {painelAluno.usuario.ativo ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Navigation Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'dashboard' && styles.activeTab]}
          onPress={() => setActiveSection('dashboard')}
        >
          <Text style={[styles.tabText, activeSection === 'dashboard' && styles.activeTabText]}>
            Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'perfil' && styles.activeTab]}
          onPress={() => setActiveSection('perfil')}
        >
          <Text style={[styles.tabText, activeSection === 'perfil' && styles.activeTabText]}>
            Meu Perfil
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'parq' && styles.activeTab]}
          onPress={() => setActiveSection('parq')}
        >
          <Text style={[styles.tabText, activeSection === 'parq' && styles.activeTabText]}>
            PAR-Q
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'checkin' && styles.activeTab]}
          onPress={() => setActiveSection('checkin')}
        >
          <Text style={[styles.tabText, activeSection === 'checkin' && styles.activeTabText]}>
            Check-in
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'pagamentos' && styles.activeTab]}
          onPress={() => setActiveSection('pagamentos')}
        >
          <Text style={[styles.tabText, activeSection === 'pagamentos' && styles.activeTabText]}>
            Pagamentos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeSection === 'dashboard' && renderDashboard()}
      {activeSection === 'perfil' && renderPerfil()}
      {activeSection === 'parq' && renderParq()}
      {activeSection === 'checkin' && renderCheckin()}
      {activeSection === 'pagamentos' && renderPagamentos()}

      <Modal visible={formaPagamentoModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { marginBottom: Math.max(insets.bottom, 8) }]}>
            <Text style={styles.modalTitle}>Forma de pagamento</Text>
            <Text style={styles.modalSubtitle}>
              {`Mensalidade de R$ ${
                mensalidadeFormaPagamento
                  ? Number(
                      mensalidadeFormaPagamento.valor_efetivo ?? mensalidadeFormaPagamento.valor
                    ).toFixed(2)
                  : '—'
              }`}
            </Text>
            <Text style={styles.modalHint}>
              Cartão de crédito abre o checkout seguro do banco no navegador.
            </Text>
            <TouchableOpacity
              style={styles.paymentOptionButton}
              onPress={() => escolherFormaPagamento('pix')}
            >
              <Text style={styles.paymentOptionButtonText}>PIX</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.paymentOptionButton}
              onPress={() => escolherFormaPagamento('boleto')}
            >
              <Text style={styles.paymentOptionButtonText}>Boleto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentOptionButton, styles.paymentOptionButtonHighlight]}
              onPress={() => escolherFormaPagamento('cartao')}
            >
              <Text style={styles.paymentOptionButtonText}>Cartão de crédito</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButtonStack, styles.modalButtonStackSecondary]}
              onPress={() => {
                setFormaPagamentoModalVisible(false);
                setMensalidadeFormaPagamento(null);
              }}
            >
              <Text style={styles.modalButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={pixModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>PIX Gerado</Text>
            <Text style={styles.modalSubtitle}>
              Escaneie o QR Code ou copie o código PIX.
            </Text>
            <View style={styles.qrContainer}>
              <QRCode
                size={200}
                value={pixData?.codigo_pix || ''}
                backgroundColor="#fff"
              />
            </View>
            {pixData?.valor && (
              <Text style={styles.modalAmount}>Valor: R$ {pixData.valor}</Text>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={handleCopiarPix}>
                <Text style={styles.modalButtonText}>Copiar código</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleConsultarPixStatus}
                disabled={pixStatusLoading}
              >
                <Text style={styles.modalButtonText}>
                  {pixStatusLoading ? 'Consultando...' : 'Já paguei — verificar'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => void fecharModalPix()}
              >
                <Text style={styles.modalButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={boletoModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Boleto Gerado</Text>
            <Text style={styles.modalSubtitle}>
              Copie a linha digitável para efetuar o pagamento.
            </Text>
            <Text style={styles.boletoLine}>{boletoData?.linha_digitavel}</Text>
            {boletoData?.valor && (
              <Text style={styles.modalAmount}>Valor: R$ {boletoData.valor}</Text>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={handleCopiarLinhaDigitavel}>
                <Text style={styles.modalButtonText}>Copiar linha</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleConsultarBoletoStatus}
                disabled={boletoStatusLoading}
              >
                <Text style={styles.modalButtonText}>
                  {boletoStatusLoading ? 'Consultando...' : 'Já paguei — verificar'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.modalButtonStack, styles.modalButtonStackSecondary]}
              onPress={handleDownloadBoletoPdf}
              disabled={boletoDownloading}
            >
              <Text style={styles.modalButtonText}>
                {boletoDownloading ? 'Baixando...' : 'Baixar PDF'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButtonStack, styles.modalButtonStackSecondary]}
              onPress={() => void fecharModalBoleto()}
            >
              <Text style={styles.modalButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={checkoutModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Checkout Criado</Text>
            <Text style={styles.modalSubtitle}>
              Abra o link para efetuar o pagamento e depois consulte o status.
            </Text>
            <TouchableOpacity
              style={[styles.modalButtonStack, styles.modalButtonStackPrimary]}
              onPress={() => {
                const url = checkoutData?.payment_url?.trim();
                if (!url) {
                  Alert.alert('Erro', 'Link de pagamento indisponível. Tente gerar novamente.');
                  return;
                }
                Linking.openURL(url);
              }}
            >
              <Text style={styles.modalButtonText}>Abrir pagamento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButtonStack, styles.modalButtonStackSecondary]}
              onPress={handleConsultarCheckoutStatus}
              disabled={checkoutStatusLoading}
            >
              <Text style={styles.modalButtonText}>
                {checkoutStatusLoading ? 'Consultando...' : 'Já paguei — verificar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButtonStack, styles.modalButtonStackSecondary]}
              onPress={() => void fecharModalCheckout()}
            >
              <Text style={styles.modalButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
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
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profileInitials: {
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
  headerStatus: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  perfilKeyboardRoot: {
    flex: 1,
  },
  perfilScrollView: {
    flex: 1,
  },
  perfilScrollInner: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 280,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
  },
  checkinHighlight: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  checkinBlocked: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
  },
  checkinHighlightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 6,
  },
  checkinBlockedTitle: {
    color: '#f57c00',
  },
  checkinHighlightText: {
    fontSize: 14,
    color: '#555',
  },
  aulaCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  aulaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  aulaLabel: {
    fontSize: 12,
    color: '#666',
  },
  aulaValue: {
    fontSize: 12,
    color: '#333',
  },
  aulaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aulaBadgePresent: {
    backgroundColor: '#4caf50',
  },
  aulaBadgeAbsent: {
    backgroundColor: '#f44336',
  },
  aulaBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
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
  photoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
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
  photoRemoveButton: {
    backgroundColor: '#f44336',
    marginTop: 8,
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
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 8,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  perfilIdadeHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
    lineHeight: 18,
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
  turmaCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  turmaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  turmaInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
  },
  statusCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  statusLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  mensalidadeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  mensalidadeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mensalidadeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  mensalidadeDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkinCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  checkinTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  checkinStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  checkinLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  checkinStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
  },
  checkinButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  checkinButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  checkinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pagarButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  pagarButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  parqInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  parqRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
  parqQuestion: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  parqSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  parqSwitchLabel: {
    fontSize: 12,
    color: '#666',
  },
  parqButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  parqButtonDisabled: {
    backgroundColor: '#ccc',
  },
  parqButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
    color: '#1F6C86',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 12,
    color: '#555555',
    marginBottom: 16,
    lineHeight: 18,
  },
  paymentOptionButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  paymentOptionButtonHighlight: {
    borderColor: colors.primary,
    backgroundColor: '#e8f4f8',
  },
  paymentOptionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F6C86',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAmount: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  /** Linha com dois botões (ex.: PIX modal) */
  modalButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  modalButtonSecondary: {
    backgroundColor: '#9e9e9e',
    marginRight: 0,
    marginLeft: 8,
  },
  /**
   * Botões empilhados em coluna: evitar flex:1 sem pai com altura definida —
   * no Android o layout pode colapsar e o texto some.
   */
  modalButtonStack: {
    alignSelf: 'stretch',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 48,
  },
  modalButtonStackPrimary: {
    backgroundColor: colors.primary,
    marginTop: 16,
  },
  modalButtonStackSecondary: {
    backgroundColor: '#757575',
    marginLeft: 0,
    marginRight: 0,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  boletoLine: {
    fontSize: 12,
    color: '#333',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalCloseButton: {
    marginTop: 12,
  },
  profileAge: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default DashboardAlunoScreen; 