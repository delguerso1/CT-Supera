import type { Mensalidade } from '../types';

type AlunoApi = {
  id?: number;
  nome_completo?: string;
  first_name?: string;
  last_name?: string;
};

/**
 * A API pode enviar `aluno_nome` ou `aluno` aninhado (UsuarioSerializer com nome_completo).
 */
export function nomeAlunoMensalidade(m: Mensalidade): string {
  if (m.aluno_nome?.trim()) return m.aluno_nome.trim();
  const a = m.aluno as unknown;
  if (a && typeof a === 'object') {
    const o = a as AlunoApi;
    const nome =
      (o.nome_completo && String(o.nome_completo).trim()) ||
      [o.first_name, o.last_name].filter(Boolean).join(' ').trim();
    if (nome) return nome;
    if (typeof o.id === 'number') return `Aluno #${o.id}`;
  }
  if (typeof a === 'number') return `Aluno #${a}`;
  return 'Aluno';
}
