import React, { useState, useEffect } from 'react';
import api from '../services/api';

function formatarDiaCurto(nome) {
  if (!nome) return '';
  return String(nome).replace(/-feira/gi, '').trim();
}

function formatarHorarioTurma(horario) {
  if (!horario) return '';
  const [horaStr, minutoStr] = String(horario).split(':');
  const hora = parseInt(horaStr, 10);
  const minuto = parseInt(minutoStr, 10);
  if (Number.isNaN(hora)) return '';
  const horaFmt = String(hora).padStart(2, '0');
  if (!minuto) return `${horaFmt}h`;
  return `${horaFmt}h${String(minuto).padStart(2, '0')}`;
}

function primeiroNome(nomeCompleto) {
  if (!nomeCompleto) return '';
  return String(nomeCompleto).trim().split(/\s+/)[0] || '';
}

function nomeAlunoCompleto(aluno) {
  const nome = `${aluno?.first_name || ''} ${aluno?.last_name || ''}`.trim();
  return nome || aluno?.username || 'Aluno';
}

function CadastroTurmas({ centroId, styles, onVoltar }) {
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
  const [turmaIdSelecionada, setTurmaIdSelecionada] = useState(null);
  const [alunosDisponiveis, setAlunosDisponiveis] = useState([]);
  const [showGerenciarAlunos, setShowGerenciarAlunos] = useState(false);
  const [alunosTurma, setAlunosTurma] = useState([]);
  const [turmaModalNome, setTurmaModalNome] = useState('');
  const [buscaAluno, setBuscaAluno] = useState('');
  const [erroAlunos, setErroAlunos] = useState('');
  const [alunoEmAndamento, setAlunoEmAndamento] = useState(null);

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
      if (Array.isArray(response.data)) {
        setAlunosDisponiveis(response.data);
      } else if (Array.isArray(response.data?.results)) {
        setAlunosDisponiveis(response.data.results);
      } else {
        setAlunosDisponiveis([]);
      }
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
        dias_semana: formData.dias_semana.map(Number),
        professores: formData.professores.map(Number),
        aceita_kids: Boolean(formData.aceita_kids),
        aceita_teen: Boolean(formData.aceita_teen),
        aceita_adultos: formData.aceita_adultos !== false
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
        aceita_kids: false,
        aceita_teen: false,
        aceita_adultos: true,
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
      aceita_kids: Boolean(turma.aceita_kids),
      aceita_teen: Boolean(turma.aceita_teen),
      aceita_adultos: turma.aceita_adultos !== false,
      professores: turma.professores || [],
      ct: turma.ct?.id || turma.ct || centroId,
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
      aceita_kids: false,
      aceita_teen: false,
      aceita_adultos: true,
      professores: [],
      ct: centroId,
    });
    setEditId(null);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const carregarAlunosTurma = async (turmaId) => {
    const response = await api.get(`turmas/${turmaId}/alunos/`);
    setAlunosTurma(Array.isArray(response.data?.alunos) ? response.data.alunos : []);
    return response.data;
  };

  const handleGerenciarAlunos = async (turma) => {
    setTurmaIdSelecionada(turma.id);
    setTurmaModalNome(`Turma das ${formatarHorarioTurma(turma.horario)}`);
    setBuscaAluno('');
    setErroAlunos('');
    try {
      await carregarAlunosTurma(turma.id);
      setShowGerenciarAlunos(true);
    } catch {
      setError('Erro ao buscar alunos da turma.');
    }
  };

  const fecharGerenciarAlunos = () => {
    setShowGerenciarAlunos(false);
    setTurmaIdSelecionada(null);
    setAlunosTurma([]);
    setBuscaAluno('');
    setErroAlunos('');
    setAlunoEmAndamento(null);
  };

  const handleAdicionarAlunoTurma = async (alunoId) => {
    if (!turmaIdSelecionada || alunoEmAndamento) return;
    setErroAlunos('');
    setAlunoEmAndamento(alunoId);
    try {
      await api.post(`turmas/${turmaIdSelecionada}/adicionar-alunos/`, { alunos: [alunoId] });
      await carregarAlunosTurma(turmaIdSelecionada);
      fetchTurmas();
    } catch (err) {
      const data = err.response?.data;
      const invalidos = data?.alunos_invalidos;
      if (Array.isArray(invalidos) && invalidos.length) {
        setErroAlunos(invalidos.map((a) => `${a.nome}: ${a.motivo}`).join(' '));
      } else {
        setErroAlunos(data?.error || 'Erro ao adicionar aluno.');
      }
    } finally {
      setAlunoEmAndamento(null);
    }
  };

  const handleRemoverAlunoTurma = async (alunoId) => {
    if (!turmaIdSelecionada || alunoEmAndamento) return;
    if (!window.confirm('Remover este aluno da turma?')) return;
    setErroAlunos('');
    setAlunoEmAndamento(alunoId);
    try {
      await api.post(`turmas/${turmaIdSelecionada}/remover-alunos/`, { alunos: [alunoId] });
      await carregarAlunosTurma(turmaIdSelecionada);
      fetchTurmas();
    } catch (err) {
      setErroAlunos(err.response?.data?.error || 'Erro ao remover aluno.');
    } finally {
      setAlunoEmAndamento(null);
    }
  };

  const termoBusca = buscaAluno.trim().toLowerCase();
  const idsNaTurma = new Set(alunosTurma.map((a) => a.id));
  const alunosNaTurmaFiltrados = [...alunosTurma]
    .filter((aluno) => !termoBusca || nomeAlunoCompleto(aluno).toLowerCase().includes(termoBusca))
    .sort((a, b) => nomeAlunoCompleto(a).localeCompare(nomeAlunoCompleto(b), 'pt-BR'));
  const alunosParaAdicionar = alunosDisponiveis
    .filter((aluno) => !idsNaTurma.has(aluno.id))
    .filter((aluno) => !termoBusca || nomeAlunoCompleto(aluno).toLowerCase().includes(termoBusca))
    .sort((a, b) => nomeAlunoCompleto(a).localeCompare(nomeAlunoCompleto(b), 'pt-BR'));

  return (
    <div style={styles.card}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          {onVoltar && (
            <button
              type="button"
              onClick={onVoltar}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                marginBottom: 8,
                color: '#1F6C86',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            >
              ← Voltar aos centros
            </button>
          )}
          <h2
            style={{
              ...(styles.cardTitle || {}),
              margin: 0,
              marginBottom: 4,
              fontSize: '1.5rem',
              color: '#1F6C86',
            }}
          >
            Centro de Treinamento
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: '1.15rem',
              color: '#333',
              fontWeight: 600,
            }}
          >
            {centroNome || '—'}
          </p>
        </div>

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
              marginLeft: 'auto',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#151b60'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#1F6C86'}
          >
            Adicionar turma
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 720 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '12px 10px', borderBottom: '2px solid #e0e0e0', textAlign: 'left', verticalAlign: 'middle', width: '22%' }}>Dias</th>
              <th style={{ padding: '12px 10px', borderBottom: '2px solid #e0e0e0', textAlign: 'center', verticalAlign: 'middle', width: '12%' }}>Horário</th>
              <th style={{ padding: '12px 10px', borderBottom: '2px solid #e0e0e0', textAlign: 'left', verticalAlign: 'middle', width: '16%' }}>Faixa</th>
              <th style={{ padding: '12px 10px', borderBottom: '2px solid #e0e0e0', textAlign: 'center', verticalAlign: 'middle', width: '10%' }}>Capacidade</th>
              <th style={{ padding: '12px 10px', borderBottom: '2px solid #e0e0e0', textAlign: 'left', verticalAlign: 'middle', width: '14%' }}>Professores</th>
              <th style={{ padding: '12px 10px', borderBottom: '2px solid #e0e0e0', textAlign: 'center', verticalAlign: 'middle', width: '8%' }}>Alunos</th>
              <th style={{ padding: '12px 10px', borderBottom: '2px solid #e0e0e0', textAlign: 'center', verticalAlign: 'middle', width: '18%' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {turmas.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: '#888', padding: 12, textAlign: 'center' }}>
                  Nenhuma turma cadastrada.
                </td>
              </tr>
            )}
            {turmas.map((turma) => (
              <tr key={turma.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px 10px', textAlign: 'left', verticalAlign: 'middle' }}>
                  {Array.isArray(turma.dias_semana_nomes) && turma.dias_semana_nomes.length
                    ? turma.dias_semana_nomes.map(formatarDiaCurto).join(', ')
                    : '-'}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>{formatarHorarioTurma(turma.horario) || '-'}</td>
                <td style={{ padding: '12px 10px', textAlign: 'left', verticalAlign: 'middle' }}>
                  {[turma.aceita_kids && 'Kids', turma.aceita_teen && 'Teen', turma.aceita_adultos && 'Adultos'].filter(Boolean).join(', ') || '-'}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>{turma.capacidade_maxima}</td>
                <td style={{ padding: '12px 10px', textAlign: 'left', verticalAlign: 'middle' }}>
                  {(turma.professor_nomes && turma.professor_nomes.length > 0)
                    ? turma.professor_nomes.map(primeiroNome).filter(Boolean).join(', ')
                    : '-'}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
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
                      handleGerenciarAlunos(turma);
                    }}
                  >
                    {turma.alunos_count || 0}
                  </button>
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
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
                      onClick={() => handleGerenciarAlunos(turma)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        backgroundColor: '#1F6C86',
                        color: 'white',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#155a70'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#1F6C86'}
                    >
                      Alunos
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontWeight: 500, marginBottom: 2 }}>Faixas Etárias Aceitas</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="aceita_kids"
                  checked={Boolean(formData.aceita_kids)}
                  onChange={(e) => setFormData(prev => ({ ...prev, aceita_kids: e.target.checked }))}
                />
                Kids (crianças até 10 anos)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="aceita_teen"
                  checked={Boolean(formData.aceita_teen)}
                  onChange={(e) => setFormData(prev => ({ ...prev, aceita_teen: e.target.checked }))}
                />
                Teen (adolescentes de 11 a 17 anos)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="aceita_adultos"
                  checked={formData.aceita_adultos !== false}
                  onChange={(e) => setFormData(prev => ({ ...prev, aceita_adultos: e.target.checked }))}
                />
                Adultos (18 anos ou mais)
              </label>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>Marque todas que se aplicam.</span>
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
                  aceita_kids: false,
        aceita_teen: false,
        aceita_adultos: true,
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

      {showGerenciarAlunos && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) fecharGerenciarAlunos();
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 8,
              width: '100%',
              maxWidth: 560,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 4, color: '#1F6C86' }}>
              Alunos da turma
            </h3>
            <p style={{ margin: '0 0 16px', color: '#555', fontWeight: 600 }}>
              {turmaModalNome || 'Turma'}
            </p>

            <input
              type="search"
              value={buscaAluno}
              onChange={(e) => setBuscaAluno(e.target.value)}
              placeholder="Buscar aluno pelo nome"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 4,
                border: '1px solid #ccc',
                fontSize: '1rem',
                marginBottom: 16,
              }}
            />

            {erroAlunos && (
              <div style={{ color: '#c62828', background: '#ffebee', padding: 10, borderRadius: 4, marginBottom: 12, fontSize: '0.9rem' }}>
                {erroAlunos}
              </div>
            )}

            <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', color: '#333' }}>
              Na turma ({alunosTurma.length})
            </h4>
            {alunosNaTurmaFiltrados.length === 0 ? (
              <div style={{ color: '#888', marginBottom: 16, fontSize: '0.9rem' }}>
                {alunosTurma.length === 0 ? 'Nenhum aluno nesta turma.' : 'Nenhum aluno encontrado na busca.'}
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
                {alunosNaTurmaFiltrados.map((aluno) => (
                  <li
                    key={aluno.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '8px 0',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <span>{nomeAlunoCompleto(aluno)}</span>
                    <button
                      type="button"
                      disabled={alunoEmAndamento === aluno.id}
                      onClick={() => handleRemoverAlunoTurma(aluno.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 4,
                        border: 'none',
                        cursor: alunoEmAndamento === aluno.id ? 'wait' : 'pointer',
                        fontSize: '0.85rem',
                        backgroundColor: '#f44336',
                        color: 'white',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', color: '#333' }}>
              Adicionar à turma
            </h4>
            {alunosParaAdicionar.length === 0 ? (
              <div style={{ color: '#888', marginBottom: 16, fontSize: '0.9rem' }}>
                {termoBusca ? 'Nenhum aluno encontrado para adicionar.' : 'Todos os alunos já estão nesta turma.'}
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
                {alunosParaAdicionar.map((aluno) => (
                  <li
                    key={aluno.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '8px 0',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <span>{nomeAlunoCompleto(aluno)}</span>
                    <button
                      type="button"
                      disabled={alunoEmAndamento === aluno.id}
                      onClick={() => handleAdicionarAlunoTurma(aluno.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 4,
                        border: 'none',
                        cursor: alunoEmAndamento === aluno.id ? 'wait' : 'pointer',
                        fontSize: '0.85rem',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Adicionar
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={fecharGerenciarAlunos}
              style={{
                backgroundColor: '#1F6C86',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                cursor: 'pointer',
                width: '100%',
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