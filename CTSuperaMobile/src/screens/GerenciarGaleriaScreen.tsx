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
  Image,
  Switch,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { galeriaService } from '../services/api';
import { GaleriaFoto } from '../types';
import { NavigationProps } from '../types';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import CONFIG from '../config';

const GerenciarGaleriaScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [fotos, setFotos] = useState<GaleriaFoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fotoSelecionada, setFotoSelecionada] = useState<GaleriaFoto | null>(null);
  const [formData, setFormData] = useState<Partial<GaleriaFoto>>({
    titulo: '',
    descricao: '',
    ativo: true,
  });
  const [imagemSelecionada, setImagemSelecionada] = useState<any>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user?.tipo === 'gerente') {
      loadFotos();
    }
  }, [user]);

  const loadFotos = async () => {
    try {
      setLoading(true);
      const fotosData = await galeriaService.listarFotos();
      setFotos(fotosData);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar fotos da galeria.');
    } finally {
      setLoading(false);
    }
  };

  const handleCriarFoto = () => {
    setFormData({
      titulo: '',
      descricao: '',
      ativo: true,
    });
    setImagemSelecionada(null);
    setImagemPreview(null);
    setFotoSelecionada(null);
    setShowForm(true);
  };

  const handleEditarFoto = (foto: GaleriaFoto) => {
    setFormData({
      id: foto.id,
      titulo: foto.titulo,
      descricao: foto.descricao || '',
      ativo: foto.ativo !== false,
    });
    setImagemSelecionada(null);
    const mediaUrl = CONFIG.API_BASE_URL.replace('/api/', '');
    setImagemPreview(foto.imagem ? `${mediaUrl}${foto.imagem.startsWith('/') ? '' : '/'}${foto.imagem}` : null);
    setFotoSelecionada(foto);
    setShowForm(true);
  };

  const handleExcluirFoto = (foto: GaleriaFoto) => {
    Alert.alert(
      'Excluir Foto',
      `Deseja realmente excluir a foto "${foto.titulo}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await galeriaService.excluirFoto(foto.id!);
              Alert.alert('Sucesso', 'Foto excluída com sucesso!');
              loadFotos();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao excluir foto.');
            }
          },
        },
      ]
    );
  };

  const handleSelecionarImagem = () => {
    launchImageLibrary(
      {
        mediaType: 'photo' as MediaType,
        quality: 0.8,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel) {
          return;
        }
        if (response.errorMessage) {
          Alert.alert('Erro', 'Erro ao selecionar imagem.');
          return;
        }
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          setImagemSelecionada({
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || 'image.jpg',
          });
          setImagemPreview(asset.uri || null);
        }
      }
    );
  };

  const handleSalvarFoto = async () => {
    if (!formData.titulo?.trim()) {
      Alert.alert('Erro', 'O título da foto é obrigatório.');
      return;
    }
    if (!fotoSelecionada && !imagemSelecionada) {
      Alert.alert('Erro', 'Uma imagem é obrigatória para criar uma nova foto.');
      return;
    }

    try {
      setSaving(true);
      const formDataToSend = new FormData();
      formDataToSend.append('titulo', formData.titulo.trim());
      if (formData.descricao) {
        formDataToSend.append('descricao', formData.descricao.trim());
      }
      formDataToSend.append('ativo', formData.ativo ? 'true' : 'false');

      if (imagemSelecionada) {
        formDataToSend.append('imagem', {
          uri: imagemSelecionada.uri,
          type: imagemSelecionada.type,
          name: imagemSelecionada.name,
        } as any);
      }

      if (fotoSelecionada?.id) {
        await galeriaService.atualizarFoto(fotoSelecionada.id, formDataToSend);
        Alert.alert('Sucesso', 'Foto atualizada com sucesso!');
      } else {
        await galeriaService.criarFoto(formDataToSend);
        Alert.alert('Sucesso', 'Foto adicionada com sucesso!');
      }
      
      setShowForm(false);
      loadFotos();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.titulo?.[0] || 'Erro ao salvar foto.';
      Alert.alert('Erro', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (user?.tipo !== 'gerente') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Acesso negado. Apenas gerentes podem gerenciar a galeria.</Text>
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
        <Text style={styles.headerTitle}>Galeria de Fotos</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCriarFoto}>
          <Text style={styles.addButtonText}>+ Nova Foto</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {fotos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma foto encontrada.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleCriarFoto}>
              <Text style={styles.emptyButtonText}>Adicionar Primeira Foto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.galleryGrid}>
            {fotos.map((foto) => (
              <View key={foto.id} style={styles.fotoCard}>
                {foto.imagem && (
                  <Image
                    source={{ 
                      uri: `${CONFIG.API_BASE_URL.replace('/api/', '')}${foto.imagem.startsWith('/') ? '' : '/'}${foto.imagem}` 
                    }}
                    style={styles.fotoImagem}
                  />
                )}
                <View style={styles.fotoContent}>
                  <Text style={styles.fotoTitulo} numberOfLines={1}>
                    {foto.titulo}
                  </Text>
                  {foto.descricao && (
                    <Text style={styles.fotoDescricao} numberOfLines={2}>
                      {foto.descricao}
                    </Text>
                  )}
                  <View style={styles.fotoActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => handleEditarFoto(foto)}
                    >
                      <Text style={styles.actionButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleExcluirFoto(foto)}
                    >
                      <Text style={styles.actionButtonText}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de Formulário */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {fotoSelecionada ? 'Editar Foto' : 'Nova Foto'}
            </Text>

            <ScrollView>
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                value={formData.titulo}
                onChangeText={(text) => setFormData({ ...formData, titulo: text })}
                placeholder="Título da foto"
                editable={!saving}
              />

              <Text style={styles.label}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.descricao}
                onChangeText={(text) => setFormData({ ...formData, descricao: text })}
                placeholder="Legenda ou descrição da foto"
                multiline
                numberOfLines={4}
                editable={!saving}
              />

              <Text style={styles.label}>Imagem {!fotoSelecionada && '*'}</Text>
              {imagemPreview && (
                <Image source={{ uri: imagemPreview }} style={styles.imagePreview} />
              )}
              <TouchableOpacity
                style={styles.imageButton}
                onPress={handleSelecionarImagem}
                disabled={saving}
              >
                <Text style={styles.imageButtonText}>
                  {imagemPreview ? 'Trocar Imagem' : 'Selecionar Imagem'}
                </Text>
              </TouchableOpacity>

              <View style={styles.switchContainer}>
                <Text style={styles.label}>Foto Ativa</Text>
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
                  onPress={handleSalvarFoto}
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
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  fotoCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fotoImagem: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  fotoContent: {
    padding: 12,
  },
  fotoTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  fotoDescricao: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  fotoActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
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
    fontSize: 12,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  imageButton: {
    backgroundColor: '#1a237e',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
});

export default GerenciarGaleriaScreen;

