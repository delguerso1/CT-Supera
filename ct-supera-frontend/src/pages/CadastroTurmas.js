import React, { useState, useEffect } from 'react';
import api from '../services/api';

function CadastroTurmas({ centroId, styles }) {
  const [turmas, setTurmas] = useState([]);
  const [diasSemana, setDiasSemana] = useState([]);
  const [professores, setProfessores] = useState([]);
  const [formData, setFormData] = useState({
    dias_semana: [],
    horario: '',
    capacidade_maxima: '',
    professores: [],
    ct: centroId,
  });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [centroNome, setCentroNome] = useState('');
  const [diasCtPermitidos, setDiasCtPermitidos] = useState([]);
  const [showAddAluno, setShowAddAluno] = useState(false);
  const [showRemoveAluno, setShowRemoveAluno] = useState(false);
  const [turmaIdSelecionada, setTurmaIdSelecionada] = useState(null);
  const [selectedAlunos, setSelectedAlunos] = useState([]);
  const [alunosDisponiveis, setAlunosDisponiveis] = useState([]);
  const [alunosTurmaParaRemover, setAlunosTurmaParaRemover] = useState([]);
  const [showAlunosModal, setShowAlunosModal] = useState(false);
  const [alunosTurma, setAlunosTurma] = useState([]);
  const [turmaModalNome, setTurmaModalNome] = useState('');

  useEffect(() => {
    fetchCentro();
    fetchTurmas();
    fetchDiasSemana();
    fetchProfessores();
    fetchAlunosDisponiveis();
    // eslint-disable-next-line
  }, [centroId]);

  // Buscar nome do centro de treinamento
  const fetchCentro = async () => {
    try {
      const response = await api.get(`cts/${centroId}/`);
      setCentroNome(response.data.nome);
      setDiasCtPermitidos(response.data.dias_semana || []);
    } catch {
      setCentroNome('');
      setDiasCtPermitidos([]);
    }
  };

  // Buscar dias da semana
  const fetchDiasSemana = async () => {
    try {
      const response = await api.get('turmas/diassemana/');
      console.log("📥 Dias da semana recebidos:", response.data); // 👈 ADICIONE ISTO
      
      // Verifica se é um array direto ou dados paginados
      let diasData = [];
      if (Array.isArray(response.data)) {
        diasData = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        diasData = response.data.results;
      }
      
      console.log("📥 Dias processados:", diasData);
      setDiasSemana(diasData);
    } catch (error) {
      console.error("❌ Erro ao buscar dias da semana:", error); // 👈 E ISTO
      setDiasSemana([]);
    }
  };

  // Buscar professores ativos
  const fetchProfessores = async () => {
    try {
      const response = await api.get('usuarios/', { params: { tipo: 'professor', ativo: true } });
      setProfessores(response.data);
    } catch {
      setProfessores([]);
    }
  };

  // Buscar alunos disponíveis para adicionar
  const fetchAlunosDisponiveis = async () => {
    try {
      const response = await api.get('usuarios/', { params: { tipo: 'aluno', ativo: true } });
      setAlunosDisponiveis(response.data);
    } catch {
      setAlunosDisponiveis([]);
    }
  };

  // Listar turmas do centro
  const fetchTurmas = async () => {
    try {
      const response = await api.get('turmas/', { params: { ct: centroId } });
      // Garante que turmas será sempre um array
      if (Array.isArray(response.data)) {
        setTurmas(response.data);
      } else if (Array.isArray(response.data.results)) {
        setTurmas(response.data.results);
      } else {
        setTurmas([]);
      }
    } catch {
      setError('Erro ao buscar turmas.');
      setTurmas([]);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, selectedOptions } = e.target;
    if (type === 'select-multiple') {
      setFormData(prev => ({
        ...prev,
        [name]: Array.from(selectedOptions, option => option.value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Criar ou editar turma
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const formDataToSend = {
        ...formData,
        ct: Number(centroId),
        dias_semana: formData.dias_semana.map(Number), // <-- converte para int
        professores: formData.professores.map(Number)
      };
      
      console.log("📤 Dados enviados no POST:", formDataToSend); // 👈 ADICIONE ISTO
      console.log("📤 Especificamente dias_semana:", formDataToSend.dias_semana); // 👈 E ISTO
      
      if (editId) {
        await api.put(`turmas/${editId}/`, formDataToSend);
        setSuccess('Turma atualizada com sucesso!');
      } else {
        await api.post('turmas/', formDataToSend);
        setSuccess('Turma cadastrada com sucesso!');
      }
      setFormData({
        dias_semana: [],
        horario: '',
        capacidade_maxima: '',
        professores: [],
        ct: centroId,
      });
      setEditId(null);
      setShowForm(false);
      fetchTurmas();
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao salvar turma. Tente novamente.');
    }
  };

  const handleEdit = (turma) => {
    setFormData({
      dias_semana: turma.dias_semana || [],
      horario: turma.horario || '',
      capacidade_maxima: turma.capacidade_maxima || '',
      professores: turma.professores || [],
      ct: turma.ct?.id || turma.ct || centroId, // ✅ Acesso seguro com fallback
    });
    setEditId(turma.id);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  // Excluir turma
  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir esta turma?')) {
      try {
        await api.delete(`turmas/${id}/`);
        setSuccess('Turma excluída com sucesso!');
        fetchTurmas();
      } catch {
        setError('Erro ao excluir turma.');
      }
    }
  };

  const handleNovaTurma = () => {
    setFormData({
      dias_semana: [],
      horario: '',
      capacidade_maxima: '',
      professores: [],
      ct: centroId,
    });
    setEditId(null);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleShowAddAluno = (turmaId) => {
    setTurmaIdSelecionada(turmaId);
    setSelectedAlunos([]);
    setShowAddAluno(true);
  };

  const handleShowRemoveAluno = async (turmaId) => {
    try {
      const response = await api.get(`turmas/${turmaId}/alunos/`);
      setAlunosTurmaParaRemover(response.data.alunos);
      setTurmaIdSelecionada(turmaId);
      setSelectedAlunos([]);
      setShowRemoveAluno(true);
    } catch (error) {
      setError('Erro ao buscar alunos da turma.');
      setShowRemoveAluno(false);
    }
  };

  const handleShowAlunosTurma = async (turmaId) => {
    try {
      const response = await api.get(`turmas/${turmaId}/alunos/`);
      setAlunosTurma(response.data.alunos);
      const nomes = response.data.turma.professor_nomes || [];
      setTurmaModalNome(nomes.length ? nomes.join(', ') : 'Turma');
      setShowAlunosModal(true);
    } catch {
      setAlunosTurma([]);
      setShowAlunosModal(false);
      alert('Erro ao buscar alunos da turma.');
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>
        Turmas do Centro: <span style={{ color: '#1F6C86' }}>{centroNome}</span>
      </h2>

      {!showForm && (
        <button
          onClick={handleNovaTurma}
          style={{
            backgroundColor: '#1F6C86',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            border: 'none',
            fontSize: '1rem',
            cursor: 'pointer',
            marginBottom: 16,
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#151b60'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#1F6C86'}
        >
          Cadastrar Nova Turma
        </button>
      )}

      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: 12, borderBottom: '2px solid #eee', textAlign: 'center' }}>Dias</th>
              <th style={{ padding: 12, borderBottom: '2px solid #eee', textAlign: 'center' }}>Horário</th>
              <th style={{ padding: 12, borderBottom: '2px solid #eee', textAlign: 'center' }}>Capacidade</th>
              <th style={{ padding: 12, borderBottom: '2px solid #eee', textAlign: 'center' }}>Professores</th>
              <th style={{ padding: 12, borderBottom: '2px solid #eee', textAlign: 'center' }}>Alunos</th>
              <th style={{ padding: 12, borderBottom: '2px solid #eee', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {turmas.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: '#888', padding: 12, textAlign: 'center' }}>
                  Nenhuma turma cadastrada.
                </td>
              </tr>
            )}
            {turmas.map((turma) => (
              <tr key={turma.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 12, textAlign: 'center' }}>
                  {/* Exibe os nomes dos dias da semana, se vierem no objeto */}
                  {turma.dias_semana_nomes
                    ? turma.dias_semana_nomes.join(', ')
                    : (turma.dias_semana || []).join(', ')
                  }
                </td>
                <td style={{ padding: 12, textAlign: 'center' }}>{turma.horario}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>{turma.capacidade_maxima}</td>
                <td style={{ padding: 12, textAlign: 'center' }}>
                  {(turma.professor_nomes && turma.professor_nomes.length > 0)
                    ? turma.professor_nomes.join(', ')
                    : '-'}
                </td>
                <td style={{ padding: 12, textAlign: 'center' }}>
                  <button
                    style={{ 
                      color: '#1F6C86', 
                      textDecoration: 'underline', 
                      cursor: 'pointer',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      font: 'inherit',
                      margin: '0 auto',
                      display: 'block'
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      handleShowAlunosTurma(turma.id);
                    }}
                  >
                    {turma.alunos_count || 0}
                  </button>
                </td>
                <td style={{ padding: 12, textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleEdit(turma)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        backgroundColor: '#2196f3',
                        color: 'white',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(turma.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        backgroundColor: '#f44336',
                        color: 'white',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#d32f2f'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#f44336'}
                    >
                      Excluir
                    </button>
                    <button
                      onClick={() => handleShowAddAluno(turma.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#4caf50'}
                    >
                      + Aluno
                    </button>
                    <button
                      onClick={() => handleShowRemoveAluno(turma.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        backgroundColor: '#ff9800',
                        color: 'white',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f57c00'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#ff9800'}
                    >
                      - Aluno
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}
          onSubmit={handleSubmit}
        >
          {error && (
            <div style={{ color: '#c62828', background: '#ffebee', padding: 8, borderRadius: 4, marginBottom: 10 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ color: '#2e7d32', background: '#e8f5e9', padding: 8, borderRadius: 4, marginBottom: 10 }}>
              {success}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontWeight: 500, marginBottom: 2 }} htmlFor="dias_semana">
              Dias da Semana
            </label>
            <select
              id="dias_semana"
              name="dias_semana"
              multiple
              value={formData.dias_semana}
              onChange={handleChange}
              style={{
                padding: '8px',
                borderRadius: 4,
                border: '1px solid #ccc',
                fontSize: '1rem'
              }}
              required
            >
              {Array.isArray(diasSemana) && diasSemana.length > 0 ? (
                diasSemana
                  .filter((dia) => diasCtPermitidos.length === 0 || diasCtPermitidos.includes(dia.id))
                  .map((dia) => (
                  <option key={dia.id} value={dia.id}>{dia.nome}</option>
                ))
              ) : (
                <option disabled>Carregando dias...</option>
              )}
            </select>
            {diasCtPermitidos.length > 0 && (
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                Apenas dias de funcionamento do CT estão disponíveis.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontWeight: 500, marginBottom: 2 }} htmlFor="horario">
              Horário
            </label>
            <input
              type="time"
              id="horario"
              name="horario"
              value={formData.horario}
              onChange={handleChange}
              style={{
                padding: '8px',
                borderRadius: 4,
                border: '1px solid #ccc',
                fontSize: '1rem'
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontWeight: 500, marginBottom: 2 }} htmlFor="capacidade_maxima">
              Capacidade Máxima
            </label>
            <input
              type="number"
              id="capacidade_maxima"
              name="capacidade_maxima"
              value={formData.capacidade_maxima}
              onChange={handleChange}
              min={1}
              style={{
                padding: '8px',
                borderRadius: 4,
                border: '1px solid #ccc',
                fontSize: '1rem'
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontWeight: 500, marginBottom: 2 }} htmlFor="professores">
              Professores
            </label>
            <select
              id="professores"
              name="professores"
              multiple
              value={formData.professores}
              onChange={handleChange}
              style={{
                padding: '8px',
                borderRadius: 4,
                border: '1px solid #ccc',
                fontSize: '1rem',
                minHeight: '120px'
              }}
              required
            >
              {professores.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.first_name || prof.username}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditId(null);
                setFormData({
                  dias_semana: [],
                  horario: '',
                  capacidade_maxima: '',
                  professores: [],
                  ct: centroId,
                });
                setError('');
                setSuccess('');
              }}
              style={{
                backgroundColor: '#f5f5f5',
                color: '#333',
                padding: '0.75rem 1.5rem',
                borderRadius: '4px',
                border: 'none',
                fontSize: '1rem',
                cursor: 'pointer',
                flex: 1,
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#f5f5f5'}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: '#1F6C86',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '4px',
                border: 'none',
                fontSize: '1rem',
                cursor: 'pointer',
                flex: 1,
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#151b60'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#1F6C86'}
            >
              {editId ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      )}

      {showAddAluno && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.post(`turmas/${turmaIdSelecionada}/adicionar-alunos/`, {
                alunos: selectedAlunos.map(Number)
              });
              setShowAddAluno(false);
              setTurmaIdSelecionada(null);
              setSelectedAlunos([]);
              setSuccess('Alunos adicionados com sucesso!');
              fetchTurmas();
            } catch (error) {
              setError(error.response?.data?.error || 'Erro ao adicionar alunos.');
            }
          }}
          style={{ marginTop: 16, background: '#e8f5e9', padding: 16, borderRadius: 8, border: '2px solid #4caf50' }}
        >
          <h3 style={{ marginTop: 0, color: '#2e7d32' }}>➕ Adicionar Alunos à Turma</h3>
          <label>Selecione os alunos: (segure Ctrl para selecionar múltiplos)</label>
          <select
            multiple
            value={selectedAlunos}
            onChange={e => setSelectedAlunos([...e.target.selectedOptions].map(opt => opt.value))}
            style={{ width: '100%', marginBottom: 8, minHeight: '150px', padding: '8px' }}
          >
            {alunosDisponiveis.map(aluno => (
              <option key={aluno.id} value={aluno.id}>
                {aluno.first_name} {aluno.last_name} ({aluno.username})
              </option>
            ))}
          </select>
          <button 
            type="button" 
            onClick={() => setShowAddAluno(false)} 
            style={{ 
              backgroundColor: '#f5f5f5',
              color: '#333',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer',
              marginRight: 8,
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#f5f5f5'}
          >
            Cancelar
          </button>
          <button 
            type="submit"
            style={{
              backgroundColor: '#4caf50',
              color: 'white',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#4caf50'}
          >
            Adicionar
          </button>
        </form>
      )}

      {showRemoveAluno && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (selectedAlunos.length === 0) {
              setError('Selecione pelo menos um aluno para remover.');
              return;
            }
            
            if (!window.confirm(`Tem certeza que deseja remover ${selectedAlunos.length} aluno(s) desta turma?`)) {
              return;
            }
            
            try {
              await api.post(`turmas/${turmaIdSelecionada}/remover-alunos/`, {
                alunos: selectedAlunos.map(Number)
              });
              setShowRemoveAluno(false);
              setTurmaIdSelecionada(null);
              setSelectedAlunos([]);
              setAlunosTurmaParaRemover([]);
              setSuccess('Alunos removidos com sucesso!');
              fetchTurmas();
            } catch (error) {
              setError(error.response?.data?.error || 'Erro ao remover alunos.');
            }
          }}
          style={{ marginTop: 16, background: '#fff3e0', padding: 16, borderRadius: 8, border: '2px solid #ff9800' }}
        >
          <h3 style={{ marginTop: 0, color: '#f57c00' }}>➖ Remover Alunos da Turma</h3>
          {alunosTurmaParaRemover.length === 0 ? (
            <div style={{ color: '#888', marginBottom: 16 }}>Esta turma não possui alunos.</div>
          ) : (
            <>
              <label>Selecione os alunos para remover: (segure Ctrl para selecionar múltiplos)</label>
              <select
                multiple
                value={selectedAlunos}
                onChange={e => setSelectedAlunos([...e.target.selectedOptions].map(opt => opt.value))}
                style={{ width: '100%', marginBottom: 8, minHeight: '150px', padding: '8px' }}
              >
                {alunosTurmaParaRemover.map(aluno => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.first_name} {aluno.last_name} ({aluno.username})
                  </option>
                ))}
              </select>
            </>
          )}
          <button 
            type="button" 
            onClick={() => {
              setShowRemoveAluno(false);
              setSelectedAlunos([]);
              setAlunosTurmaParaRemover([]);
            }} 
            style={{ 
              backgroundColor: '#f5f5f5',
              color: '#333',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer',
              marginRight: 8,
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#e0e0e0'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#f5f5f5'}
          >
            Cancelar
          </button>
          {alunosTurmaParaRemover.length > 0 && (
            <button 
              type="submit"
              style={{
                backgroundColor: '#ff9800',
                color: 'white',
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f57c00'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ff9800'}
            >
              Remover
            </button>
          )}
        </form>
      )}

      {showAlunosModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', padding: 24, borderRadius: 8, minWidth: 320, maxWidth: 400, boxShadow: '0 2px 8px #0002'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Alunos da turma {turmaModalNome && `- ${turmaModalNome}`}</h3>
            {alunosTurma.length === 0 ? (
              <div style={{ color: '#888' }}>Nenhum aluno atribuído a esta turma.</div>
            ) : (
              <ul style={{ paddingLeft: 18 }}>
                {alunosTurma.map(aluno => (
                  <li key={aluno.id}>
                    {aluno.first_name} {aluno.last_name} <span style={{ color: '#888' }}>({aluno.username})</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setShowAlunosModal(false)}
              style={{
                marginTop: 16,
                backgroundColor: '#1F6C86',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#151b60'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#1F6C86'}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CadastroTurmas;