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
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { userService, turmaService, alunoService, pagamentoService } from '../services/api';
import { User, Turma, PainelAluno, Mensalidade, HistoricoPagamentos } from '../types';
import { NavigationProps } from '../types';
import CONFIG from '../config';

const DashboardAlunoScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const [painelAluno, setPainelAluno] = useState<PainelAluno | null>(null);
  const [historicoPagamentos, setHistoricoPagamentos] = useState<HistoricoPagamentos | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);
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
      </ScrollView>
    );
  };

  const renderPerfil = () => {
    if (!painelAluno) return null;
    const aluno = painelAluno.usuario;
    const baseUrl = CONFIG.API_BASE_URL.replace('/api/', '');

    return (
      <ScrollView style={styles.content}>
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
              {aluno.data_nascimento
                ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR')
                : '-'}
            </Text>
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
        </View>
      </ScrollView>
    );
  };

  const handleCheckin = async () => {
    if (!painelAluno) return;

    if (!painelAluno.status_hoje.pode_fazer_checkin) {
      Alert.alert(
        'Check-in não disponível',
        'Você possui pendências de pagamento. Por favor, regularize suas mensalidades antes de fazer o check-in.'
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
              await alunoService.realizarCheckin();
              Alert.alert('Sucesso', 'Check-in realizado com sucesso!');
              await loadAlunoData(); // Recarrega os dados
            } catch (error: any) {
              Alert.alert(
                'Erro',
                error.response?.data?.error || error.response?.data?.message || 'Erro ao realizar check-in.'
              );
            } finally {
              setCheckinLoading(false);
            }
          },
        },
      ]
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
                  ⚠️ Você possui pendências de pagamento. Regularize suas mensalidades para fazer o check-in.
                </Text>
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
  profileAge: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default DashboardAlunoScreen; 