import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { usuarioService, turmaService } from '../services/api';
import { User, PreCadastro } from '../types';
import { NavigationProps } from '../types';

type TabKey = 'alunos' | 'professores' | 'gerentes' | 'precadastros';

const GerenciarUsuariosScreen: React.FC<NavigationProps> = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('alunos');
  const [users, setUsers] = useState<User[]>([]);
  const [precadastros, setPrecadastros] = useState<PreCadastro[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | PreCadastro | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    cpf: '',
    email: '',
    telefone: '',
    endereco: '',
    data_nascimento: '',
    nome_responsavel: '',
    telefone_responsavel: '',
    telefone_emergencia: '',
    ficha_medica: '',
  });
  const [diaVencimento, setDiaVencimento] = useState('');
  const [valorMensalidade, setValorMensalidade] = useState('');
  const [salarioProfessor, setSalarioProfessor] = useState('');
  const [pixProfessor, setPixProfessor] = useState('');
  const [planoAluno, setPlanoAluno] = useState<'3x' | '2x' | '1x'>('3x');
  const [diasHabilitadosAluno, setDiasHabilitadosAluno] = useState<number[]>([]);
  const [planoFamiliaAluno, setPlanoFamiliaAluno] = useState(false);
  const [showMatriculaModal, setShowMatriculaModal] = useState(false);
  const [matriculaPrecadastro, setMatriculaPrecadastro] = useState<PreCadastro | null>(null);
  const [diasSemana, setDiasSemana] = useState<Array<{ id: number; nome: string }>>([]);
  const [matriculaForm, setMatriculaForm] = useState({
    cpf: '',
    dia_vencimento: '1',
    ja_aluno: false,
    plano: '3x',
    valor_primeira_mensalidade: '150.00',
    plano_familia: false,
    valor_mensalidade: '',
    dias_habilitados: [] as number[],
  });

  useEffect(() => {
    if (user?.tipo === 'gerente') {
      fetchUsers();
    }
  }, [activeTab, user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      if (activeTab === 'precadastros') {
        const data = await usuarioService.listarPrecadastros();
        setPrecadastros(data);
        setUsers([]);
      } else {
        const tipo = activeTab === 'alunos' ? 'aluno' : activeTab === 'professores' ? 'professor' : 'gerente';
        const response = await usuarioService.listarUsuarios({ tipo });
        const resolved = Array.isArray(response) ? response : response.results || response.data || [];
        setUsers(resolved);
        setPrecadastros([]);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      cpf: '',
      email: '',
      telefone: '',
      endereco: '',
      data_nascimento: '',
      nome_responsavel: '',
      telefone_responsavel: '',
      telefone_emergencia: '',
      ficha_medica: '',
    });
    setDiaVencimento('');
    setValorMensalidade('');
    setSalarioProfessor('');
    setPixProfessor('');
    setPlanoAluno('3x');
    setDiasHabilitadosAluno([]);
    setPlanoFamiliaAluno(false);
  };

  const handleNewUser = () => {
    resetForm();
    setEditingUser(null);
    if (activeTab === 'alunos' && !diasSemana.length) {
      turmaService.getDiasSemana().then(setDiasSemana).catch(() => {
        Alert.alert('Erro', 'Erro ao carregar dias da semana.');
      });
    }
    setShowForm(true);
  };

  const handleEditUser = (target: User | PreCadastro) => {
    setEditingUser(target);
    setFormData({
      first_name: (target as any).first_name || '',
      last_name: (target as any).last_name || '',
      cpf: (target as any).cpf || '',
      email: (target as any).email || '',
      telefone: (target as any).telefone || '',
      endereco: (target as any).endereco || '',
      data_nascimento: (target as any).data_nascimento || '',
      nome_responsavel: (target as any).nome_responsavel || '',
      telefone_responsavel: (target as any).telefone_responsavel || '',
      telefone_emergencia: (target as any).telefone_emergencia || '',
      ficha_medica: (target as any).ficha_medica || '',
    });
    if ((target as any).tipo === 'aluno') {
      setDiaVencimento(String((target as any).dia_vencimento || ''));
      setValorMensalidade(String((target as any).valor_mensalidade || ''));
      setPlanoAluno(((target as any).plano as '3x' | '2x' | '1x') || '3x');
      setDiasHabilitadosAluno(Array.isArray((target as any).dias_habilitados) ? (target as any).dias_habilitados : []);
      if (!diasSemana.length) {
        turmaService.getDiasSemana().then(setDiasSemana).catch(() => {
          Alert.alert('Erro', 'Erro ao carregar dias da semana.');
        });
      }
    }
    if ((target as any).tipo === 'professor') {
      setSalarioProfessor(String((target as any).salario_professor || ''));
      setPixProfessor((target as any).pix_professor || '');
    }
    setShowForm(true);
  };

  const buildPayload = () => {
    const payload: any = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      cpf: formData.cpf,
      email: formData.email,
      telefone: formData.telefone,
      endereco: formData.endereco,
      data_nascimento: formData.data_nascimento || null,
    };

    if (activeTab !== 'precadastros') {
      payload.tipo = activeTab === 'alunos' ? 'aluno' : activeTab === 'professores' ? 'professor' : 'gerente';
    }

    if (payload.tipo === 'aluno') {
      payload.nome_responsavel = formData.nome_responsavel;
      payload.telefone_responsavel = formData.telefone_responsavel;
      payload.telefone_emergencia = formData.telefone_emergencia;
      payload.ficha_medica = formData.ficha_medica;
      payload.plano = planoAluno;
      payload.dias_habilitados = diasHabilitadosAluno;
      if (diaVencimento) payload.dia_vencimento = Number(diaVencimento);
      if (valorMensalidade) payload.valor_mensalidade = Number(valorMensalidade);
    }

    if (payload.tipo === 'professor') {
      if (salarioProfessor) payload.salario_professor = Number(salarioProfessor);
      if (pixProfessor) payload.pix_professor = pixProfessor;
    }

    return payload;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = buildPayload();
      if (activeTab === 'precadastros') {
        if (editingUser) {
          await usuarioService.atualizarPrecadastro((editingUser as PreCadastro).id, payload);
        } else {
          await usuarioService.criarPrecadastro(payload);
        }
      } else if (editingUser) {
        await usuarioService.atualizarUsuario((editingUser as User).id, payload);
      } else {
        await usuarioService.criarUsuario(payload);
      }
      setShowForm(false);
      resetForm();
      await fetchUsers();
      Alert.alert('Sucesso', 'Dados salvos com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || error.response?.data?.detail || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (target: User | PreCadastro) => {
    Alert.alert(
      'Excluir',
      'Deseja realmente excluir este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeTab === 'precadastros') {
                await usuarioService.excluirPrecadastro((target as PreCadastro).id);
              } else {
                await usuarioService.excluirUsuario((target as User).id);
              }
              await fetchUsers();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao excluir.');
            }
          },
        },
      ]
    );
  };

  const handleResetParq = (target: User) => {
    Alert.alert(
      'Liberar PAR-Q',
      `Deseja liberar o PAR-Q de ${target.first_name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await usuarioService.resetParq(target.id);
              await fetchUsers();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao liberar PAR-Q.');
            }
          },
        },
      ]
    );
  };

  const handleAbrirMatricula = async (precadastro: PreCadastro) => {
    try {
      const dias = await turmaService.getDiasSemana();
      setDiasSemana(dias);
      setMatriculaPrecadastro(precadastro);
      setMatriculaForm({
        cpf: precadastro.cpf || '',
        dia_vencimento: '1',
        ja_aluno: false,
        plano: '3x',
        valor_primeira_mensalidade: '150.00',
        plano_familia: false,
        valor_mensalidade: '',
        dias_habilitados: [],
      });
      setShowMatriculaModal(true);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar dias da semana.');
    }
  };

  const handleToggleDia = (diaId: number) => {
    setMatriculaForm(prev => {
      const limite = prev.plano === '3x' ? 3 : prev.plano === '2x' ? 2 : 1;
      const jaSelecionado = prev.dias_habilitados.includes(diaId);
      if (jaSelecionado) {
        return { ...prev, dias_habilitados: prev.dias_habilitados.filter(id => id !== diaId) };
      }
      if (prev.dias_habilitados.length >= limite) {
        Alert.alert('Atenção', `O plano ${prev.plano} permite ${limite} dia(s).`);
        return prev;
      }
      return { ...prev, dias_habilitados: [...prev.dias_habilitados, diaId] };
    });
  };

  const handleToggleDiaAluno = (diaId: number) => {
    const limite = planoAluno === '3x' ? 3 : planoAluno === '2x' ? 2 : 1;
    const jaSelecionado = diasHabilitadosAluno.includes(diaId);
    if (jaSelecionado) {
      setDiasHabilitadosAluno(diasHabilitadosAluno.filter(id => id !== diaId));
      return;
    }
    if (diasHabilitadosAluno.length >= limite) {
      Alert.alert('Atenção', `O plano ${planoAluno} permite ${limite} dia(s).`);
      return;
    }
    setDiasHabilitadosAluno([...diasHabilitadosAluno, diaId]);
  };

  const handleChangePlanoAluno = (plano: '3x' | '2x' | '1x') => {
    setPlanoAluno(plano);
    const limite = plano === '3x' ? 3 : plano === '2x' ? 2 : 1;
    setDiasHabilitadosAluno(prev => (prev.length > limite ? prev.slice(0, limite) : prev));
  };

  const handleTogglePlanoFamilia = (value: boolean) => {
    setPlanoFamiliaAluno(value);
    if (!valorMensalidade) return;
    const valorAtual = Number(valorMensalidade);
    if (Number.isNaN(valorAtual)) return;
    const ajuste = value ? -10 : 10;
    const novoValor = Math.max(0, valorAtual + ajuste);
    setValorMensalidade(novoValor.toFixed(2));
  };

  const handleFinalizarMatricula = async () => {
    if (!matriculaPrecadastro) return;
    try {
      const payload = {
        cpf: matriculaForm.cpf,
        dia_vencimento: Number(matriculaForm.dia_vencimento),
        ja_aluno: matriculaForm.ja_aluno,
        plano: matriculaForm.plano,
        valor_primeira_mensalidade: Number(matriculaForm.valor_primeira_mensalidade || 0),
        plano_familia: matriculaForm.plano_familia,
        valor_mensalidade: matriculaForm.valor_mensalidade ? Number(matriculaForm.valor_mensalidade) : undefined,
        dias_habilitados: matriculaForm.dias_habilitados,
      };
      await usuarioService.finalizarAgendamento(matriculaPrecadastro.id, payload);
      setShowMatriculaModal(false);
      await fetchUsers();
      Alert.alert('Sucesso', 'Pré-cadastro matriculado com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao finalizar matrícula.');
    }
  };

  if (user?.tipo !== 'gerente') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.noData}>Acesso negado.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabs}>
        {[
          { key: 'alunos', label: 'Alunos' },
          { key: 'professores', label: 'Professores' },
          { key: 'gerentes', label: 'Gerentes' },
          { key: 'precadastros', label: 'Pré-cadastros' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as TabKey)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            {activeTab === 'precadastros' ? 'Pré-cadastros' : `Gerenciar ${activeTab}`}
          </Text>
          <TouchableOpacity style={styles.addButton} onPress={handleNewUser}>
            <Text style={styles.addButtonText}>+ Novo</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a237e" />
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        ) : (
          <ScrollView>
            {activeTab === 'precadastros' ? (
              precadastros.length === 0 ? (
                <Text style={styles.noData}>Nenhum pré-cadastro encontrado.</Text>
              ) : (
                precadastros.map((item) => (
                  <View key={item.id} style={styles.card}>
                    <Text style={styles.cardTitle}>
                      {item.nome || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Sem nome'}
                    </Text>
                    <Text style={styles.cardSubtitle}>{item.email}</Text>
                    <Text style={styles.cardSubtitle}>Status: {item.status}</Text>
                    <View style={styles.actionsRow}>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleEditUser(item)}>
                        <Text style={styles.actionButtonText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionPrimary]}
                        onPress={() => handleAbrirMatricula(item)}
                      >
                        <Text style={styles.actionButtonText}>Matricular</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionDanger]}
                        onPress={() => handleDelete(item)}
                      >
                        <Text style={styles.actionButtonText}>Excluir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )
            ) : (
              users.length === 0 ? (
                <Text style={styles.noData}>Nenhum usuário encontrado.</Text>
              ) : (
                users.map((item) => (
                  <View key={item.id} style={styles.card}>
                    <Text style={styles.cardTitle}>
                      {item.first_name} {item.last_name}
                    </Text>
                    <Text style={styles.cardSubtitle}>{item.email}</Text>
                    <Text style={styles.cardSubtitle}>CPF: {item.cpf}</Text>
                    {activeTab === 'alunos' && (
                      <Text style={styles.cardSubtitle}>
                        PAR-Q: {item.parq_completed ? 'Completo' : 'Pendente'}
                      </Text>
                    )}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleEditUser(item)}>
                        <Text style={styles.actionButtonText}>Editar</Text>
                      </TouchableOpacity>
                      {activeTab === 'alunos' && item.parq_completed && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionPrimary]}
                          onPress={() => handleResetParq(item)}
                        >
                          <Text style={styles.actionButtonText}>Liberar PAR-Q</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionDanger]}
                        onPress={() => handleDelete(item)}
                      >
                        <Text style={styles.actionButtonText}>Excluir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )
            )}
          </ScrollView>
        )}
      </View>

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingUser ? 'Editar registro' : 'Novo registro'}
            </Text>
            <ScrollView>
              <TextInput
                style={styles.input}
                placeholder="Nome"
                value={formData.first_name}
                onChangeText={(value) => setFormData(prev => ({ ...prev, first_name: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Sobrenome"
                value={formData.last_name}
                onChangeText={(value) => setFormData(prev => ({ ...prev, last_name: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="CPF"
                value={formData.cpf}
                onChangeText={(value) => setFormData(prev => ({ ...prev, cpf: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(value) => setFormData(prev => ({ ...prev, email: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Telefone"
                value={formData.telefone}
                onChangeText={(value) => setFormData(prev => ({ ...prev, telefone: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Endereço"
                value={formData.endereco}
                onChangeText={(value) => setFormData(prev => ({ ...prev, endereco: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Data de Nascimento (AAAA-MM-DD)"
                value={formData.data_nascimento}
                onChangeText={(value) => setFormData(prev => ({ ...prev, data_nascimento: value }))}
              />

              {activeTab === 'alunos' && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Nome do Responsável"
                    value={formData.nome_responsavel}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, nome_responsavel: value }))}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Telefone do Responsável"
                    value={formData.telefone_responsavel}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, telefone_responsavel: value }))}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Telefone de Emergência"
                    value={formData.telefone_emergencia}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, telefone_emergencia: value }))}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Ficha Médica"
                    value={formData.ficha_medica}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, ficha_medica: value }))}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Dia de vencimento (1, 5, 10)"
                    keyboardType="numeric"
                    value={diaVencimento}
                    onChangeText={setDiaVencimento}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Valor da mensalidade"
                    keyboardType="numeric"
                    value={valorMensalidade}
                    onChangeText={setValorMensalidade}
                  />
                  <Text style={styles.sectionTitle}>Plano</Text>
                  <View style={styles.planOptions}>
                    {(['3x', '2x', '1x'] as const).map((plano) => (
                      <TouchableOpacity
                        key={plano}
                        style={[
                          styles.planOption,
                          planoAluno === plano && styles.planOptionSelected,
                        ]}
                        onPress={() => handleChangePlanoAluno(plano)}
                      >
                        <Text
                          style={[
                            styles.planOptionText,
                            planoAluno === plano && styles.planOptionTextSelected,
                          ]}
                        >
                          {plano}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Plano família</Text>
                    <Switch
                      value={planoFamiliaAluno}
                      onValueChange={handleTogglePlanoFamilia}
                    />
                  </View>
                  <Text style={styles.sectionTitle}>Dias habilitados</Text>
                  {diasSemana.length === 0 ? (
                    <Text style={styles.noData}>Nenhum dia disponível.</Text>
                  ) : (
                    diasSemana.map((dia) => (
                      <TouchableOpacity
                        key={dia.id}
                        style={styles.dayItem}
                        onPress={() => handleToggleDiaAluno(dia.id)}
                      >
                        <Text style={styles.dayText}>{dia.nome}</Text>
                        <Text style={styles.daySelected}>
                          {diasHabilitadosAluno.includes(dia.id) ? '✓' : ''}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}

              {activeTab === 'professores' && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Salário"
                    keyboardType="numeric"
                    value={salarioProfessor}
                    onChangeText={setSalarioProfessor}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Chave PIX"
                    value={pixProfessor}
                    onChangeText={setPixProfessor}
                  />
                </>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionButton, styles.actionSecondary]} onPress={() => setShowForm(false)}>
                <Text style={styles.actionButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionPrimary]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.actionButtonText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showMatriculaModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Matricular pré-cadastro</Text>
            <ScrollView>
              <TextInput
                style={styles.input}
                placeholder="CPF"
                value={matriculaForm.cpf}
                onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, cpf: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Dia de vencimento (1, 5, 10)"
                keyboardType="numeric"
                value={matriculaForm.dia_vencimento}
                onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, dia_vencimento: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Plano (3x, 2x, 1x)"
                value={matriculaForm.plano}
                onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, plano: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Valor da primeira mensalidade"
                keyboardType="numeric"
                value={matriculaForm.valor_primeira_mensalidade}
                onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, valor_primeira_mensalidade: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Valor mensalidade"
                keyboardType="numeric"
                value={matriculaForm.valor_mensalidade}
                onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, valor_mensalidade: value }))}
              />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Já é aluno</Text>
                <Switch
                  value={matriculaForm.ja_aluno}
                  onValueChange={(value) => setMatriculaForm(prev => ({ ...prev, ja_aluno: value }))}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Plano família</Text>
                <Switch
                  value={matriculaForm.plano_familia}
                  onValueChange={(value) => setMatriculaForm(prev => ({ ...prev, plano_familia: value }))}
                />
              </View>
              <Text style={styles.sectionTitle}>Dias habilitados</Text>
              {diasSemana.map((dia) => (
                <TouchableOpacity
                  key={dia.id}
                  style={styles.dayItem}
                  onPress={() => handleToggleDia(dia.id)}
                >
                  <Text style={styles.dayText}>{dia.nome}</Text>
                  <Text style={styles.daySelected}>
                    {matriculaForm.dias_habilitados.includes(dia.id) ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionSecondary]}
                onPress={() => setShowMatriculaModal(false)}
              >
                <Text style={styles.actionButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionPrimary]}
                onPress={handleFinalizarMatricula}
              >
                <Text style={styles.actionButtonText}>Finalizar</Text>
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
    fontSize: 12,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#1a237e',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: '#1a237e',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  actionPrimary: {
    backgroundColor: '#4caf50',
  },
  actionSecondary: {
    backgroundColor: '#9e9e9e',
  },
  actionDanger: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    color: '#333',
    backgroundColor: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 8,
  },
  planOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  planOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  planOptionSelected: {
    backgroundColor: '#1a237e',
    borderColor: '#1a237e',
  },
  planOptionText: {
    color: '#333',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planOptionTextSelected: {
    color: '#fff',
  },
  dayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dayText: {
    color: '#333',
    fontSize: 12,
  },
  daySelected: {
    color: '#1a237e',
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 12,
    color: '#333',
  },
});

export default GerenciarUsuariosScreen;
