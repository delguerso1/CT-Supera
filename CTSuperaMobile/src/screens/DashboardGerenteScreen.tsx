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
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { funcionarioService, financeiroService, userService } from '../services/api';
import { User, DashboardStats, Mensalidade } from '../types';
import { NavigationProps } from '../types';

const DashboardGerenteScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const [gerente, setGerente] = useState<User | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadGerenteData = async () => {
    try {
      setLoading(true);
      const [gerenteData, statsData, mensalidadesData] = await Promise.all([
        funcionarioService.getPainelGerente(),
        financeiroService.getDashboardStats(),
        financeiroService.getMensalidades()
      ]);
      
      setGerente(gerenteData);
      setDashboardStats(statsData);
      setMensalidades(mensalidadesData.data || []);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao carregar dados do gerente.');
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const renderDashboard = () => (
    <ScrollView style={styles.content}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          {gerente?.foto_perfil ? (
            <Image source={{ uri: gerente.foto_perfil }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileInitials}>
              <Text style={styles.profileInitialsText}>
                {getInitials(gerente?.first_name || '')}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {gerente?.first_name} {gerente?.last_name}
            </Text>
            <Text style={styles.profileRole}>Gerente</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Alunos Ativos</Text>
          <Text style={styles.statValue}>{dashboardStats?.alunosAtivos || 0}</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Professores</Text>
          <Text style={styles.statValue}>{dashboardStats?.professores || 0}</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Turmas</Text>
          <Text style={styles.statValue}>{dashboardStats?.turmas?.length || 0}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Mensalidades Pendentes</Text>
          <Text style={styles.statValue}>{dashboardStats?.mensalidadesPendentes || 0}</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Mensalidades Atrasadas</Text>
          <Text style={[styles.statValue, { color: '#f44336' }]}>
            {dashboardStats?.mensalidadesAtrasadas || 0}
          </Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Mensalidades Pagas</Text>
          <Text style={[styles.statValue, { color: '#4caf50' }]}>
            {dashboardStats?.mensalidadesPagas || 0}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Atividades Recentes</Text>
        {dashboardStats?.atividades_recentes?.length === 0 ? (
          <Text style={styles.noData}>Nenhuma atividade recente.</Text>
        ) : (
          dashboardStats?.atividades_recentes?.slice(0, 5).map(activity => (
            <View key={activity.id} style={styles.activityCard}>
              <Text style={styles.activityDescription}>{activity.description}</Text>
              <Text style={styles.activityDate}>{activity.data}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderFinanceiro = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gestão Financeira</Text>
        
        <View style={styles.financialStats}>
          <View style={styles.financialCard}>
            <Text style={styles.financialTitle}>Total Pendente</Text>
            <Text style={styles.financialValue}>
              {formatCurrency(mensalidades
                .filter(m => m.status === 'pendente')
                .reduce((total, m) => total + m.valor, 0)
              )}
            </Text>
          </View>
          
          <View style={styles.financialCard}>
            <Text style={styles.financialTitle}>Total Atrasado</Text>
            <Text style={[styles.financialValue, { color: '#f44336' }]}>
              {formatCurrency(mensalidades
                .filter(m => m.status === 'atrasado')
                .reduce((total, m) => total + m.valor, 0)
              )}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mensalidades</Text>
          {mensalidades.length === 0 ? (
            <Text style={styles.noData}>Nenhuma mensalidade encontrada.</Text>
          ) : (
            mensalidades.slice(0, 10).map(mensalidade => (
              <View key={mensalidade.id} style={styles.mensalidadeCard}>
                <View style={styles.mensalidadeHeader}>
                  <Text style={styles.mensalidadeAluno}>{mensalidade.aluno_nome}</Text>
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
                <Text style={styles.mensalidadeValue}>
                  {formatCurrency(mensalidade.valor)}
                </Text>
                <Text style={styles.mensalidadeDate}>
                  Vencimento: {mensalidade.data_vencimento}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );

  const renderAlunos = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gestão de Alunos</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Total de Alunos</Text>
            <Text style={styles.statValue}>{dashboardStats?.alunosAtivos || 0}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>Alunos Ativos</Text>
            <Text style={[styles.statValue, { color: '#4caf50' }]}>
              {dashboardStats?.alunosAtivos || 0}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Ver Todos os Alunos</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Cadastrar Novo Aluno</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderRelatorios = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Relatórios</Text>
        
        <TouchableOpacity style={styles.reportCard}>
          <Text style={styles.reportTitle}>Relatório Financeiro</Text>
          <Text style={styles.reportDescription}>
            Relatório detalhado de receitas e despesas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.reportCard}>
          <Text style={styles.reportTitle}>Relatório de Presença</Text>
          <Text style={styles.reportDescription}>
            Estatísticas de presença por turma
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.reportCard}>
          <Text style={styles.reportTitle}>Relatório de Alunos</Text>
          <Text style={styles.reportDescription}>
            Dados demográficos e performance dos alunos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.reportCard}>
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
    color: '#f44336',
    fontSize: 16,
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
});

export default DashboardGerenteScreen; 