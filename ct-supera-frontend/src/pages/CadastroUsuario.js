import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import api, { MEDIA_URL } from '../services/api';
import {
  apenasDigitosCpf,
  formatarCpfMascara,
  MSG_CPF_11_DIGITOS,
  MSG_CPF_MATRICULA,
} from '../utils/cpf';
import { normalizarTelefoneBrParaApi } from '../utils/telefone';

const styles = {
  container: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: {
    color: '#1F6C86',
    margin: 0,
  },
  button: {
    backgroundColor: '#1F6C86',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#151b60',
    },
  },
  tabs: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#f5f5f5',
    cursor: 'pointer',
    fontSize: '1rem',
    minHeight: '44px',
    whiteSpace: 'nowrap',
    '&:hover': {
      backgroundColor: '#e0e0e0',
    },
  },
  activeTab: {
    backgroundColor: '#1F6C86',
    color: 'white',
    '&:hover': {
      backgroundColor: '#1F6C86',
    },
  },
  table: {
    width: '100%',
    minWidth: '900px',
    borderCollapse: 'collapse',
    marginTop: '1rem',
  },
  th: {
    backgroundColor: '#f5f5f5',
    padding: '1rem',
    textAlign: 'left',
    borderBottom: '2px solid #ddd',
    color: '#333',
  },
  td: {
    padding: '1rem',
    borderBottom: '1px solid #ddd',
    color: '#666',
  },
  actionButton: {
    padding: '0.3rem 0.6rem',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    marginRight: '0.5rem',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
  },
  avatar: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
    color: '#555',
    fontSize: '20px',
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  fotoAmpliadaOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    cursor: 'pointer',
  },
  fotoAmpliadaImg: {
    maxWidth: '90vw',
    maxHeight: '90vh',
    objectFit: 'contain',
  },
  editButton: {
    backgroundColor: '#2196f3',
    color: 'white',
    '&:hover': {
      backgroundColor: '#1976d2',
    },
  },
  deleteButton: {
    backgroundColor: '#f44336',
    color: 'white',
    '&:hover': {
      backgroundColor: '#d32f2f',
    },
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
    paddingBottom: '16px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    zIndex: 1000,
    boxSizing: 'border-box',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    width: '500px',
    maxHeight: 'min(92vh, calc(100vh - max(12px, env(safe-area-inset-top, 0px)) - 24px))',
    overflowY: 'auto',
    flexShrink: 0,
  },
  /** Painel flutuante (portal em document.body); posição top/left aplicadas em runtime */
  precadastroTooltip: {
    backgroundColor: 'white',
    padding: '12px 14px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    border: '1px solid #e0e0e0',
    fontSize: '0.85rem',
    color: '#444',
    minWidth: '260px',
    whiteSpace: 'normal',
    lineHeight: 1.5,
  },
  form: {
    display: 'grid',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    color: '#333',
    fontWeight: '500',
  },
  input: {
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '1rem',
  },
  select: {
    padding: '0.75rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    backgroundColor: '#fff',
  },
  error: {
    color: '#d32f2f',
    marginTop: '0.5rem',
  },
  success: {
    color: '#2e7d32',
    marginTop: '0.5rem',
  },
  modalContentWide: {
    width: 'min(92vw, 720px)',
    maxWidth: '720px',
  },
  turmasPickerBox: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    maxHeight: 'min(42vh, 340px)',
    overflowY: 'auto',
    overflowX: 'auto',
    backgroundColor: '#fafafa',
    WebkitOverflowScrolling: 'touch',
  },
  turmasPickerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 12px',
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
  },
  turmasPickerRowLast: {
    borderBottom: 'none',
  },
  turmasPickerText: {
    flex: 1,
    minWidth: '200px',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    lineHeight: 1.45,
    fontSize: '0.95rem',
    color: '#333',
  },
};

function CadastroUsuario({ onUserChange }) {
  const singularEntidadePorTab = (tab) => {
    const map = {
      alunos: 'Aluno',
      professores: 'Professor',
      gerentes: 'Gerente',
      precadastros: 'Pré-cadastro',
    };
    return map[tab] || tab;
  };

  const [activeTab, setActiveTab] = useState('alunos');
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    cpf: '',
    email: '',
    tipo: 'aluno',
    telefone: '',
    endereco: '',
    data_nascimento: '',
    telefone_responsavel: '',
    telefone_emergencia: '',
    nome_responsavel: '',
    ficha_medica: '',
    turma: '',
    turmas: [],
    origem: 'formulario',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  // const [mensalidade, setMensalidade] = useState(null);
  // const [valorMensalidade, setValorMensalidade] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('');
  const [valorMensalidadeNovo, setValorMensalidadeNovo] = useState('');
  const [salarioProfessor, setSalarioProfessor] = useState('');
  const [pixProfessor, setPixProfessor] = useState('');
  const [diasHabilitadosAluno, setDiasHabilitadosAluno] = useState([]);
  const [centrosTreinamento, setCentrosTreinamento] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [diasSemana, setDiasSemana] = useState([]);
  const [filtroCtSelecionado, setFiltroCtSelecionado] = useState('');
  const [filtroBuscaNomeAluno, setFiltroBuscaNomeAluno] = useState('');
  const [filtroTurmaSelecionada, setFiltroTurmaSelecionada] = useState('');
  const [filtroOrigemPrecadastro, setFiltroOrigemPrecadastro] = useState('');
  const [filtroStatusPrecadastro, setFiltroStatusPrecadastro] = useState('');
  const [paginaAlunos, setPaginaAlunos] = useState(1);
  const [fotoAmpliadaUrl, setFotoAmpliadaUrl] = useState(null);
  const fotoAmpliadaHoverTimerRef = useRef(null);
  const [showParqModal, setShowParqModal] = useState(false);
  const [selectedParqUser, setSelectedParqUser] = useState(null);
  const [parqActionLoading, setParqActionLoading] = useState(false);
  const [selectedUserInfo, setSelectedUserInfo] = useState(null);
  const [selectedPrecadastroInfo, setSelectedPrecadastroInfo] = useState(null);
  const [userTooltipAnchor, setUserTooltipAnchor] = useState(null);
  const [precadastroTooltipAnchor, setPrecadastroTooltipAnchor] = useState(null);
  const [showMatriculaModal, setShowMatriculaModal] = useState(false);
  const [matriculaPrecadastro, setMatriculaPrecadastro] = useState(null);
  const [matriculaLoading, setMatriculaLoading] = useState(false);
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
    dias_habilitados: [],
    turma: '',
    criar_primeira_mensalidade_agora: false,
    forma_pagamento: '',
  });

  const usuarioModalOverlayRef = useRef(null);
  const usuarioModalContentRef = useRef(null);
  const matriculaModalOverlayRef = useRef(null);
  const matriculaModalContentRef = useRef(null);
  const parqModalOverlayRef = useRef(null);
  const parqModalContentRef = useRef(null);
  /** Evita fechar o tooltip no mesmo gesto que abre (mobile: click fantasma no document). */
  const tooltipOpenedAtRef = useRef(0);
  /** Elemento do nome clicado — reposiciona o painel em scroll e mede após layout. */
  const nameTooltipTriggerRef = useRef(null);

  // Defina fetchUsers usando useCallback
  const fetchAllPages = async (initialUrl) => {
    let resultados = [];
    let nextUrl = initialUrl;
    while (nextUrl) {
      const response = await api.get(nextUrl);
      const data = response.data;
      if (data && data.results) {
        resultados = resultados.concat(data.results);
        nextUrl = data.next ? data.next.replace(api.defaults.baseURL, '') : null;
      } else {
        resultados = data;
        nextUrl = null;
      }
    }
    return resultados;
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('[DEBUG] Iniciando busca de usuários...');
      console.log('[DEBUG] Tab ativa:', activeTab);

      if (activeTab === 'precadastros') {
        console.log('[DEBUG] Buscando pré-cadastros...');
        let url = 'usuarios/precadastros/';
        const params = [];
        if (filtroStatusPrecadastro) params.push(`status=${encodeURIComponent(filtroStatusPrecadastro)}`);
        if (filtroOrigemPrecadastro) params.push(`origem=${encodeURIComponent(filtroOrigemPrecadastro)}`);
        if (params.length) url += `?${params.join('&')}`;
        const resultados = await fetchAllPages(url);
        console.log('[DEBUG] Total pré-cadastros:', Array.isArray(resultados) ? resultados.length : 0);
        setUsers(resultados);
      } else {
        console.log('[DEBUG] Buscando usuários...');
        const tipoMap = {
          'alunos': 'aluno',
          'professores': 'professor',
          'gerentes': 'gerente'
        };
        const tipoEsperado = tipoMap[activeTab];
        console.log('[DEBUG] Tipo esperado:', tipoEsperado);

        let url = `usuarios/?tipo=${tipoEsperado}`;
        if (activeTab === 'alunos' && filtroTurmaSelecionada) {
          url += `&turma=${filtroTurmaSelecionada}`;
        }
        const resultados = await fetchAllPages(url);
        console.log('[DEBUG] Total usuários:', Array.isArray(resultados) ? resultados.length : 0);
        if (Array.isArray(resultados)) {
          setUsers(resultados);
        } else {
          console.error('[DEBUG] Formato de resposta inválido:', resultados);
          setError('Formato de resposta inválido do servidor');
        }
      }
    } catch (error) {
      console.error('[DEBUG] Erro detalhado ao carregar usuários:', error);
      console.error('[DEBUG] Resposta do servidor:', error.response?.data);
      console.error('[DEBUG] Status do erro:', error.response?.status);
      setError(error.response?.data?.error || 'Erro ao carregar usuários. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filtroTurmaSelecionada, filtroStatusPrecadastro, filtroOrigemPrecadastro]);

  // useEffect depende de fetchUsers e activeTab
  useEffect(() => {
    console.log('[DEBUG] useEffect disparado, tab:', activeTab);
    fetchUsers();
  }, [fetchUsers, activeTab]);

  // Buscar centros de treinamento para o filtro
  useEffect(() => {
    const fetchCentros = async () => {
      try {
        const response = await api.get('cts/');
        const data = response.data;
        // API pode retornar array direto ou { results: [...] } se paginado
        const centros = Array.isArray(data) ? data : (data?.results || []);
        setCentrosTreinamento(centros);
      } catch (error) {
        console.error('[DEBUG] Erro ao carregar centros de treinamento:', error);
        setCentrosTreinamento([]);
      }
    };
    fetchCentros();
  }, []);

  // Buscar turmas (usado em filtro de alunos, matrícula e pré-cadastro)
  useEffect(() => {
    if (activeTab !== 'alunos' && activeTab !== 'precadastros') return;
    const fetchTurmas = async () => {
      try {
        const turmasData = await fetchAllPages('turmas/');
        setTurmas(Array.isArray(turmasData) ? turmasData : []);
      } catch (error) {
        console.error('[DEBUG] Erro ao carregar turmas:', error);
        setTurmas([]);
      }
    };
    fetchTurmas();
  }, [activeTab]);

  // Buscar dias da semana para matrícula
  useEffect(() => {
    const fetchDiasSemana = async () => {
      try {
        const response = await api.get('turmas/diassemana/');
        const dias = Array.isArray(response.data) ? response.data : [];
        setDiasSemana(dias);
      } catch (error) {
        console.error('[DEBUG] Erro ao carregar dias da semana:', error);
        setDiasSemana([]);
      }
    };
    fetchDiasSemana();
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const id = requestAnimationFrame(() => {
      if (usuarioModalOverlayRef.current) {
        usuarioModalOverlayRef.current.scrollTop = 0;
      }
      if (usuarioModalContentRef.current) {
        usuarioModalContentRef.current.scrollTop = 0;
      }
    });
    return () => cancelAnimationFrame(id);
  }, [showModal]);

  useEffect(() => {
    if (!showMatriculaModal) return;
    const id = requestAnimationFrame(() => {
      if (matriculaModalOverlayRef.current) {
        matriculaModalOverlayRef.current.scrollTop = 0;
      }
      if (matriculaModalContentRef.current) {
        matriculaModalContentRef.current.scrollTop = 0;
      }
    });
    return () => cancelAnimationFrame(id);
  }, [showMatriculaModal]);

  useEffect(() => {
    if (!showParqModal) return;
    const id = requestAnimationFrame(() => {
      if (parqModalOverlayRef.current) {
        parqModalOverlayRef.current.scrollTop = 0;
      }
      if (parqModalContentRef.current) {
        parqModalContentRef.current.scrollTop = 0;
      }
    });
    return () => cancelAnimationFrame(id);
  }, [showParqModal]);

  const calcularIdade = (dataNascimento) => {
    if (!dataNascimento) return null;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNascimento = nascimento.getMonth();
    
    if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    
    return idade;
  };

  const formatarTelefone = (telefone) => {
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.length === 11) {
      return `(${numeros.slice(0, 2)})${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    }
    return telefone;
  };

  // Função para formatar data e hora do preenchimento do Par-Q
  const formatParqDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFotoUrl = (foto) => {
    if (!foto) return '';
    if (foto.startsWith('http://') || foto.startsWith('https://')) {
      return foto;
    }
    const base = MEDIA_URL.endsWith('/') ? MEDIA_URL.slice(0, -1) : MEDIA_URL;
    const path = foto.startsWith('/') ? foto : `/${foto}`;
    return `${base}${path}`;
  };

  const getInitials = (first, last) => {
    const f = (first || '').trim();
    const l = (last || '').trim();
    const initials = `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
    return initials || 'A';
  };

  const formatValor = (valor) => {
    if (valor === null || valor === undefined || valor === '') return 'Não definido';
    const numero = Number(valor);
    if (Number.isNaN(numero)) return String(valor);
    return `R$ ${numero.toFixed(2).replace('.', ',')}`;
  };

  const computeTooltipAnchor = useCallback((rect) => {
    const margin = 8;
    const gap = 6;
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const viewH = vv ? vv.height : window.innerHeight;
    const viewW = vv ? vv.width : window.innerWidth;
    const maxW = Math.min(300, viewW - 2 * margin);
    const preferredMaxH = 340;
    const minPanelH = 96;
    /** Só abre por cima se não houver espaço mínimo abaixo — evita alternar acima/abaixo conforme o comprimento do nome. */
    const minBelowToOpenUnder = 100;

    // Horizontal padronizado: alinhar à esquerda do nome; se ultrapassar a viewport, encostar à direita do ecrã (igual para todos).
    let left = rect.left;
    const leftMax = Math.max(margin, viewW - maxW - margin);
    if (left > leftMax) left = leftMax;
    if (left < margin) left = margin;

    const belowStart = rect.bottom + gap;
    const spaceBelow = Math.max(0, viewH - belowStart - margin);
    const spaceAbove = Math.max(0, rect.top - margin);

    let top;
    let maxHeight;

    const openBelow = spaceBelow >= minBelowToOpenUnder;

    if (openBelow) {
      top = belowStart;
      maxHeight = Math.min(preferredMaxH, Math.max(minPanelH, spaceBelow));
    } else {
      maxHeight = Math.min(preferredMaxH, Math.max(minPanelH, spaceAbove - gap));
      top = rect.top - gap - maxHeight;
      if (top < margin) {
        maxHeight = Math.max(minPanelH, rect.top - margin - gap);
        top = margin;
      }
    }

    return { top, left, maxWidth: maxW, maxHeight };
  }, []);

  const handleToggleUserInfo = (e, user) => {
    e.stopPropagation();
    if (selectedUserInfo?.id === user.id) {
      nameTooltipTriggerRef.current = null;
      setSelectedUserInfo(null);
      setUserTooltipAnchor(null);
      return;
    }
    tooltipOpenedAtRef.current = Date.now();
    setSelectedPrecadastroInfo(null);
    setPrecadastroTooltipAnchor(null);
    nameTooltipTriggerRef.current = e.currentTarget;
    setSelectedUserInfo(user);
  };

  const handleTogglePrecadastroInfo = (e, user) => {
    e.stopPropagation();
    if (selectedPrecadastroInfo?.id === user.id) {
      nameTooltipTriggerRef.current = null;
      setSelectedPrecadastroInfo(null);
      setPrecadastroTooltipAnchor(null);
      return;
    }
    tooltipOpenedAtRef.current = Date.now();
    setSelectedUserInfo(null);
    setUserTooltipAnchor(null);
    nameTooltipTriggerRef.current = e.currentTarget;
    setSelectedPrecadastroInfo(user);
  };

  useLayoutEffect(() => {
    const el = nameTooltipTriggerRef.current;
    if (!el || !el.isConnected) return;
    const pos = computeTooltipAnchor(el.getBoundingClientRect());
    if (selectedUserInfo) {
      setUserTooltipAnchor(pos);
    } else if (selectedPrecadastroInfo) {
      setPrecadastroTooltipAnchor(pos);
    }
  }, [selectedUserInfo, selectedPrecadastroInfo, computeTooltipAnchor]);

  useEffect(() => {
    if (!selectedUserInfo && !selectedPrecadastroInfo) return undefined;

    const reposition = () => {
      const el = nameTooltipTriggerRef.current;
      if (!el || !el.isConnected) return;
      const pos = computeTooltipAnchor(el.getBoundingClientRect());
      if (selectedUserInfo) setUserTooltipAnchor(pos);
      else if (selectedPrecadastroInfo) setPrecadastroTooltipAnchor(pos);
    };

    reposition();
    window.addEventListener('resize', reposition);
    document.addEventListener('scroll', reposition, true);
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (vv) {
      vv.addEventListener('resize', reposition);
      vv.addEventListener('scroll', reposition);
    }
    return () => {
      window.removeEventListener('resize', reposition);
      document.removeEventListener('scroll', reposition, true);
      if (vv) {
        vv.removeEventListener('resize', reposition);
        vv.removeEventListener('scroll', reposition);
      }
    };
  }, [selectedUserInfo, selectedPrecadastroInfo, computeTooltipAnchor]);

  const parqQuestions = [
    {
      field: 'parq_question_1',
      question: 'Algum médico já disse que você possui algum problema de coração ou pressão arterial, e que somente deveria realizar atividade física supervisionado por profissionais de saúde?'
    },
    {
      field: 'parq_question_2',
      question: 'Você sente dores no peito quando pratica atividade física?'
    },
    {
      field: 'parq_question_3',
      question: 'No último mês, você sentiu dores no peito ao praticar atividade física?'
    },
    {
      field: 'parq_question_4',
      question: 'Você apresenta algum desequilíbrio devido à tontura e/ou perda momentânea da consciência?'
    },
    {
      field: 'parq_question_5',
      question: 'Você possui algum problema ósseo ou articular, que pode ser afetado ou agravado pela atividade física?'
    },
    {
      field: 'parq_question_6',
      question: 'Você toma atualmente algum tipo de medicação de uso contínuo?'
    },
    {
      field: 'parq_question_7',
      question: 'Você realiza algum tipo de tratamento médico para pressão arterial ou problemas cardíacos?'
    },
    {
      field: 'parq_question_8',
      question: 'Você realiza algum tratamento médico contínuo, que possa ser afetado ou prejudicado com a atividade física?'
    },
    {
      field: 'parq_question_9',
      question: 'Você já se submeteu a algum tipo de cirurgia, que comprometa de alguma forma a atividade física?'
    },
    {
      field: 'parq_question_10',
      question: 'Sabe de alguma outra razão pela qual a atividade física possa eventualmente comprometer sua saúde?'
    }
  ];

  const handleOpenParqModal = (user) => {
    setSelectedParqUser(user);
    setShowParqModal(true);
  };

  const handleCloseParqModal = () => {
    setShowParqModal(false);
    setSelectedParqUser(null);
  };

  const handleAllowParqEdit = async () => {
    if (!selectedParqUser) return;
    const confirm = window.confirm('Liberar o aluno para alterar o PAR-Q?');
    if (!confirm) return;
    try {
      setParqActionLoading(true);
      await api.patch(`usuarios/${selectedParqUser.id}/`, {
        parq_completed: false,
        parq_completion_date: null
      });
      setSuccess('Aluno liberado para alterar o PAR-Q.');
      setError('');
      await fetchUsers();
      setSelectedParqUser(prev => prev ? {
        ...prev,
        parq_completed: false,
        parq_completion_date: null
      } : prev);
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.detail || 'Erro ao liberar alteração do PAR-Q.';
      setError(Array.isArray(message) ? message[0] : message);
    } finally {
      setParqActionLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let valorFormatado = value;

    if (type === 'radio') {
      valorFormatado = value === 'true';
    } else if (type === 'checkbox') {
      valorFormatado = checked;
    } else if (name === 'telefone' || name === 'telefone_responsavel' || name === 'telefone_emergencia') {
      valorFormatado = formatarTelefone(value);
    } else if (name === 'cpf') {
      valorFormatado = formatarCpfMascara(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: valorFormatado,
    }));
  };

  const handleToggleTurmaAluno = (turmaId) => {
    const idStr = String(turmaId);
    setFormData(prev => {
      const cur = Array.isArray(prev.turmas) ? [...prev.turmas] : [];
      const idx = cur.indexOf(idStr);
      if (idx >= 0) {
        setError('');
        return { ...prev, turmas: cur.filter(x => x !== idStr) };
      }
      if (cur.length >= 2) {
        setError('Selecione no máximo duas turmas.');
        return prev;
      }
      setError('');
      return { ...prev, turmas: [...cur, idStr] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cpfDigitos = apenasDigitosCpf(formData.cpf);
    if (activeTab === 'precadastros') {
      if (cpfDigitos.length > 0 && cpfDigitos.length !== 11) {
        setError(MSG_CPF_11_DIGITOS);
        return;
      }
      const telPrec = normalizarTelefoneBrParaApi(formData.telefone);
      if (telPrec.length !== 10 && telPrec.length !== 11) {
        setError(
          'Pré-cadastro: informe telefone com DDD (10 ou 11 dígitos). Pode colar com +55.'
        );
        return;
      }
    } else if (cpfDigitos.length !== 11) {
      setError(MSG_CPF_11_DIGITOS);
      return;
    }

    // Campos base para todos os tipos
    const dados = {
      username: cpfDigitos,
      cpf: cpfDigitos,
      email: formData.email,
      tipo: formData.tipo,
      first_name: formData.first_name,
      last_name: formData.last_name,
      telefone: formData.telefone,
      endereco: formData.endereco,
      data_nascimento: formData.data_nascimento,
    };

    // Campos específicos para alunos
    if (formData.tipo === 'aluno') {
      if (formData.telefone_responsavel) dados.telefone_responsavel = formData.telefone_responsavel;
      if (formData.telefone_emergencia) dados.telefone_emergencia = formData.telefone_emergencia;
      if (formData.nome_responsavel) dados.nome_responsavel = formData.nome_responsavel;
      if (formData.ficha_medica) dados.ficha_medica = formData.ficha_medica;
      if (diasHabilitadosAluno.length > 0) dados.dias_habilitados = diasHabilitadosAluno;
      if (diaVencimento) dados.dia_vencimento = parseInt(diaVencimento);
      if (valorMensalidadeNovo) dados.valor_mensalidade = parseFloat(valorMensalidadeNovo);
    }

    // Campos específicos para professores
    if (formData.tipo === 'professor') {
      if (salarioProfessor) dados.salario_professor = parseFloat(salarioProfessor);
      if (pixProfessor) dados.pix_professor = pixProfessor;
    }

    if (formData.tipo === 'aluno' && editingUser && activeTab !== 'precadastros') {
      const ids = (formData.turmas || [])
        .map((id) => parseInt(id, 10))
        .filter((n) => !Number.isNaN(n));
      dados.turmas = ids.slice(0, 2);
    }

    console.log('[DEBUG] Dados enviados:', dados);
    console.log('[DEBUG] FormData original:', formData);

    try {
      let response;
      if (activeTab === 'precadastros') {
        const payloadPrecadastro = {
          first_name: formData.first_name,
          last_name: formData.last_name || '',
          email: formData.email,
          telefone: normalizarTelefoneBrParaApi(formData.telefone),
          data_nascimento: formData.data_nascimento,
          cpf: cpfDigitos.length > 0 ? cpfDigitos : null,
          origem: formData.origem || (editingUser && editingUser.origem) || 'formulario',
        };
        const turmaId = formData.turma || (editingUser && editingUser.turma && (typeof editingUser.turma === 'object' ? editingUser.turma.id : editingUser.turma));
        payloadPrecadastro.turma = turmaId ? parseInt(turmaId, 10) : null;
        if (editingUser) {
          response = await api.put(`usuarios/precadastros/${editingUser.id}/`, payloadPrecadastro);
          setSuccess('Pré-cadastro atualizado com sucesso!');
        } else {
          response = await api.post('usuarios/precadastros/', payloadPrecadastro);
          if (response.data && response.data.id) {
            setSuccess('Pré-cadastro criado com sucesso!');
          } else {
            setError('Erro inesperado: resposta sem id.');
            return;
          }
        }
      } else if (editingUser) {
        response = await api.patch(`usuarios/${editingUser.id}/`, dados);
        setSuccess('Usuário atualizado com sucesso!');
      } else {
        response = await api.post('usuarios/', dados);
        const usuarioCriado = response.data;
        if (usuarioCriado && usuarioCriado.id) {
          setSuccess('Usuário cadastrado com sucesso! Um convite de ativação foi enviado para o e-mail informado.');
        } else {
          setError('Erro inesperado: resposta sem id.');
          return;
        }
      }
      setShowModal(false);
      fetchUsers();
      // Atualiza o dashboard se a função foi fornecida
      if (onUserChange) {
        onUserChange();
      }
    } catch (err) {
      console.error('[DEBUG] Erro detalhado:', err.response?.data);
      const data = err.response?.data;
      let errorMessage =
        data?.parq_question_1 || data?.error || data?.detail || 'Erro ao cadastrar usuário.';
      if (data?.cpf) {
        errorMessage = Array.isArray(data.cpf) ? data.cpf[0] : data.cpf;
      }
      setError(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
    }
  };

  const handleEdit = async (user) => {
    setEditingUser(user);
    setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        cpf: formatarCpfMascara(user.cpf || user.username || ''),
        email: user.email || '',
        tipo: user.tipo || 'aluno',
        telefone: user.telefone || '',
        endereco: user.endereco || '',
        data_nascimento: user.data_nascimento || '',
        telefone_responsavel: user.telefone_responsavel || '',
        telefone_emergencia: user.telefone_emergencia || '',
        nome_responsavel: user.nome_responsavel || '',
        ficha_medica: user.ficha_medica || '',
        turma: (() => {
          if (activeTab === 'precadastros') {
            if (user.turma != null && user.turma !== '') {
              return String(typeof user.turma === 'object' ? user.turma.id : user.turma);
            }
            return '';
          }
          return '';
        })(),
        turmas: (() => {
          if (activeTab === 'alunos' && user.tipo === 'aluno') {
            if (Array.isArray(user.turmas) && user.turmas.length) {
              return user.turmas.map((id) => String(id)).slice(0, 2);
            }
            const tv = user.turmas_vinculadas;
            if (Array.isArray(tv) && tv.length > 0) {
              return tv.map((t) => String(t.id)).slice(0, 2);
            }
          }
          return [];
        })(),
        origem: user.origem || 'formulario',
      });
    
    // Carregar campos específicos de professor
    if (user.tipo === 'professor') {
      setSalarioProfessor(user.salario_professor || '');
      setPixProfessor(user.pix_professor || '');
    }

    if (user.tipo === 'aluno') {
      setDiaVencimento(user.dia_vencimento ? String(user.dia_vencimento) : '');
      setValorMensalidadeNovo(user.valor_mensalidade ? String(user.valor_mensalidade) : '');
      setDiasHabilitadosAluno(Array.isArray(user.dias_habilitados) ? user.dias_habilitados : []);
    }
    
    setShowModal(true);

    // Buscar mensalidade se for aluno (comentado temporariamente)
    // if (user.tipo === 'aluno') {
    //   try {
    //     const res = await api.get('financeiro/mensalidades/', { params: { aluno: user.id } });
    //     if (res.data.results && res.data.results.length > 0) {
    //       setMensalidade(res.data.results[0]);
    //       setValorMensalidade(res.data.results[0].valor);
    //     } else {
    //       setMensalidade(null);
    //       setValorMensalidade('');
    //     }
    //   } catch (err) {
    //     setMensalidade(null);
    //     setValorMensalidade('');
    //   }
    // } else {
    //   setMensalidade(null);
    //   setValorMensalidade('');
    // }
  };

  const handleDelete = async (userId) => {
    const confirmMsg = activeTab === 'precadastros'
      ? 'Tem certeza que deseja excluir este pré-cadastro?'
      : 'Tem certeza que deseja excluir este registro?';
    const confirm2Msg = 'Esta ação é irreversível. Confirma a exclusão?';

    if (!window.confirm(confirmMsg)) return;

    if (activeTab === 'precadastros' && !window.confirm(confirm2Msg)) return;

    try {
      if (activeTab === 'alunos') {
        const response = await api.post(`usuarios/reverter-aluno/${userId}/`);
        if (response.data?.message) {
          setSuccess('Aluno movido para pré-cadastro com sucesso!');
          fetchUsers();
        }
      } else if (activeTab === 'precadastros') {
        const response = await api.delete(`usuarios/precadastros/${userId}/`);
        if (response.status === 204) {
          setSuccess('Pré-cadastro excluído com sucesso!');
          fetchUsers();
        }
      } else {
        const response = await api.delete(`usuarios/${userId}/`);
        if (response.status === 204) {
          setSuccess('Usuário excluído com sucesso!');
          fetchUsers();
        }
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao excluir:', error);
      setError(error.response?.data?.error || 'Erro ao excluir. Tente novamente.');
    }
  };

  const handleNewUser = () => {
    setEditingUser(null);
    // setMensalidade(null);
    // setValorMensalidade('');
    
    // Bloqueia criação direta de aluno
    if (activeTab === 'alunos') {
      setError('Crie um pré-cadastro e finalize a matrícula para gerar o aluno.');
      setSuccess('');
      return;
    }

    // Define o tipo baseado na aba ativa
    let tipoUsuario = 'aluno'; // padrão
    if (activeTab === 'professores') {
      tipoUsuario = 'professor';
    } else if (activeTab === 'gerentes') {
      tipoUsuario = 'gerente';
    } else if (activeTab === 'alunos') {
      tipoUsuario = 'aluno';
    }
    
    setFormData({
      first_name: '',
      last_name: '',
      cpf: '',
      email: '',
      tipo: tipoUsuario,
      telefone: '',
      endereco: '',
      data_nascimento: '',
      telefone_responsavel: '',
      telefone_emergencia: '',
      nome_responsavel: '',
      ficha_medica: '',
      turma: '',
      turmas: [],
      origem: activeTab === 'precadastros' ? 'formulario' : undefined,
    });
    
    // Limpar campos específicos
    setSalarioProfessor('');
    setPixProfessor('');
    setDiaVencimento('');
    setValorMensalidadeNovo('');
    setDiasHabilitadosAluno([]);
    
    setShowModal(true);
  };

  const handleConvertPreCadastro = async (precadastroId) => {
    const precadastro = users.find(user => user.id === precadastroId);
    if (!precadastro) {
      setError('Pré-cadastro não encontrado.');
      return;
    }
    setMatriculaPrecadastro(precadastro);
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
      turma: precadastro.turma ? (typeof precadastro.turma === 'object' ? precadastro.turma.id : precadastro.turma) : '',
      criar_primeira_mensalidade_agora: false,
      forma_pagamento: '',
    });
    setError('');
    setSuccess('');
    setShowMatriculaModal(true);
  };

  const handleCloseMatriculaModal = () => {
    if (matriculaLoading) return;
    setShowMatriculaModal(false);
    setMatriculaPrecadastro(null);
  };

  const handleMatriculaChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setMatriculaForm(prev => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }
    if (name === 'cpf') {
      setMatriculaForm(prev => ({
        ...prev,
        cpf: formatarCpfMascara(value),
      }));
      return;
    }
    if (name === 'ja_aluno') {
      const isJaAluno = value === 'true';
      setMatriculaForm(prev => ({
        ...prev,
        ja_aluno: isJaAluno,
        dias_habilitados: [],
        ...(isJaAluno
          ? { valor_mensalidade_proporcional: '', valor_mensalidade_mes_seguinte: '' }
          : { valor_mensalidade: '' }),
      }));
      return;
    }
    setMatriculaForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggleDia = (diaId) => {
    setMatriculaForm(prev => {
      const jaSelecionado = prev.dias_habilitados.includes(diaId);
      if (jaSelecionado) {
        return { ...prev, dias_habilitados: prev.dias_habilitados.filter(id => id !== diaId) };
      }
      return { ...prev, dias_habilitados: [...prev.dias_habilitados, diaId] };
    });
  };

  const handleToggleDiaAluno = (diaId) => {
    setDiasHabilitadosAluno(prev => {
      const jaSelecionado = prev.includes(diaId);
      if (jaSelecionado) return prev.filter(id => id !== diaId);
      return [...prev, diaId];
    });
  };

  const handleConfirmMatricula = async () => {
    if (!matriculaPrecadastro) return;
    const cpfDigitosForm = apenasDigitosCpf(matriculaForm.cpf);
    const cpfPrecadastro = apenasDigitosCpf(matriculaPrecadastro.cpf);
    const cpfFinalMatricula = cpfDigitosForm.length > 0 ? cpfDigitosForm : cpfPrecadastro;
    if (cpfFinalMatricula.length !== 11) {
      setError(MSG_CPF_MATRICULA);
      return;
    }
    if (!matriculaForm.dia_vencimento) {
      setError('Selecione o dia de vencimento.');
      return;
    }
    const diaVen = parseInt(matriculaForm.dia_vencimento, 10);
    if (![1, 5, 10].includes(diaVen)) {
      setError('O dia de vencimento das mensalidades deve ser 1, 5 ou 10.');
      return;
    }
    if (!matriculaForm.ja_aluno) {
      const vMesSeg = parseFloat(matriculaForm.valor_mensalidade_mes_seguinte);
      if (!matriculaForm.valor_mensalidade_mes_seguinte || Number.isNaN(vMesSeg) || vMesSeg <= 0) {
        setError('Informe o valor da mensalidade do mês seguinte (valor cheio das próximas mensalidades).');
        return;
      }
      const vProp = parseFloat(matriculaForm.valor_mensalidade_proporcional || 0);
      if (matriculaForm.valor_mensalidade_proporcional !== '' && matriculaForm.valor_mensalidade_proporcional !== undefined && Number.isNaN(vProp)) {
        setError('Informe um valor válido para a mensalidade proporcional (ou 0).');
        return;
      }
      if (vProp < 0) {
        setError('A mensalidade proporcional não pode ser negativa.');
        return;
      }
    } else {
      const valorMensalidade = parseFloat(matriculaForm.valor_mensalidade);
      if (!matriculaForm.valor_mensalidade || Number.isNaN(valorMensalidade) || valorMensalidade <= 0) {
        setError('Informe o valor da mensalidade.');
        return;
      }
    }
    if (!matriculaForm.ja_aluno) {
      if (!matriculaForm.turma) {
        setError('Selecione uma turma. É obrigatório para registrar a primeira mensalidade no financeiro.');
        return;
      }
      const vProp = parseFloat(matriculaForm.valor_mensalidade_proporcional || 0);
      const vMat = parseFloat(matriculaForm.valor_matricula || 0);
      const vUnif = parseFloat(matriculaForm.valor_uniforme || 0);
      const total = vProp + vMat + vUnif;
      if (Number.isNaN(total) || total <= 0) {
        setError('A soma (matrícula + uniforme + mensalidade proporcional) deve ser maior que zero.');
        return;
      }
      const diaPrimeira = parseInt(matriculaForm.dia_vencimento_primeira, 10);
      if (!matriculaForm.dia_vencimento_primeira || Number.isNaN(diaPrimeira) || diaPrimeira < 1 || diaPrimeira > 31) {
        setError('Informe o dia de vencimento da primeira mensalidade (1 a 31).');
        return;
      }
    }
    if (!matriculaForm.dias_habilitados || matriculaForm.dias_habilitados.length === 0) {
      setError('Selecione pelo menos um dia habilitado para treino.');
      return;
    }
    if (!matriculaForm.ja_aluno && matriculaForm.criar_primeira_mensalidade_agora) {
      if (!matriculaForm.forma_pagamento) {
        setError('Selecione a forma de pagamento (PIX ou Boleto) para enviar a cobrança.');
        return;
      }
      const diaVenc = parseInt(matriculaForm.dia_vencimento_primeira, 10);
      if (!matriculaForm.dia_vencimento_primeira || Number.isNaN(diaVenc) || diaVenc < 1 || diaVenc > 31) {
        setError('Informe o dia de vencimento do PIX/Boleto (1 a 31).');
        return;
      }
      if (!matriculaForm.turma) {
        setError('Selecione uma turma para criar e enviar a cobrança por e-mail.');
        return;
      }
    }
    try {
      setMatriculaLoading(true);
      setError('');
      const round2 = (v) => Math.round(parseFloat(v || 0) * 100) / 100;
      const payload = {
        dia_vencimento: parseInt(matriculaForm.dia_vencimento, 10),
        ja_aluno: Boolean(matriculaForm.ja_aluno),
        dias_habilitados: matriculaForm.dias_habilitados,
      };
      if (!matriculaForm.ja_aluno) {
        payload.valor_mensalidade_proporcional = round2(matriculaForm.valor_mensalidade_proporcional || 0);
        payload.valor_mensalidade_mes_seguinte = round2(matriculaForm.valor_mensalidade_mes_seguinte);
        payload.valor_matricula = round2(matriculaForm.valor_matricula);
        payload.valor_uniforme = round2(matriculaForm.valor_uniforme);
        payload.dia_vencimento_primeira = parseInt(matriculaForm.dia_vencimento_primeira, 10);
      } else {
        payload.valor_mensalidade = round2(matriculaForm.valor_mensalidade);
      }
      payload.cpf = cpfFinalMatricula;
      if (matriculaForm.turma) {
        payload.turma = parseInt(matriculaForm.turma, 10);
      }
      if (!matriculaForm.ja_aluno) {
        payload.criar_primeira_mensalidade_agora = !!matriculaForm.criar_primeira_mensalidade_agora;
        if (matriculaForm.criar_primeira_mensalidade_agora && matriculaForm.forma_pagamento) {
          payload.forma_pagamento = matriculaForm.forma_pagamento;
        }
      }
      const response = await api.post(`usuarios/finalizar-agendamento/${matriculaPrecadastro.id}/`, payload);
      if (response.data.message) {
        const msg = response.data.pagamento_enviado
          ? 'Matrícula confirmada! E-mails de ativação e cobrança enviados ao aluno.'
          : 'Obrigado por se cadastrar! Um e-mail será enviado para ativação de senha.';
        setSuccess(msg);
        setShowMatriculaModal(false);
        setMatriculaPrecadastro(null);
        fetchUsers();
        if (onUserChange) {
          onUserChange();
        }
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao converter pré-cadastro:', error);
      setError(error.response?.data?.error || 'Erro ao converter pré-cadastro. Tente novamente.');
    } finally {
      setMatriculaLoading(false);
    }
  };

  const handleReenviarAtivacao = async (userId) => {
    try {
      setError('');
      setSuccess('');
      const response = await api.post(`usuarios/reenviar-convite/${userId}/`);
      if (response.data.message) {
        setSuccess(response.data.message);
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao reenviar convite:', error);
      setError(error.response?.data?.error || 'Erro ao reenviar convite de ativação. Tente novamente.');
    }
  };

  const USUARIOS_POR_PAGINA = 10;

  // Lista da aba Alunos: filtro por CT, busca por nome e ordem alfabética (A–Z)
  const getFilteredUsers = () => {
    if (activeTab !== 'alunos') {
      return users;
    }

    let list = [...users];

    if (filtroCtSelecionado) {
      const filtroId = parseInt(filtroCtSelecionado, 10);
      if (!isNaN(filtroId)) {
        list = list.filter(user => {
          if (!user.centros_treinamento || !Array.isArray(user.centros_treinamento) || user.centros_treinamento.length === 0) {
            return false;
          }
          return user.centros_treinamento.some(ct => {
            if (!ct || ct.id === null || ct.id === undefined) {
              return false;
            }
            const ctId = typeof ct.id === 'number' ? ct.id : parseInt(String(ct.id), 10);
            return !isNaN(ctId) && ctId === filtroId;
          });
        });
      }
    }

    const q = filtroBuscaNomeAluno.trim().toLowerCase();
    if (q) {
      list = list.filter(user => {
        const nome = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase();
        return nome.includes(q);
      });
    }

    list.sort((a, b) => {
      const na = `${a.first_name || ''} ${a.last_name || ''}`.trim();
      const nb = `${b.first_name || ''} ${b.last_name || ''}`.trim();
      return na.localeCompare(nb, 'pt-BR', { sensitivity: 'base' });
    });

    return list;
  };

  // Usuários a exibir (com paginação na aba alunos)
  const getUsersToDisplay = () => {
    const filtered = getFilteredUsers();
    if (activeTab !== 'alunos') return filtered;
    const start = (paginaAlunos - 1) * USUARIOS_POR_PAGINA;
    return filtered.slice(start, start + USUARIOS_POR_PAGINA);
  };

  const totalAlunosFiltrados = activeTab === 'alunos' ? getFilteredUsers().length : 0;
  const totalPaginasAlunos = Math.ceil(totalAlunosFiltrados / USUARIOS_POR_PAGINA) || 1;

  // Resetar página ao mudar filtros ou aba
  useEffect(() => {
    setPaginaAlunos(1);
  }, [activeTab, filtroCtSelecionado, filtroTurmaSelecionada, filtroBuscaNomeAluno]);

  useEffect(() => {
    nameTooltipTriggerRef.current = null;
    setSelectedUserInfo(null);
    setUserTooltipAnchor(null);
    setSelectedPrecadastroInfo(null);
    setPrecadastroTooltipAnchor(null);
  }, [activeTab, paginaAlunos]);

  useEffect(() => {
    if (!selectedUserInfo && !selectedPrecadastroInfo) return undefined;
    const clearTooltip = () => {
      nameTooltipTriggerRef.current = null;
      setSelectedUserInfo(null);
      setUserTooltipAnchor(null);
      setSelectedPrecadastroInfo(null);
      setPrecadastroTooltipAnchor(null);
    };
    const closeOnOutsideClick = (ev) => {
      if (Date.now() - tooltipOpenedAtRef.current < 550) return;
      const t = ev.target;
      if (t && typeof t.closest === 'function') {
        if (t.closest('[data-tooltip-panel]')) return;
        if (t.closest('[data-tooltip-name-trigger]')) return;
      }
      clearTooltip();
    };
    const onKey = (ev) => {
      if (ev.key === 'Escape') clearTooltip();
    };
    document.addEventListener('click', closeOnOutsideClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', closeOnOutsideClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [selectedUserInfo, selectedPrecadastroInfo]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          {activeTab === 'precadastros' ? 'Gerenciar Pré-cadastros' : `Gerenciar ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
        </h2>
        {activeTab !== 'alunos' && (
          <button style={styles.button} onClick={handleNewUser}>
            {activeTab === 'precadastros'
              ? 'Novo Pré-cadastro'
              : `Novo ${singularEntidadePorTab(activeTab)}`}
          </button>
        )}
      </div>

      <div className="gestao-usuarios-tabs" style={styles.tabs}>
        <button
          className="gestao-usuarios-tab"
          style={{
            ...styles.tab,
            ...(activeTab === 'alunos' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('alunos')}
        >
          Alunos
        </button>
        <button
          className="gestao-usuarios-tab"
          style={{
            ...styles.tab,
            ...(activeTab === 'professores' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('professores')}
        >
          Professores
        </button>
        <button
          className="gestao-usuarios-tab"
          style={{
            ...styles.tab,
            ...(activeTab === 'gerentes' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('gerentes')}
        >
          Gerentes
        </button>
        <button
          className="gestao-usuarios-tab"
          style={{
            ...styles.tab,
            ...(activeTab === 'precadastros' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('precadastros')}
        >
          Pré-cadastros
        </button>
      </div>

      {/* Filtros de pré-cadastro: por tipo (origem) e por status (ciclo de vida) */}
      {activeTab === 'precadastros' && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: '500', color: '#333' }}>
            Tipo:
          </label>
          <select
            value={filtroOrigemPrecadastro}
            onChange={(e) => setFiltroOrigemPrecadastro(e.target.value)}
            style={{
              ...styles.select,
              minWidth: '200px',
            }}
          >
            <option value="">Todos os tipos</option>
            <option value="pendente">Pendente (cadastro pelo gerente)</option>
            <option value="ex_aluno">Ex-aluno</option>
            <option value="aula_experimental">Aula experimental</option>
          </select>
          <label style={{ fontWeight: '500', color: '#333' }}>
            Status:
          </label>
          <select
            value={filtroStatusPrecadastro}
            onChange={(e) => setFiltroStatusPrecadastro(e.target.value)}
            style={{
              ...styles.select,
              minWidth: '180px',
            }}
          >
            <option value="">Aguardando matrícula</option>
            <option value="matriculado">Matriculados</option>
            <option value="cancelado">Cancelados</option>
            <option value="todos">Todos</option>
          </select>
          {(filtroOrigemPrecadastro || filtroStatusPrecadastro) && (
            <button
              onClick={() => { setFiltroOrigemPrecadastro(''); setFiltroStatusPrecadastro(''); }}
              style={{
                ...styles.actionButton,
                backgroundColor: '#757575',
                padding: '0.5rem 1rem',
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Filtros por CT e Turma - apenas para alunos */}
      {activeTab === 'alunos' && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: '500', color: '#333', whiteSpace: 'nowrap' }} htmlFor="busca_nome_aluno">
            Buscar por nome:
          </label>
          <input
            id="busca_nome_aluno"
            type="search"
            placeholder="Nome ou sobrenome"
            value={filtroBuscaNomeAluno}
            onChange={e => setFiltroBuscaNomeAluno(e.target.value)}
            style={{
              ...styles.input,
              minWidth: '200px',
              maxWidth: '320px',
              flex: '1 1 200px',
            }}
            autoComplete="off"
          />
          {filtroBuscaNomeAluno.trim() && (
            <button
              type="button"
              onClick={() => setFiltroBuscaNomeAluno('')}
              style={{
                ...styles.actionButton,
                backgroundColor: '#757575',
                padding: '0.5rem 1rem',
              }}
            >
              Limpar busca
            </button>
          )}
          <label style={{ fontWeight: '500', color: '#333', whiteSpace: 'nowrap' }} htmlFor="filtro_ct_alunos">
            Filtrar por Centro de Treinamento:
          </label>
          {Array.isArray(centrosTreinamento) && centrosTreinamento.length > 0 ? (
            <>
              <select
                id="filtro_ct_alunos"
                value={filtroCtSelecionado}
                onChange={(e) => {
                  setFiltroCtSelecionado(e.target.value);
                  setFiltroTurmaSelecionada(''); // Limpa turma ao trocar CT
                }}
                style={{
                  ...styles.select,
                  minWidth: '250px',
                }}
              >
                <option value="">Todos os CTs</option>
                {centrosTreinamento.map(ct => (
                  <option key={ct.id} value={ct.id}>
                    {ct.nome}
                  </option>
                ))}
              </select>
              {filtroCtSelecionado && (
                <button
                  onClick={() => { setFiltroCtSelecionado(''); setFiltroTurmaSelecionada(''); }}
                  style={{
                    ...styles.actionButton,
                    backgroundColor: '#757575',
                    padding: '0.5rem 1rem',
                  }}
                >
                  Limpar Filtro
                </button>
              )}
            </>
          ) : (
            <span style={{ 
              color: '#999', 
              fontSize: '14px',
              fontStyle: 'italic',
              padding: '0.5rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px'
            }}>
              Nenhum Centro de Treinamento cadastrado ainda
            </span>
          )}
          {filtroCtSelecionado && (
            <>
              <label style={{ fontWeight: '500', color: '#333', whiteSpace: 'nowrap' }} htmlFor="filtro_turma_alunos">
                Filtrar por Turma:
              </label>
              {(() => {
                const turmasDoCt = (turmas || []).filter(t => {
                  const ctId = t.ct && typeof t.ct === 'object' ? t.ct.id : t.ct;
                  return String(ctId) === String(filtroCtSelecionado);
                });
                return turmasDoCt.length > 0 ? (
                  <>
                    <select
                      id="filtro_turma_alunos"
                      value={filtroTurmaSelecionada}
                      onChange={(e) => setFiltroTurmaSelecionada(e.target.value)}
                      style={{
                        ...styles.select,
                        minWidth: '250px',
                      }}
                    >
                      <option value="">Todas as turmas do CT</option>
                      {turmasDoCt.map(turma => (
                        <option key={turma.id} value={turma.id}>
                          {turma.horario} - {(turma.dias_semana_nomes || []).join(', ')}
                        </option>
                      ))}
                    </select>
                    {filtroTurmaSelecionada && (
                      <button
                        onClick={() => setFiltroTurmaSelecionada('')}
                        style={{
                          ...styles.actionButton,
                          backgroundColor: '#757575',
                          padding: '0.5rem 1rem',
                        }}
                      >
                        Limpar Turma
                      </button>
                    )}
                  </>
                ) : (
                  <span style={{ 
                    color: '#999', 
                    fontSize: '14px',
                    fontStyle: 'italic',
                    padding: '0.5rem',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px'
                  }}>
                    Nenhuma turma neste CT
                  </span>
                );
              })()}
            </>
          )}
          {!filtroCtSelecionado && centrosTreinamento?.length > 0 && (
            <span style={{ 
              color: '#888', 
              fontSize: '14px',
              fontStyle: 'italic',
              padding: '0.5rem',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px'
            }}>
              Selecione um CT para filtrar por turma
            </span>
          )}
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          Carregando...
        </div>
      ) : (
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="gestao-usuarios-table" style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nome</th>
                {activeTab === 'alunos' && <th style={styles.th}>Foto</th>}
                {activeTab !== 'alunos' && <th style={styles.th}>CPF</th>}
                <th style={styles.th}>E-mail</th>
                <th style={styles.th}>Telefone</th>
                {activeTab === 'alunos' && <th style={styles.th}>Centro(s) de Treinamento</th>}
                {activeTab === 'alunos' && <th style={styles.th}>Par-Q</th>}
                {activeTab === 'alunos' && <th style={styles.th}>Status</th>}
                {activeTab === 'precadastros' && <th style={styles.th}>Tipo</th>}
                {activeTab === 'precadastros' && <th style={styles.th}>Status</th>}
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
            {getUsersToDisplay().map(user => (
              <tr key={user.id}>
                <td style={{ ...styles.td, position: 'relative' }}>
                  {activeTab === 'precadastros' ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <span
                        role="button"
                        tabIndex={0}
                        data-tooltip-name-trigger="precadastro"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => handleTogglePrecadastroInfo(e, user)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleTogglePrecadastroInfo(e, user);
                          }
                        }}
                        style={{
                          color: '#1F6C86',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        {`${user.first_name} ${user.last_name || ''}`.trim()}
                      </span>
                    </div>
                  ) : (activeTab === 'alunos' || activeTab === 'professores' || activeTab === 'gerentes') ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <span
                        role="button"
                        tabIndex={0}
                        data-tooltip-name-trigger="user"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => handleToggleUserInfo(e, user)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleUserInfo(e, user);
                          }
                        }}
                        style={{
                          color: '#1F6C86',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        {`${user.first_name} ${user.last_name || ''}`.trim()}
                      </span>
                    </div>
                  ) : null}
                </td>
                {activeTab === 'alunos' && (
                  <td style={styles.td}>
                    {user.foto_perfil ? (
                      <div
                        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => setFotoAmpliadaUrl(getFotoUrl(user.foto_perfil))}
                        onMouseEnter={() => {
                          if (fotoAmpliadaHoverTimerRef.current) clearTimeout(fotoAmpliadaHoverTimerRef.current);
                          fotoAmpliadaHoverTimerRef.current = setTimeout(() => setFotoAmpliadaUrl(getFotoUrl(user.foto_perfil)), 300);
                        }}
                        onMouseLeave={() => {
                          if (fotoAmpliadaHoverTimerRef.current) {
                            clearTimeout(fotoAmpliadaHoverTimerRef.current);
                            fotoAmpliadaHoverTimerRef.current = null;
                          }
                        }}
                        title="Clique ou passe o mouse para ampliar"
                      >
                        <img
                          src={getFotoUrl(user.foto_perfil)}
                          alt="Foto do aluno"
                          style={{ ...styles.avatar, objectFit: 'cover' }}
                          onLoad={(e) => {
                            const fallback = e.currentTarget.nextSibling;
                            if (fallback && fallback.style) {
                              fallback.style.display = 'none';
                            }
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div style={styles.avatar}>
                          {getInitials(user.first_name, user.last_name)}
                        </div>
                      </div>
                    ) : (
                      <div style={styles.avatar}>
                        {getInitials(user.first_name, user.last_name)}
                      </div>
                    )}
                  </td>
                )}
                {activeTab !== 'alunos' && (
                  <td style={styles.td}>{user.cpf || user.username}</td>
                )}
                <td style={styles.td}>{user.email}</td>
                <td style={styles.td}>{user.telefone}</td>
                {activeTab === 'alunos' && (
                  <td style={styles.td}>
                    {Array.isArray(user.centros_treinamento) && user.centros_treinamento.length > 0
                      ? user.centros_treinamento.map(ct => ct.nome).join(', ')
                      : 'Nenhum CT vinculado'}
                  </td>
                )}
                {activeTab === 'alunos' && (
                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {user.parq_completed ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {(() => {
                            const temRestricao = Array.from({ length: 10 }, (_, i) => i + 1).some((idx) => {
                              const value = user[`parq_question_${idx}`];
                              return value === true || value === 'true';
                            });
                            return (
                              <span style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                backgroundColor: temRestricao ? '#ffebee' : '#e8f5e9',
                                color: temRestricao ? '#c62828' : '#2e7d32',
                                display: 'inline-block',
                                width: 'fit-content'
                              }}>
                                ✅ Completo
                              </span>
                            );
                          })()}
                          {user.parq_completion_date && (
                            <span style={{ fontSize: '10px', color: '#666' }}>
                              {formatParqDate(user.parq_completion_date)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: '#fff3cd',
                          color: '#856404',
                          display: 'inline-block',
                          width: 'fit-content'
                        }}>
                          ⏳ Pendente
                        </span>
                      )}
                      <button
                        type="button"
                        style={{
                          ...styles.actionButton,
                          backgroundColor: '#1F6C86',
                          color: 'white',
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.8rem'
                        }}
                        onClick={() => handleOpenParqModal(user)}
                      >
                        Ver respostas
                      </button>
                    </div>
                  </td>
                )}
                {activeTab === 'alunos' && (
                  <td style={styles.td}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: user.is_active ? '#e8f5e9' : '#ffebee',
                      color: user.is_active ? '#2e7d32' : '#c62828',
                    }}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                )}
                {activeTab === 'precadastros' && (
                  <td style={styles.td}>
                    {user.origem_display || 'Pendente'}
                  </td>
                )}
                {activeTab === 'precadastros' && (
                  <td style={styles.td}>
                    {user.status === 'matriculado'
                      ? 'Matriculado'
                      : user.status === 'cancelado'
                        ? 'Cancelado'
                        : 'Aguardando'}
                  </td>
                )}
                <td style={styles.td}>
                  <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.35rem', overflowX: 'auto' }}>
                    <button
                      style={{ ...styles.actionButton, ...styles.editButton }}
                      onClick={() => handleEdit(user)}
                    >
                      Editar
                    </button>
                    <button
                      style={{ ...styles.actionButton, ...styles.deleteButton }}
                      onClick={() => handleDelete(user.id)}
                    >
                      Excluir
                    </button>
                    {activeTab === 'precadastros' && user.status !== 'matriculado' && (
                      <button
                        style={{ ...styles.actionButton, ...styles.editButton }}
                        onClick={() => handleConvertPreCadastro(user.id)}
                      >
                        Matricular
                      </button>
                    )}
                    {(activeTab === 'alunos' || activeTab === 'professores' || activeTab === 'gerentes') && !user.is_active && user.email && user.email !== 'pendente' && (
                      <button
                        style={{ 
                          ...styles.actionButton,
                          backgroundColor: '#ff9800',
                          color: 'white',
                        }}
                        onClick={() => handleReenviarAtivacao(user.id)}
                        title="Reenviar e-mail de ativação da conta"
                      >
                        ✉️ Reenviar Ativação
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'alunos' && totalAlunosFiltrados > USUARIOS_POR_PAGINA && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', padding: '0.5rem 0', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ color: '#666', fontSize: '0.9rem' }}>
            Mostrando {((paginaAlunos - 1) * USUARIOS_POR_PAGINA) + 1} - {Math.min(paginaAlunos * USUARIOS_POR_PAGINA, totalAlunosFiltrados)} de {totalAlunosFiltrados} alunos
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setPaginaAlunos(p => Math.max(1, p - 1))}
              disabled={paginaAlunos <= 1}
              style={{
                ...styles.button,
                padding: '0.4rem 0.8rem',
                fontSize: '0.9rem',
                opacity: paginaAlunos <= 1 ? 0.5 : 1,
                cursor: paginaAlunos <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Anterior
            </button>
            <span style={{ fontSize: '0.9rem', color: '#333' }}>
              Página {paginaAlunos} de {totalPaginasAlunos}
            </span>
            <button
              type="button"
              onClick={() => setPaginaAlunos(p => Math.min(totalPaginasAlunos, p + 1))}
              disabled={paginaAlunos >= totalPaginasAlunos}
              style={{
                ...styles.button,
                padding: '0.4rem 0.8rem',
                fontSize: '0.9rem',
                opacity: paginaAlunos >= totalPaginasAlunos ? 0.5 : 1,
                cursor: paginaAlunos >= totalPaginasAlunos ? 'not-allowed' : 'pointer'
              }}
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div ref={usuarioModalOverlayRef} style={styles.modal}>
          <div
            ref={usuarioModalContentRef}
            style={{
              ...styles.modalContent,
              ...(editingUser && activeTab === 'alunos' ? styles.modalContentWide : {}),
            }}
          >
            <h2 style={styles.title}>
              {editingUser
                ? activeTab === 'precadastros'
                  ? 'Editar Pré-cadastro'
                  : `Editar ${singularEntidadePorTab(activeTab)}`
                : activeTab === 'precadastros'
                  ? 'Novo Pré-cadastro'
                  : `Novo ${singularEntidadePorTab(activeTab)}`}
            </h2>

            <form style={styles.form} onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="first_name">
                  Nome
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="last_name">
                  Sobrenome
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="cpf">
                  CPF
                </label>
                <input
                  type="text"
                  id="cpf"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  inputMode="numeric"
                  autoComplete="off"
                  required={activeTab !== 'precadastros'}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="email">
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>

              {!editingUser && activeTab !== 'precadastros' && (
                <div style={styles.formGroup}>
                  <div style={{ 
                    backgroundColor: '#e3f2fd', 
                    padding: '1rem', 
                    borderRadius: '4px', 
                    border: '1px solid #2196f3',
                    color: '#1976d2',
                    fontSize: '0.9rem'
                  }}>
                    <strong>📧 Convite de Ativação</strong><br />
                    Após o cadastro, um convite será enviado para o e-mail informado 
                    para que o usuário possa definir sua senha e ativar a conta.
                  </div>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="telefone">
                  Telefone
                </label>
                <input
                  type="tel"
                  id="telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>

              {activeTab === 'precadastros' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="precadastro_origem">
                      Tipo
                    </label>
                    <select
                      id="precadastro_origem"
                      name="origem"
                      value={formData.origem || 'formulario'}
                      onChange={handleChange}
                      style={styles.input}
                    >
                      <option value="formulario">Pendente (cadastro pelo gerente)</option>
                      <option value="aula_experimental">Aula experimental</option>
                      <option value="ex_aluno">Ex-aluno</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="precadastro_turma">
                      Turma (opcional)
                    </label>
                    <select
                      id="precadastro_turma"
                      name="turma"
                      value={formData.turma || ''}
                      onChange={handleChange}
                      style={styles.input}
                    >
                      <option value="">Selecione uma turma (opcional)</option>
                      {Array.isArray(turmas) && turmas.filter(t => t.ativo !== false).map(t => (
                        <option key={t.id} value={t.id}>
                          {t.ct_nome || 'CT'} - {(t.dias_semana_nomes || []).join(', ')} às {t.horario || ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="endereco">
                  Endereço
                </label>
                <input
                  type="text"
                  id="endereco"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  style={styles.input}
                  required={formData.tipo === 'aluno' && !editingUser && activeTab !== 'precadastros'}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="data_nascimento">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  id="data_nascimento"
                  name="data_nascimento"
                  value={formData.data_nascimento}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>

              {formData.tipo === 'aluno' && formData.data_nascimento && (
                <>
                  {calcularIdade(formData.data_nascimento) < 18 ? (
                    <>
                      <div style={styles.formGroup}>
                        <label style={styles.label} htmlFor="nome_responsavel">
                          Nome do Responsável
                        </label>
                        <input
                          type="text"
                          id="nome_responsavel"
                          name="nome_responsavel"
                          value={formData.nome_responsavel}
                          onChange={handleChange}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label} htmlFor="telefone_responsavel">
                          Telefone do Responsável
                        </label>
                        <input
                          type="tel"
                          id="telefone_responsavel"
                          name="telefone_responsavel"
                          value={formData.telefone_responsavel}
                          onChange={handleChange}
                          style={styles.input}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </>
                  ) : (
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="telefone_emergencia">
                        Telefone de Emergência
                      </label>
                      <input
                        type="tel"
                        id="telefone_emergencia"
                        name="telefone_emergencia"
                        value={formData.telefone_emergencia}
                        onChange={handleChange}
                        style={styles.input}
                        required={activeTab !== 'precadastros'}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Campo tipo de usuário - só mostra se for cadastro de gerente */}
              {activeTab === 'gerentes' && (
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="tipo">
                    Tipo de Usuário
                  </label>
                  <select
                    id="tipo"
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    style={styles.select}
                    required
                  >
                    <option value="professor">Professor</option>
                    <option value="gerente">Gerente</option>
                  </select>
                </div>
              )}

              {formData.tipo === 'aluno' && activeTab !== 'precadastros' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="diaVencimento">
                      Dia de Vencimento da Mensalidade
                    </label>
                    <select
                      id="diaVencimento"
                      name="diaVencimento"
                      value={diaVencimento}
                      onChange={e => setDiaVencimento(e.target.value)}
                      style={styles.select}
                      required={activeTab !== 'precadastros'}
                    >
                      <option value="">Selecione</option>
                      <option value="1">Dia 1</option>
                      <option value="5">Dia 5</option>
                      <option value="10">Dia 10</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="valorMensalidadeNovo">
                      Valor da Mensalidade
                    </label>
                    <input
                      type="number"
                      id="valorMensalidadeNovo"
                      name="valorMensalidadeNovo"
                      value={valorMensalidadeNovo}
                      onChange={e => setValorMensalidadeNovo(e.target.value)}
                      style={styles.input}
                      min="0"
                      step="0.01"
                      placeholder="Valor da mensalidade"
                      required={activeTab !== 'precadastros'}
                    />
                  </div>
                  {editingUser && (
                  <div style={styles.formGroup}>
                    <span style={styles.label} id="aluno_edicao_turmas_label">
                      Turmas vinculadas (até 2)
                    </span>
                    <div
                      style={styles.turmasPickerBox}
                      role="group"
                      aria-labelledby="aluno_edicao_turmas_label"
                    >
                      {(!Array.isArray(turmas) || turmas.filter(t => t.ativo !== false).length === 0) && (
                        <div style={{ padding: '12px', color: '#888', fontSize: '0.9rem' }}>
                          Nenhuma turma ativa disponível.
                        </div>
                      )}
                      {Array.isArray(turmas) && turmas.filter(t => t.ativo !== false).map((t, i, arr) => {
                        const tid = t.id;
                        const sel = (formData.turmas || []).includes(String(tid));
                        const isLast = i === arr.length - 1;
                        return (
                          <label
                            key={tid}
                            htmlFor={`turma_chk_${tid}`}
                            style={{
                              ...styles.turmasPickerRow,
                              ...(isLast ? styles.turmasPickerRowLast : {}),
                              backgroundColor: sel ? '#e8f4f8' : 'transparent',
                            }}
                          >
                            <input
                              id={`turma_chk_${tid}`}
                              type="checkbox"
                              checked={sel}
                              onChange={() => handleToggleTurmaAluno(tid)}
                              style={{ marginTop: '3px', flexShrink: 0 }}
                            />
                            <span style={styles.turmasPickerText}>
                              <strong>{t.ct_nome || 'CT'}</strong>
                              <br />
                              {(t.dias_semana_nomes || []).join(', ')} · {t.horario || ''}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.35rem' }}>
                      Marque até duas turmas. Nenhuma seleção remove os vínculos. É necessário haver dia em comum entre os dias habilitados do aluno e os dias de cada turma.
                    </div>
                  </div>
                  )}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Dias habilitados para treino ({diasHabilitadosAluno.length})
                    </label>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {diasSemana.map(dia => (
                        <label key={dia.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={diasHabilitadosAluno.includes(dia.id)}
                            onChange={() => handleToggleDiaAluno(dia.id)}
                          />
                          {dia.nome}
                        </label>
                      ))}
                    </div>
                    {diasSemana.length === 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#999' }}>
                        Nenhum dia da semana disponível.
                      </div>
                    )}
                  </div>
                </>
              )}

              {formData.tipo === 'professor' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="salarioProfessor">
                      Salário do Professor
                    </label>
                    <input
                      type="number"
                      id="salarioProfessor"
                      name="salarioProfessor"
                      value={salarioProfessor}
                      onChange={e => setSalarioProfessor(e.target.value)}
                      style={styles.input}
                      min="0"
                      step="0.01"
                      placeholder="Ex: 2500.00"
                      required={activeTab === 'professores'}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="pixProfessor">
                      Chave PIX do Professor
                    </label>
                    <input
                      type="text"
                      id="pixProfessor"
                      name="pixProfessor"
                      value={pixProfessor}
                      onChange={e => setPixProfessor(e.target.value)}
                      style={styles.input}
                      placeholder="CPF, e-mail, telefone ou chave aleatória"
                      required={activeTab === 'professores'}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                  }}
                  style={{
                    ...styles.button,
                    backgroundColor: '#f5f5f5',
                    color: '#333',
                    flex: 1,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    ...styles.button,
                    flex: 1,
                  }}
                >
                  {editingUser ? 'Salvar' : `Cadastrar ${singularEntidadePorTab(activeTab)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMatriculaModal && matriculaPrecadastro && (
        <div ref={matriculaModalOverlayRef} style={styles.modal}>
          <div ref={matriculaModalContentRef} style={styles.modalContent}>
            <h2 style={styles.title}>Matricular pré-cadastro</h2>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              A primeira mensalidade inclui matrícula + uniforme + mensalidade do mês. O vencimento será no dia informado abaixo.
            </div>
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #2196f3',
              color: '#1976d2',
              fontSize: '0.9rem',
              marginTop: '0.75rem'
            }}>
              <strong>📧 Ativação de senha</strong><br />
              Após a matrícula, um e-mail será enviado para ativação de senha do aluno.
            </div>
            <form style={{ ...styles.form, marginTop: '1rem' }} onSubmit={(e) => e.preventDefault()}>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="matricula_ja_aluno">
                  Já é aluno?
                </label>
                <select
                  id="matricula_ja_aluno"
                  name="ja_aluno"
                  value={matriculaForm.ja_aluno ? 'true' : 'false'}
                  onChange={handleMatriculaChange}
                  style={styles.select}
                >
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </select>
              </div>

              {!matriculaPrecadastro.cpf && (
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="matricula_cpf">
                    CPF
                  </label>
                  <input
                    type="text"
                    id="matricula_cpf"
                    name="cpf"
                    value={matriculaForm.cpf}
                    onChange={handleMatriculaChange}
                    style={styles.input}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    inputMode="numeric"
                    autoComplete="off"
                    required
                  />
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="matricula_turma">
                  Turma
                </label>
                <select
                  id="matricula_turma"
                  name="turma"
                  value={matriculaForm.turma}
                  onChange={handleMatriculaChange}
                  style={styles.select}
                  required={!matriculaForm.ja_aluno}
                >
                  <option value="">{matriculaForm.ja_aluno ? 'Selecione uma turma (opcional)' : 'Selecione uma turma (obrigatório para novo aluno)'}</option>
                  {Array.isArray(turmas) && turmas.filter(t => t.ativo !== false).map(turma => (
                    <option key={turma.id} value={turma.id}>
                      {turma.ct_nome || 'CT'} - {(turma.dias_semana_nomes || []).join(', ')} às {turma.horario || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="matricula_dia_vencimento">
                  Dia de vencimento das mensalidades
                </label>
                <select
                  id="matricula_dia_vencimento"
                  name="dia_vencimento"
                  value={matriculaForm.dia_vencimento}
                  onChange={handleMatriculaChange}
                  style={styles.select}
                  required
                >
                  <option value="1">Dia 1</option>
                  <option value="5">Dia 5</option>
                  <option value="10">Dia 10</option>
                </select>
              </div>

              {!matriculaForm.ja_aluno && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="matricula_valor_matricula">
                      Valor da matrícula (R$)
                    </label>
                    <input
                      type="number"
                      id="matricula_valor_matricula"
                      name="valor_matricula"
                      value={matriculaForm.valor_matricula}
                      onChange={handleMatriculaChange}
                      style={styles.input}
                      min="0"
                      step="0.01"
                      placeholder="Ex: 90.00"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="matricula_valor_uniforme">
                      Valor do uniforme (R$)
                    </label>
                    <input
                      type="number"
                      id="matricula_valor_uniforme"
                      name="valor_uniforme"
                      value={matriculaForm.valor_uniforme}
                      onChange={handleMatriculaChange}
                      style={styles.input}
                      min="0"
                      step="0.01"
                      placeholder="Ex: 80.00"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="matricula_valor_mensalidade_proporcional">
                      Mensalidade proporcional (R$)
                    </label>
                    <input
                      type="number"
                      id="matricula_valor_mensalidade_proporcional"
                      name="valor_mensalidade_proporcional"
                      value={matriculaForm.valor_mensalidade_proporcional}
                      onChange={handleMatriculaChange}
                      style={styles.input}
                      min="0"
                      step="0.01"
                      placeholder="Ex: 75.00 (parte do mês na 1ª cobrança)"
                    />
                    <div style={{ fontSize: '0.82rem', color: '#555', marginTop: '4px' }}>
                      Entra na <strong>primeira cobrança</strong> junto com matrícula e uniforme (ex.: proporcional aos dias restantes do mês).
                    </div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="matricula_valor_mensalidade_mes_seguinte">
                      Mensalidade do mês seguinte (R$)
                    </label>
                    <input
                      type="number"
                      id="matricula_valor_mensalidade_mes_seguinte"
                      name="valor_mensalidade_mes_seguinte"
                      value={matriculaForm.valor_mensalidade_mes_seguinte}
                      onChange={handleMatriculaChange}
                      style={styles.input}
                      min="0"
                      step="0.01"
                      placeholder="Ex: 150.00 (valor cheio)"
                      required={!matriculaForm.ja_aluno}
                    />
                    <div style={{ fontSize: '0.82rem', color: '#555', marginTop: '4px' }}>
                      Valor gravado no cadastro do aluno para as <strong>próximas mensalidades</strong> (cobrança a partir do mês seguinte).
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#1F6C86', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Total da 1ª cobrança (matrícula + uniforme + proporcional): R$ {
                      (Math.round((parseFloat(matriculaForm.valor_matricula || 0) + parseFloat(matriculaForm.valor_uniforme || 0) + parseFloat(matriculaForm.valor_mensalidade_proporcional || 0)) * 100) / 100).toFixed(2).replace('.', ',')
                    }
                  </div>
                  {!matriculaForm.criar_primeira_mensalidade_agora && (
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="matricula_dia_vencimento_primeira">
                        Dia de vencimento da primeira mensalidade
                      </label>
                      <input
                        type="number"
                        id="matricula_dia_vencimento_primeira"
                        name="dia_vencimento_primeira"
                        value={matriculaForm.dia_vencimento_primeira}
                        onChange={handleMatriculaChange}
                        style={styles.input}
                        min="1"
                        max="31"
                        placeholder="Ex: 15 (dia 1 a 31)"
                        required={!matriculaForm.ja_aluno}
                      />
                    </div>
                  )}

                  <div style={{
                    backgroundColor: '#e8f5e9',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #81c784',
                    marginBottom: '1rem'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: matriculaForm.criar_primeira_mensalidade_agora ? '0.75rem' : 0 }}>
                      <input
                        type="checkbox"
                        name="criar_primeira_mensalidade_agora"
                        checked={!!matriculaForm.criar_primeira_mensalidade_agora}
                        onChange={handleMatriculaChange}
                      />
                      <span><strong>Criar primeira mensalidade agora</strong> e enviar por e-mail ao aluno</span>
                    </label>
                    {matriculaForm.criar_primeira_mensalidade_agora && (
                      <>
                        <div style={styles.formGroup}>
                          <label style={styles.label} htmlFor="matricula_forma_pagamento">
                            Forma de pagamento
                          </label>
                          <select
                            id="matricula_forma_pagamento"
                            name="forma_pagamento"
                            value={matriculaForm.forma_pagamento}
                            onChange={handleMatriculaChange}
                            style={styles.select}
                            required={!!matriculaForm.criar_primeira_mensalidade_agora}
                          >
                            <option value="">Selecione</option>
                            <option value="pix">PIX</option>
                            <option value="boleto">Boleto</option>
                          </select>
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label} htmlFor="matricula_dia_vencimento_pagamento">
                            Dia de vencimento do PIX/Boleto (1 a 31)
                          </label>
                          <input
                            type="number"
                            id="matricula_dia_vencimento_pagamento"
                            name="dia_vencimento_primeira"
                            value={matriculaForm.dia_vencimento_primeira}
                            onChange={handleMatriculaChange}
                            style={styles.input}
                            min="1"
                            max="31"
                            placeholder="Ex: 15"
                            required={!!matriculaForm.criar_primeira_mensalidade_agora}
                          />
                          <div style={{ fontSize: '0.85rem', color: '#2e7d32', marginTop: '4px' }}>
                            Será gerada a cobrança e enviada ao e-mail do aluno com as instruções de pagamento.
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {matriculaForm.ja_aluno && (
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="matricula_valor_mensalidade">
                    Valor da mensalidade (R$)
                  </label>
                  <input
                    type="number"
                    id="matricula_valor_mensalidade"
                    name="valor_mensalidade"
                    value={matriculaForm.valor_mensalidade}
                    onChange={handleMatriculaChange}
                    style={styles.input}
                    min="0"
                    step="0.01"
                    placeholder="Ex: 150.00"
                    required
                  />
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Dias habilitados para treino ({matriculaForm.dias_habilitados.length})
                </label>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {diasSemana.map(dia => (
                    <label key={dia.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={matriculaForm.dias_habilitados.includes(dia.id)}
                        onChange={() => handleToggleDia(dia.id)}
                      />
                      {dia.nome}
                    </label>
                  ))}
                </div>
                {diasSemana.length === 0 && (
                  <div style={{ fontSize: '0.85rem', color: '#999' }}>
                    Nenhum dia da semana disponível.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={handleCloseMatriculaModal}
                  style={{
                    ...styles.button,
                    backgroundColor: '#f5f5f5',
                    color: '#333',
                    flex: 1,
                  }}
                  disabled={matriculaLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMatricula}
                  style={{
                    ...styles.button,
                    flex: 1,
                  }}
                  disabled={matriculaLoading}
                >
                  {matriculaLoading ? 'Matriculando...' : 'Confirmar matrícula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {fotoAmpliadaUrl && (
        <div
          style={styles.fotoAmpliadaOverlay}
          onClick={() => setFotoAmpliadaUrl(null)}
        >
          <img
            src={fotoAmpliadaUrl}
            alt="Foto em tamanho original"
            style={styles.fotoAmpliadaImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showParqModal && selectedParqUser && (
        <div ref={parqModalOverlayRef} style={styles.modal}>
          <div ref={parqModalContentRef} style={styles.modalContent}>
            <h2 style={styles.title}>
              Respostas PAR-Q - {selectedParqUser.first_name} {selectedParqUser.last_name}
            </h2>
            <div style={{ marginBottom: '1rem', color: '#666', fontSize: '14px' }}>
              Status: {selectedParqUser.parq_completed ? 'Completo' : 'Pendente'}
              {selectedParqUser.parq_completion_date && (
                <span> • {formatParqDate(selectedParqUser.parq_completion_date)}</span>
              )}
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {parqQuestions.map((item, index) => (
                <div key={item.field} style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                  <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                    <strong>{index + 1}.</strong> {item.question}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: selectedParqUser[item.field] ? '#c62828' : '#2e7d32' }}>
                    {selectedParqUser[item.field] ? 'Sim' : 'Não'}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              {selectedParqUser.parq_completed && (
                <button
                  type="button"
                  style={{ ...styles.actionButton, backgroundColor: '#ff9800', color: 'white' }}
                  onClick={handleAllowParqEdit}
                  disabled={parqActionLoading}
                >
                  {parqActionLoading ? 'Liberando...' : 'Permitir alteração'}
                </button>
              )}
              <button
                type="button"
                style={{ ...styles.actionButton, backgroundColor: '#757575', color: 'white' }}
                onClick={handleCloseParqModal}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPrecadastroInfo && precadastroTooltipAnchor && createPortal(
        <div
          data-tooltip-panel
          role="tooltip"
          style={{
            position: 'fixed',
            zIndex: 10050,
            ...styles.precadastroTooltip,
            boxSizing: 'border-box',
            width: precadastroTooltipAnchor.maxWidth,
            minWidth: 0,
            top: precadastroTooltipAnchor.top,
            left: precadastroTooltipAnchor.left,
            maxWidth: precadastroTooltipAnchor.maxWidth,
            maxHeight: precadastroTooltipAnchor.maxHeight,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div><strong>E-mail:</strong> {selectedPrecadastroInfo.email}</div>
          <div><strong>Telefone:</strong> {selectedPrecadastroInfo.telefone || '-'}</div>
          <div><strong>Tipo:</strong> {selectedPrecadastroInfo.origem_display || selectedPrecadastroInfo.origem || '-'}</div>
          {selectedPrecadastroInfo.origem === 'aula_experimental' && selectedPrecadastroInfo.data_aula_experimental && (
            <div>
              <strong>Data da aula experimental:</strong>{' '}
              {new Date(selectedPrecadastroInfo.data_aula_experimental + 'T12:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </div>
          )}
          <div><strong>Status:</strong> {selectedPrecadastroInfo.status === 'matriculado' ? 'Matriculado' : selectedPrecadastroInfo.status === 'cancelado' ? 'Cancelado' : 'Pendente'}</div>
        </div>,
        document.body
      )}

      {selectedUserInfo && userTooltipAnchor && createPortal(
        <div
          data-tooltip-panel
          role="tooltip"
          style={{
            position: 'fixed',
            zIndex: 10050,
            ...styles.precadastroTooltip,
            boxSizing: 'border-box',
            width: userTooltipAnchor.maxWidth,
            minWidth: 0,
            top: userTooltipAnchor.top,
            left: userTooltipAnchor.left,
            maxWidth: userTooltipAnchor.maxWidth,
            maxHeight: userTooltipAnchor.maxHeight,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {activeTab === 'alunos' && (
            <>
              <div><strong>CPF:</strong> {selectedUserInfo.cpf || selectedUserInfo.username || '-'}</div>
              <div>
                <strong>Turma(s):</strong>
                {Array.isArray(selectedUserInfo.turmas_vinculadas) && selectedUserInfo.turmas_vinculadas.length > 0 ? (
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', listStyleType: 'disc' }}>
                    {selectedUserInfo.turmas_vinculadas.map((t) => {
                      const partes = [
                        t.ct_nome,
                        t.horario,
                        Array.isArray(t.dias_semana_nomes) && t.dias_semana_nomes.length
                          ? t.dias_semana_nomes.join(', ')
                          : null,
                      ].filter(Boolean);
                      return (
                        <li key={t.id} style={{ marginBottom: '4px' }}>
                          {partes.join(' — ')}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <span> Nenhuma turma vinculada.</span>
                )}
              </div>
              <div><strong>Valor mensalidade:</strong> {formatValor(selectedUserInfo.valor_mensalidade)}</div>
              <div>
                <strong>Dias habilitados:</strong>{' '}
                {Array.isArray(selectedUserInfo.dias_habilitados_nomes) && selectedUserInfo.dias_habilitados_nomes.length > 0
                  ? selectedUserInfo.dias_habilitados_nomes.join(', ')
                  : Array.isArray(selectedUserInfo.dias_habilitados) && selectedUserInfo.dias_habilitados.length > 0
                    ? 'Configurado'
                    : 'Não configurado'}
              </div>
              {Array.isArray(selectedUserInfo.centros_treinamento) && selectedUserInfo.centros_treinamento.length > 0 && (
                <div><strong>CTs:</strong> {selectedUserInfo.centros_treinamento.map(ct => ct.nome).join(', ')}</div>
              )}
            </>
          )}
          {(activeTab === 'professores' || activeTab === 'gerentes') && (
            <>
              <div><strong>E-mail:</strong> {selectedUserInfo.email}</div>
              <div><strong>Telefone:</strong> {selectedUserInfo.telefone || '-'}</div>
              {activeTab === 'professores' && selectedUserInfo.salario_professor != null && selectedUserInfo.salario_professor !== '' && (
                <div><strong>Salário:</strong> {formatValor(selectedUserInfo.salario_professor)}</div>
              )}
              {activeTab === 'professores' && selectedUserInfo.pix_professor && (
                <div><strong>PIX:</strong> {selectedUserInfo.pix_professor}</div>
              )}
              {Array.isArray(selectedUserInfo.centros_treinamento) && selectedUserInfo.centros_treinamento.length > 0 && (
                <div><strong>CTs:</strong> {selectedUserInfo.centros_treinamento.map(ct => ct.nome).join(', ')}</div>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default CadastroUsuario;