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
import { User, PreCadastro, Turma } from '../types';
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
  const [diasHabilitadosAluno, setDiasHabilitadosAluno] = useState<number[]>([]);
  const [showMatriculaModal, setShowMatriculaModal] = useState(false);
  const [matriculaPrecadastro, setMatriculaPrecadastro] = useState<PreCadastro | null>(null);
  const [diasSemana, setDiasSemana] = useState<Array<{ id: number; nome: string }>>([]);
  const [matriculaForm, setMatriculaForm] = useState({
    cpf: '',
    dia_vencimento: '1',
    ja_aluno: false,
    valor_mensalidade: '',
    valor_matricula: '',
    valor_uniforme: '',
    dia_vencimento_primeira: '',
    dias_habilitados: [] as number[],
    turma: '' as string | number,
    criar_primeira_mensalidade_agora: false,
    forma_pagamento: '',
  });
  const [turmasParaMatricula, setTurmasParaMatricula] = useState<Turma[]>([]);
  const [filtroStatusPrecadastro, setFiltroStatusPrecadastro] = useState<string>('');

  useEffect(() => {
    if (user?.tipo === 'gerente') {
      fetchUsers();
    }
  }, [activeTab, user, filtroStatusPrecadastro]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      if (activeTab === 'precadastros') {
        const data = await usuarioService.listarPrecadastros(
          filtroStatusPrecadastro ? { status: filtroStatusPrecadastro } : undefined
        );
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
    setDiasHabilitadosAluno([]);
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
    } else {
      payload.origem = editingUser
        ? (editingUser as PreCadastro).origem || 'formulario'
        : 'formulario';
    }

    if (payload.tipo === 'aluno') {
      payload.nome_responsavel = formData.nome_responsavel;
      payload.telefone_responsavel = formData.telefone_responsavel;
      payload.telefone_emergencia = formData.telefone_emergencia;
      payload.ficha_medica = formData.ficha_medica;
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
    const onConfirmDelete = async () => {
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
    };

    if (activeTab === 'precadastros') {
      Alert.alert(
        'Excluir pré-cadastro',
        'Deseja realmente excluir este pré-cadastro?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Confirmar exclusão',
                'Esta ação é irreversível. Confirma a exclusão?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Sim, excluir', style: 'destructive', onPress: onConfirmDelete },
                ]
              );
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Excluir',
        'Deseja realmente excluir este registro?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: onConfirmDelete },
        ]
      );
    }
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
      const [dias, turmasData] = await Promise.all([
        turmaService.getDiasSemana(),
        turmaService.getTurmas(),
      ]);
      setDiasSemana(dias);
      setTurmasParaMatricula(Array.isArray(turmasData) ? turmasData : []);
      setMatriculaPrecadastro(precadastro);
      const precadastroTurma = (precadastro as any).turma;
      const turmaInicial = precadastroTurma
        ? (typeof precadastroTurma === 'object' ? precadastroTurma.id : precadastroTurma)
        : '';
      setMatriculaForm({
        cpf: precadastro.cpf || '',
        dia_vencimento: '1',
        ja_aluno: false,
        valor_mensalidade: '',
        valor_matricula: '',
        valor_uniforme: '',
        dia_vencimento_primeira: '',
        dias_habilitados: [],
        turma: turmaInicial,
        criar_primeira_mensalidade_agora: false,
        forma_pagamento: '',
      });
      setShowMatriculaModal(true);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar dados.');
    }
  };

  const handleToggleDia = (diaId: number) => {
    setMatriculaForm(prev => {
      const jaSelecionado = prev.dias_habilitados.includes(diaId);
      if (jaSelecionado) {
        return { ...prev, dias_habilitados: prev.dias_habilitados.filter(id => id !== diaId) };
      }
      return { ...prev, dias_habilitados: [...prev.dias_habilitados, diaId] };
    });
  };

  const handleToggleDiaAluno = (diaId: number) => {
    const jaSelecionado = diasHabilitadosAluno.includes(diaId);
    if (jaSelecionado) {
      setDiasHabilitadosAluno(diasHabilitadosAluno.filter(id => id !== diaId));
      return;
    }
    setDiasHabilitadosAluno([...diasHabilitadosAluno, diaId]);
  };

  const handleFinalizarMatricula = async () => {
    if (!matriculaPrecadastro) return;
    const cpfDigits = String(matriculaForm.cpf || '').replace(/\D/g, '');
    if (!matriculaPrecadastro.cpf && cpfDigits.length !== 11) {
      Alert.alert('Atenção', 'Informe o CPF do aluno (11 dígitos).');
      return;
    }
    const valorMensalidade = Number(matriculaForm.valor_mensalidade);
    if (!matriculaForm.valor_mensalidade || Number.isNaN(valorMensalidade) || valorMensalidade <= 0) {
      Alert.alert('Atenção', 'Informe o valor da mensalidade.');
      return;
    }
    if (!matriculaForm.ja_aluno) {
      const vMat = Number(matriculaForm.valor_matricula || 0);
      const vUnif = Number(matriculaForm.valor_uniforme || 0);
      const total = valorMensalidade + vMat + vUnif;
      if (Number.isNaN(total) || total <= 0) {
        Alert.alert('Atenção', 'Informe os valores da matrícula, uniforme e mensalidade.');
        return;
      }
      const diaPrimeira = Number(matriculaForm.dia_vencimento_primeira);
      if (!matriculaForm.dia_vencimento_primeira || Number.isNaN(diaPrimeira) || diaPrimeira < 1 || diaPrimeira > 31) {
        Alert.alert('Atenção', 'Informe o dia de vencimento da primeira mensalidade (1 a 31).');
        return;
      }
    }
    const diaVenM = Number(matriculaForm.dia_vencimento);
    if (!matriculaForm.dia_vencimento || Number.isNaN(diaVenM) || ![1, 5, 10].includes(diaVenM)) {
      Alert.alert('Atenção', 'Selecione o dia de vencimento das mensalidades (1, 5 ou 10).');
      return;
    }
    if (!matriculaForm.ja_aluno && !matriculaForm.turma) {
      Alert.alert(
        'Atenção',
        'Selecione uma turma. É obrigatório para novo aluno (primeira mensalidade no financeiro).',
      );
      return;
    }
    if (!matriculaForm.dias_habilitados || matriculaForm.dias_habilitados.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um dia habilitado para treino.');
      return;
    }
    if (!matriculaForm.ja_aluno && matriculaForm.criar_primeira_mensalidade_agora) {
      if (!matriculaForm.forma_pagamento) {
        Alert.alert('Atenção', 'Selecione a forma de pagamento (PIX ou Boleto) para enviar a cobrança.');
        return;
      }
      const diaVenc = Number(matriculaForm.dia_vencimento_primeira);
      if (!matriculaForm.dia_vencimento_primeira || Number.isNaN(diaVenc) || diaVenc < 1 || diaVenc > 31) {
        Alert.alert('Atenção', 'Informe o dia de vencimento do PIX/Boleto (1 a 31).');
        return;
      }
      if (!matriculaForm.turma) {
        Alert.alert('Atenção', 'Selecione uma turma para criar e enviar a cobrança por e-mail.');
        return;
      }
    }
    try {
      const round2 = (v: string | number) => Math.round(Number(v || 0) * 100) / 100;
      const payload: any = {
        cpf: matriculaForm.cpf,
        dia_vencimento: Number(matriculaForm.dia_vencimento),
        ja_aluno: matriculaForm.ja_aluno,
        valor_mensalidade: round2(matriculaForm.valor_mensalidade),
        dias_habilitados: matriculaForm.dias_habilitados,
      };
      if (!matriculaForm.ja_aluno) {
        payload.valor_matricula = round2(matriculaForm.valor_matricula);
        payload.valor_uniforme = round2(matriculaForm.valor_uniforme);
        payload.dia_vencimento_primeira = Number(matriculaForm.dia_vencimento_primeira);
      }
      if (matriculaForm.turma) {
        payload.turma = Number(matriculaForm.turma);
      }
      if (!matriculaForm.ja_aluno) {
        payload.criar_primeira_mensalidade_agora = !!matriculaForm.criar_primeira_mensalidade_agora;
        if (matriculaForm.criar_primeira_mensalidade_agora && matriculaForm.forma_pagamento) {
          payload.forma_pagamento = matriculaForm.forma_pagamento;
        }
      }
      const response = await usuarioService.finalizarAgendamento(matriculaPrecadastro.id, payload);
      setShowMatriculaModal(false);
      await fetchUsers();
      const msg = response?.pagamento_enviado
        ? 'Matrícula confirmada! E-mails de ativação e cobrança enviados ao aluno.'
        : 'Pré-cadastro matriculado com sucesso!';
      Alert.alert('Sucesso', msg);
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

        {activeTab === 'precadastros' && (
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Status:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {['', 'cancelado'].map((s) => (
                <TouchableOpacity
                  key={s || 'pendentes'}
                  style={[
                    styles.filterChip,
                    filtroStatusPrecadastro === s && styles.filterChipActive,
                  ]}
                  onPress={() => setFiltroStatusPrecadastro(s)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filtroStatusPrecadastro === s && styles.filterChipTextActive,
                    ]}
                  >
                    {s === '' ? 'Pendentes' : 'Cancelados'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

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
                    <TouchableOpacity
                      onPress={() => {
                        const nome = item.nome || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Sem nome';
                        let msg = `E-mail: ${item.email}\nTelefone: ${item.telefone || '-'}\nTipo: ${item.origem_display || item.origem || '-'}\nStatus: ${item.status === 'matriculado' ? 'Matriculado' : item.status === 'cancelado' ? 'Cancelado' : 'Pendente'}`;
                        if (item.origem === 'aula_experimental' && item.data_aula_experimental) {
                          msg += `\n\nData da aula experimental: ${new Date(item.data_aula_experimental + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`;
                        }
                        Alert.alert(nome, msg, [{ text: 'OK' }]);
                      }}
                    >
                      <Text style={[styles.cardTitle, { color: '#1F6C86', textDecorationLine: 'underline' }]}>
                        {item.nome || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Sem nome'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.cardSubtitle}>{item.email}</Text>
                    <Text style={styles.cardSubtitle}>
                      Status:{' '}
                      {item.status === 'matriculado'
                        ? 'Matriculado'
                        : item.status === 'cancelado'
                        ? 'Cancelado'
                        : 'Pendente'}
                    </Text>
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
                  <Text style={styles.sectionTitle}>Dias habilitados para treino</Text>
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
              <Text style={styles.sectionTitle}>
                {matriculaForm.ja_aluno ? 'Turma (opcional)' : 'Turma (obrigatório para novo aluno)'}
              </Text>
              {turmasParaMatricula.filter(t => t.ativo !== false).length === 0 ? (
                <Text style={styles.noData}>Nenhuma turma disponível.</Text>
              ) : (
                turmasParaMatricula.filter(t => t.ativo !== false).map((turma) => (
                  <TouchableOpacity
                    key={turma.id}
                    style={[styles.dayItem, matriculaForm.turma === turma.id && styles.turmaItemSelected]}
                    onPress={() => setMatriculaForm(prev => ({ ...prev, turma: prev.turma === turma.id ? '' : turma.id! }))}
                  >
                    <Text style={[styles.dayText, matriculaForm.turma === turma.id && styles.turmaItemTextSelected]}>
                      {turma.ct_nome || 'CT'} - {(turma.dias_semana_nomes || []).join(', ')} às {turma.horario || ''}
                    </Text>
                    <Text style={[styles.daySelected, matriculaForm.turma === turma.id && styles.turmaItemTextSelected]}>
                      {matriculaForm.turma === turma.id ? '✓' : ''}
                    </Text>
                  </TouchableOpacity>
                ))
              )}

              {!matriculaPrecadastro.cpf ? (
                <TextInput
                  style={styles.input}
                  placeholder="CPF (obrigatório)"
                  keyboardType="numeric"
                  value={matriculaForm.cpf}
                  onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, cpf: value }))}
                />
              ) : null}
              <Text style={styles.sectionTitle}>Dia de vencimento das mensalidades</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {(['1', '5', '10'] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayItem, matriculaForm.dia_vencimento === d && styles.turmaItemSelected]}
                    onPress={() => setMatriculaForm(prev => ({ ...prev, dia_vencimento: d }))}
                  >
                    <Text style={[styles.dayText, matriculaForm.dia_vencimento === d && styles.turmaItemTextSelected]}>
                      Dia {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Já é aluno? (recredenciamento)</Text>
                <Switch
                  value={matriculaForm.ja_aluno}
                  onValueChange={(value) => setMatriculaForm(prev => ({ ...prev, ja_aluno: value }))}
                />
              </View>
              {matriculaForm.ja_aluno ? (
                <TextInput
                  style={styles.input}
                  placeholder="Valor da mensalidade (R$)"
                  keyboardType="numeric"
                  value={matriculaForm.valor_mensalidade}
                  onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, valor_mensalidade: value }))}
                />
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Valor da matrícula (R$)"
                    keyboardType="numeric"
                    value={matriculaForm.valor_matricula}
                    onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, valor_matricula: value }))}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Valor do uniforme (R$)"
                    keyboardType="numeric"
                    value={matriculaForm.valor_uniforme}
                    onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, valor_uniforme: value }))}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Valor da mensalidade do mês (R$)"
                    keyboardType="numeric"
                    value={matriculaForm.valor_mensalidade}
                    onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, valor_mensalidade: value }))}
                  />
                  <Text style={styles.sectionTitle}>
                    Total: R$ {(Math.round((Number(matriculaForm.valor_matricula || 0) + Number(matriculaForm.valor_uniforme || 0) + Number(matriculaForm.valor_mensalidade || 0)) * 100) / 100).toFixed(2)}
                  </Text>
                  {!matriculaForm.criar_primeira_mensalidade_agora && (
                    <TextInput
                      style={styles.input}
                      placeholder="Dia venc. 1ª mensalidade (1-31)"
                      keyboardType="numeric"
                      value={matriculaForm.dia_vencimento_primeira}
                      onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, dia_vencimento_primeira: value }))}
                    />
                  )}
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Criar 1ª mensalidade agora e enviar por e-mail</Text>
                    <Switch
                      value={matriculaForm.criar_primeira_mensalidade_agora}
                      onValueChange={(v) => setMatriculaForm(prev => ({ ...prev, criar_primeira_mensalidade_agora: v }))}
                    />
                  </View>
                  {matriculaForm.criar_primeira_mensalidade_agora && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.sectionTitle}>Forma de pagamento</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.dayItem, matriculaForm.forma_pagamento === 'pix' && styles.turmaItemSelected]}
                          onPress={() => setMatriculaForm(prev => ({ ...prev, forma_pagamento: 'pix' }))}
                        >
                          <Text style={[styles.dayText, matriculaForm.forma_pagamento === 'pix' && styles.turmaItemTextSelected]}>PIX</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.dayItem, matriculaForm.forma_pagamento === 'boleto' && styles.turmaItemSelected]}
                          onPress={() => setMatriculaForm(prev => ({ ...prev, forma_pagamento: 'boleto' }))}
                        >
                          <Text style={[styles.dayText, matriculaForm.forma_pagamento === 'boleto' && styles.turmaItemTextSelected]}>Boleto</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.sectionTitle}>Dia de vencimento (1-31)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: 15"
                        keyboardType="numeric"
                        value={matriculaForm.dia_vencimento_primeira}
                        onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, dia_vencimento_primeira: value }))}
                      />
                      <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        Cobrança será enviada ao e-mail do aluno
                      </Text>
                    </View>
                  )}
                </>
              )}
              <Text style={styles.sectionTitle}>Dias habilitados para treino</Text>
              {diasSemana.length === 0 ? (
                <Text style={styles.noData}>Nenhum dia disponível.</Text>
              ) : (
                diasSemana.map((dia) => (
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
                ))
              )}
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
  turmaItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  turmaItemTextSelected: {
    color: '#1a237e',
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  filterScroll: {
    flex: 1,
    maxHeight: 40,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#1a237e',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default GerenciarUsuariosScreen;
