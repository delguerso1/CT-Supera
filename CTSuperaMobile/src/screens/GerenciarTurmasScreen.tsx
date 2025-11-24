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
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { turmaService, ctService, professorService, usuarioService } from '../services/api';
import { Turma, User, CentroTreinamento } from '../types';
import { NavigationProps } from '../types';
import CONFIG from '../config';

interface DiaSemana {
  id: number;
  nome: string;
}

const GerenciarTurmasScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [cts, setCts] = useState<CentroTreinamento[]>([]);
  const [professores, setProfessores] = useState<User[]>([]);
  const [diasSemana, setDiasSemana] = useState<DiaSemana[]>([]);
  const [alunos, setAlunos] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAlunosModal, setShowAlunosModal] = useState(false);
  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);
  const [formData, setFormData] = useState<Partial<Turma>>({
    ct: 0,
    horario: '',
    dias_semana: [],
    capacidade_maxima: 0,
    professor: null,
    ativo: true,
  });
  const [alunosSelecionados, setAlunosSelecionados] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.tipo === 'gerente') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [turmasData, ctsData, professoresData, diasSemanaData, alunosData] = await Promise.all([
        turmaService.getTurmas(),
        ctService.listarCTs(),
        professorService.listarProfessores(),
        turmaService.getDiasSemana(),
        usuarioService.listarAlunos(),
      ]);
      setTurmas(turmasData);
      setCts(ctsData);
      setProfessores(professoresData);
      setDiasSemana(diasSemanaData);
      setAlunos(alunosData);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleCriarTurma = () => {
    setFormData({
      ct: 0,
      horario: '',
      dias_semana: [],
      capacidade_maxima: 0,
      professor: null,
      ativo: true,
    });
    setTurmaSelecionada(null);
    setShowForm(true);
  };

  const handleEditarTurma = (turma: Turma) => {
    setFormData({
      id: turma.id,
      ct: turma.ct,
      horario: turma.horario,
      dias_semana: Array.isArray(turma.dias_semana) 
        ? turma.dias_semana.map((d: any) => typeof d === 'object' ? d.id : d)
        : [],
      capacidade_maxima: turma.capacidade_maxima,
      professor: turma.professor || null,
      ativo: turma.ativo !== false,
    });
    setTurmaSelecionada(turma);
    setShowForm(true);
  };

  const handleExcluirTurma = (turma: Turma) => {
    Alert.alert(
      'Excluir Turma',
      `Deseja realmente excluir a turma ${turma.ct_nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await turmaService.excluirTurma(turma.id!);
              Alert.alert('Sucesso', 'Turma excluída com sucesso!');
              loadData();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao excluir turma.');
            }
          },
        },
      ]
    );
  };

  const handleSalvarTurma = async () => {
    if (!formData.ct || !formData.horario || !formData.dias_semana?.length || !formData.capacidade_maxima) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      const dataToSave = {
        ct: formData.ct,
        horario: formData.horario,
        dias_semana: formData.dias_semana,
        capacidade_maxima: formData.capacidade_maxima,
        professor: formData.professor || null,
        ativo: formData.ativo !== false,
      };

      if (turmaSelecionada?.id) {
        await turmaService.atualizarTurma(turmaSelecionada.id, dataToSave);
        Alert.alert('Sucesso', 'Turma atualizada com sucesso!');
      } else {
        await turmaService.criarTurma(dataToSave);
        Alert.alert('Sucesso', 'Turma criada com sucesso!');
      }
      
      setShowForm(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao salvar turma.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDiaSemana = (diaId: number) => {
    const diasAtuais = formData.dias_semana || [];
    if (diasAtuais.includes(diaId)) {
      setFormData({ ...formData, dias_semana: diasAtuais.filter((id) => id !== diaId) });
    } else {
      setFormData({ ...formData, dias_semana: [...diasAtuais, diaId] });
    }
  };

  const handleGerenciarAlunos = async (turma: Turma) => {
    try {
      const alunosTurma = await turmaService.getAlunosTurma(turma.id!);
      setAlunosSelecionados(alunosTurma.map((a) => a.id));
      setTurmaSelecionada(turma);
      setShowAlunosModal(true);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar alunos da turma.');
    }
  };

  const handleSalvarAlunos = async () => {
    if (!turmaSelecionada) return;

    try {
      setSaving(true);
      const alunosAtuais = await turmaService.getAlunosTurma(turmaSelecionada.id!);
      const alunosAtuaisIds = alunosAtuais.map((a) => a.id);
      
      const alunosParaAdicionar = alunosSelecionados.filter((id) => !alunosAtuaisIds.includes(id));
      const alunosParaRemover = alunosAtuaisIds.filter((id) => !alunosSelecionados.includes(id));

      if (alunosParaAdicionar.length > 0) {
        await turmaService.adicionarAlunos(turmaSelecionada.id!, alunosParaAdicionar);
      }
      if (alunosParaRemover.length > 0) {
        await turmaService.removerAlunos(turmaSelecionada.id!, alunosParaRemover);
      }

      Alert.alert('Sucesso', 'Alunos atualizados com sucesso!');
      setShowAlunosModal(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao atualizar alunos.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAluno = (alunoId: number) => {
    if (alunosSelecionados.includes(alunoId)) {
      setAlunosSelecionados(alunosSelecionados.filter((id) => id !== alunoId));
    } else {
      setAlunosSelecionados([...alunosSelecionados, alunoId]);
    }
  };

  if (user?.tipo !== 'gerente') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Acesso negado. Apenas gerentes podem gerenciar turmas.</Text>
        </View>
      </SafeAreaView>
    );
  }

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gerenciar Turmas</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCriarTurma}>
          <Text style={styles.addButtonText}>+ Nova Turma</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {turmas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma turma encontrada.</Text>
          </View>
        ) : (
          turmas.map((turma) => (
            <View key={turma.id} style={styles.turmaCard}>
              <View style={styles.turmaHeader}>
                <View style={styles.turmaInfo}>
                  <Text style={styles.turmaTitle}>{turma.ct_nome || `Turma ${turma.id}`}</Text>
                  <Text style={styles.turmaSubtitle}>
                    {turma.dias_semana_nomes?.join(', ') || '-'} às {turma.horario}
                  </Text>
                  <Text style={styles.turmaDetails}>
                    Professor: {turma.professor_nome || 'Não atribuído'} | 
                    Alunos: {turma.alunos_count || 0}/{turma.capacidade_maxima}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: turma.ativo ? '#4caf50' : '#f44336' }]}>
                  <Text style={styles.statusText}>{turma.ativo ? 'Ativa' : 'Inativa'}</Text>
                </View>
              </View>
              <View style={styles.turmaActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEditarTurma(turma)}
                >
                  <Text style={styles.actionButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.alunosButton]}
                  onPress={() => handleGerenciarAlunos(turma)}
                >
                  <Text style={styles.actionButtonText}>Alunos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleExcluirTurma(turma)}
                >
                  <Text style={styles.actionButtonText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de Formulário */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {turmaSelecionada ? 'Editar Turma' : 'Nova Turma'}
            </Text>

            <ScrollView>
              <Text style={styles.label}>Centro de Treinamento *</Text>
              <View style={styles.pickerContainer}>
                {cts.map((ct) => (
                  <TouchableOpacity
                    key={ct.id}
                    style={[
                      styles.pickerOption,
                      formData.ct === ct.id && styles.pickerOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, ct: ct.id })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.ct === ct.id && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {ct.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Horário *</Text>
              <TextInput
                style={styles.input}
                value={formData.horario}
                onChangeText={(text) => setFormData({ ...formData, horario: text })}
                placeholder="HH:MM (ex: 18:00)"
                editable={!saving}
              />

              <Text style={styles.label}>Dias da Semana *</Text>
              <View style={styles.diasContainer}>
                {diasSemana.map((dia) => (
                  <TouchableOpacity
                    key={dia.id}
                    style={[
                      styles.diaButton,
                      formData.dias_semana?.includes(dia.id) && styles.diaButtonSelected,
                    ]}
                    onPress={() => toggleDiaSemana(dia.id)}
                  >
                    <Text
                      style={[
                        styles.diaButtonText,
                        formData.dias_semana?.includes(dia.id) && styles.diaButtonTextSelected,
                      ]}
                    >
                      {dia.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Capacidade Máxima *</Text>
              <TextInput
                style={styles.input}
                value={formData.capacidade_maxima?.toString()}
                onChangeText={(text) => setFormData({ ...formData, capacidade_maxima: parseInt(text) || 0 })}
                placeholder="Número de vagas"
                keyboardType="numeric"
                editable={!saving}
              />

              <Text style={styles.label}>Professor</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={[
                    styles.pickerOption,
                    !formData.professor && styles.pickerOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, professor: null })}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      !formData.professor && styles.pickerOptionTextSelected,
                    ]}
                  >
                    Não atribuído
                  </Text>
                </TouchableOpacity>
                {professores.map((prof) => (
                  <TouchableOpacity
                    key={prof.id}
                    style={[
                      styles.pickerOption,
                      formData.professor === prof.id && styles.pickerOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, professor: prof.id })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.professor === prof.id && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {prof.first_name} {prof.last_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.label}>Turma Ativa</Text>
                <Switch
                  value={formData.ativo !== false}
                  onValueChange={(value) => setFormData({ ...formData, ativo: value })}
                  disabled={saving}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowForm(false)}
                  disabled={saving}
                >
                  <Text style={[styles.modalButtonText, { color: '#333' }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, saving && styles.buttonDisabled]}
                  onPress={handleSalvarTurma}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Gerenciar Alunos */}
      <Modal visible={showAlunosModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Gerenciar Alunos - {turmaSelecionada?.ct_nome}
            </Text>

            <ScrollView style={styles.alunosList}>
              {alunos.map((aluno) => (
                <TouchableOpacity
                  key={aluno.id}
                  style={styles.alunoItem}
                  onPress={() => toggleAluno(aluno.id)}
                >
                  <View style={styles.alunoInfo}>
                    <Text style={styles.alunoNome}>
                      {aluno.first_name} {aluno.last_name}
                    </Text>
                    <Text style={styles.alunoEmail}>{aluno.email}</Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      alunosSelecionados.includes(aluno.id) && styles.checkboxSelected,
                    ]}
                  >
                    {alunosSelecionados.includes(aluno.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowAlunosModal(false)}
                  disabled={saving}
                >
                  <Text style={[styles.modalButtonText, { color: '#333' }]}>Cancelar</Text>
                </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSalvarAlunos}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Salvar</Text>
                )}
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
  header: {
    backgroundColor: '#1a237e',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#1a237e',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  turmaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  turmaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  turmaInfo: {
    flex: 1,
  },
  turmaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  turmaSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  turmaDetails: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  turmaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2196f3',
  },
  alunosButton: {
    backgroundColor: '#ff9800',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  pickerOptionSelected: {
    backgroundColor: '#1a237e',
    borderColor: '#1a237e',
  },
  pickerOptionText: {
    color: '#333',
    fontSize: 14,
  },
  pickerOptionTextSelected: {
    color: '#fff',
  },
  diasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  diaButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  diaButtonSelected: {
    backgroundColor: '#1a237e',
    borderColor: '#1a237e',
  },
  diaButtonText: {
    color: '#333',
    fontSize: 14,
  },
  diaButtonTextSelected: {
    color: '#fff',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#1a237e',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  alunosList: {
    maxHeight: 400,
  },
  alunoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  alunoInfo: {
    flex: 1,
  },
  alunoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  alunoEmail: {
    fontSize: 14,
    color: '#666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#1a237e',
    borderColor: '#1a237e',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GerenciarTurmasScreen;

