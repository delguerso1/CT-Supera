import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

function formatarData(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function modalidades(c) {
  const p = [];
  if (c.interesse_praia) p.push('Praia');
  if (c.interesse_quadra) p.push('Quadra');
  return p.length ? p.join(' · ') : '—';
}

function GerenciarCandidaturasTrabalho() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setErro('');
    setLoading(true);
    try {
      const { data } = await api.get('cts/trabalhe-conosco/');
      setLista(Array.isArray(data) ? data : []);
    } catch (e) {
      setLista([]);
      setErro(
        e.response?.data?.error ||
          'Não foi possível carregar as candidaturas. Verifique se você está logado como gerente.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const tableWrap = {
    overflowX: 'auto',
    marginTop: '8px',
    WebkitOverflowScrolling: 'touch',
  };

  const table = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    minWidth: '720px',
  };

  const th = {
    textAlign: 'left',
    padding: '10px 8px',
    borderBottom: '2px solid #1F6C86',
    color: '#1F6C86',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  };

  const td = {
    padding: '10px 8px',
    borderBottom: '1px solid #e0e0e0',
    verticalAlign: 'top',
    color: '#333',
  };

  const linkCv = {
    color: '#1565c0',
    fontWeight: '600',
    textDecoration: 'none',
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '8px',
        }}
      >
        <p style={{ margin: 0, color: '#666', fontSize: '15px', maxWidth: '640px' }}>
          Candidaturas enviadas pela página Trabalhe conosco. Use o link para abrir o PDF do
          currículo.
        </p>
        <button
          type="button"
          onClick={carregar}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #1F6C86',
            background: '#fff',
            color: '#1F6C86',
            fontWeight: '600',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Atualizando…' : 'Atualizar lista'}
        </button>
      </div>

      {erro ? (
        <div
          style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          {erro}
        </div>
      ) : null}

      {loading && lista.length === 0 ? (
        <p style={{ color: '#666' }}>Carregando candidaturas…</p>
      ) : null}

      {!loading && !erro && lista.length === 0 ? (
        <p style={{ color: '#666' }}>Nenhuma candidatura recebida ainda.</p>
      ) : null}

      {lista.length > 0 ? (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Data</th>
                <th style={th}>Nome</th>
                <th style={th}>Contato</th>
                <th style={th}>Vaga</th>
                <th style={th}>Modalidades</th>
                <th style={th}>Período (Ed. Fís.)</th>
                <th style={th}>Currículo</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td style={td}>{formatarData(c.data_envio)}</td>
                  <td style={td}>{c.nome_completo}</td>
                  <td style={td}>
                    <div>{c.email}</div>
                    <div style={{ color: '#666', marginTop: '4px' }}>{c.telefone}</div>
                  </td>
                  <td style={td}>{c.tipo_vaga_display || c.tipo_vaga}</td>
                  <td style={td}>{modalidades(c)}</td>
                  <td style={td}>{c.periodo_ed_fis || '—'}</td>
                  <td style={td}>
                    {c.curriculo_url ? (
                      <a href={c.curriculo_url} target="_blank" rel="noopener noreferrer" style={linkCv}>
                        Abrir PDF
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {lista.some((c) => c.mensagem) ? (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '16px', color: '#1F6C86', marginBottom: '12px' }}>Mensagens</h3>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#444', lineHeight: 1.5 }}>
            {lista
              .filter((c) => c.mensagem && String(c.mensagem).trim())
              .map((c) => (
                <li key={`msg-${c.id}`} style={{ marginBottom: '10px' }}>
                  <strong>{c.nome_completo}:</strong> {c.mensagem}
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default GerenciarCandidaturasTrabalho;
