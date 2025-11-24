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
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { ctService } from '../services/api';
import { CentroTreinamento } from '../types';
import { NavigationProps } from '../types';

const GerenciarCTsScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [cts, setCts] = useState<CentroTreinamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ctSelecionado, setCtSelecionado] = useState<CentroTreinamento | null>(null);
  const [formData, setFormData] = useState<Partial<CentroTreinamento>>({
    nome: '',
    endereco: '',
    telefone: '',
  });

  useEffect(() => {
    if (user?.tipo === 'gerente') {
      loadCTs();
    }
  }, [user]);

  const loadCTs = async () => {
    try {
      setLoading(true);
      const ctsData = await ctService.listarCTs();
      setCts(ctsData);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar centros de treinamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleCriarCT = () => {
    setFormData({
      nome: '',
      endereco: '',
      telefone: '',
    });
    setCtSelecionado(null);
    setShowForm(true);
  };

  const handleEditarCT = (ct: CentroTreinamento) => {
    setFormData({
      id: ct.id,
      nome: ct.nome,
      endereco: ct.endereco || '',
      telefone: ct.telefone || '',
    });
    setCtSelecionado(ct);
    setShowForm(true);
  };

  const handleExcluirCT = (ct: CentroTreinamento) => {
    Alert.alert(
      'Excluir Centro de Treinamento',
      `Deseja realmente excluir o centro "${ct.nome}"?\n\nEsta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await ctService.excluirCT(ct.id!);
              Alert.alert('Sucesso', 'Centro de Treinamento excluído com sucesso!');
              loadCTs();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao excluir centro de treinamento.');
            }
          },
        },
      ]
    );
  };

  const handleSalvarCT = async () => {
    if (!formData.nome?.trim()) {
      Alert.alert('Erro', 'O nome do centro de treinamento é obrigatório.');
      return;
    }

    try {
      setSaving(true);
      const dataToSave = {
        nome: formData.nome.trim(),
        endereco: formData.endereco?.trim() || '',
        telefone: formData.telefone?.trim() || '',
      };

      if (ctSelecionado?.id) {
        await ctService.atualizarCT(ctSelecionado.id, dataToSave);
        Alert.alert('Sucesso', 'Centro de Treinamento atualizado com sucesso!');
      } else {
        await ctService.criarCT(dataToSave);
        Alert.alert('Sucesso', 'Centro de Treinamento criado com sucesso!');
      }
      
      setShowForm(false);
      loadCTs();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.nome?.[0] || 'Erro ao salvar centro de treinamento.';
      Alert.alert('Erro', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (user?.tipo !== 'gerente') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Acesso negado. Apenas gerentes podem gerenciar centros de treinamento.</Text>
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
        <Text style={styles.headerTitle}>Centros de Treinamento</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCriarCT}>
          <Text style={styles.addButtonText}>+ Novo CT</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {cts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum centro de treinamento encontrado.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleCriarCT}>
              <Text style={styles.emptyButtonText}>Criar Primeiro CT</Text>
            </TouchableOpacity>
          </View>
        ) : (
          cts.map((ct) => (
            <View key={ct.id} style={styles.ctCard}>
              <View style={styles.ctHeader}>
                <View style={styles.ctInfo}>
                  <Text style={styles.ctNome}>{ct.nome}</Text>
                  {ct.endereco && (
                    <Text style={styles.ctDetail}>📍 {ct.endereco}</Text>
                  )}
                  {ct.telefone && (
                    <Text style={styles.ctDetail}>📞 {ct.telefone}</Text>
                  )}
                </View>
              </View>
              <View style={styles.ctActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEditarCT(ct)}
                >
                  <Text style={styles.actionButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleExcluirCT(ct)}
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
              {ctSelecionado ? 'Editar Centro de Treinamento' : 'Novo Centro de Treinamento'}
            </Text>

            <ScrollView>
              <Text style={styles.label}>Nome *</Text>
              <TextInput
                style={styles.input}
                value={formData.nome}
                onChangeText={(text) => setFormData({ ...formData, nome: text })}
                placeholder="Nome do centro de treinamento"
                editable={!saving}
              />

              <Text style={styles.label}>Endereço</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.endereco}
                onChangeText={(text) => setFormData({ ...formData, endereco: text })}
                placeholder="Endereço completo"
                multiline
                numberOfLines={3}
                editable={!saving}
              />

              <Text style={styles.label}>Telefone</Text>
              <TextInput
                style={styles.input}
                value={formData.telefone}
                onChangeText={(text) => setFormData({ ...formData, telefone: text })}
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
                editable={!saving}
              />

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
                  onPress={handleSalvarCT}
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
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#1a237e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ctCard: {
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
  ctHeader: {
    marginBottom: 12,
  },
  ctInfo: {
    flex: 1,
  },
  ctNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ctDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ctActions: {
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
});

export default GerenciarCTsScreen;

