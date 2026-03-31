import React, { useState } from 'react';
import api from '../services/api';
import { normalizarTelefoneBrParaApi } from '../utils/telefone';

const styles = {
  wrap: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: '2rem 1rem 3rem',
  },
  hero: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    color: '#1F6C86',
    marginBottom: '0.5rem',
    fontWeight: '700',
  },
  lead: {
    color: '#455a64',
    fontSize: '1.05rem',
    lineHeight: 1.5,
    maxWidth: '560px',
    margin: '0 auto',
  },
  cards: {
    display: 'grid',
    gap: '1rem',
    marginBottom: '2rem',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '1.25rem 1.5rem',
    boxShadow: '0 2px 12px rgba(31,108,134,0.12)',
    border: '1px solid #b3e5fc',
  },
  cardTitle: {
    color: '#1F6C86',
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '0.75rem',
  },
  cardList: {
    margin: 0,
    paddingLeft: '1.25rem',
    color: '#37474f',
    lineHeight: 1.55,
    fontSize: '0.95rem',
  },
  formCard: {
    background: '#e3f2fd',
    borderRadius: '12px',
    padding: '1.75rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  formTitle: {
    color: '#1F6C86',
    fontWeight: '700',
    marginBottom: '1.25rem',
    fontSize: '1.15rem',
  },
  field: { marginBottom: '1rem' },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#37474f',
    marginBottom: '6px',
  },
  hint: {
    fontSize: '0.8rem',
    color: '#607d8b',
    marginTop: '4px',
    lineHeight: 1.35,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #b0bec5',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #b0bec5',
    fontSize: '1rem',
    minHeight: '88px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  rowInline: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.25rem',
    alignItems: 'center',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.95rem',
    color: '#37474f',
  },
  button: {
    backgroundColor: '#1F6C86',
    color: 'white',
    padding: '12px 28px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  buttonDisabled: {
    opacity: 0.65,
    cursor: 'not-allowed',
  },
  error: {
    color: '#c62828',
    marginBottom: '12px',
    fontSize: '0.9rem',
    lineHeight: 1.4,
  },
  success: {
    color: '#2e7d32',
    marginBottom: '12px',
    fontSize: '0.95rem',
    lineHeight: 1.45,
    fontWeight: '500',
  },
  fileName: {
    fontSize: '0.85rem',
    color: '#546e7a',
    marginTop: '6px',
  },
};

const TIPO_PROFESSOR = 'professor';
const TIPO_ESTAGIARIO = 'estagiario';

function TrabalheConoscoPage() {
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipoVaga, setTipoVaga] = useState(TIPO_ESTAGIARIO);
  const [interessePraia, setInteressePraia] = useState(true);
  const [interesseQuadra, setInteresseQuadra] = useState(true);
  const [periodoEdFis, setPeriodoEdFis] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [curriculo, setCurriculo] = useState(null);
  const [cvInputKey, setCvInputKey] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    setCurriculo(f || null);
    setErro('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso(false);

    if (!nomeCompleto.trim()) {
      setErro('Informe seu nome completo.');
      return;
    }
    if (!email.trim()) {
      setErro('Informe um e-mail válido.');
      return;
    }
    if (!interessePraia && !interesseQuadra) {
      setErro('Selecione ao menos uma modalidade de interesse (praia ou quadra).');
      return;
    }
    if (!curriculo) {
      setErro('Anexe seu currículo em PDF.');
      return;
    }
    const lower = curriculo.name.toLowerCase();
    if (!lower.endsWith('.pdf')) {
      setErro('O currículo deve ser um arquivo PDF (.pdf).');
      return;
    }
    if (curriculo.size > 5 * 1024 * 1024) {
      setErro('O PDF deve ter no máximo 5 MB.');
      return;
    }

    const fd = new FormData();
    fd.append('nome_completo', nomeCompleto.trim());
    fd.append('email', email.trim());
    fd.append('telefone', normalizarTelefoneBrParaApi(telefone) || telefone.trim());
    fd.append('tipo_vaga', tipoVaga);
    fd.append('interesse_praia', interessePraia ? 'true' : 'false');
    fd.append('interesse_quadra', interesseQuadra ? 'true' : 'false');
    fd.append('periodo_ed_fis', periodoEdFis.trim());
    fd.append('mensagem', mensagem.trim());
    fd.append('curriculo', curriculo);

    setEnviando(true);
    try {
      await api.post('cts/trabalhe-conosco/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setSucesso(true);
      setNomeCompleto('');
      setEmail('');
      setTelefone('');
      setTipoVaga(TIPO_ESTAGIARIO);
      setInteressePraia(true);
      setInteresseQuadra(true);
      setPeriodoEdFis('');
      setMensagem('');
      setCurriculo(null);
      setCvInputKey((k) => k + 1);
    } catch (err) {
      const d = err.response?.data;
      let msg = 'Não foi possível enviar. Tente novamente ou entre em contato pelo WhatsApp.';
      if (typeof d === 'string') msg = d;
      else if (d?.detail) msg = d.detail;
      else if (Array.isArray(d?.non_field_errors) && d.non_field_errors[0]) {
        msg = d.non_field_errors[0];
      } else if (d && typeof d === 'object') {
        const first = Object.values(d).flat()[0];
        if (typeof first === 'string') msg = first;
        else if (Array.isArray(first) && first[0]) msg = first[0];
      }
      setErro(msg);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <header style={styles.hero}>
        <h1 style={styles.title}>Trabalhe conosco</h1>
        <p style={styles.lead}>
          Envie seus dados e currículo em PDF para concorrer às vagas de professor ou estagiário nas
          modalidades vôlei de praia e quadra.
        </p>
      </header>

      <div style={styles.cards}>
        <article style={styles.card}>
          <h2 style={styles.cardTitle}>Estagiário(a)</h2>
          <ul style={styles.cardList}>
            <li>Cursando Educação Física, a partir do 2º período.</li>
            <li>Preferência para quem tenha experiência na modalidade (praia e/ou quadra).</li>
          </ul>
        </article>
        <article style={styles.card}>
          <h2 style={styles.cardTitle}>Professor(a)</h2>
          <ul style={styles.cardList}>
            <li>Graduação em Educação Física.</li>
            <li>Preferência para quem tenha experiência na modalidade (praia e/ou quadra).</li>
          </ul>
        </article>
      </div>

      <div style={styles.formCard}>
        <h2 style={styles.formTitle}>Envio de candidatura</h2>

        {erro ? <div style={styles.error}>{erro}</div> : null}
        {sucesso ? (
          <div style={styles.success}>
            Candidatura enviada com sucesso. Entraremos em contato quando houver retorno.
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label htmlFor="tc-nome" style={styles.label}>
              Nome completo *
            </label>
            <input
              id="tc-nome"
              type="text"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              style={styles.input}
              autoComplete="name"
              required
            />
          </div>
          <div style={styles.field}>
            <label htmlFor="tc-email" style={styles.label}>
              E-mail *
            </label>
            <input
              id="tc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              autoComplete="email"
              required
            />
          </div>
          <div style={styles.field}>
            <label htmlFor="tc-tel" style={styles.label}>
              Telefone / WhatsApp *
            </label>
            <input
              id="tc-tel"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              style={styles.input}
              autoComplete="tel"
              placeholder="(00) 00000-0000"
              required
            />
          </div>

          <div style={styles.field}>
            <span style={styles.label}>Vaga de interesse *</span>
            <div style={styles.rowInline}>
              <label style={styles.checkRow}>
                <input
                  type="radio"
                  name="tipo_vaga"
                  checked={tipoVaga === TIPO_ESTAGIARIO}
                  onChange={() => setTipoVaga(TIPO_ESTAGIARIO)}
                />
                Estagiário(a)
              </label>
              <label style={styles.checkRow}>
                <input
                  type="radio"
                  name="tipo_vaga"
                  checked={tipoVaga === TIPO_PROFESSOR}
                  onChange={() => setTipoVaga(TIPO_PROFESSOR)}
                />
                Professor(a)
              </label>
            </div>
          </div>

          {tipoVaga === TIPO_ESTAGIARIO ? (
            <div style={styles.field}>
              <label htmlFor="tc-periodo" style={styles.label}>
                Período do curso de Ed. Física
              </label>
              <input
                id="tc-periodo"
                type="text"
                value={periodoEdFis}
                onChange={(e) => setPeriodoEdFis(e.target.value)}
                style={styles.input}
                placeholder="Ex.: 3º período"
              />
              <p style={styles.hint}>Obrigatório para estágio: mínimo 2º período (informe o seu).</p>
            </div>
          ) : null}

          <div style={styles.field}>
            <span style={styles.label}>Modalidades de interesse *</span>
            <div style={{ ...styles.rowInline, flexDirection: 'column', alignItems: 'flex-start' }}>
              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={interessePraia}
                  onChange={(e) => setInteressePraia(e.target.checked)}
                />
                Vôlei de praia
              </label>
              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={interesseQuadra}
                  onChange={(e) => setInteresseQuadra(e.target.checked)}
                />
                Vôlei de quadra
              </label>
            </div>
          </div>

          <div style={styles.field}>
            <label htmlFor="tc-msg" style={styles.label}>
              Mensagem ou observações (opcional)
            </label>
            <textarea
              id="tc-msg"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              style={styles.textarea}
              placeholder="Experiência, disponibilidade, CT de preferência..."
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="tc-cv" style={styles.label}>
              Currículo (PDF, máx. 5 MB) *
            </label>
            <input
              key={cvInputKey}
              id="tc-cv"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFile}
              style={{ fontSize: '0.95rem' }}
            />
            {curriculo ? (
              <div style={styles.fileName}>Arquivo: {curriculo.name}</div>
            ) : null}
          </div>

          <button
            type="submit"
            style={{ ...styles.button, ...(enviando ? styles.buttonDisabled : {}) }}
            disabled={enviando}
          >
            {enviando ? 'Enviando…' : 'Enviar candidatura'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default TrabalheConoscoPage;
