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
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { funcionarioService, financeiroService, usuarioService } from '../services/api';
import { User, PainelGerente, Mensalidade, PreCadastro } from '../types';
import { NavigationProps } from '../types';
import CONFIG from '../config';

const DashboardGerenteScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const [painelGerente, setPainelGerente] = useState<PainelGerente | null>(null);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [alunos, setAlunos] = useState<User[]>([]);
  const [precadastros, setPrecadastros] = useState<PreCadastro[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'financeiro' | 'alunos' | 'relatorios'>('dashboard');

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
      loadMensalidades();
    }
  }, [activeSection, user]);

  const loadGerenteData = async () => {
    try {
      setLoading(true);
      const painelData = await funcionarioService.getPainelGerente();
      setPainelGerente(painelData);
    } catch (error: any) {
      console.error('Erro ao carregar painel do gerente:', error);
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar dados do gerente.');
    } finally {
      setLoading(false);
    }
  };

  const loadMensalidades = async () => {
    try {
      const response = await financeiroService.getMensalidades();
      setMensalidades((response as any).results || (response as any).data || []);
    } catch (error: any) {
      console.error('Erro ao carregar mensalidades:', error);
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
    if (activeSection === 'financeiro') await loadMensalidades();
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
              <Text style={styles.financialTitle}>Total Geral</Text>
              <Text style={styles.financialValue}>
                {formatCurrency(totalPendente + totalAtrasado + totalPago)}
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
                  Vencimento: {new Date(mensalidade.data_vencimento).toLocaleDateString('pt-BR')}
                </Text>
                {mensalidade.data_pagamento && (
                  <Text style={styles.mensalidadeDate}>
                    Pago em: {new Date(mensalidade.data_pagamento).toLocaleDateString('pt-BR')}
                  </Text>
                )}
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
      </View>

      {/* Content */}
      {activeSection === 'dashboard' && renderDashboard()}
      {activeSection === 'financeiro' && renderFinanceiro()}
      {activeSection === 'alunos' && renderAlunos()}
      {activeSection === 'relatorios' && renderRelatorios()}
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
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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