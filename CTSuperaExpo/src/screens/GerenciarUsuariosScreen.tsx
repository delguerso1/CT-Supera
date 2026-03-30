import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { usuarioService, turmaService, ctService } from '../services/api';
import { User, PreCadastro, Turma, CentroTreinamento } from '../types';
import { NavigationProps } from '../types';
import {
  apenasDigitosCpf,
  formatarCpfMascara,
  MSG_CPF_11_DIGITOS,
  MSG_CPF_MATRICULA,
} from '../utils/cpf';
import {
  formatarDataBrMascara,
  isoParaBrDisplay,
  normalizarDataNascimentoParaApi,
  calcularIdade,
} from '../utils/dataNascimento';
import { formatarErroApi, parseDecimalBrasil } from '../utils/apiError';
import {
  formatarTelefoneSoDigitos,
  normalizarTelefoneBrParaApi,
  telefoneBrValido,
} from '../utils/telefone';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SafeScreen from '../components/SafeScreen';
import { colors } from '../theme';

type TabKey = 'alunos' | 'professores' | 'gerentes' | 'precadastros';

function sortUsersByName(list: User[]): User[] {
  return [...list].sort((a, b) => {
    const an = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLocaleLowerCase();
    const bn = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLocaleLowerCase();
    return an.localeCompare(bn, 'pt-BR');
  });
}

function sortPreCadastrosByName(list: PreCadastro[]): PreCadastro[] {
  return [...list].sort((a, b) => {
    const an = (a.nome || `${a.first_name || ''} ${a.last_name || ''}`.trim()).toLocaleLowerCase();
    const bn = (b.nome || `${b.first_name || ''} ${b.last_name || ''}`.trim()).toLocaleLowerCase();
    return an.localeCompare(bn, 'pt-BR');
  });
}

const GerenciarUsuariosScreen: React.FC<NavigationProps> = ({ embedded }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const wrap = (children: React.ReactNode) =>
    embedded ? (
      <View style={styles.container}>{children}</View>
    ) : (
      <SafeScreen tabScreen style={styles.container}>
        {children}
      </SafeScreen>
    );
  const formModalScrollRef = useRef<ScrollView>(null);
  const matriculaModalScrollRef = useRef<ScrollView>(null);
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
  });
  const [diaVencimento, setDiaVencimento] = useState('');
  const [valorMensalidade, setValorMensalidade] = useState('');
  const [salarioProfessor, setSalarioProfessor] = useState('');
  const [pixProfessor, setPixProfessor] = useState('');
  const [diasHabilitadosAluno, setDiasHabilitadosAluno] = useState<number[]>([]);
  const [showMatriculaModal, setShowMatriculaModal] = useState(false);
  const [matriculaPrecadastro, setMatriculaPrecadastro] = useState<PreCadastro | null>(null);
  const [diasSemana, setDiasSemana] = useState<Array<{ id: number; nome: string }>>([]);
  /** Edição de aluno: até 2 turmas (mesma regra da API / web) */
  const [turmasEdicaoAluno, setTurmasEdicaoAluno] = useState<number[]>([]);
  const [turmasCatalogoEdicao, setTurmasCatalogoEdicao] = useState<Turma[]>([]);

  const [matriculaForm, setMatriculaForm] = useState({
    cpf: '',
    dia_vencimento: '1',
    ja_aluno: false,
    valor_mensalidade: '',
    valor_mensalidade_proporcional: '',
    valor_mensalidade_mes_seguinte: '',
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
  const [ctsFiltroAlunos, setCtsFiltroAlunos] = useState<CentroTreinamento[]>([]);
  const [turmasFiltroCatalogo, setTurmasFiltroCatalogo] = useState<Turma[]>([]);
  const [filtroAlunoCtId, setFiltroAlunoCtId] = useState<number | null>(null);
  const [filtroAlunoTurmaId, setFiltroAlunoTurmaId] = useState<number | null>(null);

  const selecionarCtFiltroAlunos = (ctId: number | null) => {
    setFiltroAlunoCtId(ctId);
    setFiltroAlunoTurmaId(null);
  };

  useEffect(() => {
    if (activeTab !== 'alunos') {
      setFiltroAlunoCtId(null);
      setFiltroAlunoTurmaId(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (user?.tipo !== 'gerente' || activeTab !== 'alunos') return;
    let cancelled = false;
    (async () => {
      try {
        const [ctsRaw, turmasRes] = await Promise.all([
          ctService.listarCTs(),
          turmaService.getTurmas({ page_size: 500 }),
        ]);
        const ctsArr = Array.isArray(ctsRaw) ? ctsRaw : (ctsRaw as { results?: CentroTreinamento[] })?.results || [];
        const turmasArr = Array.isArray(turmasRes) ? turmasRes : (turmasRes as { results?: Turma[] })?.results || [];
        if (cancelled) return;
        setCtsFiltroAlunos(
          [...ctsArr].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
        );
        setTurmasFiltroCatalogo(turmasArr);
      } catch {
        if (!cancelled) {
          setCtsFiltroAlunos([]);
          setTurmasFiltroCatalogo([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, user?.tipo]);

  useEffect(() => {
    if (user?.tipo === 'gerente') {
      fetchUsers();
    }
  }, [activeTab, user, filtroStatusPrecadastro]);

  useEffect(() => {
    if (!showForm) return;
    const id = requestAnimationFrame(() => {
      formModalScrollRef.current?.scrollTo({ y: 0, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [showForm]);

  useEffect(() => {
    if (!showMatriculaModal) return;
    const id = requestAnimationFrame(() => {
      matriculaModalScrollRef.current?.scrollTo({ y: 0, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [showMatriculaModal]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      if (activeTab === 'precadastros') {
        const data = await usuarioService.listarPrecadastros(
          filtroStatusPrecadastro ? { status: filtroStatusPrecadastro } : undefined
        );
        setPrecadastros(sortPreCadastrosByName(data));
        setUsers([]);
      } else {
        const tipo = activeTab === 'alunos' ? 'aluno' : activeTab === 'professores' ? 'professor' : 'gerente';
        const response = await usuarioService.listarUsuarios({ tipo });
        const resolved = Array.isArray(response) ? response : response.results || response.data || [];
        setUsers(sortUsersByName(resolved));
        setPrecadastros([]);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  const turmasDoCtFiltro = useMemo(() => {
    if (filtroAlunoCtId == null) return [];
    return turmasFiltroCatalogo
      .filter((t) => Number(t.ct) === Number(filtroAlunoCtId))
      .sort((a, b) => {
        const c = (a.horario || '').localeCompare(b.horario || '', 'pt-BR');
        if (c !== 0) return c;
        return (a.id || 0) - (b.id || 0);
      });
  }, [filtroAlunoCtId, turmasFiltroCatalogo]);

  const usuariosListaExibicao = useMemo(() => {
    if (activeTab !== 'alunos') return users;
    let list = users;
    if (filtroAlunoCtId != null) {
      const idsTurmasNoCt = new Set(
        turmasFiltroCatalogo
          .filter((t) => Number(t.ct) === Number(filtroAlunoCtId))
          .map((t) => t.id)
          .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id))
      );
      list = list.filter((u) => (u.turmas || []).some((tid) => idsTurmasNoCt.has(tid)));
      if (filtroAlunoTurmaId != null) {
        list = list.filter((u) => (u.turmas || []).includes(filtroAlunoTurmaId));
      }
    }
    return list;
  }, [activeTab, users, filtroAlunoCtId, filtroAlunoTurmaId, turmasFiltroCatalogo]);

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
    });
    setDiaVencimento('');
    setValorMensalidade('');
    setSalarioProfessor('');
    setPixProfessor('');
    setDiasHabilitadosAluno([]);
    setTurmasEdicaoAluno([]);
    setTurmasCatalogoEdicao([]);
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

  const handleToggleTurmaEdicaoAluno = (turmaId: number) => {
    setTurmasEdicaoAluno((prev) => {
      if (prev.includes(turmaId)) {
        return prev.filter((id) => id !== turmaId);
      }
      if (prev.length >= 2) {
        Alert.alert('Limite', 'No máximo duas turmas por aluno.');
        return prev;
      }
      return [...prev, turmaId];
    });
  };

  const handleEditUser = async (target: User | PreCadastro) => {
    setEditingUser(target);
    setFormData({
      first_name: (target as any).first_name || '',
      last_name: (target as any).last_name || '',
      cpf: formatarCpfMascara((target as any).cpf || ''),
      email: (target as any).email || '',
      telefone: (target as any).telefone || '',
      endereco: (target as any).endereco || '',
      data_nascimento: isoParaBrDisplay((target as any).data_nascimento) || (target as any).data_nascimento || '',
      nome_responsavel: (target as any).nome_responsavel || '',
      telefone_responsavel: (target as any).telefone_responsavel || '',
      telefone_emergencia: (target as any).telefone_emergencia || '',
    });

    const isAlunoNaAbaAlunos = activeTab === 'alunos' && (target as User).tipo === 'aluno';

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

    if (isAlunoNaAbaAlunos) {
      try {
        const turmasData = await turmaService.getTurmas();
        setTurmasCatalogoEdicao(Array.isArray(turmasData) ? turmasData : []);
        const u = target as User;
        let ids: number[] = [];
        if (Array.isArray(u.turmas) && u.turmas.length) {
          ids = u.turmas
            .map((x) => Number(x))
            .filter((n) => !Number.isNaN(n))
            .slice(0, 2);
        } else if (u.turmas_vinculadas?.length) {
          ids = u.turmas_vinculadas.map((t) => t.id).slice(0, 2);
        }
        setTurmasEdicaoAluno(ids);
      } catch {
        setTurmasCatalogoEdicao([]);
        setTurmasEdicaoAluno([]);
        Alert.alert('Aviso', 'Não foi possível carregar a lista de turmas.');
      }
    } else {
      setTurmasEdicaoAluno([]);
      setTurmasCatalogoEdicao([]);
    }

    setShowForm(true);
  };

  const buildPayload = () => {
    const cpfDigits = apenasDigitosCpf(formData.cpf);
    const payload: any = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      cpf: activeTab === 'precadastros' ? (cpfDigits.length > 0 ? cpfDigits : null) : cpfDigits,
      email: formData.email.trim(),
      telefone:
        activeTab === 'precadastros'
          ? normalizarTelefoneBrParaApi(formData.telefone)
          : formData.telefone,
      endereco: formData.endereco,
      data_nascimento: normalizarDataNascimentoParaApi(formData.data_nascimento),
    };

    if (activeTab !== 'precadastros') {
      payload.tipo = activeTab === 'alunos' ? 'aluno' : activeTab === 'professores' ? 'professor' : 'gerente';
      payload.username = cpfDigits;
    } else {
      payload.origem = editingUser
        ? (editingUser as PreCadastro).origem || 'formulario'
        : 'formulario';
    }

    if (payload.tipo === 'aluno') {
      payload.nome_responsavel = formData.nome_responsavel;
      payload.telefone_responsavel = formData.telefone_responsavel;
      payload.telefone_emergencia = formData.telefone_emergencia;
      payload.dias_habilitados = diasHabilitadosAluno;
      if (diaVencimento) payload.dia_vencimento = Number(diaVencimento);
      if (valorMensalidade) payload.valor_mensalidade = Number(valorMensalidade);
      if (editingUser && activeTab === 'alunos') {
        payload.turmas = turmasEdicaoAluno.slice(0, 2);
      }
    }

    if (payload.tipo === 'professor') {
      const sal = parseDecimalBrasil(salarioProfessor);
      if (sal !== undefined) payload.salario_professor = sal;
      if (pixProfessor?.trim()) payload.pix_professor = pixProfessor.trim();
    }

    return payload;
  };

  const handleSave = async () => {
    const cpfDigits = apenasDigitosCpf(formData.cpf);
    if (activeTab === 'precadastros') {
      if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
        Alert.alert('Validação', MSG_CPF_11_DIGITOS);
        return;
      }
      if (!telefoneBrValido(formData.telefone)) {
        Alert.alert(
          'Validação',
          'Informe o telefone com DDD (10 ou 11 dígitos). Pode colar com +55; o sistema ajusta automaticamente.'
        );
        return;
      }
    } else if (cpfDigits.length !== 11) {
      Alert.alert('Validação', MSG_CPF_11_DIGITOS);
      return;
    }

    if (activeTab !== 'precadastros' && (activeTab === 'professores' || activeTab === 'gerentes')) {
      if (!formData.first_name?.trim()) {
        Alert.alert('Validação', 'Informe o nome.');
        return;
      }
      if (!formData.email?.trim()) {
        Alert.alert('Validação', 'Informe o e-mail (necessário para o convite de acesso).');
        return;
      }
    }

    if (activeTab === 'professores' && salarioProfessor.trim()) {
      if (parseDecimalBrasil(salarioProfessor) === undefined) {
        Alert.alert('Validação', 'Informe um salário válido (ex.: 3500 ou 3.500,00).');
        return;
      }
    }

    if (formData.data_nascimento.trim()) {
      const isoDn = normalizarDataNascimentoParaApi(formData.data_nascimento);
      if (!isoDn) {
        Alert.alert('Validação', 'Informe a data de nascimento completa e válida (DD/MM/AAAA).');
        return;
      }
      if (activeTab === 'alunos') {
        const id = calcularIdade(isoDn);
        if (id !== null && id < 18) {
          if (!formData.nome_responsavel?.trim() || !formData.telefone_responsavel?.trim()) {
            Alert.alert('Validação', 'Para menores de 18 anos, informe nome e telefone do responsável.');
            return;
          }
        }
        if (id !== null && id >= 18 && !formData.telefone_emergencia?.trim()) {
          Alert.alert('Validação', 'Informe o telefone de emergência.');
          return;
        }
      }
    }

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
      Alert.alert('Erro', formatarErroApi(error));
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
        Alert.alert('Erro', formatarErroApi(error));
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
        cpf: formatarCpfMascara(precadastro.cpf || ''),
        dia_vencimento: '1',
        ja_aluno: false,
        valor_mensalidade: '',
        valor_mensalidade_proporcional: '',
        valor_mensalidade_mes_seguinte: '',
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
    const cpfDigitosForm = apenasDigitosCpf(matriculaForm.cpf);
    const cpfPrecadastro = apenasDigitosCpf(matriculaPrecadastro.cpf);
    const cpfFinalMatricula = cpfDigitosForm.length > 0 ? cpfDigitosForm : cpfPrecadastro;
    if (cpfFinalMatricula.length !== 11) {
      Alert.alert('Atenção', MSG_CPF_MATRICULA);
      return;
    }
    if (!matriculaForm.ja_aluno) {
      const vMesSeg = Number(matriculaForm.valor_mensalidade_mes_seguinte);
      if (!matriculaForm.valor_mensalidade_mes_seguinte || Number.isNaN(vMesSeg) || vMesSeg <= 0) {
        Alert.alert('Atenção', 'Informe a mensalidade do mês seguinte (valor cheio).');
        return;
      }
      const vProp = Number(matriculaForm.valor_mensalidade_proporcional || 0);
      if (matriculaForm.valor_mensalidade_proporcional && Number.isNaN(vProp)) {
        Alert.alert('Atenção', 'Mensalidade proporcional inválida (use 0 se não houver).');
        return;
      }
      if (vProp < 0) {
        Alert.alert('Atenção', 'A mensalidade proporcional não pode ser negativa.');
        return;
      }
    } else {
      const valorMensalidade = Number(matriculaForm.valor_mensalidade);
      if (!matriculaForm.valor_mensalidade || Number.isNaN(valorMensalidade) || valorMensalidade <= 0) {
        Alert.alert('Atenção', 'Informe o valor da mensalidade.');
        return;
      }
    }
    if (!matriculaForm.ja_aluno) {
      const vProp = Number(matriculaForm.valor_mensalidade_proporcional || 0);
      const vMat = Number(matriculaForm.valor_matricula || 0);
      const vUnif = Number(matriculaForm.valor_uniforme || 0);
      const total = vProp + vMat + vUnif;
      if (Number.isNaN(total) || total <= 0) {
        Alert.alert('Atenção', 'Matrícula + uniforme + proporcional deve ser maior que zero.');
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
        cpf: cpfFinalMatricula,
        dia_vencimento: Number(matriculaForm.dia_vencimento),
        ja_aluno: matriculaForm.ja_aluno,
        dias_habilitados: matriculaForm.dias_habilitados,
      };
      if (!matriculaForm.ja_aluno) {
        payload.valor_mensalidade_proporcional = round2(matriculaForm.valor_mensalidade_proporcional || 0);
        payload.valor_mensalidade_mes_seguinte = round2(matriculaForm.valor_mensalidade_mes_seguinte);
        payload.valor_matricula = round2(matriculaForm.valor_matricula);
        payload.valor_uniforme = round2(matriculaForm.valor_uniforme);
        payload.dia_vencimento_primeira = Number(matriculaForm.dia_vencimento_primeira);
      } else {
        payload.valor_mensalidade = round2(matriculaForm.valor_mensalidade);
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
    return wrap(<Text style={styles.noData}>Acesso negado.</Text>);
  }

  const isoDnForm = normalizarDataNascimentoParaApi(formData.data_nascimento);
  const idadeAluno = activeTab === 'alunos' && isoDnForm ? calcularIdade(isoDnForm) : null;
  const dataNascimentoInvalida =
    !!formData.data_nascimento.trim() &&
    formData.data_nascimento.replace(/\D/g, '').length === 8 &&
    !isoDnForm;

  return wrap(
    <>
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
          {activeTab !== 'alunos' && (
            <TouchableOpacity style={styles.addButton} onPress={handleNewUser}>
              <Text style={styles.addButtonText}>+ Novo</Text>
            </TouchableOpacity>
          )}
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

        {activeTab === 'alunos' && (
          <>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>CT:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, filtroAlunoCtId === null && styles.filterChipActive]}
                  onPress={() => selecionarCtFiltroAlunos(null)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filtroAlunoCtId === null && styles.filterChipTextActive,
                    ]}
                  >
                    Todos
                  </Text>
                </TouchableOpacity>
                {ctsFiltroAlunos.map((ct) => {
                  const id = ct.id;
                  if (id == null) return null;
                  const ativo = filtroAlunoCtId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.filterChip, ativo && styles.filterChipActive]}
                      onPress={() => selecionarCtFiltroAlunos(id)}
                    >
                      <Text
                        style={[styles.filterChipText, ativo && styles.filterChipTextActive]}
                        numberOfLines={1}
                      >
                        {ct.nome}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            {filtroAlunoCtId != null && (
              <View style={[styles.filterRow, styles.filterRowTight]}>
                <Text style={styles.filterLabel}>Turma:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  <TouchableOpacity
                    style={[styles.filterChip, filtroAlunoTurmaId === null && styles.filterChipActive]}
                    onPress={() => setFiltroAlunoTurmaId(null)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filtroAlunoTurmaId === null && styles.filterChipTextActive,
                      ]}
                    >
                      Todas
                    </Text>
                  </TouchableOpacity>
                  {turmasDoCtFiltro.map((t) => {
                    const tid = t.id;
                    if (tid == null) return null;
                    const ativo = filtroAlunoTurmaId === tid;
                    return (
                      <TouchableOpacity
                        key={tid}
                        style={[styles.filterChip, ativo && styles.filterChipActive]}
                        onPress={() => setFiltroAlunoTurmaId(tid)}
                      >
                        <Text
                          style={[styles.filterChipText, ativo && styles.filterChipTextActive]}
                          numberOfLines={1}
                        >
                          Turma {tid} · {t.horario || '-'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
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
                      <Text style={[styles.cardTitle, { color: colors.primary, textDecorationLine: 'underline' }]}>
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
              (activeTab === 'alunos' ? usuariosListaExibicao : users).length === 0 ? (
                <Text style={styles.noData}>
                  {activeTab === 'alunos' && filtroAlunoCtId != null
                    ? 'Nenhum aluno encontrado para este CT/turma.'
                    : 'Nenhum usuário encontrado.'}
                </Text>
              ) : (
                (activeTab === 'alunos' ? usuariosListaExibicao : users).map((item) => (
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
        <View style={[styles.modalOverlay, { paddingTop: insets.top + 8 }]}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingUser ? 'Editar registro' : 'Novo registro'}
            </Text>
            <ScrollView
              ref={formModalScrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
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
                onChangeText={(value) =>
                  setFormData(prev => ({ ...prev, cpf: formatarCpfMascara(value) }))
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(value) => setFormData(prev => ({ ...prev, email: value }))}
              />
              {(activeTab === 'alunos' || activeTab === 'precadastros') && (
                <Text style={styles.hintEmail}>
                  Menores podem usar o mesmo e-mail do responsável ou de irmãos. Maiores de idade: e-mail único.
                </Text>
              )}
              <TextInput
                style={styles.input}
                placeholder={
                  activeTab === 'precadastros'
                    ? 'Telefone (DDD + número, só números)'
                    : 'Telefone'
                }
                keyboardType="number-pad"
                maxLength={activeTab === 'precadastros' ? 15 : undefined}
                value={formData.telefone}
                onChangeText={(value) =>
                  setFormData(prev => ({
                    ...prev,
                    telefone:
                      activeTab === 'precadastros'
                        ? formatarTelefoneSoDigitos(value)
                        : value,
                  }))
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Endereço"
                value={formData.endereco}
                onChangeText={(value) => setFormData(prev => ({ ...prev, endereco: value }))}
              />
              <Text style={styles.fieldLabel}>Data de nascimento</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                keyboardType="number-pad"
                maxLength={10}
                value={formData.data_nascimento}
                onChangeText={(value) =>
                  setFormData(prev => ({ ...prev, data_nascimento: formatarDataBrMascara(value) }))
                }
              />
              {!!formData.data_nascimento.trim() && (
                <>
                  {dataNascimentoInvalida ? (
                    <Text style={styles.hintError}>Data inválida. Use uma data real (DD/MM/AAAA).</Text>
                  ) : activeTab === 'alunos' && idadeAluno !== null ? (
                    <Text style={styles.hintIdade}>
                      {idadeAluno < 18
                        ? `Menor de idade (${idadeAluno} anos) — informe dados do responsável abaixo.`
                        : `Maior de idade (${idadeAluno} anos) — informe telefone de emergência abaixo.`}
                    </Text>
                  ) : null}
                </>
              )}

              {activeTab === 'alunos' && (
                <>
                  {idadeAluno !== null && idadeAluno < 18 ? (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Nome do responsável *"
                        value={formData.nome_responsavel}
                        onChangeText={(value) => setFormData(prev => ({ ...prev, nome_responsavel: value }))}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Telefone do responsável *"
                        value={formData.telefone_responsavel}
                        onChangeText={(value) => setFormData(prev => ({ ...prev, telefone_responsavel: value }))}
                      />
                    </>
                  ) : idadeAluno !== null && idadeAluno >= 18 ? (
                    <TextInput
                      style={styles.input}
                      placeholder="Telefone de emergência *"
                      value={formData.telefone_emergencia}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, telefone_emergencia: value }))}
                    />
                  ) : null}
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
                  {editingUser && (
                    <>
                      <Text style={styles.sectionTitle}>Turmas vinculadas (até 2)</Text>
                      <Text style={styles.matriculaHint}>
                        Toque para marcar ou desmarcar. É necessário dia em comum entre os dias habilitados do aluno e os
                        dias de cada turma. Nenhuma turma selecionada remove os vínculos.
                      </Text>
                      {turmasCatalogoEdicao.filter((t) => t.ativo !== false).length === 0 ? (
                        <Text style={styles.noData}>Nenhuma turma disponível.</Text>
                      ) : (
                        turmasCatalogoEdicao
                          .filter((t) => t.ativo !== false)
                          .map((turma) => {
                            const tid = turma.id as number;
                            const sel = turmasEdicaoAluno.includes(tid);
                            return (
                              <TouchableOpacity
                                key={tid}
                                style={[styles.dayItem, sel && styles.turmaItemSelected]}
                                onPress={() => handleToggleTurmaEdicaoAluno(tid)}
                              >
                                <Text style={[styles.dayText, sel && styles.turmaItemTextSelected]}>
                                  {turma.ct_nome || 'CT'} — {(turma.dias_semana_nomes || []).join(', ')} às{' '}
                                  {turma.horario || ''}
                                </Text>
                                <Text style={[styles.daySelected, sel && styles.turmaItemTextSelected]}>
                                  {sel ? '✓' : ''}
                                </Text>
                              </TouchableOpacity>
                            );
                          })
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
        <View style={[styles.modalOverlay, { paddingTop: insets.top + 8 }]}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Matricular pré-cadastro</Text>
            <ScrollView
              ref={matriculaModalScrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
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

              <Text style={styles.sectionTitle}>CPF *</Text>
              <Text style={styles.matriculaHint}>
                {matriculaPrecadastro?.cpf
                  ? 'Confira o CPF. Em reingresso (já é aluno), deve ser o mesmo do cadastro do aluno no sistema.'
                  : 'Informe o CPF do aluno. Obrigatório para criar o cadastro ou vincular a um ex-aluno já existente.'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="000.000.000-00"
                keyboardType="number-pad"
                maxLength={14}
                value={matriculaForm.cpf}
                onChangeText={(value) =>
                  setMatriculaForm(prev => ({ ...prev, cpf: formatarCpfMascara(value) }))
                }
              />
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
                  onValueChange={(value) =>
                    setMatriculaForm((prev) => ({
                      ...prev,
                      ja_aluno: value,
                      dias_habilitados: [],
                      ...(value
                        ? {
                            valor_mensalidade_proporcional: '',
                            valor_mensalidade_mes_seguinte: '',
                          }
                        : { valor_mensalidade: '' }),
                    }))
                  }
                />
              </View>
              {matriculaForm.ja_aluno ? (
                <>
                  <Text style={styles.sectionTitle}>Valores (recredenciamento)</Text>
                  <Text style={styles.fieldLabel}>Mensalidade mensal (R$) *</Text>
                  <Text style={styles.matriculaHint}>
                    Valor cheio que o aluno pagará todo mês a partir do cadastro. Use ponto ou vírgula (ex.: 180 ou 180,50).
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 180,00"
                    keyboardType="decimal-pad"
                    value={matriculaForm.valor_mensalidade}
                    onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, valor_mensalidade: value }))}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Valores da 1ª entrada e mensalidades</Text>
                  <Text style={styles.fieldLabel}>Taxa de matrícula (R$)</Text>
                  <Text style={styles.matriculaHint}>Cobrança única referente à matrícula.</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 80,00"
                    keyboardType="decimal-pad"
                    value={matriculaForm.valor_matricula}
                    onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, valor_matricula: value }))}
                  />
                  <Text style={styles.fieldLabel}>Uniforme (R$)</Text>
                  <Text style={styles.matriculaHint}>Valor único do uniforme, se houver.</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 0 ou 120,00"
                    keyboardType="decimal-pad"
                    value={matriculaForm.valor_uniforme}
                    onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, valor_uniforme: value }))}
                  />
                  <Text style={styles.fieldLabel}>Mensalidade proporcional (R$)</Text>
                  <Text style={styles.matriculaHint}>
                    Parte do mês corrente na primeira cobrança (soma com matrícula + uniforme). Deixe vazio ou 0 se não houver.
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 75,00"
                    keyboardType="decimal-pad"
                    value={matriculaForm.valor_mensalidade_proporcional}
                    onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, valor_mensalidade_proporcional: value }))}
                  />
                  <Text style={styles.fieldLabel}>Mensalidade cheia — meses seguintes (R$) *</Text>
                  <Text style={styles.matriculaHint}>
                    Valor cheio que o aluno pagará nos meses seguintes (gravado no cadastro).
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 180,00"
                    keyboardType="decimal-pad"
                    value={matriculaForm.valor_mensalidade_mes_seguinte}
                    onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, valor_mensalidade_mes_seguinte: value }))}
                  />
                  <Text style={styles.sectionTitle}>
                    Total da 1ª cobrança (matrícula + uniforme + proporcional): R${' '}
                    {(Math.round((Number(matriculaForm.valor_matricula || 0) + Number(matriculaForm.valor_uniforme || 0) + Number(matriculaForm.valor_mensalidade_proporcional || 0)) * 100) / 100).toFixed(2)}
                  </Text>
                  {!matriculaForm.criar_primeira_mensalidade_agora && (
                    <>
                      <Text style={styles.fieldLabel}>Dia de vencimento da 1ª mensalidade (1-31) *</Text>
                      <Text style={styles.matriculaHint}>
                        Dia do mês em que vence a primeira cobrança (quando não enviar PIX/boleto por e-mail agora).
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: 10"
                        keyboardType="number-pad"
                        value={matriculaForm.dia_vencimento_primeira}
                        onChangeText={(value) => setMatriculaForm(prev => ({ ...prev, dia_vencimento_primeira: value }))}
                      />
                    </>
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
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
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
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addButtonText: {
    color: colors.onPrimary,
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
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: colors.primary,
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
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  loadingText: {
    marginTop: 8,
    color: colors.textSecondary,
  },
  noData: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '92%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    color: colors.text,
    backgroundColor: '#fff',
  },
  fieldLabel: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
    fontWeight: '600',
  },
  hintIdade: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 10,
    marginTop: -4,
  },
  hintEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
    marginTop: -4,
    lineHeight: 17,
  },
  hintError: {
    fontSize: 12,
    color: '#c62828',
    marginBottom: 10,
    marginTop: -4,
  },
  matriculaHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  planOptionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  planOptionTextSelected: {
    color: colors.onPrimary,
  },
  dayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dayText: {
    color: colors.text,
    fontSize: 12,
  },
  daySelected: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  turmaItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  turmaItemTextSelected: {
    color: colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 12,
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  filterRowTight: {
    marginTop: 4,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  filterScroll: {
    flex: 1,
    maxHeight: 40,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.chipInactive,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
});

export default GerenciarUsuariosScreen;
