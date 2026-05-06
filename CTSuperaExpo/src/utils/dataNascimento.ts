/**
 * Data de nascimento: máscara dd/mm/aaaa na edição; envio ao backend DD-MM-AAAA (via normalizarDataNascimentoParaApi).
 * Exibição alinhada a formatApiDateDisplay (DD-MM-AAAA).
 */

import { formatApiDateDisplay } from './dateApi';

export function formatarDataBrMascara(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Converte dd/mm/aaaa válida em DD-MM-AAAA; senão null. */
export function dataBrParaApi(br: string): string | null {
  const digits = br.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const day = parseInt(digits.slice(0, 2), 10);
  const month = parseInt(digits.slice(2, 4), 10) - 1;
  const year = parseInt(digits.slice(4, 8), 10);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const dt = new Date(year, month, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month || dt.getDate() !== day) return null;
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${dd}-${mm}-${year}`;
}

/** @deprecated use dataBrParaApi — mesmo retorno (DD-MM-AAAA). */
export const dataBrParaIso = dataBrParaApi;

/** Mesmo que formatApiDateDisplay — DD-MM-AAAA para leitura. */
export function isoParaBrDisplay(iso: string | null | undefined): string {
  return formatApiDateDisplay(iso ?? '');
}

/** Valor inicial para TextInput com máscara dd/mm/aaaa (só dígitos → máscara). */
export function apiDateParaCampoNascimentoMascarado(iso: string | null | undefined): string {
  const digits = formatApiDateDisplay(iso ?? '').replace(/\D/g, '').slice(0, 8);
  return digits ? formatarDataBrMascara(digits) : '';
}

function parsePartesDataApi(s: string): { y: number; mo: number; day: number } | null {
  const t = s.trim().split(/[\sT]/)[0];
  const dmY = /^(\d{2})-(\d{2})-(\d{4})$/.exec(t);
  if (dmY) {
    return { y: +dmY[3], mo: +dmY[2] - 1, day: +dmY[1] };
  }
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (ymd) {
    return { y: +ymd[1], mo: +ymd[2] - 1, day: +ymd[3] };
  }
  return null;
}

/** Idade a partir de DD-MM-AAAA ou AAAA-MM-DD (legado). */
export function calcularIdade(dataApi: string): number | null {
  if (!dataApi) return null;
  const p = parsePartesDataApi(dataApi);
  if (!p) return null;
  const nasc = new Date(p.y, p.mo, p.day);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  if (hoje.getMonth() < p.mo || (hoje.getMonth() === p.mo && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  return idade;
}

export function calcularIdadeDeBr(br: string): number | null {
  const api = dataBrParaApi(br);
  if (!api) return null;
  return calcularIdade(api);
}

/**
 * Aceita dd/mm/aaaa, DD-MM-AAAA ou AAAA-MM-DD e devolve DD-MM-AAAA para a API.
 * Também aceita ISO com hora (usa só a parte da data).
 */
export function normalizarDataNascimentoParaApi(input: string): string | null {
  const t = input.trim().split(/[\sT]/)[0];
  if (!t) return null;
  if (/^\d{2}-\d{2}-\d{4}$/.test(t)) return t;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  }
  return dataBrParaApi(t);
}
