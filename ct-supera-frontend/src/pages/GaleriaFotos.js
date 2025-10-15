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
  galleryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginTop: '2rem',
  },
  photoCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    transition: 'transform 0.3s, box-shadow 0.3s',
  },
  photoImage: {
    width: '100%',
    height: '250px',
    objectFit: 'cover',
    cursor: 'pointer',
  },
  photoContent: {
    padding: '1rem',
  },
  photoTitle: {
    fontSize: '1.1rem',
    color: '#1a237e',
    marginBottom: '0.5rem',
    fontWeight: '600',
  },
  photoDescription: {
    fontSize: '0.95rem',
    color: '#666',
    marginBottom: '0.75rem',
    lineHeight: '1.4',
  },
  photoFooter: {
    fontSize: '0.85rem',
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
  imageModal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1rem',
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  modalImage: {
    maxWidth: '100%',
    maxHeight: '80vh',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  imageCaption: {
    marginTop: '1rem',
    textAlign: 'center',
    color: '#333',
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
    minHeight: '80px',
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

function GaleriaFotos() {
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    imagem: null,
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchFotos();
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
  }, []);

  const fetchFotos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cts/galeria/');
      setFotos(response.data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar fotos. Tente novamente mais tarde.');
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
      await api.post('/cts/galeria/criar/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setShowModal(false);
      setFormData({ titulo: '', descricao: '', imagem: null });
      fetchFotos();
    } catch (err) {
      alert('Erro ao adicionar foto. Verifique os dados e tente novamente.');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta foto?')) {
      try {
        await api.delete(`/cts/galeria/excluir/${id}/`);
        fetchFotos();
      } catch (err) {
        alert('Erro ao excluir foto.');
        console.error(err);
      }
    }
  };

  const handleImageClick = (foto) => {
    setSelectedImage(foto);
    setShowImageModal(true);
  };

  const isGerente = user && user.tipo === 'gerente';

  if (loading) {
    return <div style={styles.loading}>Carregando galeria...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Galeria de Fotos</h1>
        <p style={styles.subtitle}>
          Veja fotos dos nossos eventos, treinos e conquistas!
        </p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {isGerente && (
        <button
          style={styles.addButton}
          onClick={() => setShowModal(true)}
        >
          <span>➕</span> Adicionar Foto
        </button>
      )}

      <div style={styles.galleryGrid}>
        {fotos.length === 0 ? (
          <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#999' }}>
            Nenhuma foto disponível no momento.
          </p>
        ) : (
          fotos.map((foto) => (
            <div
              key={foto.id}
              style={styles.photoCard}
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
                src={`${MEDIA_URL}${foto.imagem}`}
                alt={foto.titulo}
                style={styles.photoImage}
                onClick={() => handleImageClick(foto)}
              />
              <div style={styles.photoContent}>
                <h3 style={styles.photoTitle}>{foto.titulo}</h3>
                {foto.descricao && (
                  <p style={styles.photoDescription}>{foto.descricao}</p>
                )}
                <div style={styles.photoFooter}>
                  <span>Por: {foto.autor_nome}</span>
                  <span>{new Date(foto.data_criacao).toLocaleDateString('pt-BR')}</span>
                </div>
                {isGerente && (
                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDelete(foto.id)}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal para adicionar foto */}
      {showModal && (
        <div style={styles.modal} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Adicionar Nova Foto</h2>
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
                <label style={styles.label}>Descrição (opcional)</label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleInputChange}
                  style={styles.textarea}
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
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para visualizar imagem */}
      {showImageModal && selectedImage && (
        <div style={styles.modal} onClick={() => setShowImageModal(false)}>
          <div style={styles.imageModal} onClick={(e) => e.stopPropagation()}>
            <img
              src={`${MEDIA_URL}${selectedImage.imagem}`}
              alt={selectedImage.titulo}
              style={styles.modalImage}
            />
            <div style={styles.imageCaption}>
              <h3 style={styles.photoTitle}>{selectedImage.titulo}</h3>
              {selectedImage.descricao && (
                <p style={styles.photoDescription}>{selectedImage.descricao}</p>
              )}
              <div style={styles.photoFooter}>
                <span>Por: {selectedImage.autor_nome}</span>
                <span>{new Date(selectedImage.data_criacao).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GaleriaFotos;