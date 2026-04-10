import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
  TextInput,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { funcionarioService, turmaService, presencaService } from '../services/api';
import {
  User,
  Turma,
  AlunoPresenca,
  VerificarCheckinResponse,
  HistoricoAulasProfessorItem,
  ObservacaoAulaResponse,
} from '../types';
import { NavigationProps } from '../types';
import CONFIG from '../config';
import SafeScreen from '../components/SafeScreen';
import { colors } from '../theme';

const MAX_OBSERVACAO_AULA_CHARS = 1000;

const DashboardProfessorScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const [professor, setProfessor] = useState<User | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'turmas' | 'presenca' | 'historico' | 'perfil'>('dashboard');
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [checkinData, setCheckinData] = useState<VerificarCheckinResponse | null>(null);
  const [presencasSelecionadas, setPresencasSelecionadas] = useState<Record<string, boolean>>({});
  const [loadingCheckin, setLoadingCheckin] = useState(false);
  const [loadingPresenca, setLoadingPresenca] = useState(false);
  const [historicoAulas, setHistoricoAulas] = useState<HistoricoAulasProfessorItem[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [observacaoDraft, setObservacaoDraft] = useState('');
  const [observacaoInfo, setObservacaoInfo] = useState<ObservacaoAulaResponse | null>(null);
  const [loadingObservacao, setLoadingObservacao] = useState(false);
  const [savingObservacao, setSavingObservacao] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfessorData();
    }
  }, [user]);

  // Detectar seção ativa baseada na rota
  useEffect(() => {
    if (route?.name) {
      const normalized = route.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      setActiveSection(normalized as any);
    }
  }, [route?.name]);

  useEffect(() => {
    if (activeSection === 'historico') {
      loadHistoricoAulas();
    }
  }, [activeSection]);

  const loadProfessorData = async () => {
    try {
      setLoading(true);
      const [professorData, turmasData] = await Promise.all([
        funcionarioService.getPainelProfessor(),
        turmaService.getTurmas({ professor: user?.id })
      ]);
      
      setProfessor(professorData);
      setTurmas(turmasData);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao carregar dados do professor.');
    } finally {
      setLoading(false);
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

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('pt-BR');
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const loadHistoricoAulas = async () => {
    try {
      setLoadingHistorico(true);
      const response = await funcionarioService.getHistoricoAulasProfessor();
      setHistoricoAulas(response.historico || []);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar histórico de aulas.');
    } finally {
      setLoadingHistorico(false);
    }
  };

  const renderDashboard = () => (
    <ScrollView style={styles.content}>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Turmas Ativas</Text>
          <Text style={styles.statValue}>{turmas.filter(t => t.ativo).length}</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Total de Alunos</Text>
          <Text style={styles.statValue}>
            {turmas.reduce((total, turma) => total + (turma.alunos_count || 0), 0)}
          </Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Salário</Text>
          <Text style={styles.statValue}>R$ {professor?.salario_professor || 0}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Minhas Turmas</Text>
        {turmas.length === 0 ? (
          <Text style={styles.noData}>Nenhuma turma encontrada.</Text>
        ) : (
          turmas.map(turma => (
            <View key={turma.id} style={styles.turmaCard}>
              <Text style={styles.turmaTitle}>Turma {turma.id}</Text>
              <Text style={styles.turmaInfo}>Centro: {turma.ct_nome}</Text>
              <Text style={styles.turmaInfo}>Alunos: {turma.alunos_count}</Text>
              <Text style={styles.turmaInfo}>Horário: {turma.horario}</Text>
              <Text style={styles.turmaInfo}>
                Dias: {(turma.dias_semana_nomes ?? []).join(', ')}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: turma.ativo ? '#4caf50' : '#f44336' }]}>
                <Text style={styles.statusText}>{turma.ativo ? 'Ativa' : 'Inativa'}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const handleVerDetalhesTurma = async (turma: Turma) => {
    try {
      const turmaId = turma.id!;
      const [turmaDetalhes, alunos] = await Promise.all([
        turmaService.getTurmaById(turmaId),
        turmaService.getAlunosTurma(turmaId),
      ]);

      Alert.alert(
        `Turma ${turma.id}`,
        `Centro: ${turma.ct_nome}\n` +
        `Horário: ${turma.horario}\n` +
        `Dias: ${turma.dias_semana_nomes?.join(', ') || '-'}\n` +
        `Alunos: ${alunos.length}\n` +
        `Status: ${turma.ativo ? 'Ativa' : 'Inativa'}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar detalhes da turma.');
    }
  };

  const renderTurmas = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Minhas Turmas</Text>
        {turmas.length === 0 ? (
          <Text style={styles.noData}>Nenhuma turma encontrada.</Text>
        ) : (
          turmas.map(turma => (
            <TouchableOpacity
              key={turma.id}
              style={styles.turmaCard}
              onPress={() => handleVerDetalhesTurma(turma)}
            >
              <View style={styles.turmaHeader}>
                <Text style={styles.turmaTitle}>{turma.ct_nome || `Turma ${turma.id}`}</Text>
                <View style={[styles.statusBadge, { backgroundColor: turma.ativo ? '#4caf50' : '#f44336' }]}>
                  <Text style={styles.statusText}>{turma.ativo ? 'Ativa' : 'Inativa'}</Text>
                </View>
              </View>
              <Text style={styles.turmaInfo}>Alunos: {turma.alunos_count || 0}</Text>
              <Text style={styles.turmaInfo}>Horário: {turma.horario}</Text>
              <Text style={styles.turmaInfo}>
                Dias: {turma.dias_semana_nomes?.join(', ') || '-'}
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleVerDetalhesTurma(turma)}
              >
                <Text style={styles.actionButtonText}>Ver Detalhes</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );

  const loadObservacaoAula = async (turmaId: number, dataIso: string) => {
    try {
      setLoadingObservacao(true);
      const r = await presencaService.getObservacaoAula(turmaId, dataIso);
      setObservacaoInfo(r);
      setObservacaoDraft(r.texto ?? '');
    } catch (error: any) {
      setObservacaoInfo(null);
      setObservacaoDraft('');
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar observação da aula.');
    } finally {
      setLoadingObservacao(false);
    }
  };

  const salvarObservacaoAula = async () => {
    if (!selectedTurma?.id || !checkinData) return;
    const t = observacaoDraft.trim();
    if (t.length < 1 || t.length > MAX_OBSERVACAO_AULA_CHARS) {
      Alert.alert('Observação', `Informe entre 1 e ${MAX_OBSERVACAO_AULA_CHARS} caracteres.`);
      return;
    }
    try {
      setSavingObservacao(true);
      const r = await presencaService.salvarObservacaoAula(selectedTurma.id, t);
      setObservacaoInfo(r);
      setObservacaoDraft(r.texto ?? '');
      Alert.alert('Sucesso', 'Observação salva.');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao salvar observação.');
    } finally {
      setSavingObservacao(false);
    }
  };

  const handleSelecionarTurma = async (turma: Turma) => {
    try {
      setLoadingCheckin(true);
      setSelectedTurma(turma);
      setSearchQuery('');
      setObservacaoInfo(null);
      setObservacaoDraft('');
      const data = await presencaService.verificarCheckin(turma.id!);
      setCheckinData(data);

      await loadObservacaoAula(turma.id!, data.data);
      
      const inicialPresencas: Record<string, boolean> = {};
      data.alunos.forEach(aluno => {
        const k = String(aluno.id);
        if (aluno.presenca_confirmada) {
          inicialPresencas[k] = true;
        } else if (aluno.ausencia_registrada) {
          inicialPresencas[k] = false;
        } else if (aluno.pode_confirmar_presenca) {
          inicialPresencas[k] = true;
        }
      });
      setPresencasSelecionadas(inicialPresencas);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar dados de check-in.');
    } finally {
      setLoadingCheckin(false);
    }
  };

  const togglePresenca = (alunoId: number | string) => {
    const key = String(alunoId);
    setPresencasSelecionadas(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const normalizeSearch = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const clearSelections = () => {
    if (!checkinData) return;
    const cleared: Record<string, boolean> = {};
    checkinData.alunos.forEach(aluno => {
      const k = String(aluno.id);
      if (aluno.presenca_confirmada) {
        cleared[k] = true;
      } else {
        cleared[k] = false;
      }
    });
    setPresencasSelecionadas(cleared);
  };

  const selectAllPendentes = () => {
    if (!checkinData) return;
    const selecionadas: Record<string, boolean> = {};
    checkinData.alunos.forEach(aluno => {
      selecionadas[String(aluno.id)] = true;
    });
    setPresencasSelecionadas(selecionadas);
  };

  const handleRegistrarPresenca = async () => {
    if (!selectedTurma || !checkinData) return;

    const presencaIds: string[] = [];
    const faltasIds: string[] = [];
    checkinData.alunos.forEach(aluno => {
      const k = String(aluno.id);
      if (presencasSelecionadas[k]) {
        presencaIds.push(k);
      } else {
        faltasIds.push(k);
      }
    });

    if (presencaIds.length === 0 && faltasIds.length === 0) {
      Alert.alert('Atenção', 'Nenhum aluno na lista.');
      return;
    }

    Alert.alert(
      'Confirmar presença',
      `Serão registrados ${presencaIds.length} presente(s) e ${faltasIds.length} falta(s). Deseja continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setLoadingPresenca(true);
              const response = await presencaService.registrarPresenca(
                selectedTurma.id!,
                presencaIds,
                faltasIds
              );
              
              if (response.warning) {
                Alert.alert('Presença Registrada', `${response.message}\n\n${response.warning}`);
              } else {
                Alert.alert('Sucesso', response.message);
              }
              
              // Recarrega os dados
              await handleSelecionarTurma(selectedTurma);
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao registrar presença.');
            } finally {
              setLoadingPresenca(false);
            }
          },
        },
      ]
    );
  };

  const renderPresenca = () => {
    if (!selectedTurma) {
      return (
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Registrar Presença</Text>
            <Text style={styles.sectionSubtitle}>Selecione uma turma para registrar presença</Text>
            {turmas.length === 0 ? (
              <Text style={styles.noData}>Nenhuma turma encontrada.</Text>
            ) : (
              turmas.map(turma => (
                <TouchableOpacity
                  key={turma.id}
                  style={styles.turmaCard}
                  onPress={() => handleSelecionarTurma(turma)}
                >
                  <View style={styles.turmaHeader}>
                    <Text style={styles.turmaTitle}>{turma.ct_nome || `Turma ${turma.id}`}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: turma.ativo ? '#4caf50' : '#f44336' }]}>
                      <Text style={styles.statusText}>{turma.ativo ? 'Ativa' : 'Inativa'}</Text>
                    </View>
                  </View>
                  <Text style={styles.turmaInfo}>Alunos: {turma.alunos_count}</Text>
                  <Text style={styles.turmaInfo}>Horário: {turma.horario}</Text>
                  <Text style={styles.turmaInfo}>
                    Dias: {turma.dias_semana_nomes?.join(', ') || '-'}
                  </Text>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Selecionar Turma</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      );
    }

    if (loadingCheckin) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando alunos...</Text>
        </View>
      );
    }

    if (!checkinData) {
      return (
        <View style={styles.content}>
          <Text style={styles.noData}>Erro ao carregar dados.</Text>
        </View>
      );
    }

    const searchNormalized = normalizeSearch(searchQuery);
    const alunosFiltrados = checkinData.alunos.filter(aluno =>
      normalizeSearch(aluno.nome).includes(searchNormalized)
    );
    const alunosAulaExperimental = alunosFiltrados.filter((a: any) => a.tipo === 'aula_experimental');
    const alunosNormais = alunosFiltrados.filter((a: any) => a.tipo !== 'aula_experimental');
    const alunosComCheckin = alunosNormais.filter(a => a.checkin_realizado);
    const alunosSemCheckin = alunosNormais.filter(a => !a.checkin_realizado);

    return (
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.turmaHeader}>
            <View>
              <Text style={styles.sectionTitle}>Registrar Presença</Text>
              <Text style={styles.sectionSubtitle}>{checkinData.turma}</Text>
              <Text style={styles.sectionSubtitle}>
                Data: {new Date(checkinData.data).toLocaleDateString('pt-BR')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setSelectedTurma(null);
                setCheckinData(null);
                setPresencasSelecionadas({});
                setObservacaoInfo(null);
                setObservacaoDraft('');
              }}
            >
              <Text style={styles.backButtonText}>Trocar Turma</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.infoBox, styles.presencaLegendaMargin]}>
            <Text style={styles.infoText}>
              O check-in no app é feito pelo aluno. Aqui você confirma quem compareceu à aula; pode marcar
              presença mesmo sem check-in no app (ex.: sem celular ou inadimplente). Desmarcar um aluno grava
              falta para o dia.
            </Text>
          </View>

          <View style={styles.observacaoSection}>
            <Text style={styles.observacaoTitle}>Observação da aula (interna)</Text>
            <Text style={styles.observacaoHint}>
              Visível ao gerente. Edição apenas no dia da aula. {MAX_OBSERVACAO_AULA_CHARS} caracteres no máximo.
            </Text>
            {loadingObservacao ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
            ) : observacaoInfo?.pode_editar ? (
              <>
                <TextInput
                  style={styles.observacaoInput}
                  multiline
                  maxLength={MAX_OBSERVACAO_AULA_CHARS}
                  value={observacaoDraft}
                  onChangeText={setObservacaoDraft}
                  placeholder="Ex.: dinâmica aplicada, aluno com limitação, etc."
                  placeholderTextColor="#999"
                />
                <Text style={styles.observacaoCounter}>
                  {observacaoDraft.trim().length}/{MAX_OBSERVACAO_AULA_CHARS}
                </Text>
                <TouchableOpacity
                  style={[styles.observacaoSaveBtn, savingObservacao && styles.registrarButtonDisabled]}
                  onPress={salvarObservacaoAula}
                  disabled={savingObservacao}
                >
                  <Text style={styles.observacaoSaveBtnText}>Salvar observação</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.observacaoReadonly}>
                {observacaoInfo?.texto
                  ? observacaoInfo.texto
                  : 'Nenhuma observação registrada para hoje.'}
              </Text>
            )}
            {observacaoInfo?.autor_nome && observacaoInfo.texto ? (
              <Text style={styles.observacaoMeta}>
                Por {observacaoInfo.autor_nome}
                {observacaoInfo.atualizado_em
                  ? ` · ${new Date(observacaoInfo.atualizado_em).toLocaleString('pt-BR')}`
                  : ''}
              </Text>
            ) : null}
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar aluno por nome"
              placeholderTextColor="#999"
            />
            <View style={styles.searchActions}>
              <TouchableOpacity style={styles.searchButton} onPress={selectAllPendentes}>
                <Text style={styles.searchButtonText}>Selecionar Pendentes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.searchButtonOutline} onPress={clearSelections}>
                <Text style={styles.searchButtonOutlineText}>Limpar Seleção</Text>
              </TouchableOpacity>
            </View>
          </View>

          {alunosAulaExperimental.length > 0 && (
            <View style={styles.alunosSection}>
              <Text style={styles.alunosSectionTitle}>
                Aula Experimental ({alunosAulaExperimental.length})
              </Text>
              {alunosAulaExperimental.map(aluno => (
                <View key={aluno.id} style={[styles.alunoItem, { backgroundColor: '#fff8e1' }]}>
                  <View style={styles.alunoInfo}>
                    <Text style={styles.alunoNome}>{aluno.nome}</Text>
                    <View style={styles.alunoStatusRow}>
                      <View style={[styles.statusDot, { backgroundColor: '#ff9800' }]} />
                      <Text style={styles.alunoStatus}>
                        {aluno.presenca_confirmada ? 'Compareceu' : 'Aguardando confirmação'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={presencasSelecionadas[String(aluno.id)] || false}
                    onValueChange={() => togglePresenca(aluno.id)}
                    trackColor={{ false: '#ccc', true: '#4caf50' }}
                    thumbColor={presencasSelecionadas[String(aluno.id)] ? '#fff' : '#f4f3f4'}
                    accessibilityLabel={`Presença na aula experimental: ${aluno.nome}`}
                  />
                </View>
              ))}
            </View>
          )}

          {alunosComCheckin.length > 0 && (
            <View style={styles.alunosSection}>
              <Text style={styles.alunosSectionTitle}>
                Alunos com Check-in ({alunosComCheckin.length})
              </Text>
              {alunosComCheckin.map(aluno => (
                <View key={aluno.id} style={styles.alunoItem}>
                  <View style={styles.alunoInfo}>
                    <Text style={styles.alunoNome}>{aluno.nome}</Text>
                    <View style={styles.alunoStatusRow}>
                      <View style={[styles.statusDot, { backgroundColor: '#4caf50' }]} />
                      <Text style={styles.alunoStatus}>
                        {aluno.presenca_confirmada
                          ? 'Presença confirmada'
                          : aluno.ausencia_registrada
                            ? 'Falta registrada'
                            : 'Check-in no app'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={presencasSelecionadas[String(aluno.id)] || false}
                    onValueChange={() => togglePresenca(aluno.id)}
                    trackColor={{ false: '#ccc', true: '#4caf50' }}
                    thumbColor={presencasSelecionadas[String(aluno.id)] ? '#fff' : '#f4f3f4'}
                    accessibilityLabel={`Presença confirmada: ${aluno.nome}`}
                  />
                </View>
              ))}
            </View>
          )}

          {alunosSemCheckin.length > 0 && (
            <View style={styles.alunosSection}>
              <Text style={styles.alunosSectionTitle}>
                Alunos sem Check-in no app ({alunosSemCheckin.length})
              </Text>
              {alunosSemCheckin.map(aluno => (
                <View key={aluno.id} style={[styles.alunoItem, { backgroundColor: '#fff8f0' }]}>
                  <View style={styles.alunoInfo}>
                    <Text style={styles.alunoNome}>{aluno.nome}</Text>
                    <View style={styles.alunoStatusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: aluno.presenca_confirmada ? '#4caf50' : '#ff9800' },
                        ]}
                      />
                      <Text style={styles.alunoStatus}>
                        {aluno.presenca_confirmada
                          ? 'Presença confirmada'
                          : aluno.ausencia_registrada
                            ? 'Falta registrada'
                            : 'Sem check-in no app — pode registrar presença'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={presencasSelecionadas[String(aluno.id)] || false}
                    onValueChange={() => togglePresenca(aluno.id)}
                    trackColor={{ false: '#ccc', true: '#4caf50' }}
                    thumbColor={presencasSelecionadas[String(aluno.id)] ? '#fff' : '#f4f3f4'}
                    accessibilityLabel={`Presença sem check-in no app: ${aluno.nome}`}
                  />
                </View>
              ))}
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Inclua quem estiver na aula nesta lista, mesmo sem check-in no app.
                </Text>
              </View>
            </View>
          )}

          {checkinData.alunos.length === 0 && (
            <Text style={styles.noData}>Nenhum aluno encontrado nesta turma.</Text>
          )}

          <TouchableOpacity
            style={[styles.registrarButton, loadingPresenca && styles.registrarButtonDisabled]}
            onPress={handleRegistrarPresenca}
            disabled={loadingPresenca}
          >
            {loadingPresenca ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registrarButtonText}>
                Registrar presença ({checkinData.alunos.length})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderHistorico = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Histórico de Aulas</Text>
        {loadingHistorico ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando histórico...</Text>
          </View>
        ) : historicoAulas.length === 0 ? (
          <Text style={styles.noData}>Nenhuma aula registrada.</Text>
        ) : (
          historicoAulas.map((item, index) => (
            <View key={`${item.turma.id || index}`} style={styles.historicoCard}>
              <Text style={styles.historicoTurmaTitle}>
                {item.turma.ct_nome || `Turma ${item.turma.id}`}
              </Text>
              <Text style={styles.historicoTurmaInfo}>
                Horário: {item.turma.horario}
              </Text>
              <Text style={styles.historicoTurmaInfo}>
                Dias: {item.turma.dias_semana_nomes?.join(', ') || '-'}
              </Text>
              <View style={styles.historicoDates}>
                {item.datas.length === 0 ? (
                  <Text style={styles.noData}>Nenhuma data disponível.</Text>
                ) : (
                  item.datas.map((data, idx) => (
                    <View key={`${item.turma.id}-${idx}`} style={styles.historicoDateBadge}>
                      <Text style={styles.historicoDateText}>{formatDate(data)}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderPerfil = () => {
    if (!professor) return null;
    const baseUrl = CONFIG.API_BASE_URL.replace('/api/', '');

    return (
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meu Perfil</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              {professor.foto_perfil ? (
                <Image
                  source={{ uri: `${baseUrl}${professor.foto_perfil}` }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileInitials}>
                  <Text style={styles.profileInitialsText}>
                    {getInitials(`${professor.first_name} ${professor.last_name}`)}
                  </Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {professor.first_name} {professor.last_name}
                </Text>
                <Text style={styles.profileEmail}>{professor.email}</Text>
              </View>
            </View>
            
            <View style={styles.profileDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Telefone:</Text>
                <Text style={styles.detailValue}>{professor.telefone || 'Não informado'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Endereço:</Text>
                <Text style={styles.detailValue}>{professor.endereco || 'Não informado'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Salário:</Text>
                <Text style={styles.detailValue}>
                  R$ {professor.salario_professor?.toFixed(2) || '0,00'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>PIX:</Text>
                <Text style={styles.detailValue}>{professor.pix_professor || 'Não informado'}</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Editar Perfil</Text>
            </TouchableOpacity>
          </View>
        </View>
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
      {professor && (
        <View style={styles.mainHeader}>
          <View style={styles.headerContent}>
            <View style={styles.profilePhoto}>
              {professor.foto_perfil ? (
                <Image
                  source={{ uri: `${CONFIG.API_BASE_URL.replace('/api/', '')}${professor.foto_perfil}` }}
                  style={styles.profileImageHeader}
                />
              ) : (
                <View style={styles.profileInitialsHeader}>
                  <Text style={styles.profileInitialsTextHeader}>
                    {getInitials(`${professor.first_name} ${professor.last_name}`)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>
                {professor.first_name} {professor.last_name}
              </Text>
              <Text style={styles.headerRole}>Professor</Text>
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
          style={[styles.tab, activeSection === 'turmas' && styles.activeTab]}
          onPress={() => setActiveSection('turmas')}
        >
          <Text style={[styles.tabText, activeSection === 'turmas' && styles.activeTabText]}>
            Turmas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'presenca' && styles.activeTab]}
          onPress={() => setActiveSection('presenca')}
        >
          <Text style={[styles.tabText, activeSection === 'presenca' && styles.activeTabText]}>
            Presença
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'historico' && styles.activeTab]}
          onPress={() => setActiveSection('historico')}
        >
          <Text style={[styles.tabText, activeSection === 'historico' && styles.activeTabText]}>
            Histórico
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
      {activeSection === 'turmas' && renderTurmas()}
      {activeSection === 'presenca' && renderPresenca()}
      {activeSection === 'historico' && renderHistorico()}
      {activeSection === 'perfil' && renderPerfil()}
    </SafeScreen>
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
  historicoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  historicoTurmaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  historicoTurmaInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  historicoDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  historicoDateBadge: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  historicoDateText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  turmaCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  turmaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  turmaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  turmaInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
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
  noData: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  profileDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  editButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  backButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#333',
  },
  searchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  searchButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchButtonOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginLeft: 8,
  },
  searchButtonOutlineText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  alunosSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  alunosSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  alunoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  alunoInfo: {
    flex: 1,
    marginRight: 12,
  },
  alunoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  alunoStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  alunoStatus: {
    fontSize: 12,
    color: '#666',
  },
  presencaLegendaMargin: {
    marginBottom: 12,
  },
  observacaoSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  observacaoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  observacaoHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  observacaoInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    minHeight: 88,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  observacaoCounter: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  observacaoSaveBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  observacaoSaveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  observacaoReadonly: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  observacaoMeta: {
    fontSize: 11,
    color: '#888',
    marginTop: 8,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#1565c0',
  },
  registrarButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  registrarButtonDisabled: {
    opacity: 0.6,
  },
  registrarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DashboardProfessorScreen; 