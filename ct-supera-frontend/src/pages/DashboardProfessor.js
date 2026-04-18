import React, { useEffect, useState } from 'react';
import api, { mediaProfileBackgroundImageUrl } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { NAVBAR_HEIGHT_CSS } from '../constants/layout';
import { apiDateToInputDate, formatApiDateDisplay, inputDateToApiDate } from '../utils/dateApi';

// Hook para detectar tamanho da tela
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [isTablet, setIsTablet] = useState(window.innerWidth > 1024 && window.innerWidth <= 1200);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
      setIsTablet(window.innerWidth > 1024 && window.innerWidth <= 1200);
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
    backgroundColor: '#f5f7fa'
  },
  sidebar: {
    width: '280px',
    backgroundColor: '#1F6C86',
    color: 'white',
    padding: '20px',
    boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
    position: 'fixed',
    top: NAVBAR_HEIGHT_CSS,
    left: 0,
    height: `calc(100vh - ${NAVBAR_HEIGHT_CSS})`,
    overflowY: 'auto',
    zIndex: 10
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
    color: '#1F6C86',
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
    color: '#1F6C86',
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
    color: '#1F6C86',
    marginBottom: '4px'
  },
  statSubtitle: {
    fontSize: '12px',
    color: '#999'
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
    marginTop: '20px',
    flexWrap: 'nowrap',
    overflowX: 'auto'
  },
  primaryButton: {
    backgroundColor: '#1F6C86',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    color: '#666',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
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
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: '#fff',
    padding: '30px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalTitle: {
    fontSize: '20px',
    color: '#1F6C86',
    marginBottom: '20px'
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    marginBottom: '8px'
  },
  checkbox: {
    width: '18px',
    height: '18px'
  },
  checkboxLabel: {
    flex: 1,
    fontSize: '16px'
  },
  actionButton: {
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease'
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    color: '#666',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease'
  }
};

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function DashboardProfessor({ user }) {
  const { isMobile, isTablet } = useResponsive();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [turmas, setTurmas] = useState([]);
  const [centros, setCentros] = useState([]);
  const [ctSelecionado, setCtSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [professor, setProfessor] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefone: '',
    endereco: '',
    data_nascimento: ''
  });
  const [success, setSuccess] = useState('');
  const [erro, setErro] = useState('');
  const [turmaPresenca, setTurmaPresenca] = useState(null);
  const [alunosPresenca, setAlunosPresenca] = useState([]);
  const [loadingPresenca, setLoadingPresenca] = useState(false);
  const [presencas, setPresencas] = useState({});
  const [observacaoMeta, setObservacaoMeta] = useState(null);
  const [observacaoTexto, setObservacaoTexto] = useState('');
  const [loadingObservacao, setLoadingObservacao] = useState(false);
  const [savingObservacao, setSavingObservacao] = useState(false);
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Verificar se o usuário existe e é do tipo professor
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.tipo !== 'professor') {
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    async function fetchTurmas() {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        console.log('🔍 Buscando turmas para o professor:', user.id);
        const resp = await api.get('turmas/', { params: { professor: user.id } });
        console.log('📥 Resposta da API:', resp.data);
        const turmasData = resp.data.results || resp.data;
        setTurmas(turmasData);

        // Extrai centros únicos dessas turmas
        const centrosMap = {};
        turmasData.forEach(turma => {
          console.log('📋 Processando turma:', turma);
          if (turma.ct) {
            const centroId = typeof turma.ct === 'object' ? turma.ct.id : turma.ct;
            const centroNome = turma.ct_nome || (typeof turma.ct === 'object' ? turma.ct.nome : '');
            
            if (centroId && centroNome && !centrosMap[centroId]) {
              centrosMap[centroId] = {
                id: centroId,
                nome: centroNome
              };
            }
          }
        });
        
        const centrosArray = Object.values(centrosMap);
        console.log('🏢 Centros extraídos:', centrosArray);
        setCentros(centrosArray);
      } catch (err) {
        console.error('❌ Erro ao buscar turmas:', err);
        setErro('Erro ao carregar turmas.');
      } finally {
        setLoading(false);
      }
    }
    fetchTurmas();
  }, [user?.id]);

  useEffect(() => {
    async function fetchPainel() {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const painelResp = await api.get('funcionarios/painel-professor/');
        setProfessor(painelResp.data);
        setForm({
          first_name: painelResp.data.first_name || '',
          last_name: painelResp.data.last_name || '',
          email: painelResp.data.email || '',
          telefone: painelResp.data.telefone || '',
          endereco: painelResp.data.endereco || '',
          data_nascimento: apiDateToInputDate(painelResp.data.data_nascimento || '') || ''
        });
      } catch (err) {
        setErro('Erro ao carregar dados do painel do professor.');
      } finally {
        setLoading(false);
      }
    }
    fetchPainel();
  }, [user?.id]);

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
      
      await api.put(`usuarios/${professor.id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSuccess('Foto de perfil atualizada com sucesso!');
      setFotoPerfil(null);
      setFotoPreview(null);
      
      // Atualizar dados do professor com timestamp para forçar reload da imagem
      const resp = await api.get('funcionarios/painel-professor/');
      const professorAtualizado = {
        ...resp.data,
        _photoTimestamp: Date.now() // Cache-bust para forçar reload da foto
      };
      setProfessor(professorAtualizado);
      
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

  // Turmas do centro selecionado
  const turmasDoCentro = ctSelecionado
    ? turmas.filter(turma => {
        const turmaCtId = typeof turma.ct === 'object' ? turma.ct.id : turma.ct;
        return turmaCtId === ctSelecionado.id;
      })
    : [];

  const handleEdit = () => {
    setEditMode(true);
    setSuccess('');
    setErro('');
  };

  const handleCancel = () => {
    setEditMode(false);
    setForm({
      first_name: professor?.first_name || '',
      last_name: professor?.last_name || '',
      email: professor?.email || '',
      telefone: professor?.telefone || '',
      endereco: professor?.endereco || '',
      data_nascimento: apiDateToInputDate(professor?.data_nascimento || '') || ''
    });
    setErro('');
    setSuccess('');
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async e => {
    e.preventDefault();
    setErro('');
    setSuccess('');
    try {
      const payload = {
        ...form,
        data_nascimento: form.data_nascimento
          ? inputDateToApiDate(form.data_nascimento) || form.data_nascimento
          : form.data_nascimento,
      };
      const resp = await api.put('funcionarios/atualizar-dados-professor/', payload);
      setProfessor(resp.data);
      setEditMode(false);
      setSuccess('Dados atualizados com sucesso!');
    } catch (err) {
      setErro('Erro ao atualizar dados.');
    }
  };

  const MAX_OBSERVACAO_AULA_CHARS = 1000;

  const fecharModalPresenca = () => {
    setTurmaPresenca(null);
    setPresencas({});
    setAlunosPresenca([]);
    setObservacaoMeta(null);
    setObservacaoTexto('');
  };

  const handleAbrirModalPresenca = async (turma) => {
    setTurmaPresenca(turma);
    setPresencas({});
    setAlunosPresenca([]);
    setObservacaoMeta(null);
    setObservacaoTexto('');
    try {
      setLoadingPresenca(true);
      setErro('');
      const resp = await api.get(`funcionarios/verificar-checkin/${turma.id}/`);
      setAlunosPresenca(resp.data.alunos || []);
      try {
        setLoadingObservacao(true);
        const obsResp = await api.get(`funcionarios/observacao-aula/${turma.id}/`, {
          params: { data: resp.data.data },
        });
        setObservacaoMeta(obsResp.data);
        setObservacaoTexto(obsResp.data.texto || '');
      } catch (e) {
        console.error('Erro ao carregar observação:', e);
        setObservacaoMeta(null);
        setObservacaoTexto('');
      } finally {
        setLoadingObservacao(false);
      }
    } catch (err) {
      console.error('Erro ao carregar alunos:', err);
      setErro('Erro ao carregar alunos da turma.');
      setTurmaPresenca(null);
    } finally {
      setLoadingPresenca(false);
    }
  };

  const handleSalvarObservacaoAula = async () => {
    if (!turmaPresenca?.id) return;
    const t = observacaoTexto.trim();
    if (t.length < 1 || t.length > MAX_OBSERVACAO_AULA_CHARS) {
      setErro(`Observação: informe entre 1 e ${MAX_OBSERVACAO_AULA_CHARS} caracteres.`);
      return;
    }
    try {
      setSavingObservacao(true);
      setErro('');
      const r = await api.put(`funcionarios/observacao-aula/${turmaPresenca.id}/`, { texto: t });
      setObservacaoMeta(r.data);
      setObservacaoTexto(r.data.texto || '');
      setSuccess('Observação salva.');
    } catch (err) {
      console.error(err);
      setErro(err.response?.data?.error || 'Erro ao salvar observação.');
    } finally {
      setSavingObservacao(false);
    }
  };

  const handlePresencaChange = (alunoId, checked) => {
    const id = String(alunoId);
    setPresencas(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  const handleRegistrarPresenca = async () => {
    if (!turmaPresenca) return;

    const alunosIds = Object.keys(presencas).filter(id => presencas[id] === true).map(String);
    if (alunosIds.length === 0) {
      setErro('Selecione pelo menos um aluno ou aula experimental.');
      return;
    }

    try {
      setErro('');
      const response = await api.post(`funcionarios/registrar-presenca/${turmaPresenca.id}/`, {
        presenca: alunosIds
      });
      fecharModalPresenca();
      setSuccess(response.data.message || 'Presenças registradas com sucesso!');
      if (response.data.warning) {
        setSuccess(prev => `${prev} ${response.data.warning}`);
      }
    } catch (err) {
      console.error('Erro ao registrar presença:', err);
      setErro(err.response?.data?.error || 'Erro ao registrar presenças.');
    }
  };

  const renderDashboard = () => (
    <div>
      <h2 style={styles.contentTitle}>
        <span>📊</span>
        Dashboard
      </h2>
      
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Status do Professor</div>
          <div style={styles.statValue}>
            <span style={{
              ...styles.statusBadge,
              ...(professor?.ativo ? styles.statusActive : styles.statusInactive)
            }}>
              {professor?.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <div style={styles.statSubtitle}>Status atual do professor</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Turmas Ativas</div>
          <div style={styles.statValue}>{turmas.length}</div>
          <div style={styles.statSubtitle}>Total de turmas responsável</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Centros de Treinamento</div>
          <div style={styles.statValue}>{centros.length}</div>
          <div style={styles.statSubtitle}>Centros onde atua</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Total de Alunos</div>
          <div style={styles.statValue}>
            {turmas.reduce((total, turma) => total + (turma.alunos_count || 0), 0)}
          </div>
          <div style={styles.statSubtitle}>Alunos em todas as turmas</div>
        </div>
      </div>

      <div style={styles.contentArea}>
        <h3 style={{...styles.contentTitle, fontSize: '20px'}}>
          <span>🏢</span>
          Centros de Treinamento
        </h3>
        
        {centros.length === 0 ? (
          <p style={styles.noData}>Nenhum centro encontrado.</p>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {centros.map(ct => (
              <div key={ct.id} style={{
                padding: '20px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                ':hover': {
                  backgroundColor: '#f5f5f5'
                }
              }}
                onClick={() => {
                  setCtSelecionado(ct);
                  setActiveSection('turmas');
                }}
              >
                <h4 style={{ margin: '0 0 8px 0', color: '#1F6C86' }}>{ct.nome}</h4>
                <p style={{ margin: 0, color: '#666' }}>
                  Clique para ver as turmas deste centro
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
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
          color: '#1F6C86',
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
              color: '#1F6C86',
              border: '3px solid #e0e0e0',
              overflow: 'hidden',
              backgroundImage: mediaProfileBackgroundImageUrl(professor?.foto_perfil, professor?._photoTimestamp),
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}>
              {!professor?.foto_perfil && getInitials(`${professor?.first_name} ${professor?.last_name}`)}
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
                style={{ display: 'none' }}
                id="foto-input"
              />
              <label
                htmlFor="foto-input"
                style={{
                  backgroundColor: '#1F6C86',
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
        <form onSubmit={handleSave} style={styles.form}>
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
            />
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
              {professor?.first_name} {professor?.last_name}
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <div style={styles.input}>{professor?.email}</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Telefone</label>
            <div style={styles.input}>{professor?.telefone}</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Endereço</label>
            <div style={styles.input}>{professor?.endereco || '-'}</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Data de Nascimento</label>
            <div style={styles.input}>
              {professor?.data_nascimento
                ? formatApiDateDisplay(professor.data_nascimento)
                : '-'}
            </div>
          </div>
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

  const renderTurmas = () => (
    <div>
      <h2 style={styles.contentTitle}>
        <span>👥</span>
        Minhas Turmas
      </h2>
      
      {ctSelecionado && (
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ margin: 0, color: '#1976d2' }}>
              Centro: {ctSelecionado.nome}
            </h3>
          </div>
          <button
            onClick={() => setCtSelecionado(null)}
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
            Voltar para Todos os Centros
          </button>
        </div>
      )}
      
      {!ctSelecionado && (
        <div style={styles.contentArea}>
          <h3 style={{...styles.contentTitle, fontSize: '20px'}}>
            <span>🏢</span>
            Selecione um Centro de Treinamento
          </h3>
          
        {centros.length === 0 ? (
            <p style={styles.noData}>Nenhum centro encontrado.</p>
        ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
            {centros.map(ct => (
                <div key={ct.id} style={{
                  padding: '20px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  ':hover': {
                    backgroundColor: '#f5f5f5'
                  }
                }} onClick={() => setCtSelecionado(ct)}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#1F6C86' }}>{ct.nome}</h4>
                  <p style={{ margin: 0, color: '#666' }}>
                    Clique para ver as turmas deste centro
                  </p>
                </div>
              ))}
            </div>
        )}
      </div>
      )}

      {ctSelecionado && (
        <div style={styles.contentArea}>
          <h3 style={{...styles.contentTitle, fontSize: '20px'}}>
            <span>👥</span>
            Turmas do Centro: {ctSelecionado.nome}
          </h3>
          
          {turmasDoCentro.length === 0 ? (
            <p style={styles.noData}>Nenhuma turma encontrada neste centro.</p>
          ) : (
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="table" style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Turma</th>
                <th style={styles.th}>Professor</th>
                <th style={styles.th}>Dias</th>
                <th style={styles.th}>Horário</th>
                <th style={styles.th}>Alunos Ativos</th>
                <th style={styles.th}>Capacidade</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {turmasDoCentro.map(turma => (
                <tr key={turma.id}>
                  <td style={styles.td}>{turma.id}</td>
                  <td style={styles.td}>
                    {(turma.professor_nomes && turma.professor_nomes.length > 0)
                      ? turma.professor_nomes.join(', ')
                      : '-'}
                  </td>
                      <td style={styles.td}>
                        {Array.isArray(turma.dias_semana_nomes) 
                          ? turma.dias_semana_nomes.join(', ') 
                          : turma.dias_semana_nomes}
                      </td>
                  <td style={styles.td}>{turma.horario}</td>
                  <td style={styles.td}>{turma.alunos_count}</td>
                  <td style={styles.td}>{turma.capacidade_maxima}</td>
                  <td style={styles.td}>
                    <button
                          style={styles.actionButton}
                      onClick={() => handleAbrirModalPresenca(turma)}
                    >
                      Registrar Presença
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </div>
      )}
    </div>
  );

  if (loading) return <div style={styles.container}>Carregando...</div>;
  if (erro) return <div style={{ ...styles.container, color: 'red' }}>{erro}</div>;

  // Estilos responsivos dinâmicos
  const responsiveStyles = {
    container: {
      ...styles.container,
      flexDirection: isMobile ? 'column' : 'row'
    },
    sidebar: {
      ...styles.sidebar,
      width: isMobile ? '100%' : (isTablet ? '240px' : '280px'),
      height: isMobile ? 'auto' : `calc(100vh - ${NAVBAR_HEIGHT_CSS})`,
      position: isMobile ? 'relative' : 'fixed',
      top: isMobile ? 'auto' : NAVBAR_HEIGHT_CSS,
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
    <div style={responsiveStyles.container}>
      {/* Sidebar */}
      <div style={responsiveStyles.sidebar}>
        <div style={styles.profileSection}>
          <div style={{
            ...styles.profilePhoto,
            backgroundImage: mediaProfileBackgroundImageUrl(professor?.foto_perfil, professor?._photoTimestamp),
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}>
            {!professor?.foto_perfil && getInitials(`${professor?.first_name} ${professor?.last_name}`)}
          </div>
          <div style={styles.profileName}>
            {professor?.first_name} {professor?.last_name}
          </div>
          <div style={styles.profileStatus}>
            <span style={{
              ...styles.statusBadge,
              ...(professor?.ativo ? styles.statusActive : styles.statusInactive)
            }}>
              {professor?.ativo ? 'Ativo' : 'Inativo'}
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
              ...(activeSection === 'turmas' && styles.activeMenuItem)
            }}
            onClick={() => setActiveSection('turmas')}
          >
            <span style={styles.menuIcon}>👥</span>
            Minhas Turmas
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={responsiveStyles.mainContent}>
        {erro && (
          <div style={styles.error}>
            {erro}
          </div>
        )}

        {success && <div style={styles.success}>{success}</div>}

        <div style={styles.contentArea}>
          {activeSection === 'dashboard' && renderDashboard()}
          {activeSection === 'perfil' && renderMeuPerfil()}
          {activeSection === 'turmas' && renderTurmas()}
        </div>
      </div>

      {/* Modal de Registrar Presença */}
      {turmaPresenca && (
        <div className="modal" style={styles.modal}>
          <div className="modal-content" style={styles.modalContent}>
            <h2 className="modal-title" style={styles.modalTitle}>
              Registrar Presença - Turma {turmaPresenca.id}
            </h2>
            <p><strong>Centro:</strong> {turmaPresenca.ct_nome}</p>
            <p><strong>Horário:</strong> {turmaPresenca.horario}</p>
            <p><strong>Dias:</strong> {
              Array.isArray(turmaPresenca.dias_semana_nomes) 
                ? turmaPresenca.dias_semana_nomes.join(', ') 
                : turmaPresenca.dias_semana_nomes
            }</p>
            
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ marginBottom: '16px' }}>Alunos</h3>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px', lineHeight: 1.45 }}>
                💡 O check-in no app é feito pelo aluno. Aqui você confirma quem compareceu à aula; pode marcar
                presença mesmo sem check-in no app (ex.: sem celular ou inadimplente).
              </p>
              <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Observação da aula (interna)</h4>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  Visível ao gerente. Edição apenas no dia da aula. Máximo {MAX_OBSERVACAO_AULA_CHARS} caracteres.
                </p>
                {loadingObservacao ? (
                  <p style={{ fontSize: '13px', color: '#666' }}>Carregando observação...</p>
                ) : observacaoMeta?.pode_editar ? (
                  <>
                    <textarea
                      value={observacaoTexto}
                      onChange={e => setObservacaoTexto(e.target.value)}
                      maxLength={MAX_OBSERVACAO_AULA_CHARS}
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '8px',
                        fontSize: '14px',
                        borderRadius: '6px',
                        border: '1px solid #ccc',
                        boxSizing: 'border-box',
                      }}
                      placeholder="Ex.: dinâmica aplicada, aluno com limitação, etc."
                    />
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', textAlign: 'right' }}>
                      {observacaoTexto.trim().length}/{MAX_OBSERVACAO_AULA_CHARS}
                    </div>
                    <button
                      type="button"
                      onClick={handleSalvarObservacaoAula}
                      disabled={savingObservacao}
                      style={{
                        marginTop: '8px',
                        padding: '8px 16px',
                        background: '#1F6C86',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: savingObservacao ? 'wait' : 'pointer',
                        opacity: savingObservacao ? 0.7 : 1,
                      }}
                    >
                      {savingObservacao ? 'Salvando...' : 'Salvar observação'}
                    </button>
                  </>
                ) : (
                  <p style={{ fontSize: '14px', color: '#444', whiteSpace: 'pre-wrap' }}>
                    {observacaoMeta?.texto?.trim()
                      ? observacaoMeta.texto
                      : 'Nenhuma observação registrada para hoje.'}
                  </p>
                )}
                {observacaoMeta?.autor_nome && observacaoMeta?.texto?.trim() ? (
                  <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                    Por {observacaoMeta.autor_nome}
                    {observacaoMeta.atualizado_em
                      ? ` · ${new Date(observacaoMeta.atualizado_em).toLocaleString('pt-BR')}`
                      : ''}
                  </p>
                ) : null}
              </div>
              {loadingPresenca ? (
                <p style={styles.noData}>Carregando alunos...</p>
              ) : alunosPresenca.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {alunosPresenca.map(aluno => {
                    const isAulaExperimental = aluno.tipo === 'aula_experimental';
                    return (
                      <div key={aluno.id} style={{
                        ...styles.checkboxContainer,
                        opacity: aluno.presenca_confirmada ? 0.7 : 1,
                        backgroundColor: isAulaExperimental ? '#fff8e1' : (aluno.checkin_realizado ? '#f0f8ff' : '#fff8f0')
                      }}>
                        <input
                          type="checkbox"
                          id={`aluno-${aluno.id}`}
                          checked={presencas[String(aluno.id)] || false}
                          onChange={e => handlePresencaChange(aluno.id, e.target.checked)}
                          disabled={aluno.presenca_confirmada}
                          style={styles.checkbox}
                          aria-label={`Presença: ${aluno.nome || ''}`}
                        />
                        <label
                          htmlFor={`aluno-${aluno.id}`}
                          style={{
                            ...styles.checkboxLabel,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: aluno.presenca_confirmada ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <span>{aluno.nome || `${aluno.first_name || ''} ${aluno.last_name || ''}`.trim()}{aluno.username ? ` (${aluno.username})` : ''}</span>
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: 3,
                            backgroundColor: aluno.presenca_confirmada ? '#4caf50' : isAulaExperimental ? '#ff9800' : (aluno.checkin_realizado ? '#2196f3' : '#ff9800'),
                            color: 'white'
                          }}>
                            {aluno.presenca_confirmada
                              ? '✅ Confirmada'
                              : isAulaExperimental
                                ? 'Aula experimental'
                                : aluno.checkin_realizado
                                  ? 'Check-in no app'
                                  : 'Sem check-in no app'}
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={styles.noData}>Nenhum aluno encontrado nesta turma.</p>
              )}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={fecharModalPresenca}
                style={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarPresenca}
                disabled={!Object.values(presencas).some(v => v === true)}
                style={{
                  ...styles.actionButton,
                  opacity: !Object.values(presencas).some(v => v === true) ? 0.5 : 1
                }}
              >
                Registrar Presença
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { styles };
export default DashboardProfessor;