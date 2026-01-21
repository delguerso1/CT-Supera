import React, { useState, useEffect, useCallback } from 'react';
import api, { MEDIA_URL } from '../services/api';

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
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
    color: '#555',
    fontSize: '12px',
    fontWeight: 'bold',
    overflow: 'hidden',
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    width: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
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
};

function CadastroUsuario({ onUserChange }) {
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
  const [centrosTreinamento, setCentrosTreinamento] = useState([]);
  const [diasSemana, setDiasSemana] = useState([]);
  const [filtroCtSelecionado, setFiltroCtSelecionado] = useState('');
  const [showParqModal, setShowParqModal] = useState(false);
  const [selectedParqUser, setSelectedParqUser] = useState(null);
  const [parqActionLoading, setParqActionLoading] = useState(false);
  const [showMatriculaModal, setShowMatriculaModal] = useState(false);
  const [matriculaPrecadastro, setMatriculaPrecadastro] = useState(null);
  const [matriculaLoading, setMatriculaLoading] = useState(false);
  const [matriculaForm, setMatriculaForm] = useState({
    cpf: '',
    dia_vencimento: '1',
    ja_aluno: false,
    plano: '3x',
    valor_primeira_mensalidade: '150.00',
    plano_familia: false,
    valor_mensalidade: '',
    dias_habilitados: [],
  });

  const PLANO_VALORES = {
    '3x': 150.00,
    '2x': 130.00,
    '1x': 110.00,
  };

  const PLANO_LIMITES = {
    '3x': 3,
    '2x': 2,
    '1x': 1,
  };

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
        const resultados = await fetchAllPages('usuarios/precadastros/');
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

        const resultados = await fetchAllPages(`usuarios/?tipo=${tipoEsperado}`);
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
  }, [activeTab]); // Inclua todas as dependências usadas dentro de fetchUsers

  // useEffect depende de fetchUsers e activeTab
  useEffect(() => {
    console.log('[DEBUG] useEffect disparado, tab:', activeTab);
    fetchUsers();
  }, [fetchUsers, activeTab]);

  // Buscar centros de treinamento para o filtro
  useEffect(() => {
    const fetchCentros = async () => {
      try {
        const response = await api.get('ct/');
        console.log('[DEBUG] Resposta centros de treinamento:', response.data);
        // Garante que sempre será um array
        const centros = Array.isArray(response.data) ? response.data : [];
        setCentrosTreinamento(centros);
      } catch (error) {
        console.error('[DEBUG] Erro ao carregar centros de treinamento:', error);
        setCentrosTreinamento([]);
      }
    };
    fetchCentros();
  }, []);

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
    }

    setFormData(prev => ({
      ...prev,
      [name]: valorFormatado,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Campos base para todos os tipos
    const dados = {
      username: formData.cpf.replace(/\D/g, ''),
      cpf: formData.cpf.replace(/\D/g, ''),
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
      if (diaVencimento) dados.dia_vencimento = parseInt(diaVencimento);
      if (valorMensalidadeNovo) dados.valor_mensalidade = parseFloat(valorMensalidadeNovo);
    }

    // Campos específicos para professores
    if (formData.tipo === 'professor') {
      if (salarioProfessor) dados.salario_professor = parseFloat(salarioProfessor);
      if (pixProfessor) dados.pix_professor = pixProfessor;
    }

    console.log('[DEBUG] Dados enviados:', dados);
    console.log('[DEBUG] FormData original:', formData);

    try {
      let response;
      if (editingUser) {
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
      const errorMessage = err.response?.data?.parq_question_1 || err.response?.data?.error || err.response?.data?.detail || 'Erro ao cadastrar usuário.';
      setError(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
    }
  };

  const handleEdit = async (user) => {
    setEditingUser(user);
          setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        cpf: user.cpf || user.username,
        email: user.email,
        tipo: user.tipo,
        telefone: user.telefone,
        endereco: user.endereco,
        data_nascimento: user.data_nascimento,
        telefone_responsavel: user.telefone_responsavel || '',
        telefone_emergencia: user.telefone_emergencia || '',
        nome_responsavel: user.nome_responsavel || '',
        ficha_medica: user.ficha_medica || '',
      });
    
    // Carregar campos específicos de professor
    if (user.tipo === 'professor') {
      setSalarioProfessor(user.salario_professor || '');
      setPixProfessor(user.pix_professor || '');
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
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      try {
        if (activeTab === 'alunos') {
          const response = await api.post(`usuarios/reverter-aluno/${userId}/`);
          if (response.data?.message) {
            setSuccess('Aluno movido para pré-cadastro com sucesso!');
            fetchUsers();
          }
        } else {
          const response = await api.delete(`usuarios/${userId}/`);
          if (response.status === 204) {
            setSuccess(activeTab === 'precadastros' ? 'Pré-cadastro excluído com sucesso!' : 'Usuário excluído com sucesso!');
            fetchUsers();
          }
        }
      } catch (error) {
        console.error('[DEBUG] Erro ao excluir:', error);
        setError(error.response?.data?.error || 'Erro ao excluir. Tente novamente.');
      }
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
    });
    
    // Limpar campos específicos
    setSalarioProfessor('');
    setPixProfessor('');
    setDiaVencimento('');
    setValorMensalidadeNovo('');
    
    setShowModal(true);
  };

  const handleConvertPreCadastro = async (precadastroId) => {
    const precadastro = users.find(user => user.id === precadastroId);
    if (!precadastro) {
      setError('Pré-cadastro não encontrado.');
      return;
    }
    const planoPadrao = '3x';
    setMatriculaPrecadastro(precadastro);
    setMatriculaForm({
      cpf: precadastro.cpf || '',
      dia_vencimento: '1',
      ja_aluno: false,
      plano: planoPadrao,
      valor_primeira_mensalidade: PLANO_VALORES[planoPadrao].toFixed(2),
      plano_familia: false,
      valor_mensalidade: '',
      dias_habilitados: [],
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
    if (name === 'ja_aluno') {
      const jaAluno = value === 'true';
      setMatriculaForm(prev => ({
        ...prev,
        ja_aluno: jaAluno,
        dias_habilitados: [],
        plano: prev.plano || '3x',
        valor_primeira_mensalidade: PLANO_VALORES[prev.plano || '3x'].toFixed(2),
      }));
      return;
    }
    if (name === 'plano') {
      const limite = PLANO_LIMITES[value] || 0;
      setMatriculaForm(prev => ({
        ...prev,
        plano: value,
        valor_primeira_mensalidade: PLANO_VALORES[value].toFixed(2),
        dias_habilitados: prev.dias_habilitados.slice(0, limite),
      }));
      return;
    }
    setMatriculaForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggleDia = (diaId) => {
    const limite = PLANO_LIMITES[matriculaForm.plano] || 0;
    setMatriculaForm(prev => {
      const jaSelecionado = prev.dias_habilitados.includes(diaId);
      if (jaSelecionado) {
        return {
          ...prev,
          dias_habilitados: prev.dias_habilitados.filter(id => id !== diaId),
        };
      }
      if (prev.dias_habilitados.length >= limite) {
        setError(`O plano ${prev.plano} permite apenas ${limite} dia(s).`);
        return prev;
      }
      return {
        ...prev,
        dias_habilitados: [...prev.dias_habilitados, diaId],
      };
    });
  };

  const handleConfirmMatricula = async () => {
    if (!matriculaPrecadastro) return;
    const precisaCpf = !matriculaPrecadastro.cpf;
    if (precisaCpf && !matriculaForm.cpf) {
      setError('Informe o CPF do aluno.');
      return;
    }
    if (!matriculaForm.dia_vencimento) {
      setError('Selecione o dia de vencimento.');
      return;
    }
    if (!matriculaForm.plano) {
      setError('Selecione o plano.');
      return;
    }
    if (!matriculaForm.ja_aluno && !matriculaForm.valor_primeira_mensalidade) {
      setError('Informe o valor da primeira mensalidade.');
      return;
    }
    const limitePlano = PLANO_LIMITES[matriculaForm.plano] || 0;
    if (['1x', '2x'].includes(matriculaForm.plano) && matriculaForm.dias_habilitados.length !== limitePlano) {
      setError(`Selecione exatamente ${limitePlano} dia(s) para o plano escolhido.`);
      return;
    }
    try {
      setMatriculaLoading(true);
      setError('');
      const payload = {
        dia_vencimento: parseInt(matriculaForm.dia_vencimento, 10),
        plano_familia: Boolean(matriculaForm.plano_familia),
        ja_aluno: Boolean(matriculaForm.ja_aluno),
      };
      payload.plano = matriculaForm.plano;
      if (!matriculaForm.ja_aluno) {
        payload.valor_primeira_mensalidade = parseFloat(matriculaForm.valor_primeira_mensalidade);
      }
      if (matriculaForm.dias_habilitados.length > 0) {
        payload.dias_habilitados = matriculaForm.dias_habilitados;
      }
      if (matriculaForm.cpf) {
        payload.cpf = matriculaForm.cpf;
      }
      const response = await api.post(`usuarios/finalizar-agendamento/${matriculaPrecadastro.id}/`, payload);
      if (response.data.message) {
        setSuccess('Pré-cadastro convertido em aluno com sucesso!');
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

  // Função para filtrar usuários por CT
  const getFilteredUsers = () => {
    // Se não há filtro selecionado ou não está na aba de alunos, retorna todos
    if (!filtroCtSelecionado || filtroCtSelecionado === '' || activeTab !== 'alunos') {
      return users;
    }
    
    // Converte o filtro para número
    const filtroId = parseInt(filtroCtSelecionado, 10);
    if (isNaN(filtroId)) {
      return users;
    }
    
    // Filtra os usuários que têm o CT selecionado
    return users.filter(user => {
      // Verifica se o usuário tem centros de treinamento
      if (!user.centros_treinamento || !Array.isArray(user.centros_treinamento) || user.centros_treinamento.length === 0) {
        return false;
      }
      
      // Verifica se algum dos CTs do usuário corresponde ao filtro
      return user.centros_treinamento.some(ct => {
        if (!ct || ct.id === null || ct.id === undefined) {
          return false;
        }
        // Converte o ID do CT para número para comparação
        const ctId = typeof ct.id === 'number' ? ct.id : parseInt(String(ct.id), 10);
        return !isNaN(ctId) && ctId === filtroId;
      });
    });
  };

  const totalPrimeiraMensalidade = () => {
    const valor = parseFloat(matriculaForm.valor_primeira_mensalidade || '0');
    if (Number.isNaN(valor)) {
      return '0.00';
    }
    const desconto = matriculaForm.plano_familia ? 10 : 0;
    return (valor - desconto + 90).toFixed(2);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          {activeTab === 'precadastros' ? 'Gerenciar Pré-cadastros' : `Gerenciar ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
        </h2>
        {activeTab !== 'alunos' && (
          <button style={styles.button} onClick={handleNewUser}>
            {activeTab === 'precadastros' ? 'Novo Pré-cadastro' : 
             activeTab === 'professores' ? 'Novo Professor' :
             activeTab === 'gerentes' ? 'Novo Gerente' :
             `Novo ${activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}`}
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

      {/* Filtro por CT - apenas para alunos */}
      {activeTab === 'alunos' && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: '500', color: '#333' }}>
            Filtrar por Centro de Treinamento:
          </label>
          {Array.isArray(centrosTreinamento) && centrosTreinamento.length > 0 ? (
            <>
              <select
                value={filtroCtSelecionado}
                onChange={(e) => setFiltroCtSelecionado(e.target.value)}
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
                  onClick={() => setFiltroCtSelecionado('')}
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
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          Carregando...
        </div>
      ) : (
        <div className="table-responsive">
          <table className="gestao-usuarios-table" style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nome</th>
                {activeTab === 'alunos' && <th style={styles.th}>Foto</th>}
                <th style={styles.th}>CPF</th>
                <th style={styles.th}>E-mail</th>
                <th style={styles.th}>Telefone</th>
                {activeTab === 'alunos' && <th style={styles.th}>Centro(s) de Treinamento</th>}
                {activeTab === 'alunos' && <th style={styles.th}>Par-Q</th>}
                {activeTab === 'alunos' && <th style={styles.th}>Status</th>}
                {activeTab === 'precadastros' && <th style={styles.th}>Status</th>}
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
            {getFilteredUsers().map(user => (
              <tr key={user.id}>
                <td style={styles.td}>
                  {`${user.first_name} ${user.last_name || ''}`.trim()}
                </td>
                {activeTab === 'alunos' && (
                  <td style={styles.td}>
                    {user.foto_perfil ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center' }}>
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
                <td style={styles.td}>{user.cpf || user.username}</td>
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
                  <td style={styles.td}>{user.status || '-'}</td>
                )}
                <td style={styles.td}>
                  <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.35rem', overflowX: 'auto' }}>
                    <button
                      style={{ ...styles.actionButton, ...styles.editButton }}
                      onClick={() => handleEdit(user)}
                    >
                      Editar
                    </button>
                    {activeTab !== 'precadastros' && (
                      <button
                        style={{ ...styles.actionButton, ...styles.deleteButton }}
                        onClick={() => handleDelete(user.id)}
                      >
                        Excluir
                      </button>
                    )}
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

      {showModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={styles.title}>
              {editingUser 
                ? (activeTab === 'precadastros' ? 'Editar Pré-cadastro' : `Editar ${activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}`)
                : (activeTab === 'precadastros' ? 'Novo Pré-cadastro' : `Novo ${activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}`)
              }
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
                  required={activeTab !== 'precadastros'}
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
                  required={activeTab !== 'precadastros'}
                />
              </div>

              {formData.data_nascimento && (
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
                          required={activeTab !== 'precadastros'}
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
                          required={activeTab !== 'precadastros'}
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

              <div style={{ marginTop: '20px', display: 'flex', gap: '1rem' }}>
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
                  {editingUser ? 'Salvar' : `Cadastrar ${activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}`}
                </button>
              </div>

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

              {activeTab !== 'alunos' && (
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
                    {editingUser ? 'Salvar' : `Cadastrar ${activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}`}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {showMatriculaModal && matriculaPrecadastro && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={styles.title}>Matricular pré-cadastro</h2>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              A matrícula adiciona R$ 90,00 à primeira mensalidade e o vencimento será em 48h.
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
                    placeholder="Apenas números"
                    required
                  />
                </div>
              )}

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

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="matricula_plano">
                  Plano
                </label>
                <select
                  id="matricula_plano"
                  name="plano"
                  value={matriculaForm.plano}
                  onChange={handleMatriculaChange}
                  style={styles.select}
                  required
                >
                  <option value="3x">3 vezes na semana (R$ 150,00)</option>
                  <option value="2x">2 vezes na semana (R$ 130,00)</option>
                  <option value="1x">1 vez na semana (R$ 110,00)</option>
                </select>
              </div>

              {['1x', '2x'].includes(matriculaForm.plano) && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Dias habilitados ({matriculaForm.dias_habilitados.length}/{PLANO_LIMITES[matriculaForm.plano] || 0})
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
              )}

              {!matriculaForm.ja_aluno && (
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="matricula_valor_primeira">
                    Valor da primeira mensalidade (sem matrícula)
                  </label>
                  <input
                    type="number"
                    id="matricula_valor_primeira"
                    name="valor_primeira_mensalidade"
                    value={matriculaForm.valor_primeira_mensalidade}
                    onChange={handleMatriculaChange}
                    style={styles.input}
                    min="0"
                    step="0.01"
                    required
                  />
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    Total com matrícula: <strong>R$ {totalPrimeiraMensalidade()}</strong>
                  </div>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    name="plano_familia"
                    checked={matriculaForm.plano_familia}
                    onChange={handleMatriculaChange}
                  />
                  Plano família (desconto de R$ 10,00 na mensalidade)
                </label>
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

      {showParqModal && selectedParqUser && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
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
    </div>
  );
}

export default CadastroUsuario;