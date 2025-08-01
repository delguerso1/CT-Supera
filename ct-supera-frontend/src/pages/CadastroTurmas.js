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
    professor: '',
    ct: centroId,
  });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [centroNome, setCentroNome] = useState('');
  const [showAddAluno, setShowAddAluno] = useState(false);
  const [turmaIdSelecionada, setTurmaIdSelecionada] = useState(null);
  const [selectedAlunos, setSelectedAlunos] = useState([]);
  const [alunosDisponiveis, setAlunosDisponiveis] = useState([]);
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
    } catch {
      setCentroNome('');
    }
  };

  // Buscar dias da semana
  const fetchDiasSemana = async () => {
    try {
      const response = await api.get('turmas/diassemana/');
      console.log("📥 Dias da semana recebidos:", response.data); // 👈 ADICIONE ISTO
      
      if (Array.isArray(response.data)) {
        setDiasSemana(response.data);
      } else if (Array.isArray(response.data.results)) {
        setDiasSemana(response.data.results);
      } else {
        setDiasSemana([]);
      }
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
        professor: Number(formData.professor) || null // <-- converte para int ou null
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
        professor: '',
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
      professor: turma.professor || '',
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
      professor: '',
      ct: centroId,
    });
    setEditId(null);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleShowAddAluno = (turmaId) => {
    setTurmaIdSelecionada(turmaId);
    setShowAddAluno(true);
  };

  const handleShowAlunosTurma = async (turmaId) => {
    try {
      const response = await api.get(`turmas/${turmaId}/alunos/`);
      setAlunosTurma(response.data.alunos);
      setTurmaModalNome(response.data.turma.professor_nome || 'Turma');
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
        Turmas do Centro: <span style={{ color: '#1a237e' }}>{centroNome}</span>
      </h2>

      {!showForm && (
        <button
          onClick={handleNovaTurma}
          style={{
            ...styles.tab,
            backgroundColor: '#1a237e',
            color: 'white',
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Cadastrar Nova Turma
        </button>
      )}

      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: 10, borderBottom: '2px solid #eee', textAlign: 'left' }}>Dias</th>
              <th style={{ padding: 10, borderBottom: '2px solid #eee', textAlign: 'left' }}>Horário</th>
              <th style={{ padding: 10, borderBottom: '2px solid #eee', textAlign: 'left' }}>Capacidade</th>
              <th style={{ padding: 10, borderBottom: '2px solid #eee', textAlign: 'left' }}>Professor</th>
              <th style={{ padding: 10, borderBottom: '2px solid #eee', textAlign: 'left' }}>Alunos</th>
              <th style={{ padding: 10, borderBottom: '2px solid #eee', textAlign: 'center' }}>Ações</th>
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
                <td style={{ padding: 10 }}>
                  {/* Exibe os nomes dos dias da semana, se vierem no objeto */}
                  {turma.dias_semana_nomes
                    ? turma.dias_semana_nomes.join(', ')
                    : (turma.dias_semana || []).join(', ')
                  }
                </td>
                <td style={{ padding: 10 }}>{turma.horario}</td>
                <td style={{ padding: 10 }}>{turma.capacidade_maxima}</td>
                <td style={{ padding: 10 }}>{turma.professor_nome || turma.professor}</td>
                <td style={{ padding: 10 }}>
                  <button
                    style={{ 
                      color: '#1a237e', 
                      textDecoration: 'underline', 
                      cursor: 'pointer',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      font: 'inherit'
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      handleShowAlunosTurma(turma.id);
                    }}
                  >
                    {turma.alunos_count}
                  </button>
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <button
                    onClick={() => handleEdit(turma)}
                    style={{ ...styles.tab, marginRight: 8 }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(turma.id)}
                    style={{ ...styles.tab, backgroundColor: '#f44336', color: 'white', marginRight: 8 }}
                  >
                    Excluir
                  </button>
                  <button
                    onClick={() => handleShowAddAluno(turma.id)}
                    style={{ ...styles.tab, backgroundColor: '#388e3c', color: 'white' }}
                  >
                    Adicionar Aluno
                  </button>
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
                diasSemana.map((dia) => (
                  <option key={dia.id} value={dia.id}>{dia.nome}</option>
                ))
              ) : (
                <option disabled>Carregando dias...</option>
              )}
            </select>
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
            <label style={{ fontWeight: 500, marginBottom: 2 }} htmlFor="professor">
              Professor
            </label>
            <select
              id="professor"
              name="professor"
              value={formData.professor}
              onChange={handleChange}
              style={{
                padding: '8px',
                borderRadius: 4,
                border: '1px solid #ccc',
                fontSize: '1rem'
              }}
              required
            >
              <option value="">Selecione</option>
              {professores.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.first_name || prof.username}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              style={{
                backgroundColor: '#1a237e',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                padding: '10px 0',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                flex: 1
              }}
            >
              {editId ? 'Salvar Alterações' : 'Cadastrar Turma'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditId(null);
                setFormData({
                  dias_semana: [],
                  horario: '',
                  capacidade_maxima: '',
                  professor: '',
                  ct: centroId,
                });
                setError('');
                setSuccess('');
              }}
              style={{
                ...styles.tab,
                backgroundColor: '#888',
                color: 'white',
                flex: 1
              }}
            >
              Cancelar
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
              setSuccess('Alunos adicionados com sucesso!');
              fetchTurmas();
            } catch (error) {
              setError(error.response?.data?.error || 'Erro ao adicionar alunos.');
            }
          }}
          style={{ marginTop: 16, background: '#f5f5f5', padding: 16, borderRadius: 8 }}
        >
          <label>Selecione os alunos:</label>
          <select
            multiple
            value={selectedAlunos}
            onChange={e => setSelectedAlunos([...e.target.selectedOptions].map(opt => opt.value))}
            style={{ width: '100%', marginBottom: 8 }}
          >
            {alunosDisponiveis.map(aluno => (
              <option key={aluno.id} value={aluno.id}>
                {aluno.first_name} {aluno.last_name} ({aluno.username})
              </option>
            ))}
          </select>
          <button type="submit" style={{ background: '#388e3c', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 4 }}>
            Adicionar
          </button>
          <button type="button" onClick={() => setShowAddAluno(false)} style={{ marginLeft: 8 }}>
            Cancelar
          </button>
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
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Alunos da turma</h3>
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
                marginTop: 16, background: '#1a237e', color: 'white', border: 'none',
                borderRadius: 4, padding: '8px 16px', cursor: 'pointer'
              }}
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