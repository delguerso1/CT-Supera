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
import { superaNewsService } from '../services/api';
import { SuperaNews } from '../types';
import { NavigationProps } from '../types';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import CONFIG from '../config';

const GerenciarSuperaNewsScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [noticias, setNoticias] = useState<SuperaNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [noticiaSelecionada, setNoticiaSelecionada] = useState<SuperaNews | null>(null);
  const [formData, setFormData] = useState<Partial<SuperaNews>>({
    titulo: '',
    descricao: '',
    ativo: true,
  });
  const [imagemSelecionada, setImagemSelecionada] = useState<any>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user?.tipo === 'gerente') {
      loadNoticias();
    }
  }, [user]);

  const loadNoticias = async () => {
    try {
      setLoading(true);
      const noticiasData = await superaNewsService.listarNoticias();
      setNoticias(noticiasData);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar notícias.');
    } finally {
      setLoading(false);
    }
  };

  const handleCriarNoticia = () => {
    setFormData({
      titulo: '',
      descricao: '',
      ativo: true,
    });
    setImagemSelecionada(null);
    setImagemPreview(null);
    setNoticiaSelecionada(null);
    setShowForm(true);
  };

  const handleEditarNoticia = (noticia: SuperaNews) => {
    setFormData({
      id: noticia.id,
      titulo: noticia.titulo,
      descricao: noticia.descricao,
      ativo: noticia.ativo !== false,
    });
    setImagemSelecionada(null);
    const mediaUrl = CONFIG.API_BASE_URL.replace('/api/', '');
    setImagemPreview(noticia.imagem ? `${mediaUrl}${noticia.imagem.startsWith('/') ? '' : '/'}${noticia.imagem}` : null);
    setNoticiaSelecionada(noticia);
    setShowForm(true);
  };

  const handleExcluirNoticia = (noticia: SuperaNews) => {
    Alert.alert(
      'Excluir Notícia',
      `Deseja realmente excluir a notícia "${noticia.titulo}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await superaNewsService.excluirNoticia(noticia.id!);
              Alert.alert('Sucesso', 'Notícia excluída com sucesso!');
              loadNoticias();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao excluir notícia.');
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

  const handleSalvarNoticia = async () => {
    if (!formData.titulo?.trim()) {
      Alert.alert('Erro', 'O título da notícia é obrigatório.');
      return;
    }
    if (!formData.descricao?.trim()) {
      Alert.alert('Erro', 'A descrição da notícia é obrigatória.');
      return;
    }
    if (!noticiaSelecionada && !imagemSelecionada) {
      Alert.alert('Erro', 'Uma imagem é obrigatória para criar uma nova notícia.');
      return;
    }

    try {
      setSaving(true);
      const formDataToSend = new FormData();
      formDataToSend.append('titulo', formData.titulo.trim());
      formDataToSend.append('descricao', formData.descricao.trim());
      formDataToSend.append('ativo', formData.ativo ? 'true' : 'false');

      if (imagemSelecionada) {
        formDataToSend.append('imagem', {
          uri: imagemSelecionada.uri,
          type: imagemSelecionada.type,
          name: imagemSelecionada.name,
        } as any);
      }

      if (noticiaSelecionada?.id) {
        await superaNewsService.atualizarNoticia(noticiaSelecionada.id, formDataToSend);
        Alert.alert('Sucesso', 'Notícia atualizada com sucesso!');
      } else {
        await superaNewsService.criarNoticia(formDataToSend);
        Alert.alert('Sucesso', 'Notícia criada com sucesso!');
      }
      
      setShowForm(false);
      loadNoticias();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.titulo?.[0] || 'Erro ao salvar notícia.';
      Alert.alert('Erro', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (user?.tipo !== 'gerente') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Acesso negado. Apenas gerentes podem gerenciar notícias.</Text>
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
        <Text style={styles.headerTitle}>Supera News</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCriarNoticia}>
          <Text style={styles.addButtonText}>+ Nova Notícia</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {noticias.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma notícia encontrada.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleCriarNoticia}>
              <Text style={styles.emptyButtonText}>Criar Primeira Notícia</Text>
            </TouchableOpacity>
          </View>
        ) : (
          noticias.map((noticia) => (
            <View key={noticia.id} style={styles.noticiaCard}>
              {noticia.imagem && (
                <Image
                  source={{ 
                    uri: `${CONFIG.API_BASE_URL.replace('/api/', '')}${noticia.imagem.startsWith('/') ? '' : '/'}${noticia.imagem}` 
                  }}
                  style={styles.noticiaImagem}
                />
              )}
              <View style={styles.noticiaContent}>
                <Text style={styles.noticiaTitulo}>{noticia.titulo}</Text>
                <Text style={styles.noticiaDescricao} numberOfLines={3}>
                  {noticia.descricao}
                </Text>
                <View style={styles.noticiaFooter}>
                  <Text style={styles.noticiaData}>
                    {noticia.data_criacao
                      ? new Date(noticia.data_criacao).toLocaleDateString('pt-BR')
                      : ''}
                  </Text>
                  {noticia.autor_nome && (
                    <Text style={styles.noticiaAutor}>Por: {noticia.autor_nome}</Text>
                  )}
                </View>
                <View style={styles.noticiaActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEditarNoticia(noticia)}
                  >
                    <Text style={styles.actionButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleExcluirNoticia(noticia)}
                  >
                    <Text style={styles.actionButtonText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
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
              {noticiaSelecionada ? 'Editar Notícia' : 'Nova Notícia'}
            </Text>

            <ScrollView>
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                value={formData.titulo}
                onChangeText={(text) => setFormData({ ...formData, titulo: text })}
                placeholder="Título da notícia"
                editable={!saving}
              />

              <Text style={styles.label}>Descrição *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.descricao}
                onChangeText={(text) => setFormData({ ...formData, descricao: text })}
                placeholder="Conteúdo da notícia"
                multiline
                numberOfLines={6}
                editable={!saving}
              />

              <Text style={styles.label}>Imagem {!noticiaSelecionada && '*'}</Text>
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
                <Text style={styles.label}>Notícia Ativa</Text>
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
                  onPress={handleSalvarNoticia}
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
  noticiaCard: {
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
  noticiaImagem: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  noticiaContent: {
    padding: 16,
  },
  noticiaTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noticiaDescricao: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  noticiaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  noticiaData: {
    fontSize: 12,
    color: '#999',
  },
  noticiaAutor: {
    fontSize: 12,
    color: '#999',
  },
  noticiaActions: {
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
    minHeight: 120,
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

export default GerenciarSuperaNewsScreen;

