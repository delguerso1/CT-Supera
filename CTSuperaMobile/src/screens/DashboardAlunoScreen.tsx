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
  Linking,
  TextInput,
  Switch,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { userService, alunoService, pagamentoService } from '../services/api';
import { User, PainelAluno, Mensalidade, HistoricoPagamentos } from '../types';
import { NavigationProps } from '../types';
import CONFIG from '../config';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';

const DashboardAlunoScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
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
    if (activeSection === 'pagamentos' && user) {
      loadHistoricoPagamentos();
    }
  }, [activeSection, user]);

  const loadAlunoData = async () => {
    try {
      setLoading(true);
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
        data_nascimento: usuario.data_nascimento || '',
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
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar dados do aluno.');
    } finally {
      setLoading(false);
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
        data_nascimento: usuario.data_nascimento || '',
        nome_responsavel: usuario.nome_responsavel || '',
        telefone_responsavel: usuario.telefone_responsavel || '',
        telefone_emergencia: usuario.telefone_emergencia || '',
      }));
    }
  };

  const handleSaveProfile = async () => {
    if (!painelAluno) return;
    try {
      setSavingProfile(true);
      const usuario = painelAluno.usuario;
      const payload: Partial<User> = {
        id: usuario.id,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        telefone: form.telefone,
        endereco: form.endereco,
        data_nascimento: form.data_nascimento || null,
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
                    R$ {mensalidade.valor.toFixed(2)}
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

    return (
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foto de Perfil</Text>
          <View style={styles.photoRow}>
            <View style={styles.profilePhotoLarge}>
              {fotoPreview ? (
                <Image source={{ uri: fotoPreview }} style={styles.profileImageLarge} />
              ) : aluno.foto_perfil ? (
                <Image
                  source={{ uri: `${baseUrl}${aluno.foto_perfil}` }}
                  style={styles.profileImageLarge}
                />
              ) : (
                <Text style={styles.profileInitialsLarge}>
                  {getInitials(`${aluno.first_name} ${aluno.last_name}`)}
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

        <View style={styles.profileSection}>
          <View style={styles.profilePhoto}>
            {aluno.foto_perfil ? (
              <Image
                source={{ uri: `${baseUrl}${aluno.foto_perfil}` }}
                style={styles.profileImage}
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Pessoais</Text>
          {editMode ? (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nome</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.first_name}
                  onChangeText={(value) => handleFormChange('first_name', value)}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sobrenome</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.last_name}
                  onChangeText={(value) => handleFormChange('last_name', value)}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="email-address"
                  value={form.email}
                  onChangeText={(value) => handleFormChange('email', value)}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Telefone</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.telefone}
                  onChangeText={(value) => handleFormChange('telefone', value)}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Endereço</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.endereco}
                  onChangeText={(value) => handleFormChange('endereco', value)}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Data de Nascimento (AAAA-MM-DD)</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.data_nascimento}
                  onChangeText={(value) => handleFormChange('data_nascimento', value)}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nome do Responsável</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.nome_responsavel}
                  onChangeText={(value) => handleFormChange('nome_responsavel', value)}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Telefone do Responsável</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.telefone_responsavel}
                  onChangeText={(value) => handleFormChange('telefone_responsavel', value)}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Telefone de Emergência</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.telefone_emergencia}
                  onChangeText={(value) => handleFormChange('telefone_emergencia', value)}
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
                <Text style={styles.infoLabel}>Telefone:</Text>
                <Text style={styles.infoValue}>{aluno.telefone || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Endereço:</Text>
                <Text style={styles.infoValue}>{aluno.endereco || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Data de Nascimento:</Text>
                <Text style={styles.infoValue}>{formatDate(aluno.data_nascimento)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nome do Responsável:</Text>
                <Text style={styles.infoValue}>{aluno.nome_responsavel || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Telefone do Responsável:</Text>
                <Text style={styles.infoValue}>{aluno.telefone_responsavel || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Telefone de Emergência:</Text>
                <Text style={styles.infoValue}>{aluno.telefone_emergencia || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ficha Médica:</Text>
                <Text style={styles.infoValue}>{aluno.ficha_medica || '-'}</Text>
              </View>
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
                        R$ {mensalidade.valor.toFixed(2)}
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
    Alert.alert(
      'Forma de Pagamento',
      `Escolha a forma de pagamento para a mensalidade de R$ ${mensalidade.valor.toFixed(2)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'PIX', onPress: () => gerarPix(mensalidade) },
        { text: 'Boleto', onPress: () => gerarBoleto(mensalidade) },
        { text: 'Cartão', onPress: () => criarCheckout(mensalidade) },
      ]
    );
  };

  const gerarPix = async (mensalidade: Mensalidade) => {
    try {
      const response = await pagamentoService.gerarPix(mensalidade.id);
      Alert.alert(
        'PIX Gerado',
        'PIX gerado com sucesso! Use o código abaixo para pagar:',
        [
          { text: 'Copiar Código', onPress: () => {
            // Aqui você pode implementar a cópia do código PIX
            Alert.alert('Código PIX', response.transacao.codigo_pix);
          }},
          { text: 'OK' },
        ]
      );
      await loadHistoricoPagamentos();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao gerar PIX.');
    }
  };

  const gerarBoleto = async (mensalidade: Mensalidade) => {
    try {
      const response = await pagamentoService.gerarBoleto(mensalidade.id);
      Alert.alert(
        'Boleto Gerado',
        `Boleto gerado com sucesso!\nLinha digitável: ${response.transacao.linha_digitavel}`,
        [
          { text: 'Copiar Linha Digitável', onPress: () => {
            Alert.alert('Linha Digitável', response.transacao.linha_digitavel);
          }},
          { text: 'OK' },
        ]
      );
      await loadHistoricoPagamentos();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao gerar boleto.');
    }
  };

  const criarCheckout = async (mensalidade: Mensalidade) => {
    try {
      const response = await pagamentoService.criarCheckout(mensalidade.id);
      Alert.alert(
        'Checkout Criado',
        'Redirecionando para o pagamento...',
        [
          {
            text: 'Abrir',
            onPress: () => {
              Linking.openURL(response.checkout.payment_url);
            },
          },
        ]
      );
      await loadHistoricoPagamentos();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao criar checkout.');
    }
  };

  const renderPagamentos = () => {
    if (!historicoPagamentos) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a237e" />
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
                    R$ {mensalidade.valor.toFixed(2)}
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
                    R$ {mensalidade.valor.toFixed(2)}
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
                    R$ {mensalidade.valor.toFixed(2)}
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
                    R$ {mensalidade.valor.toFixed(2)}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
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
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profileInitials: {
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
    color: '#1a237e',
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
    color: '#1a237e',
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
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
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
    color: '#1a237e',
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
    borderBottomColor: '#e0e0e0',
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
    color: '#1a237e',
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
    borderBottomColor: '#e0e0e0',
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
    backgroundColor: '#1a237e',
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
    backgroundColor: '#1a237e',
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
    backgroundColor: '#1a237e',
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
  profileAge: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default DashboardAlunoScreen; 