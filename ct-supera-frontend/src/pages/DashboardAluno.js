import React, { useEffect, useState } from 'react';
import api, { MEDIA_URL } from '../services/api';

// Hook para detectar tamanho da tela
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth > 768 && window.innerWidth <= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth > 768 && window.innerWidth <= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isMobile, isTablet };
};

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
  },
  sidebar: {
    width: '280px',
    backgroundColor: '#1a237e',
    color: 'white',
    padding: '20px',
    boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    overflowY: 'auto',
    zIndex: 1000
  },
  mainContent: {
    flex: 1,
    marginLeft: '280px',
    padding: '20px'
  },
  profileSection: {
    textAlign: 'center',
    paddingBottom: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    marginBottom: '20px'
  },
  profilePhoto: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 15px',
    fontSize: '40px',
    color: '#1a237e',
    border: '3px solid rgba(255,255,255,0.3)',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  profileName: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '5px'
  },
  profileStatus: {
    fontSize: '14px',
    opacity: 0.8
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    marginBottom: '8px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontSize: '16px'
  },
  activeMenuItem: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    fontWeight: 'bold'
  },
  menuIcon: {
    marginRight: '12px',
    fontSize: '20px'
  },
  contentArea: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  contentTitle: {
    fontSize: '24px',
    color: '#1a237e',
    marginBottom: '30px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0'
  },
  statTitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px',
    textTransform: 'uppercase',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: '4px'
  },
  statSubtitle: {
    fontSize: '12px',
    color: '#999'
  },
  checkinCard: {
    backgroundColor: '#e8f5e9',
    border: '1px solid #4caf50',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px'
  },
  checkinTitle: {
    color: '#2e7d32',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  checkinButton: {
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '10px'
  },
  checkinButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  },
  form: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '500'
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'border-color 0.3s ease'
  },
  textarea: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    resize: 'vertical',
    minHeight: '100px'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px'
  },
  primaryButton: {
    backgroundColor: '#1a237e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    color: '#666',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px'
  },
  th: {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#666',
    borderBottom: '2px solid #e0e0e0'
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #e0e0e0',
    color: '#333'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  statusActive: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32'
  },
  statusInactive: {
    backgroundColor: '#ffebee',
    color: '#c62828'
  },
  statusPresent: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32'
  },
  statusAbsent: {
    backgroundColor: '#ffebee',
    color: '#c62828'
  },
  statusPaid: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32'
  },
  statusPending: {
    backgroundColor: '#fff3e0',
    color: '#f57c00'
  },
  paymentButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  pixButton: {
    backgroundColor: '#32BCAD',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease'
  },
  bankButton: {
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease'
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  success: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    padding: '40px',
    fontSize: '16px'
  },
  pixContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: '12px',
    padding: '30px',
    marginTop: '20px',
    textAlign: 'center'
  },
  pixTitle: {
    color: '#32BCAD',
    marginBottom: '20px',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  qrCode: {
    maxWidth: '200px',
    height: 'auto',
    marginBottom: '20px'
  },
  pixCodeWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px',
    marginTop: '20px'
  },
  pixCode: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '14px',
    wordBreak: 'break-all',
    maxWidth: '300px'
  },
  copyButton: {
    backgroundColor: '#32BCAD',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    fontWeight: 'bold'
  }
};

function formatCurrency(value) {
  if (!value) return 'R$ 0,00';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function DashboardAluno({ user }) {
  const { isMobile, isTablet } = useResponsive();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [aluno, setAluno] = useState(null);
  const [historicoAulas, setHistoricoAulas] = useState([]);
  const [historicoMensalidades, setHistoricoMensalidades] = useState([]);
  const [erro, setErro] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [mensalidadesPendentes, setMensalidadesPendentes] = useState([]);
  const [transacaoPix, setTransacaoPix] = useState(null);
  const [pagamentoLoading, setPagamentoLoading] = useState(false);
  const [pagamentoBancarioLoading, setPagamentoBancarioLoading] = useState(false);
  const [statusHoje, setStatusHoje] = useState({
    checkin_realizado: false,
    presenca_confirmada: false,
    pode_fazer_checkin: true
  });
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefone: '',
    endereco: '',
    data_nascimento: '',
    nome_responsavel: '',
    telefone_responsavel: '',
    telefone_emergencia: '',
    parq_question_1: false,
    parq_question_2: false,
    parq_question_3: false,
    parq_question_4: false,
    parq_question_5: false,
    parq_question_6: false,
    parq_question_7: false
  });
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const resp = await api.get('alunos/painel-aluno/');
        setAluno(resp.data.usuario);
        setHistoricoAulas(resp.data.historico_aulas);
        setHistoricoMensalidades(resp.data.historico_pagamentos);
        setStatusHoje(resp.data.status_hoje || {
          checkin_realizado: false,
          presenca_confirmada: false,
          pode_fazer_checkin: true
        });
        setForm({
          first_name: resp.data.usuario.first_name || '',
          last_name: resp.data.usuario.last_name || '',
          email: resp.data.usuario.email || '',
          telefone: resp.data.usuario.telefone || '',
          endereco: resp.data.usuario.endereco || '',
          data_nascimento: resp.data.usuario.data_nascimento || '',
          nome_responsavel: resp.data.usuario.nome_responsavel || '',
          telefone_responsavel: resp.data.usuario.telefone_responsavel || '',
          telefone_emergencia: resp.data.usuario.telefone_emergencia || '',
          parq_question_1: resp.data.usuario.parq_question_1 || false,
          parq_question_2: resp.data.usuario.parq_question_2 || false,
          parq_question_3: resp.data.usuario.parq_question_3 || false,
          parq_question_4: resp.data.usuario.parq_question_4 || false,
          parq_question_5: resp.data.usuario.parq_question_5 || false,
          parq_question_6: resp.data.usuario.parq_question_6 || false,
          parq_question_7: resp.data.usuario.parq_question_7 || false
        });
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setErro('Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.id]);

  const handleEdit = () => {
    setEditMode(true);
    setSuccess('');
    setErro('');
  };

  const handleCancel = () => {
    setEditMode(false);
    setForm({
      first_name: aluno?.first_name || '',
      last_name: aluno?.last_name || '',
      email: aluno?.email || '',
      telefone: aluno?.telefone || '',
      endereco: aluno?.endereco || '',
      data_nascimento: aluno?.data_nascimento || '',
      nome_responsavel: aluno?.nome_responsavel || '',
      telefone_responsavel: aluno?.telefone_responsavel || '',
      telefone_emergencia: aluno?.telefone_emergencia || '',
      parq_question_1: aluno?.parq_question_1 || false,
      parq_question_2: aluno?.parq_question_2 || false,
      parq_question_3: aluno?.parq_question_3 || false,
      parq_question_4: aluno?.parq_question_4 || false,
      parq_question_5: aluno?.parq_question_5 || false,
      parq_question_6: aluno?.parq_question_6 || false,
      parq_question_7: aluno?.parq_question_7 || false
    });
    setSuccess('');
    setErro('');
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSuccess('');
    setErro('');
    const fullForm = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      telefone: form.telefone,
      endereco: form.endereco,
      data_nascimento: form.data_nascimento,
      nome_responsavel: form.nome_responsavel,
      telefone_responsavel: form.telefone_responsavel,
      telefone_emergencia: form.telefone_emergencia,
      parq_question_1: form.parq_question_1,
      parq_question_2: form.parq_question_2,
      parq_question_3: form.parq_question_3,
      parq_question_4: form.parq_question_4,
      parq_question_5: form.parq_question_5,
      parq_question_6: form.parq_question_6,
      parq_question_7: form.parq_question_7,
      username: aluno.username,
      tipo: aluno.tipo,
      cpf: aluno.cpf,
      ativo: aluno.ativo,
    };
    try {
      await api.put(`usuarios/${aluno.id}/`, fullForm);
      setSuccess('Dados atualizados com sucesso!');
      setEditMode(false);
      const resp = await api.get('alunos/painel-aluno/');
      setAluno(resp.data.usuario);
    } catch (err) {
      setErro('Erro ao atualizar dados.');
    }
  };

  const handleCheckin = async () => {
    try {
      setCheckinLoading(true);
      setErro('');
      setSuccess('');
      setMensalidadesPendentes([]);
      
      const response = await api.post('alunos/realizar-checkin/');
      setSuccess(response.data.message);
      
      const resp = await api.get('alunos/painel-aluno/');
      setHistoricoAulas(resp.data.historico_aulas);
      setStatusHoje(resp.data.status_hoje || {
        checkin_realizado: false,
        presenca_confirmada: false,
        pode_fazer_checkin: true
      });
    } catch (err) {
      console.error('Erro ao realizar check-in:', err);
      const errorMessage = err.response?.data?.error || 'Erro ao realizar check-in.';
      setErro(errorMessage);
      
      if (errorMessage.includes('pendências de pagamento')) {
        if (err.response?.data?.mensalidades_pendentes) {
          setMensalidadesPendentes(err.response.data.mensalidades_pendentes);
        }
      } else if (errorMessage.includes('não está matriculado')) {
        setErro(`${errorMessage} Por favor, entre em contato com a secretaria.`);
      }
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleGerarPix = async (mensalidadeId) => {
    try {
      setPagamentoLoading(true);
      setErro('');
      setSuccess('');
      setTransacaoPix(null);

      const response = await api.post(`financeiro/pix/gerar/${mensalidadeId}/`);
      setTransacaoPix(response.data.transacao);
      setSuccess(response.data.message);

      const checkStatus = setInterval(async () => {
        try {
          const statusResponse = await api.get(`financeiro/pix/status/${response.data.transacao.id}/`);
          const { transacao } = statusResponse.data;

          if (transacao.status === 'aprovado') {
            clearInterval(checkStatus);
            setSuccess('Pagamento aprovado com sucesso!');
            setTransacaoPix(null);
            const resp = await api.get('alunos/painel-aluno/');
            setHistoricoMensalidades(resp.data.historico_pagamentos);
          } else if (transacao.status === 'expirado') {
            clearInterval(checkStatus);
            setErro('Pagamento PIX expirado. Por favor, gere um novo pagamento.');
            setTransacaoPix(null);
          }
        } catch (err) {
          console.error('Erro ao verificar status:', err);
        }
      }, 5000);

      setTimeout(() => {
        clearInterval(checkStatus);
      }, 30 * 60 * 1000);

    } catch (err) {
      console.error('Erro ao gerar PIX:', err);
      setErro(err.response?.data?.error || 'Erro ao gerar pagamento PIX.');
    } finally {
      setPagamentoLoading(false);
    }
  };

  const handleGerarPagamentoBancario = async (mensalidadeId) => {
    try {
      setPagamentoBancarioLoading(true);
      setErro('');
      setSuccess('');

      const response = await api.post(`financeiro/pagamento-bancario/gerar/${mensalidadeId}/`);
      
      if (response.data.payment_url) {
        window.open(response.data.payment_url, '_blank');
        setSuccess('Redirecionando para o pagamento bancário...');
      } else {
        setErro('Erro ao gerar link de pagamento bancário.');
      }

    } catch (err) {
      console.error('Erro ao gerar pagamento bancário:', err);
      setErro(err.response?.data?.error || 'Erro ao gerar pagamento bancário.');
    } finally {
      setPagamentoBancarioLoading(false);
    }
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        setErro('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      
      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErro('A imagem deve ter no máximo 5MB.');
        return;
      }
      
      setFotoPerfil(file);
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setFotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setErro('');
    }
  };

  const handleUploadFoto = async () => {
    if (!fotoPerfil) {
      setErro('Por favor, selecione uma imagem.');
      return;
    }

    try {
      setUploadingFoto(true);
      setErro('');
      
      const formData = new FormData();
      formData.append('foto_perfil', fotoPerfil);
      
      await api.put(`usuarios/${aluno.id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSuccess('Foto de perfil atualizada com sucesso!');
      setFotoPerfil(null);
      setFotoPreview(null);
      
      // Atualizar dados do aluno
      const resp = await api.get('alunos/painel-aluno/');
      setAluno(resp.data.usuario);
      
    } catch (err) {
      console.error('Erro ao fazer upload da foto:', err);
      setErro(err.response?.data?.error || 'Erro ao fazer upload da foto.');
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleCancelFoto = () => {
    setFotoPerfil(null);
    setFotoPreview(null);
    setErro('');
  };

  if (loading) return <div style={styles.container}>Carregando...</div>;
  if (!aluno) return <div style={styles.container}>Erro ao carregar painel do aluno.</div>;

  const renderDashboard = () => (
    <div>
      <h2 style={styles.contentTitle}>
        <span>📊</span>
        Dashboard
      </h2>
      
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Status do Aluno</div>
          <div style={styles.statValue}>
            <span style={{
              ...styles.statusBadge,
              ...(aluno.ativo ? styles.statusActive : styles.statusInactive)
            }}>
              {aluno.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <div style={styles.statSubtitle}>Status atual da matrícula</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Aulas Realizadas</div>
          <div style={styles.statValue}>{historicoAulas.length}</div>
          <div style={styles.statSubtitle}>Total de aulas participadas</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Mensalidades</div>
          <div style={styles.statValue}>{historicoMensalidades.length}</div>
          <div style={styles.statSubtitle}>Total de mensalidades</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Check-in Hoje</div>
          <div style={styles.statValue}>
            <span style={{
              ...styles.statusBadge,
              ...(statusHoje.checkin_realizado ? styles.statusActive : styles.statusInactive)
            }}>
              {statusHoje.checkin_realizado ? 'Realizado' : 'Pendente'}
            </span>
          </div>
          <div style={styles.statSubtitle}>Status do check-in de hoje</div>
        </div>
      </div>

      {!statusHoje.checkin_realizado && statusHoje.pode_fazer_checkin && (
        <div className="checkin-card" style={styles.checkinCard}>
          <div style={styles.checkinTitle}>
            <span>✅</span>
            Check-in Disponível
          </div>
          <p>Você pode realizar o check-in para a aula de hoje.</p>
          <button
            className="checkin-button"
            onClick={handleCheckin}
            disabled={checkinLoading}
            style={{
              ...styles.checkinButton,
              ...(checkinLoading && styles.checkinButtonDisabled)
            }}
          >
            {checkinLoading ? 'Realizando check-in...' : 'Realizar Check-in'}
          </button>
        </div>
      )}

      {statusHoje.checkin_realizado && (
        <div className="checkin-card" style={styles.checkinCard}>
          <div style={styles.checkinTitle}>
            <span>✅</span>
            Check-in Realizado
          </div>
          <p>Você já realizou o check-in para a aula de hoje.</p>
        </div>
      )}

      {!statusHoje.pode_fazer_checkin && (
        <div style={{...styles.checkinCard, backgroundColor: '#fff3e0', borderColor: '#ff9800'}}>
          <div style={{...styles.checkinTitle, color: '#f57c00'}}>
            <span>⚠️</span>
            Pagamento Pendente
          </div>
          <p>Você possui pendências de pagamento. Regularize sua situação para fazer check-in.</p>
        </div>
      )}
    </div>
  );

  const renderMeuPerfil = () => (
    <div>
      <h2 style={styles.contentTitle}>
        <span>👤</span>
        Meu Perfil
      </h2>
      
      {/* Seção de Foto */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '30px',
        border: '1px solid #e0e0e0'
      }}>
        <h3 style={{
          fontSize: '18px',
          color: '#1a237e',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>📷</span>
          Foto de Perfil
        </h3>
        
        <div className="photo-upload-container" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '30px',
          flexWrap: 'wrap'
        }}>
          {/* Foto Atual */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px',
              fontSize: '48px',
              color: '#1a237e',
              border: '3px solid #e0e0e0',
              overflow: 'hidden',
              backgroundImage: aluno?.foto_perfil ? `url(${MEDIA_URL}${aluno.foto_perfil})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}>
              {!aluno?.foto_perfil && getInitials(`${aluno?.first_name} ${aluno?.last_name}`)}
            </div>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Foto Atual
            </p>
          </div>
          
          {/* Preview da Nova Foto */}
          {fotoPreview && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                backgroundImage: `url(${fotoPreview})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                margin: '0 auto 10px',
                border: '3px solid #4caf50'
              }} />
              <p style={{ fontSize: '14px', color: '#4caf50', margin: 0, fontWeight: 'bold' }}>
                Nova Foto
              </p>
            </div>
          )}
          
          {/* Controles de Upload */}
          <div className="photo-upload-controls" style={{ flex: 1, minWidth: '250px' }}>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                style={{
                  display: 'none'
                }}
                id="foto-input"
              />
              <label
                htmlFor="foto-input"
                style={{
                  backgroundColor: '#1a237e',
                  color: 'white',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-block',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
              >
                📁 Selecionar Foto
              </label>
            </div>
            
            {fotoPerfil && (
              <div style={{
                backgroundColor: '#e8f5e9',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '15px'
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#2e7d32' }}>
                  <strong>Arquivo selecionado:</strong> {fotoPerfil.name}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                  Tamanho: {(fotoPerfil.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
            
            {fotoPerfil && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleUploadFoto}
                  disabled={uploadingFoto}
                  style={{
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    cursor: uploadingFoto ? 'not-allowed' : 'pointer',
                    opacity: uploadingFoto ? 0.7 : 1
                  }}
                >
                  {uploadingFoto ? 'Enviando...' : 'Salvar Foto'}
                </button>
                <button
                  onClick={handleCancelFoto}
                  style={{
                    backgroundColor: '#f5f5f5',
                    color: '#666',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div style={{
          marginTop: '15px',
          padding: '12px',
          backgroundColor: '#fff3cd',
          borderRadius: '6px',
          border: '1px solid #ffeaa7'
        }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#856404' }}>
            <strong>💡 Dica:</strong> Use imagens quadradas para melhor resultado. 
            Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB.
          </p>
        </div>
      </div>
      
      {editMode ? (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nome</label>
            <input
              type="text"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Sobrenome</label>
            <input
              type="text"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Telefone</label>
            <input
              type="tel"
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Endereço</label>
            <input
              type="text"
              name="endereco"
              value={form.endereco}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Data de Nascimento</label>
            <input
              type="date"
              name="data_nascimento"
              value={form.data_nascimento}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nome do Responsável</label>
            <input
              type="text"
              name="nome_responsavel"
              value={form.nome_responsavel}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Telefone do Responsável</label>
            <input
              type="tel"
              name="telefone_responsavel"
              value={form.telefone_responsavel}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Telefone de Emergência</label>
            <input
              type="tel"
              name="telefone_emergencia"
              value={form.telefone_emergencia}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          {/* Questionário PAR-Q */}
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
              <div key={item.field} style={{ marginBottom: '10px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name={item.field}
                    checked={form[item.field] || false}
                    onChange={(e) => handleChange({
                      target: {
                        name: item.field,
                        value: e.target.checked
                      }
                    })}
                    style={{ margin: 0, marginTop: '2px' }}
                  />
                  <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.3' }}>
                    <strong>{index + 1}.</strong> {item.question}
                  </div>
                </label>
              </div>
            ))}
            
            <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
              <strong>Importante:</strong> Se você respondeu "Sim" a alguma pergunta, consulte seu médico antes de começar um programa de atividade física.
            </div>
          </div>
          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.primaryButton}>
              Salvar Alterações
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={styles.secondaryButton}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nome Completo</label>
            <div style={styles.input}>
              {aluno?.first_name} {aluno?.last_name}
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <div style={styles.input}>{aluno?.email}</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Telefone</label>
            <div style={styles.input}>{aluno?.telefone}</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Endereço</label>
            <div style={styles.input}>{aluno?.endereco || '-'}</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Data de Nascimento</label>
            <div style={styles.input}>
              {aluno?.data_nascimento
                ? new Date(aluno.data_nascimento).toLocaleDateString()
                : '-'}
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nome do Responsável</label>
            <div style={styles.input}>{aluno?.nome_responsavel || '-'}</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Telefone do Responsável</label>
            <div style={styles.input}>{aluno?.telefone_responsavel || '-'}</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Telefone de Emergência</label>
            <div style={styles.input}>{aluno?.telefone_emergencia || '-'}</div>
          </div>
        </div>
        
        {/* Seção PAR-Q - Questionário de Aptidão para Atividade Física */}
        <div style={{
          gridColumn: '1 / -1',
          marginTop: '20px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{
            fontSize: '18px',
            color: '#1a237e',
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📋</span>
            Questionário PAR-Q (Prontidão para Atividade Física)
          </h3>
          
          {aluno?.parq_completed ? (
            <div>
              <div style={{
                backgroundColor: '#e8f5e9',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>✅</span>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#2e7d32' }}>
                    Questionário Completo
                  </div>
                  {aluno?.parq_completion_date && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Preenchido em: {new Date(aluno.parq_completion_date).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              </div>
              
              {[
                {
                  field: 'parq_question_1',
                  question: '1. Alguma vez um médico disse que você tem um problema de coração e que só deveria fazer atividade física recomendada por um médico?'
                },
                {
                  field: 'parq_question_2',
                  question: '2. Você sente dor no peito quando faz atividade física?'
                },
                {
                  field: 'parq_question_3',
                  question: '3. No último mês, você teve dor no peito quando não estava fazendo atividade física?'
                },
                {
                  field: 'parq_question_4',
                  question: '4. Você perde o equilíbrio por causa de tontura ou alguma vez perdeu a consciência?'
                },
                {
                  field: 'parq_question_5',
                  question: '5. Você tem algum problema ósseo ou articular que poderia piorar com a mudança de sua atividade física?'
                },
                {
                  field: 'parq_question_6',
                  question: '6. Atualmente um médico está prescrevendo medicamentos para sua pressão arterial ou condição cardíaca?'
                },
                {
                  field: 'parq_question_7',
                  question: '7. Você sabe de alguma outra razão pela qual não deveria fazer atividade física?'
                }
              ].map((item) => (
                <div key={item.field} style={{
                  padding: '10px',
                  marginBottom: '8px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <span style={{
                    fontSize: '18px',
                    color: aluno?.[item.field] ? '#d32f2f' : '#4caf50'
                  }}>
                    {aluno?.[item.field] ? '⚠️' : '✅'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                      {item.question}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: aluno?.[item.field] ? '#d32f2f' : '#4caf50'
                    }}>
                      Resposta: {aluno?.[item.field] ? 'Sim' : 'Não'}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Alerta se alguma resposta for Sim */}
              {[1, 2, 3, 4, 5, 6, 7].some(i => aluno?.[`parq_question_${i}`]) && (
                <div style={{
                  marginTop: '15px',
                  padding: '15px',
                  backgroundColor: '#fff3cd',
                  borderRadius: '8px',
                  border: '2px solid #ffc107'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>⚠️</span>
                    <div style={{ fontWeight: 'bold', color: '#856404', fontSize: '16px' }}>
                      Atenção - Consulta Médica Necessária
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', color: '#856404' }}>
                    Você respondeu "Sim" a pelo menos uma pergunta do PAR-Q. 
                    É recomendado consultar um médico antes de iniciar ou intensificar 
                    atividades físicas.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              padding: '20px',
              backgroundColor: '#fff3cd',
              borderRadius: '8px',
              border: '1px solid #ffc107',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '48px', marginBottom: '10px', display: 'block' }}>📋</span>
              <div style={{ fontSize: '16px', color: '#856404', marginBottom: '10px' }}>
                <strong>Questionário PAR-Q Pendente</strong>
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                Preencha o questionário PAR-Q para avaliar sua aptidão para atividade física.
              </div>
              <button
                onClick={handleEdit}
                style={{
                  ...styles.primaryButton,
                  backgroundColor: '#ff9800'
                }}
              >
                Preencher Questionário
              </button>
            </div>
          )}
        </div>
        
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={styles.buttonGroup}>
            <button
              onClick={handleEdit}
              style={styles.primaryButton}
            >
              Editar Perfil
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderCheckin = () => (
    <div>
      <h2 style={styles.contentTitle}>
        <span>✅</span>
        Check-in e Presença
      </h2>
      
      <div className="checkin-card" style={styles.checkinCard}>
        <div style={styles.checkinTitle}>
          <span>📅</span>
          Status de Hoje
        </div>
        <div style={{ marginBottom: '15px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            marginBottom: 8 
          }}>
            <span style={{
              fontSize: '14px',
              padding: '8px 12px',
              borderRadius: 8,
              backgroundColor: statusHoje.checkin_realizado ? '#4caf50' : '#ff9800',
              color: 'white',
              fontWeight: 'bold'
            }}>
              {statusHoje.checkin_realizado ? '✅ Check-in Realizado' : '⏳ Check-in Pendente'}
            </span>
            {statusHoje.presenca_confirmada && (
              <span style={{
                fontSize: '14px',
                padding: '8px 12px',
                borderRadius: 8,
                backgroundColor: '#2196f3',
                color: 'white',
                fontWeight: 'bold'
              }}>
                ✅ Presença Confirmada
              </span>
            )}
          </div>
          
          {!statusHoje.pode_fazer_checkin && (
            <div style={{
              fontSize: '14px',
              color: '#f44336',
              backgroundColor: '#ffebee',
              padding: '12px',
              borderRadius: 8,
              marginBottom: 8
            }}>
              ⚠️ Você possui pendências de pagamento. Regularize sua situação para fazer check-in.
            </div>
          )}
        </div>
        
        <button
          className="checkin-button"
          onClick={handleCheckin}
          disabled={checkinLoading || statusHoje.checkin_realizado || !statusHoje.pode_fazer_checkin}
          style={{
            ...styles.checkinButton,
            ...(checkinLoading || statusHoje.checkin_realizado || !statusHoje.pode_fazer_checkin) && styles.checkinButtonDisabled
          }}
        >
          {checkinLoading ? 'Realizando check-in...' : 
           statusHoje.checkin_realizado ? 'Check-in Realizado' : 
           !statusHoje.pode_fazer_checkin ? 'Pagamento Pendente' : 
           'Realizar Check-in'}
        </button>
      </div>

      <h3 style={{...styles.contentTitle, fontSize: '20px', marginTop: '30px'}}>
        <span>📋</span>
        Histórico de Aulas
      </h3>
      
      {historicoAulas.length > 0 ? (
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="table" style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Data</th>
                <th style={styles.th}>Turma</th>
                <th style={styles.th}>Professor</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {historicoAulas.map(aula => (
                <tr key={aula.id}>
                  <td style={styles.td}>
                    {new Date(aula.data).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>{aula.turma}</td>
                  <td style={styles.td}>{aula.professor}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      ...(aula.presente ? styles.statusPresent : styles.statusAbsent)
                    }}>
                      {aula.presente ? 'Presente' : 'Ausente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={styles.noData}>Nenhuma aula registrada.</p>
      )}
    </div>
  );

  const renderPagamentos = () => (
    <div>
      <h2 style={styles.contentTitle}>
        <span>💳</span>
        Pagamentos
      </h2>
      
      {mensalidadesPendentes.length > 0 && (
        <div style={{...styles.checkinCard, backgroundColor: '#fff3e0', borderColor: '#ff9800'}}>
          <div style={{...styles.checkinTitle, color: '#f57c00'}}>
            <span>⚠️</span>
            Mensalidades Pendentes
          </div>
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Mês/Ano</th>
                  <th style={styles.th}>Valor</th>
                  <th style={styles.th}>Vencimento</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {mensalidadesPendentes.map(mensalidade => (
                  <tr key={mensalidade.id}>
                    <td style={styles.td}>
                      {new Date(mensalidade.data_vencimento).toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </td>
                    <td style={styles.td}>
                      {formatCurrency(mensalidade.valor)}
                    </td>
                    <td style={styles.td}>
                      {new Date(mensalidade.data_vencimento).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        ...(mensalidade.status === 'atrasado' ? styles.statusAbsent : styles.statusPending)
                      }}>
                        {mensalidade.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div className="payment-buttons" style={styles.paymentButtons}>
                        <button
                          className="pix-button"
                          onClick={() => handleGerarPix(mensalidade.id)}
                          disabled={pagamentoLoading || pagamentoBancarioLoading}
                          style={{
                            ...styles.pixButton,
                            opacity: (pagamentoLoading || pagamentoBancarioLoading) ? 0.7 : 1
                          }}
                        >
                          {pagamentoLoading ? 'Gerando PIX...' : 'Pagar com PIX'}
                        </button>
                        <button
                          className="bank-button"
                          onClick={() => handleGerarPagamentoBancario(mensalidade.id)}
                          disabled={pagamentoLoading || pagamentoBancarioLoading}
                          style={{
                            ...styles.bankButton,
                            opacity: (pagamentoBancarioLoading || pagamentoLoading) ? 0.7 : 1
                          }}
                        >
                          {pagamentoBancarioLoading ? 'Gerando Banco...' : 'Pagar com Cartão'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h3 style={{...styles.contentTitle, fontSize: '20px', marginTop: '30px'}}>
        <span>📊</span>
        Histórico de Mensalidades
      </h3>
      
      {historicoMensalidades.length > 0 ? (
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="table" style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Mês/Ano</th>
                <th style={styles.th}>Valor</th>
                <th style={styles.th}>Vencimento</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Data de Pagamento</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {historicoMensalidades.map(mensalidade => (
                <tr key={mensalidade.id}>
                  <td style={styles.td}>
                    {new Date(mensalidade.data_vencimento).toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </td>
                  <td style={styles.td}>
                    {formatCurrency(mensalidade.valor)}
                  </td>
                  <td style={styles.td}>
                    {new Date(mensalidade.data_vencimento).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      ...(mensalidade.status === 'pago' ? styles.statusPaid : styles.statusPending)
                    }}>
                      {mensalidade.status === 'pago' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {mensalidade.data_pagamento
                      ? new Date(mensalidade.data_pagamento).toLocaleDateString()
                      : '-'}
                  </td>
                  <td style={styles.td}>
                    {mensalidade.status !== 'pago' && (
                      <div className="payment-buttons" style={styles.paymentButtons}>
                        <button
                          className="pix-button"
                          onClick={() => handleGerarPix(mensalidade.id)}
                          disabled={pagamentoLoading || pagamentoBancarioLoading}
                          style={{
                            ...styles.pixButton,
                            opacity: (pagamentoLoading || pagamentoBancarioLoading) ? 0.7 : 1
                          }}
                        >
                          {pagamentoLoading ? 'Gerando PIX...' : 'Pagar com PIX'}
                        </button>
                        <button
                          className="bank-button"
                          onClick={() => handleGerarPagamentoBancario(mensalidade.id)}
                          disabled={pagamentoLoading || pagamentoBancarioLoading}
                          style={{
                            ...styles.bankButton,
                            opacity: (pagamentoBancarioLoading || pagamentoLoading) ? 0.7 : 1
                          }}
                        >
                          {pagamentoBancarioLoading ? 'Gerando Banco...' : 'Pagar com Cartão'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={styles.noData}>Nenhuma mensalidade registrada.</p>
      )}
    </div>
  );

  // Estilos responsivos dinâmicos
  const responsiveStyles = {
    container: {
      ...styles.container,
      flexDirection: isMobile ? 'column' : 'row'
    },
    sidebar: {
      ...styles.sidebar,
      width: isMobile ? '100%' : (isTablet ? '240px' : '280px'),
      height: isMobile ? 'auto' : '100vh',
      position: isMobile ? 'relative' : 'fixed',
      marginBottom: isMobile ? '0' : '0',
      boxShadow: isMobile ? 'none' : styles.sidebar.boxShadow,
      borderBottom: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none'
    },
    mainContent: {
      ...styles.mainContent,
      marginLeft: isMobile ? '0' : (isTablet ? '240px' : '280px'),
      padding: isMobile ? '0.5rem' : '20px'
    }
  };

  return (
    <div className="dashboard-container" style={responsiveStyles.container}>
      {/* Sidebar */}
      <div className="dashboard-sidebar" style={responsiveStyles.sidebar}>
        <div style={styles.profileSection}>
          <div style={{
            ...styles.profilePhoto,
            backgroundImage: aluno?.foto_perfil ? `url(http://72.60.145.13${aluno.foto_perfil})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}>
            {!aluno?.foto_perfil && getInitials(`${aluno?.first_name} ${aluno?.last_name}`)}
          </div>
          <div style={styles.profileName}>
            {aluno?.first_name} {aluno?.last_name}
          </div>
          <div style={styles.profileStatus}>
            <span style={{
              ...styles.statusBadge,
              ...(aluno.ativo ? styles.statusActive : styles.statusInactive)
            }}>
              {aluno.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        <div>
          <div
            style={{
              ...styles.menuItem,
              ...(activeSection === 'dashboard' && styles.activeMenuItem)
            }}
            onClick={() => setActiveSection('dashboard')}
          >
            <span style={styles.menuIcon}>📊</span>
            Dashboard
          </div>
          <div
            style={{
              ...styles.menuItem,
              ...(activeSection === 'perfil' && styles.activeMenuItem)
            }}
            onClick={() => setActiveSection('perfil')}
          >
            <span style={styles.menuIcon}>👤</span>
            Meu Perfil
          </div>
          <div
            style={{
              ...styles.menuItem,
              ...(activeSection === 'checkin' && styles.activeMenuItem)
            }}
            onClick={() => setActiveSection('checkin')}
          >
            <span style={styles.menuIcon}>✅</span>
            Check-in
          </div>
          <div
            style={{
              ...styles.menuItem,
              ...(activeSection === 'pagamentos' && styles.activeMenuItem)
            }}
            onClick={() => setActiveSection('pagamentos')}
          >
            <span style={styles.menuIcon}>💳</span>
            Pagamentos
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main-content" style={responsiveStyles.mainContent}>
        {erro && (
          <div className="alert alert-danger" style={styles.error}>
            {erro}
          </div>
        )}

        {transacaoPix && (
          <div className="pix-container" style={styles.pixContainer}>
            <h3 style={styles.pixTitle}>Pagamento PIX</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Escaneie o QR Code abaixo ou copie o código PIX para realizar o pagamento.
              O código expira em 30 minutos.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <img
                className="qr-code"
                src={`data:image/png;base64,${transacaoPix.qr_code}`}
                alt="QR Code PIX"
                style={styles.qrCode}
              />
            </div>
            <div>
              <p style={{ color: '#666', marginBottom: '10px' }}>Código PIX Copia e Cola:</p>
              <div className="pix-code-wrapper" style={styles.pixCodeWrapper}>
                <code className="pix-code" style={styles.pixCode}>{transacaoPix.codigo_pix}</code>
                <button
                  className="copy-button"
                  onClick={() => {
                    navigator.clipboard.writeText(transacaoPix.codigo_pix);
                    setSuccess('Código PIX copiado!');
                  }}
                  style={styles.copyButton}
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>
        )}

        {success && <div className="alert alert-success" style={styles.success}>{success}</div>}

        <div className="dashboard-content-area" style={styles.contentArea}>
          {activeSection === 'dashboard' && renderDashboard()}
          {activeSection === 'perfil' && renderMeuPerfil()}
          {activeSection === 'checkin' && renderCheckin()}
          {activeSection === 'pagamentos' && renderPagamentos()}
        </div>
      </div>
    </div>
  );
}

export { styles };
export default DashboardAluno;