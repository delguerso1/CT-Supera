import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { MEDIA_URL } from '../services/api';
import CadastroUsuario from '../pages/CadastroUsuario';
import ControleFinanceiro from '../pages/ControleFinanceiro';
import CadastroCentroTreinamento from '../pages/CadastroCentroTreinamento';

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
    backgroundColor: '#f5f7fa'
  },
  sidebar: {
    width: '280px',
    backgroundColor: '#1F6C86',
    color: 'white',
    padding: '20px',
    boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
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
    border: '1px solid #e0e0e0',
    textAlign: 'center'
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
  statValueSuccess: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: '4px'
  },
  statValueDanger: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#d32f2f',
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
    flexWrap: 'wrap'
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
  activityItem: {
    padding: '12px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  activityIcon: {
    fontSize: '20px'
  },
  activityContent: {
    flex: 1
  },
  activityDescription: {
    fontSize: '14px',
    color: '#333',
    marginBottom: '4px'
  },
  activityDate: {
    fontSize: '12px',
    color: '#999'
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
  }
};

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function DashboardGerente({ user }) {
  const { isMobile, isTablet } = useResponsive();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [stats, setStats] = useState({
    alunosAtivos: 0,
    professores: 0,
    mensalidadesPendentes: 0,
    mensalidadesAtrasadas: 0,
    mensalidadesPagas: 0,
    precadastros: 0,
    turmas: []
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gerente, setGerente] = useState(null);
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
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const navigate = useNavigate();

  const fetchGerenteData = useCallback(async () => {
    try {
      const response = await api.get('funcionarios/painel-gerente/');
      setGerente(response.data);
      setForm({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        email: response.data.email || '',
        telefone: response.data.telefone || '',
        endereco: response.data.endereco || '',
        data_nascimento: response.data.data_nascimento || ''
      });
    } catch (err) {
      setErro('Erro ao carregar dados do gerente.');
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');

      if (!user || !token) {
        navigate('/login');
        return;
      }

      if (user.tipo !== 'gerente') {
        setError('Você não tem permissão para acessar esta página.');
        navigate('/dashboard');
        return;
      }

      const response = await api.get('funcionarios/painel-gerente/');
      if (!response.data) {
        throw new Error('Dados não recebidos da API');
      }

      setStats({
        alunosAtivos: response.data.alunos_ativos || 0,
        professores: response.data.professores || 0,
        mensalidadesPendentes: response.data.mensalidades_pendentes || 0,
        mensalidadesAtrasadas: response.data.mensalidades_atrasadas || 0,
        mensalidadesPagas: response.data.mensalidades_pagas || 0,
        precadastros: response.data.precadastros || 0,
        turmas: response.data.turmas || []
      });

      setRecentActivities(response.data.atividades_recentes || []);

    } catch (error) {
      if (error.response?.status === 403) {
        setError('Você não tem permissão para acessar esta página.');
        navigate('/dashboard');
      } else if (error.response?.status === 401) {
        setError('Sua sessão expirou. Por favor, faça login novamente.');
        navigate('/login');
      } else {
        setError(error.response?.data?.error || 'Erro ao carregar dados do dashboard. Por favor, tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!user || !token) {
      navigate('/login');
      return;
    }

    if (user.tipo !== 'gerente') {
      navigate('/dashboard');
      return;
    }

    fetchDashboardData();
    fetchGerenteData();
  }, [user, navigate, fetchDashboardData, fetchGerenteData]);

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
      
      await api.put(`usuarios/${gerente.id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSuccess('Foto de perfil atualizada com sucesso!');
      setFotoPerfil(null);
      setFotoPreview(null);
      
      // Atualizar dados do gerente com timestamp para forçar reload da imagem
      const resp = await api.get(`usuarios/${gerente.id}/`);
      const gerenteAtualizado = {
        ...resp.data,
        _photoTimestamp: Date.now() // Cache-bust para forçar reload da foto
      };
      setGerente(gerenteAtualizado);
      
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

  const handleEdit = () => {
    setEditMode(true);
    setSuccess('');
    setErro('');
  };

  const handleCancel = () => {
    setEditMode(false);
    setForm({
      first_name: gerente?.first_name || '',
      last_name: gerente?.last_name || '',
      email: gerente?.email || '',
      telefone: gerente?.telefone || '',
      endereco: gerente?.endereco || '',
      data_nascimento: gerente?.data_nascimento || ''
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
      const resp = await api.put('funcionarios/atualizar-dados-gerente/', form);
      setGerente(resp.data);
      setEditMode(false);
      setSuccess('Dados atualizados com sucesso!');
    } catch (err) {
      setErro('Erro ao atualizar dados.');
    }
  };

  const handleRetry = () => {
    fetchDashboardData();
  };

  const renderDashboard = () => (
    <div>
      <h2 style={styles.contentTitle}>
        <span>📊</span>
        Dashboard
      </h2>
      
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Alunos Ativos</div>
          <div style={styles.statValueSuccess}>{stats.alunosAtivos}</div>
          <div style={styles.statSubtitle}>Total de alunos ativos</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Professores</div>
          <div style={styles.statValue}>{stats.professores}</div>
          <div style={styles.statSubtitle}>Total de professores</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Mensalidades Pendentes</div>
          <div style={styles.statValueDanger}>{stats.mensalidadesPendentes}</div>
          <div style={styles.statSubtitle}>Aguardando pagamento</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Mensalidades Atrasadas</div>
          <div style={styles.statValueDanger}>{stats.mensalidadesAtrasadas}</div>
          <div style={styles.statSubtitle}>Vencidas há mais de 30 dias</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Mensalidades Pagas</div>
          <div style={styles.statValueSuccess}>{stats.mensalidadesPagas}</div>
          <div style={styles.statSubtitle}>Pagas este mês</div>
        </div>
        
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Pré-cadastros</div>
          <div style={styles.statValue}>{stats.precadastros}</div>
          <div style={styles.statSubtitle}>Aguardando aprovação</div>
        </div>
      </div>

      <div style={styles.contentArea}>
        <h3 style={{...styles.contentTitle, fontSize: '20px'}}>
          <span>📈</span>
          Atividades Recentes
        </h3>
        
        {recentActivities.length === 0 ? (
          <p style={styles.noData}>Nenhuma atividade recente.</p>
        ) : (
          <div>
            {recentActivities.map(activity => (
              <div key={activity.id} style={styles.activityItem}>
                <div style={styles.activityIcon}>
                  {activity.type === 'aluno' ? '👤' : '💰'}
                </div>
                <div style={styles.activityContent}>
                  <div style={styles.activityDescription}>
                    {activity.description}
                  </div>
                  <div style={styles.activityDate}>
                    {new Date(activity.data).toLocaleDateString('pt-BR')}
                  </div>
                </div>
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
              backgroundImage: gerente?.foto_perfil ? `url(${MEDIA_URL}${gerente.foto_perfil}?t=${gerente._photoTimestamp || Date.now()})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}>
              {!gerente?.foto_perfil && getInitials(`${gerente?.first_name} ${gerente?.last_name}`)}
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
              {gerente?.first_name} {gerente?.last_name}
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <div style={styles.input}>{gerente?.email}</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Telefone</label>
            <div style={styles.input}>{gerente?.telefone}</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Endereço</label>
            <div style={styles.input}>{gerente?.endereco || '-'}</div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Data de Nascimento</label>
            <div style={styles.input}>
              {gerente?.data_nascimento
                ? new Date(gerente.data_nascimento).toLocaleDateString()
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

  const renderUsuarios = () => (
    <div>
      <h2 style={styles.contentTitle}>
        <span>👥</span>
        Gestão de Usuários
      </h2>
      <CadastroUsuario styles={styles} onUserChange={fetchDashboardData} />
    </div>
  );

  const renderCentros = () => (
    <div>
      <h2 style={styles.contentTitle}>
        <span>🏢</span>
        Centros de Treinamento
      </h2>
      <CadastroCentroTreinamento styles={styles} />
    </div>
  );

  const renderFinanceiro = () => (
    <div>
      <h2 style={styles.contentTitle}>
        <span>💰</span>
        Controle Financeiro
      </h2>
      <ControleFinanceiro user={user} onDataChange={fetchDashboardData} />
    </div>
  );

  if (loading) return <div style={styles.container}>Carregando...</div>;
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h3>Erro ao carregar dados</h3>
          <p>{error}</p>
          <button 
            onClick={handleRetry}
            style={styles.primaryButton}
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

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
    <div style={responsiveStyles.container}>
      {/* Sidebar */}
      <div style={responsiveStyles.sidebar}>
        <div style={styles.profileSection}>
          <div style={{
            ...styles.profilePhoto,
            backgroundImage: gerente?.foto_perfil ? `url(${MEDIA_URL}${gerente.foto_perfil}?t=${gerente._photoTimestamp || Date.now()})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}>
            {!gerente?.foto_perfil && getInitials(`${gerente?.first_name} ${gerente?.last_name}`)}
          </div>
          <div style={styles.profileName}>
            {gerente?.first_name} {gerente?.last_name}
          </div>
          <div style={styles.profileStatus}>
            <span style={{
              ...styles.statusBadge,
              ...(gerente?.ativo ? styles.statusActive : styles.statusInactive)
            }}>
              {gerente?.ativo ? 'Ativo' : 'Inativo'}
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
              ...(activeSection === 'usuarios' && styles.activeMenuItem)
            }}
            onClick={() => setActiveSection('usuarios')}
          >
            <span style={styles.menuIcon}>👥</span>
            Gestão de Usuários
          </div>
          <div
            style={{
              ...styles.menuItem,
              ...(activeSection === 'centros' && styles.activeMenuItem)
            }}
            onClick={() => setActiveSection('centros')}
          >
            <span style={styles.menuIcon}>🏢</span>
            Centros de Treinamento
          </div>
          <div
            style={{
              ...styles.menuItem,
              ...(activeSection === 'financeiro' && styles.activeMenuItem)
            }}
            onClick={() => setActiveSection('financeiro')}
          >
            <span style={styles.menuIcon}>💰</span>
            Controle Financeiro
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
          {activeSection === 'usuarios' && renderUsuarios()}
          {activeSection === 'centros' && renderCentros()}
          {activeSection === 'financeiro' && renderFinanceiro()}
        </div>
      </div>
    </div>
  );
}

export { styles };
export default DashboardGerente;