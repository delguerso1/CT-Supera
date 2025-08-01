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
import { funcionarioService, turmaService, presencaService } from '../services/api';
import { User, Turma } from '../types';
import { NavigationProps } from '../types';

const DashboardProfessorScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const [professor, setProfessor] = useState<User | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'turmas' | 'presenca' | 'perfil'>('dashboard');

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
      <View style={styles.header}>
        <View style={styles.profileSection}>
          {professor?.foto_perfil ? (
            <Image source={{ uri: professor.foto_perfil }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileInitials}>
              <Text style={styles.profileInitialsText}>
                {getInitials(professor?.first_name || '')}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {professor?.first_name} {professor?.last_name}
            </Text>
            <Text style={styles.profileRole}>Professor</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

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

  const renderTurmas = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gerenciar Turmas</Text>
        {turmas.length === 0 ? (
          <Text style={styles.noData}>Nenhuma turma encontrada.</Text>
        ) : (
          turmas.map(turma => (
            <TouchableOpacity key={turma.id} style={styles.turmaCard}>
              <View style={styles.turmaHeader}>
                <Text style={styles.turmaTitle}>Turma {turma.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: turma.ativo ? '#4caf50' : '#f44336' }]}>
                  <Text style={styles.statusText}>{turma.ativo ? 'Ativa' : 'Inativa'}</Text>
                </View>
              </View>
              <Text style={styles.turmaInfo}>Centro: {turma.ct_nome}</Text>
              <Text style={styles.turmaInfo}>Alunos: {turma.alunos_count}</Text>
              <Text style={styles.turmaInfo}>Horário: {turma.horario}</Text>
              <Text style={styles.turmaInfo}>
                Dias: {turma.dias_semana_nomes.join(', ')}
              </Text>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Ver Detalhes</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderPresenca = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registrar Presença</Text>
        {turmas.length === 0 ? (
          <Text style={styles.noData}>Nenhuma turma encontrada.</Text>
        ) : (
          turmas.map(turma => (
            <TouchableOpacity key={turma.id} style={styles.turmaCard}>
              <Text style={styles.turmaTitle}>Turma {turma.id}</Text>
              <Text style={styles.turmaInfo}>Centro: {turma.ct_nome}</Text>
              <Text style={styles.turmaInfo}>Alunos: {turma.alunos_count}</Text>
              <Text style={styles.turmaInfo}>Horário: {turma.horario}</Text>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Registrar Presença</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderPerfil = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meu Perfil</Text>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {professor?.foto_perfil ? (
              <Image source={{ uri: professor.foto_perfil }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileInitials}>
                <Text style={styles.profileInitialsText}>
                  {getInitials(professor?.first_name || '')}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {professor?.first_name} {professor?.last_name}
              </Text>
              <Text style={styles.profileEmail}>{professor?.email}</Text>
            </View>
          </View>
          
          <View style={styles.profileDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Telefone:</Text>
              <Text style={styles.detailValue}>{professor?.telefone || 'Não informado'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Endereço:</Text>
              <Text style={styles.detailValue}>{professor?.endereco || 'Não informado'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Salário:</Text>
              <Text style={styles.detailValue}>R$ {professor?.salario_professor || 0}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>PIX:</Text>
              <Text style={styles.detailValue}>{professor?.pix_professor || 'Não informado'}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Editar Perfil</Text>
          </TouchableOpacity>
        </View>
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
});

export default DashboardProfessorScreen; 