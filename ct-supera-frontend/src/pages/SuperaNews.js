import React, { useState, useEffect } from 'react';
import api, { MEDIA_URL } from '../services/api';

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1rem',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2.5rem',
    color: '#1a237e',
    marginBottom: '1rem',
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#555',
  },
  addButton: {
    backgroundColor: '#1a237e',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  newsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '2rem',
    marginTop: '2rem',
  },
  newsCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    transition: 'transform 0.3s, box-shadow 0.3s',
    cursor: 'pointer',
  },
  newsImage: {
    width: '100%',
    height: '200px',
    objectFit: 'contain',
    backgroundColor: '#f5f5f5',
  },
  newsContent: {
    padding: '1.5rem',
  },
  newsTitle: {
    fontSize: '1.3rem',
    color: '#1a237e',
    marginBottom: '0.5rem',
  },
  newsDescription: {
    fontSize: '1rem',
    color: '#666',
    marginBottom: '1rem',
    lineHeight: '1.5',
  },
  newsFooter: {
    fontSize: '0.9rem',
    color: '#999',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '1.8rem',
    color: '#1a237e',
    marginBottom: '1.5rem',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    color: '#333',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '8px',
    minHeight: '100px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
  },
  submitButton: {
    backgroundColor: '#1a237e',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  cancelButton: {
    backgroundColor: '#999',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    fontSize: '0.9rem',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  loading: {
    textAlign: 'center',
    fontSize: '1.2rem',
    color: '#666',
    padding: '2rem',
  },
};

function SuperaNews() {
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    imagem: null,
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchNoticias();
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
  }, []);

  const fetchNoticias = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cts/supera-news/');
      setNoticias(response.data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar notícias. Tente novamente mais tarde.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageChange = (e) => {
    setFormData({ ...formData, imagem: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = new FormData();
    data.append('titulo', formData.titulo);
    data.append('descricao', formData.descricao);
    if (formData.imagem) {
      data.append('imagem', formData.imagem);
    }

    try {
      await api.post('/cts/supera-news/criar/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setShowModal(false);
      setFormData({ titulo: '', descricao: '', imagem: null });
      fetchNoticias();
    } catch (err) {
      alert('Erro ao criar notícia. Verifique os dados e tente novamente.');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta notícia?')) {
      try {
        await api.delete(`/cts/supera-news/excluir/${id}/`);
        fetchNoticias();
      } catch (err) {
        alert('Erro ao excluir notícia.');
        console.error(err);
      }
    }
  };

  const isGerente = user && user.tipo === 'gerente';

  if (loading) {
    return <div style={styles.loading}>Carregando notícias...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Supera News</h1>
        <p style={styles.subtitle}>
          Aqui você encontra as últimas notícias e novidades do CT Supera.
        </p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {isGerente && (
        <button
          style={styles.addButton}
          onClick={() => setShowModal(true)}
        >
          <span>➕</span> Adicionar Notícia
        </button>
      )}

      <div style={styles.newsGrid}>
        {noticias.length === 0 ? (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#999' }}>
            Nenhuma notícia disponível no momento.
          </p>
        ) : (
          noticias.map((noticia) => (
            <div
              key={noticia.id}
              style={styles.newsCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
              }}
            >
              <img
                src={`${MEDIA_URL}${noticia.imagem}`}
                alt={noticia.titulo}
                style={styles.newsImage}
              />
              <div style={styles.newsContent}>
                <h3 style={styles.newsTitle}>{noticia.titulo}</h3>
                <p style={styles.newsDescription}>{noticia.descricao}</p>
                <div style={styles.newsFooter}>
                  <span>Por: {noticia.autor_nome}</span>
                  <span>{new Date(noticia.data_criacao).toLocaleDateString('pt-BR')}</span>
                </div>
                {isGerente && (
                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDelete(noticia.id)}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Adicionar Nova Notícia</h2>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Título *</label>
                <input
                  type="text"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Descrição *</label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleInputChange}
                  style={styles.textarea}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Imagem *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.buttonGroup}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ titulo: '', descricao: '', imagem: null });
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" style={styles.submitButton}>
                  Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperaNews;