import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Image,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { funcionarioService, financeiroService, usuarioService, userService } from '../services/api';
import { User, PainelGerente, Mensalidade, PreCadastro, Despesa, Salario, FinanceiroDashboard } from '../types';
import { NavigationProps } from '../types';
import CONFIG from '../config';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';

const DashboardGerenteScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const [painelGerente, setPainelGerente] = useState<PainelGerente | null>(null);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [salarios, setSalarios] = useState<Salario[]>([]);
  const [dashboardFinanceiro, setDashboardFinanceiro] = useState<FinanceiroDashboard | null>(null);
  const [alunos, setAlunos] = useState<User[]>([]);
  const [precadastros, setPrecadastros] = useState<PreCadastro[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingFinanceiro, setLoadingFinanceiro] = useState(false);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'financeiro' | 'alunos' | 'relatorios' | 'perfil'>('dashboard');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [showDespesaModal, setShowDespesaModal] = useState(false);
  const [editDespesa, setEditDespesa] = useState<Despesa | null>(null);
  const [savingDespesa, setSavingDespesa] = useState(false);
  const [despesaForm, setDespesaForm] = useState({
    descricao: '',
    valor: '',
    data: '',
  });
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

  useEffect(() => {
    if (user) {
      loadGerenteData();
    }
  }, [user]);

  // Detectar seção ativa baseada na rota
  useEffect(() => {
    if (route?.name) {
      setActiveSection(route.name.toLowerCase() as any);
    }
  }, [route?.name]);

  useEffect(() => {
    if (activeSection === 'alunos' && user) {
      loadAlunos();
    }
    if (activeSection === 'financeiro' && user) {
      loadFinanceiroData();
    }
  }, [activeSection, user, mes, ano]);

  const loadGerenteData = async () => {
    try {
      setLoading(true);
      const painelData = await funcionarioService.getPainelGerente();
      setPainelGerente(painelData);
      setProfileForm({
        first_name: painelData.first_name || '',
        last_name: painelData.last_name || '',
        email: painelData.email || '',
        telefone: painelData.telefone || '',
        endereco: painelData.endereco || '',
        data_nascimento: painelData.data_nascimento || '',
      });
    } catch (error: any) {
      console.error('Erro ao carregar painel do gerente:', error);
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar dados do gerente.');
    } finally {
      setLoading(false);
    }
  };

  const buildFinanceiroParams = () => ({ mes, ano });

  const loadMensalidades = async () => {
    try {
      const response = await financeiroService.getMensalidades(buildFinanceiroParams());
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

  const loadPrecadastros = async () => {
    try {
      const precadastrosData = await funcionarioService.listarPrecadastros();
      setPrecadastros(precadastrosData);
    } catch (error: any) {
      console.error('Erro ao carregar pré-cadastros:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGerenteData();
    if (activeSection === 'alunos') await loadAlunos();
    if (activeSection === 'financeiro') await loadFinanceiroData();
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

  const formatCurrency = (value: number | undefined | null) => {
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
    setDespesaForm({ descricao: '', valor: '', data: '' });
    setShowDespesaModal(true);
  };

  const handleEditarDespesa = (despesa: Despesa) => {
    setEditDespesa(despesa);
    setDespesaForm({
      descricao: despesa.descricao,
      valor: String(despesa.valor ?? ''),
      data: despesa.data,
    });
    setShowDespesaModal(true);
  };

  const handleSalvarDespesa = async () => {
    if (!despesaForm.descricao.trim() || !despesaForm.valor || !despesaForm.data) {
      Alert.alert('Erro', 'Preencha descrição, valor e data.');
      return;
    }

    try {
      setSavingDespesa(true);
      const payload = {
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

  const handleSelecionarFoto = () => {
    launchImageLibrary(
      { mediaType: 'photo' as MediaType, quality: 0.8 },
      (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorMessage) {
          Alert.alert('Erro', 'Erro ao selecionar imagem.');
          return;
        }
        const asset = response.assets && response.assets[0];
        if (!asset?.uri) return;
        setFotoPerfil(asset);
        setFotoPreview(asset.uri);
      }
    );
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
        data_nascimento: painelGerente.data_nascimento || '',
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!painelGerente) return;
    try {
      setSavingProfile(true);
      const payload: Partial<User> = {
        id: painelGerente.id,
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email,
        telefone: profileForm.telefone,
        endereco: profileForm.endereco,
        data_nascimento: profileForm.data_nascimento || null,
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
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao atualizar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const renderDashboard = () => {
    if (!painelGerente) return null;

    return (
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Alunos Ativos</Text>
            <Text style={styles.statValue}>{painelGerente.alunos_ativos || 0}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Professores</Text>
            <Text style={styles.statValue}>{painelGerente.professores || 0}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Turmas</Text>
            <Text style={styles.statValue}>{painelGerente.turmas?.length || 0}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Mensalidades Pendentes</Text>
            <Text style={styles.statValue}>{painelGerente.mensalidades_pendentes || 0}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Mensalidades Atrasadas</Text>
            <Text style={[styles.statValue, { color: '#f44336' }]}>
              {painelGerente.mensalidades_atrasadas || 0}
            </Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Mensalidades Pagas</Text>
            <Text style={[styles.statValue, { color: '#4caf50' }]}>
              {painelGerente.mensalidades_pagas || 0}
            </Text>
          </View>
        </View>

        {painelGerente.precadastros > 0 && (
          <View style={styles.section}>
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>
                ⚠️ {painelGerente.precadastros} Pré-cadastro(s) pendente(s)
              </Text>
              <Text style={styles.warningText}>
                Existem pré-cadastros aguardando conversão em alunos.
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
                  {new Date(activity.data).toLocaleDateString('pt-BR')}
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
      .reduce((total, m) => total + m.valor, 0);
    const totalAtrasado = mensalidades
      .filter(m => m.status === 'atrasado')
      .reduce((total, m) => total + m.valor, 0);
    const totalPago = mensalidades
      .filter(m => m.status === 'pago')
      .reduce((total, m) => total + m.valor, 0);

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
              <ActivityIndicator size="small" color="#1a237e" />
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
                      {mensalidade.aluno_nome || `Aluno #${mensalidade.aluno}`}
                    </Text>
                    <Text style={styles.mensalidadeValue}>
                      {formatCurrency(mensalidade.valor)}
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
                {mensalidade.data_pagamento && (
                  <Text style={styles.mensalidadeDate}>
                    Pago em: {formatDate(mensalidade.data_pagamento)}
                  </Text>
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
                    style={[styles.actionButton, styles.editButton, styles.inlineButton]}
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

  const handleConverterPrecadastro = async (precadastro: PreCadastro) => {
    Alert.alert(
      'Converter Pré-cadastro',
      `Deseja converter o pré-cadastro de ${precadastro.nome || precadastro.email} em aluno?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Converter',
          onPress: async () => {
            try {
              await funcionarioService.converterPrecadastro(precadastro.id);
              Alert.alert('Sucesso', 'Pré-cadastro convertido em aluno com sucesso! Um convite de ativação foi enviado por e-mail.');
              await loadPrecadastros();
              await loadGerenteData();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao converter pré-cadastro.');
            }
          },
        },
      ]
    );
  };

  const renderAlunos = () => {
    const alunosAtivos = alunos.filter(a => a.ativo).length;
    const alunosInativos = alunos.filter(a => !a.ativo).length;

    return (
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estatísticas</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Total de Alunos</Text>
              <Text style={styles.statValue}>{alunos.length}</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Alunos Ativos</Text>
              <Text style={[styles.statValue, { color: '#4caf50' }]}>
                {alunosAtivos}
              </Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Alunos Inativos</Text>
              <Text style={[styles.statValue, { color: '#f44336' }]}>
                {alunosInativos}
              </Text>
            </View>
          </View>
        </View>

        {precadastros.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pré-cadastros Pendentes ({precadastros.length})</Text>
            {precadastros.map(precadastro => (
              <View key={precadastro.id} style={styles.precadastroCard}>
                <View style={styles.precadastroHeader}>
                  <View style={styles.precadastroInfo}>
                    <Text style={styles.precadastroNome}>
                      {precadastro.nome || `${precadastro.first_name || ''} ${precadastro.last_name || ''}`.trim() || 'Sem nome'}
                    </Text>
                    <Text style={styles.precadastroEmail}>{precadastro.email}</Text>
                    {precadastro.telefone && (
                      <Text style={styles.precadastroTelefone}>{precadastro.telefone}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: '#ff9800' }]}>
                    <Text style={styles.statusText}>Pendente</Text>
                  </View>
                </View>
                <Text style={styles.precadastroDate}>
                  Cadastrado em: {new Date(precadastro.criado_em).toLocaleDateString('pt-BR')}
                </Text>
                <TouchableOpacity
                  style={styles.converterButton}
                  onPress={() => handleConverterPrecadastro(precadastro)}
                >
                  <Text style={styles.converterButtonText}>Converter em Aluno</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lista de Alunos ({alunos.length})</Text>
          {alunos.length === 0 ? (
            <Text style={styles.noData}>Nenhum aluno encontrado.</Text>
          ) : (
            alunos.map(aluno => (
              <TouchableOpacity
                key={aluno.id}
                style={styles.alunoCard}
                onPress={() => {
                  Alert.alert(
                    aluno.first_name + ' ' + aluno.last_name,
                    `Email: ${aluno.email}\n` +
                    `Telefone: ${aluno.telefone || 'Não informado'}\n` +
                    `Status: ${aluno.ativo ? 'Ativo' : 'Inativo'}`,
                    [{ text: 'OK' }]
                  );
                }}
              >
                <View style={styles.alunoHeader}>
                  <View style={styles.alunoInfo}>
                    <Text style={styles.alunoNome}>
                      {aluno.first_name} {aluno.last_name}
                    </Text>
                    <Text style={styles.alunoEmail}>{aluno.email}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: aluno.ativo ? '#4caf50' : '#f44336' }
                  ]}>
                    <Text style={styles.statusText}>
                      {aluno.ativo ? 'Ativo' : 'Inativo'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
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
                <Text style={styles.formLabel}>Data de Nascimento (AAAA-MM-DD)</Text>
                <TextInput
                  style={styles.formInput}
                  value={profileForm.data_nascimento}
                  onChangeText={(value) => setProfileForm(prev => ({ ...prev, data_nascimento: value }))}
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

  const renderRelatorios = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Relatórios Disponíveis</Text>
        
        <TouchableOpacity
          style={styles.reportCard}
          onPress={handleGerarRelatorioFinanceiro}
        >
          <Text style={styles.reportTitle}>Relatório Financeiro</Text>
          <Text style={styles.reportDescription}>
            Relatório detalhado de receitas e despesas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.reportCard}
          onPress={() => {
            Alert.alert('Em Desenvolvimento', 'Esta funcionalidade será implementada em breve.');
          }}
        >
          <Text style={styles.reportTitle}>Relatório de Presença</Text>
          <Text style={styles.reportDescription}>
            Estatísticas de presença por turma
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.reportCard}
          onPress={() => {
            Alert.alert('Em Desenvolvimento', 'Esta funcionalidade será implementada em breve.');
          }}
        >
          <Text style={styles.reportTitle}>Relatório de Alunos</Text>
          <Text style={styles.reportDescription}>
            Dados demográficos e performance dos alunos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.reportCard}
          onPress={() => {
            Alert.alert('Em Desenvolvimento', 'Esta funcionalidade será implementada em breve.');
          }}
        >
          <Text style={styles.reportTitle}>Relatório de Turmas</Text>
          <Text style={styles.reportDescription}>
            Análise de ocupação e performance das turmas
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a237e" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      {painelGerente && (
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
          style={[styles.tab, activeSection === 'financeiro' && styles.activeTab]}
          onPress={() => setActiveSection('financeiro')}
        >
          <Text style={[styles.tabText, activeSection === 'financeiro' && styles.activeTabText]}>
            Financeiro
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'alunos' && styles.activeTab]}
          onPress={() => {
            setActiveSection('alunos');
            loadPrecadastros();
          }}
        >
          <Text style={[styles.tabText, activeSection === 'alunos' && styles.activeTabText]}>
            Alunos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'relatorios' && styles.activeTab]}
          onPress={() => setActiveSection('relatorios')}
        >
          <Text style={[styles.tabText, activeSection === 'relatorios' && styles.activeTabText]}>
            Relatórios
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'perfil' && styles.activeTab]}
          onPress={() => setActiveSection('perfil')}
        >
          <Text style={[styles.tabText, activeSection === 'perfil' && styles.activeTabText]}>
            Perfil
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeSection === 'dashboard' && renderDashboard()}
      {activeSection === 'financeiro' && renderFinanceiro()}
      {activeSection === 'alunos' && renderAlunos()}
      {activeSection === 'relatorios' && renderRelatorios()}
      {activeSection === 'perfil' && renderPerfil()}

      <Modal visible={showDespesaModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editDespesa ? 'Editar despesa' : 'Nova despesa'}
            </Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
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
    borderColor: '#e0e0e0',
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
    color: '#1a237e',
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
    backgroundColor: '#1a237e',
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
    backgroundColor: '#1a237e',
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
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
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
    backgroundColor: '#1a237e',
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
    backgroundColor: '#1a237e',
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
    color: '#1a237e',
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
    backgroundColor: '#1a237e',
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
    color: '#1a237e',
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
    backgroundColor: '#1a237e',
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
    backgroundColor: '#1a237e',
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
  editButton: {
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#9e9e9e',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#1a237e',
    flex: 1,
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
    backgroundColor: '#1a237e',
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
    color: '#1a237e',
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1a237e',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#1a237e',
    fontWeight: 'bold',
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
    backgroundColor: '#1a237e',
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