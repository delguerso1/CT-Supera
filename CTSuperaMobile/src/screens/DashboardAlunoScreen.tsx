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
import { userService, turmaService } from '../services/api';
import { User, Turma } from '../types';
import { NavigationProps } from '../types';

const DashboardAlunoScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const [aluno, setAluno] = useState<User | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'perfil' | 'checkin' | 'pagamentos'>('dashboard');

  // Detectar seção ativa baseada na rota
  useEffect(() => {
    if (route?.name) {
      setActiveSection(route.name.toLowerCase() as any);
    }
  }, [route?.name]);

  useEffect(() => {
    if (user) {
      loadAlunoData();
    }
  }, [user]);

  const loadAlunoData = async () => {
    try {
      setLoading(true);
      const [alunoData, turmasData] = await Promise.all([
        userService.getProfile(),
        turmaService.getTurmas({ aluno: user?.id })
      ]);
      
      setAluno(alunoData);
      setTurmas(turmasData);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao carregar dados do aluno.');
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
          <Text style={styles.statTitle}>Status</Text>
          <Text style={[styles.statValue, { color: aluno?.ativo ? '#4caf50' : '#f44336' }]}>
            {aluno?.ativo ? 'Ativo' : 'Inativo'}
          </Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Turmas</Text>
          <Text style={styles.statValue}>{turmas.length}</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Mensalidade</Text>
          <Text style={styles.statValue}>R$ {aluno?.valor_mensalidade || 0}</Text>
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
              <Text style={styles.turmaInfo}>Professor: {turma.professor_nome}</Text>
              <Text style={styles.turmaInfo}>Horário: {turma.horario}</Text>
              <Text style={styles.turmaInfo}>
                Dias: {turma.dias_semana_nomes.join(', ')}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderPerfil = () => (
    <ScrollView style={styles.content}>
      <View style={styles.profileSection}>
        <View style={styles.profilePhoto}>
          {aluno?.foto_perfil ? (
            <Image
              source={{ uri: `http://localhost:8000${aluno.foto_perfil}` }}
              style={styles.profileImage}
            />
          ) : (
            <Text style={styles.profileInitials}>
              {getInitials(`${aluno?.first_name} ${aluno?.last_name}`)}
            </Text>
          )}
        </View>
        
        <Text style={styles.profileName}>
          {aluno?.first_name} {aluno?.last_name}
        </Text>
        <Text style={styles.profileEmail}>{aluno?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Pessoais</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Telefone:</Text>
          <Text style={styles.infoValue}>{aluno?.telefone || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Endereço:</Text>
          <Text style={styles.infoValue}>{aluno?.endereco || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Data de Nascimento:</Text>
          <Text style={styles.infoValue}>
            {aluno?.data_nascimento
              ? new Date(aluno.data_nascimento).toLocaleDateString()
              : '-'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ficha Médica:</Text>
          <Text style={styles.infoValue}>{aluno?.ficha_medica || '-'}</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderCheckin = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Check-in</Text>
        <Text style={styles.noData}>
          Funcionalidade de check-in será implementada em breve.
        </Text>
      </View>
    </ScrollView>
  );

  const renderPagamentos = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pagamentos</Text>
        <Text style={styles.noData}>
          Funcionalidade de pagamentos será implementada em breve.
        </Text>
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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.profilePhoto}>
            {aluno?.foto_perfil ? (
              <Image
                source={{ uri: `http://localhost:8000${aluno.foto_perfil}` }}
                style={styles.profileImage}
              />
            ) : (
              <Text style={styles.profileInitials}>
                {getInitials(`${aluno?.first_name} ${aluno?.last_name}`)}
              </Text>
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {aluno?.first_name} {aluno?.last_name}
            </Text>
            <Text style={styles.headerStatus}>
              {aluno?.ativo ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

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
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
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
});

export default DashboardAlunoScreen; 