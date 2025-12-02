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
          Cadastrar Novo Centro de Treinamento
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
                      color: '#1F6C86',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'none'
                    }}
                  >
                    {centro.nome}
                  </Link>
                </td>
                <td style={{ padding: 10 }}>{centro.endereco}</td>
                <td style={{ padding: 10 }}>{centro.telefone}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <div className="centro-treinamento-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      className="centro-treinamento-action-btn"
                      onClick={() => handleEdit(centro)}
                      style={{
                        padding: '0.5rem 0.875rem',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        backgroundColor: '#2196f3',
                        color: 'white',
                        minHeight: '36px',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#1976d2'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
                    >
                      Editar
                    </button>
                    <button
                      className="centro-treinamento-action-btn"
                      onClick={() => handleDelete(centro.id)}
                      style={{
                        padding: '0.5rem 0.875rem',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        backgroundColor: '#f44336',
                        color: 'white',
                        minHeight: '36px',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#d32f2f'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#f44336'}
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de cadastro/edição */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
              setEditId(null);
              setFormData({ nome: '', endereco: '', telefone: '' });
              setError('');
              setSuccess('');
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.5rem', color: '#333' }}>
              {editId ? 'Editar Centro de Treinamento' : 'Novo Centro de Treinamento'}
            </h3>

            <form
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              onSubmit={handleSubmit}
            >
              {error && (
                <div style={{ color: '#c62828', background: '#ffebee', padding: '12px', borderRadius: '4px', fontSize: '0.9rem' }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ color: '#2e7d32', background: '#e8f5e9', padding: '12px', borderRadius: '4px', fontSize: '0.9rem' }}>
                  {success}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: 500, fontSize: '0.9rem', color: '#555' }} htmlFor="nome">
                  Nome do Centro *
                </label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '0.95rem',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: 500, fontSize: '0.9rem', color: '#555' }} htmlFor="endereco">
                  Endereço *
                </label>
                <input
                  type="text"
                  id="endereco"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '0.95rem',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: 500, fontSize: '0.9rem', color: '#555' }} htmlFor="telefone">
                  Telefone *
                </label>
                <input
                  type="tel"
                  id="telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  style={{
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '0.95rem',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
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
                    backgroundColor: '#f5f5f5',
                    color: '#333',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    flex: 1,
                    transition: 'background-color 0.2s',
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
                    padding: '10px 20px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    flex: 1,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#151b60'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#1F6C86'}
                >
                  {editId ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CadastroCentroTreinamento;