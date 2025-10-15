import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Adicione esta importação
import api from '../services/api';

function CadastroCentroTreinamento({ styles }) {
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    telefone: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [centros, setCentros] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchCentros();
  }, []);

  const fetchCentros = async () => {
    try {
      const response = await api.get('cts/');
      setCentros(response.data);
    } catch {
      setError('Erro ao buscar centros de treinamento.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editId) {
        await api.put(`cts/editar/${editId}/`, formData);
        setSuccess('Centro de treinamento atualizado com sucesso!');
      } else {
        await api.post('cts/criar/', formData);
        setSuccess('Centro de treinamento cadastrado com sucesso!');
      }
      setFormData({ nome: '', endereco: '', telefone: '' });
      setEditId(null);
      setShowForm(false);
      fetchCentros();
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao salvar centro de treinamento. Tente novamente.');
    }
  };

  const handleEdit = (centro) => {
    setFormData({
      nome: centro.nome,
      endereco: centro.endereco,
      telefone: centro.telefone,
    });
    setEditId(centro.id);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir este centro?')) {
      try {
        await api.delete(`cts/excluir/${id}/`);
        setSuccess('Centro de treinamento excluído com sucesso!');
        fetchCentros();
      } catch {
        setError('Erro ao excluir centro de treinamento.');
      }
    }
  };

  const handleNovoCentro = () => {
    setFormData({ nome: '', endereco: '', telefone: '' });
    setEditId(null);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Centros de Treinamento</h2>

      {/* Botão para cadastrar novo centro */}
      {!showForm && (
        <button
          onClick={handleNovoCentro}
          style={{
            backgroundColor: '#1a237e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: 16,
            width: '100%',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#0d47a1'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#1a237e'}
        >
          ➕ Cadastrar Novo Centro de Treinamento
        </button>
      )}

      {/* Tabela de centros cadastrados */}
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: 10, borderBottom: '2px solid #eee', textAlign: 'left' }}>Nome</th>
              <th style={{ padding: 10, borderBottom: '2px solid #eee', textAlign: 'left' }}>Endereço</th>
              <th style={{ padding: 10, borderBottom: '2px solid #eee', textAlign: 'left' }}>Telefone</th>
              <th style={{ padding: 10, borderBottom: '2px solid #eee', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {centros.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: '#888', padding: 12, textAlign: 'center' }}>
                  Nenhum centro cadastrado.
                </td>
              </tr>
            )}
            {centros.map((centro) => (
              <tr key={centro.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>
                  <Link
                    to={`/centros/${centro.id}/turmas`}
                    style={{
                      color: '#1a237e',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {centro.nome}
                  </Link>
                </td>
                <td style={{ padding: 10 }}>{centro.endereco}</td>
                <td style={{ padding: 10 }}>{centro.telefone}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <button
                    onClick={() => handleEdit(centro)}
                    style={{
                      backgroundColor: '#1a237e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      marginRight: 8,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#0d47a1'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#1a237e'}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(centro.id)}
                    style={{
                      backgroundColor: '#d32f2f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#b71c1c'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#d32f2f'}
                  >
                    🗑️ Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formulário de cadastro/edição */}
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
            <label style={{ fontWeight: 500, marginBottom: 2 }} htmlFor="nome">
              Nome do Centro
            </label>
            <input
              type="text"
              id="nome"
              name="nome"
              value={formData.nome}
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
            <label style={{ fontWeight: 500, marginBottom: 2 }} htmlFor="endereco">
              Endereço
            </label>
            <input
              type="text"
              id="endereco"
              name="endereco"
              value={formData.endereco}
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
            <label style={{ fontWeight: 500, marginBottom: 2 }} htmlFor="telefone">
              Telefone
            </label>
            <input
              type="tel"
              id="telefone"
              name="telefone"
              value={formData.telefone}
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

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              style={{
                backgroundColor: '#1a237e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                flex: 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#0d47a1'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#1a237e'}
            >
              {editId ? '💾 Salvar Alterações' : '➕ Cadastrar Centro de Treinamento'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditId(null);
                setFormData({ nome: '', endereco: '', telefone: '' });
                setError('');
                setSuccess('');
              }}
              style={{
                backgroundColor: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                flex: 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#616161'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#757575'}
            >
              ❌ Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default CadastroCentroTreinamento;