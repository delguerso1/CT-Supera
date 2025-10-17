import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

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
    color: '#1a237e',
    margin: 0,
  },
  button: {
    backgroundColor: '#1a237e',
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
  },
  tab: {
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#f5f5f5',
    cursor: 'pointer',
    fontSize: '1rem',
    '&:hover': {
      backgroundColor: '#e0e0e0',
    },
  },
  activeTab: {
    backgroundColor: '#1a237e',
    color: 'white',
    '&:hover': {
      backgroundColor: '#1a237e',
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
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    marginRight: '0.5rem',
    fontSize: '0.9rem',
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
    // Campos do PAR-Q
    parq_question_1: false,
    parq_question_2: false,
    parq_question_3: false,
    parq_question_4: false,
    parq_question_5: false,
    parq_question_6: false,
    parq_question_7: false,
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
  const [filtroCtSelecionado, setFiltroCtSelecionado] = useState('');

  // Defina fetchUsers usando useCallback
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('[DEBUG] Iniciando busca de usuários...');
      console.log('[DEBUG] Tab ativa:', activeTab);

      if (activeTab === 'precadastros') {
        console.log('[DEBUG] Buscando pré-cadastros...');
        const response = await api.get('usuarios/precadastros/');
        console.log('[DEBUG] Resposta pré-cadastros:', response.data);
        if (response.data && response.data.results) {
          setUsers(response.data.results);
        } else {
          setUsers(response.data);
        }
      } else {
        console.log('[DEBUG] Buscando usuários...');
        const tipoMap = {
          'alunos': 'aluno',
          'professores': 'professor',
          'gerentes': 'gerente'
        };
        const tipoEsperado = tipoMap[activeTab];
        console.log('[DEBUG] Tipo esperado:', tipoEsperado);
        
        const response = await api.get(`usuarios/?tipo=${tipoEsperado}`);
        console.log('[DEBUG] Resposta completa:', response);
        console.log('[DEBUG] Dados recebidos:', response.data);
        
        if (response.data && response.data.results) {
          setUsers(response.data.results);
        } else if (Array.isArray(response.data)) {
          setUsers(response.data);
        } else {
          console.error('[DEBUG] Formato de resposta inválido:', response.data);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    let valorFormatado = value;

    if (name === 'telefone' || name === 'telefone_responsavel' || name === 'telefone_emergencia') {
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
      setError(err.response?.data?.error || 'Erro ao cadastrar usuário.');
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
        const response = await api.delete(`usuarios/${userId}/`);
        if (response.status === 204) {
          setSuccess(activeTab === 'precadastros' ? 'Pré-cadastro excluído com sucesso!' : 'Usuário excluído com sucesso!');
          fetchUsers();
        }
      } catch (error) {
        console.error('[DEBUG] Erro ao excluir:', error);
        setError('Erro ao excluir. Tente novamente.');
      }
    }
  };

  const handleNewUser = () => {
    setEditingUser(null);
    // setMensalidade(null);
    // setValorMensalidade('');
    
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
    try {
      const cpf = prompt('Digite o CPF do aluno (apenas números):');
      if (!cpf) {
        return; // Usuário cancelou a operação
      }
      const diaVenc = prompt('Digite o dia de vencimento da mensalidade (1-31):');
      if (!diaVenc) {
        return;
      }
      const valorMensal = prompt('Digite o valor da mensalidade (ex: 150.00):');
      if (!valorMensal) {
        return;
      }
      const response = await api.post(`usuarios/finalizar-agendamento/${precadastroId}/`, {
        cpf: cpf,
        dia_vencimento: diaVenc,
        valor_mensalidade: valorMensal
      });
      if (response.data.message) {
        setSuccess('Pré-cadastro convertido em aluno com sucesso!');
        fetchUsers();
        // Atualiza o dashboard se a função foi fornecida
        if (onUserChange) {
          onUserChange();
        }
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao converter pré-cadastro:', error);
      setError(error.response?.data?.error || 'Erro ao converter pré-cadastro. Tente novamente.');
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
    if (!filtroCtSelecionado || activeTab !== 'alunos') {
      return users;
    }
    
    return users.filter(user => {
      if (!Array.isArray(user.centros_treinamento) || user.centros_treinamento.length === 0) {
        return false;
      }
      return user.centros_treinamento.some(ct => ct.id === parseInt(filtroCtSelecionado));
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          {activeTab === 'precadastros' ? 'Gerenciar Pré-cadastros' : `Gerenciar ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
        </h2>
        <button style={styles.button} onClick={handleNewUser}>
          {activeTab === 'precadastros' ? 'Novo Pré-cadastro' : 
           activeTab === 'professores' ? 'Novo Professor' :
           activeTab === 'gerentes' ? 'Novo Gerente' :
           `Novo ${activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}`}
        </button>
      </div>

      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'alunos' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('alunos')}
        >
          Alunos
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'professores' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('professores')}
        >
          Professores
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'gerentes' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('gerentes')}
        >
          Gerentes
        </button>
        <button
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
      {activeTab === 'alunos' && Array.isArray(centrosTreinamento) && centrosTreinamento.length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ fontWeight: '500', color: '#333' }}>
            Filtrar por Centro de Treinamento:
          </label>
          <select
            value={filtroCtSelecionado}
            onChange={(e) => setFiltroCtSelecionado(e.target.value)}
            style={{
              ...styles.select,
              minWidth: '250px',
            }}
          >
            <option value="">Todos os CTs</option>
            {Array.isArray(centrosTreinamento) && centrosTreinamento.map(ct => (
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
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          Carregando...
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>CPF</th>
              <th style={styles.th}>E-mail</th>
              <th style={styles.th}>Telefone</th>
              {activeTab === 'alunos' && <th style={styles.th}>Centro(s) de Treinamento</th>}
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
                  {activeTab === 'alunos' && !user.is_active && user.email && user.email !== 'pendente' && (
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

              {/* Ficha Médica - apenas para alunos */}
              {activeTab === 'alunos' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Questionário de Prontidão para Atividade Física (PAR-Q)
                  </label>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                    Marque "Sim" se alguma das perguntas se aplica a você
                  </div>
                  
                  {[
                    {
                      field: 'parq_question_1',
                      question: 'Alguma vez um médico disse que você tem um problema de coração e que só deveria fazer atividade física recomendada por um médico?'
                    },
                    {
                      field: 'parq_question_2',
                      question: 'Você sente dor no peito quando faz atividade física?'
                    },
                    {
                      field: 'parq_question_3',
                      question: 'No último mês, você teve dor no peito quando não estava fazendo atividade física?'
                    },
                    {
                      field: 'parq_question_4',
                      question: 'Você perde o equilíbrio por causa de tontura ou alguma vez perdeu a consciência?'
                    },
                    {
                      field: 'parq_question_5',
                      question: 'Você tem algum problema ósseo ou articular que poderia piorar com a mudança de sua atividade física?'
                    },
                    {
                      field: 'parq_question_6',
                      question: 'Atualmente um médico está prescrevendo medicamentos para sua pressão arterial ou condição cardíaca?'
                    },
                    {
                      field: 'parq_question_7',
                      question: 'Você sabe de alguma outra razão pela qual não deveria fazer atividade física?'
                    }
                  ].map((item, index) => (
                    <div key={item.field} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', minWidth: '60px' }}>
                          <input
                            type="checkbox"
                            name={item.field}
                            checked={formData[item.field] || false}
                            onChange={(e) => handleChange({
                              target: {
                                name: item.field,
                                value: e.target.checked
                              }
                            })}
                            style={{ margin: 0 }}
                          />
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Sim</span>
                        </label>
                        <div style={{ flex: 1, fontSize: '14px', lineHeight: '1.4' }}>
                          <strong>{index + 1}.</strong> {item.question}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px', fontSize: '13px', color: '#666' }}>
                    <strong>Importante:</strong> Se você respondeu "Sim" a alguma pergunta, consulte seu médico antes de começar um programa de atividade física.
                  </div>
                </div>
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

              {formData.tipo === 'aluno' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="diaVencimento">
                      Dia de Vencimento da Mensalidade
                    </label>
                    <input
                      type="number"
                      id="diaVencimento"
                      name="diaVencimento"
                      value={diaVencimento}
                      onChange={e => setDiaVencimento(e.target.value)}
                      style={styles.input}
                      min="1"
                      max="31"
                      placeholder="Ex: 10"
                      required={activeTab !== 'precadastros'}
                    />
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

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    // setMensalidade(null);
                    // setValorMensalidade('');
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CadastroUsuario;