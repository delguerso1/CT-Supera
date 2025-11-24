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
  Switch,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { funcionarioService, turmaService, presencaService } from '../services/api';
import { User, Turma, AlunoPresenca, VerificarCheckinResponse } from '../types';
import { NavigationProps } from '../types';
import CONFIG from '../config';

const DashboardProfessorScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const [professor, setProfessor] = useState<User | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'turmas' | 'presenca' | 'perfil'>('dashboard');
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [checkinData, setCheckinData] = useState<VerificarCheckinResponse | null>(null);
  const [presencasSelecionadas, setPresencasSelecionadas] = useState<{ [key: number]: boolean }>({});
  const [loadingCheckin, setLoadingCheckin] = useState(false);
  const [loadingPresenca, setLoadingPresenca] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfessorData();
    }
  }, [user]);

  // Detectar seção ativa baseada na rota
  useEffect(() => {
    if (route?.name) {
      setActiveSection(route.name.toLowerCase() as any);
    }
  }, [route?.name]);

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

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
                Dias: {turma.dias_semana_nomes.join(', ')}
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
      const [turmaDetalhes, alunos] = await Promise.all([
        turmaService.getTurmaById(turma.id),
        turmaService.getAlunosTurma(turma.id),
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

  const handleSelecionarTurma = async (turma: Turma) => {
    try {
      setLoadingCheckin(true);
      setSelectedTurma(turma);
      const data = await presencaService.verificarCheckin(turma.id);
      setCheckinData(data);
      
      // Inicializa as presenças selecionadas apenas com alunos que fizeram check-in
      const inicialPresencas: { [key: number]: boolean } = {};
      data.alunos.forEach(aluno => {
        if (aluno.checkin_realizado && !aluno.presenca_confirmada) {
          inicialPresencas[aluno.id] = true;
        } else if (aluno.presenca_confirmada) {
          inicialPresencas[aluno.id] = true;
        }
      });
      setPresencasSelecionadas(inicialPresencas);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar dados de check-in.');
    } finally {
      setLoadingCheckin(false);
    }
  };

  const togglePresenca = (alunoId: number) => {
    setPresencasSelecionadas(prev => ({
      ...prev,
      [alunoId]: !prev[alunoId],
    }));
  };

  const handleRegistrarPresenca = async () => {
    if (!selectedTurma) return;

    const alunosIds = Object.keys(presencasSelecionadas)
      .filter(id => presencasSelecionadas[parseInt(id)])
      .map(id => id.toString());

    if (alunosIds.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um aluno para registrar presença.');
      return;
    }

    Alert.alert(
      'Confirmar Presença',
      `Deseja registrar presença para ${alunosIds.length} aluno(s)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setLoadingPresenca(true);
              const response = await presencaService.registrarPresenca(selectedTurma.id, alunosIds);
              
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
          <ActivityIndicator size="large" color="#1a237e" />
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

    const alunosComCheckin = checkinData.alunos.filter(a => a.checkin_realizado);
    const alunosSemCheckin = checkinData.alunos.filter(a => !a.checkin_realizado);

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
              }}
            >
              <Text style={styles.backButtonText}>Trocar Turma</Text>
            </TouchableOpacity>
          </View>

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
                        {aluno.presenca_confirmada ? 'Presença confirmada' : 'Check-in realizado'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={presencasSelecionadas[aluno.id] || false}
                    onValueChange={() => togglePresenca(aluno.id)}
                    disabled={aluno.presenca_confirmada}
                    trackColor={{ false: '#ccc', true: '#4caf50' }}
                    thumbColor={presencasSelecionadas[aluno.id] ? '#fff' : '#f4f3f4'}
                  />
                </View>
              ))}
            </View>
          )}

          {alunosSemCheckin.length > 0 && (
            <View style={styles.alunosSection}>
              <Text style={styles.alunosSectionTitle}>
                Alunos sem Check-in ({alunosSemCheckin.length})
              </Text>
              {alunosSemCheckin.map(aluno => (
                <View key={aluno.id} style={styles.alunoItem}>
                  <View style={styles.alunoInfo}>
                    <Text style={styles.alunoNome}>{aluno.nome}</Text>
                    <View style={styles.alunoStatusRow}>
                      <View style={[styles.statusDot, { backgroundColor: '#f44336' }]} />
                      <Text style={styles.alunoStatus}>Sem check-in</Text>
                    </View>
                  </View>
                  <Switch
                    value={false}
                    onValueChange={() => {}}
                    disabled={true}
                    trackColor={{ false: '#ccc', true: '#4caf50' }}
                  />
                </View>
              ))}
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Alunos sem check-in não podem ter presença registrada.
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
                Registrar Presença ({Object.values(presencasSelecionadas).filter(Boolean).length})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

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
      {activeSection === 'perfil' && renderPerfil()}
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
    backgroundColor: '#1a237e',
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
    backgroundColor: '#1a237e',
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
    color: '#1a237e',
    fontSize: 14,
    fontWeight: '600',
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
  warningBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
  },
  registrarButton: {
    backgroundColor: '#1a237e',
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