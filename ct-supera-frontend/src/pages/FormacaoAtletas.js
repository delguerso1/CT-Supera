import React, { useState } from 'react';
import api from '../services/api';

function FormacaoAtletas() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    cpf: '',
    email: '',
    telefone: '',
    data_nascimento: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatarNome = (valor) => {
    if (!valor) return '';
    return valor
      .toLowerCase()
      .split(' ')
      .filter(part => part.trim() !== '')
      .map(part => part
        .split('-')
        .map(p => (p ? p.charAt(0).toUpperCase() + p.slice(1) : ''))
        .join('-'))
      .join(' ');
  };

  const formatarTelefone = (telefone) => {
    const numeros = telefone.replace(/\D/g, '').slice(0, 11);
    if (numeros.length >= 2 && numeros.length <= 6) {
      return `(${numeros.slice(0, 2)})${numeros.slice(2)}`;
    }
    if (numeros.length >= 7) {
      return `(${numeros.slice(0, 2)})${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    }
    return numeros;
  };

  const formatarCpf = (cpf) => cpf.replace(/\D/g, '').slice(0, 11);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let valorFormatado = value;
    if (name === 'first_name' || name === 'last_name') {
      valorFormatado = formatarNome(value);
    }
    if (name === 'telefone') {
      valorFormatado = formatarTelefone(value);
    }
    if (name === 'cpf') {
      valorFormatado = formatarCpf(value);
    }
    setFormData(prev => ({
      ...prev,
      [name]: valorFormatado
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        cpf: formatarCpf(formData.cpf),
        email: formData.email,
        telefone: formData.telefone,
        data_nascimento: formData.data_nascimento
      };
      await api.post('usuarios/precadastros/', payload);
      setSuccess('Cadastro enviado com sucesso! Em breve entraremos em contato.');
      setFormData({
        first_name: '',
        last_name: '',
        cpf: '',
        email: '',
        telefone: '',
        data_nascimento: ''
      });
    } catch (err) {
      const data = err.response?.data;
      const message =
        data?.error ||
        data?.detail ||
        data?.email ||
        data?.cpf ||
        data?.telefone ||
        'Erro ao enviar cadastro. Verifique os dados e tente novamente.';
      setError(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{ color: '#1F6C86' }}>Alunos</h1>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>
        Se você já é aluno do CT Supera, preencha o cadastro abaixo. A seleção de turma
        será feita posteriormente pela nossa equipe.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label>Nome</label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
        </div>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label>Sobrenome</label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
          />
        </div>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label>CPF</label>
          <input
            type="text"
            name="cpf"
            value={formData.cpf}
            onChange={handleChange}
            required
          />
        </div>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label>E-mail</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label>Telefone</label>
          <input
            type="tel"
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            placeholder="(21)00000-0000"
            required
          />
        </div>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label>Data de Nascimento</label>
          <input
            type="date"
            name="data_nascimento"
            value={formData.data_nascimento}
            onChange={handleChange}
            required
          />
        </div>

        {error && <div style={{ color: '#d32f2f' }}>{error}</div>}
        {success && <div style={{ color: '#2e7d32' }}>{success}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: '#1F6C86',
            color: 'white',
            padding: '0.75rem 1.25rem',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Enviando...' : 'Enviar cadastro'}
        </button>
      </form>
    </div>
  );
}

export default FormacaoAtletas;