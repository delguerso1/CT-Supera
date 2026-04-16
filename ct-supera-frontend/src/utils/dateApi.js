/**
 * Datas na API: DD-MM-AAAA (também aceita leitura legada AAAA-MM-DD).
 */

export function parseApiDateToParts(value) {
  if (value == null || value === '') return null;
  const s0 = String(value).trim().split(/[\sT]/)[0];
  const dmY = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s0);
  if (dmY) {
    return { d: +dmY[1], m: +dmY[2], y: +dmY[3] };
  }
  const Ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s0);
  if (Ymd) {
    return { d: +Ymd[3], m: +Ymd[2], y: +Ymd[1] };
  }
  return null;
}

/** Valor para <input type="date"> (AAAA-MM-DD interno do navegador). */
export function apiDateToInputDate(isoOrApi) {
  const p = parseApiDateToParts(isoOrApi);
  if (!p) return '';
  const dd = String(p.d).padStart(2, '0');
  const mm = String(p.m).padStart(2, '0');
  return `${p.y}-${mm}-${dd}`;
}

/** Converte valor do input date (AAAA-MM-DD) para formato da API (DD-MM-AAAA). */
export function inputDateToApiDate(htmlYmd) {
  if (!htmlYmd || typeof htmlYmd !== 'string') return htmlYmd || '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(htmlYmd.trim());
  if (!m) return htmlYmd;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function formatApiDateDisplay(value) {
  const p = parseApiDateToParts(value);
  if (!p) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value || '') : d.toLocaleDateString('pt-BR');
  }
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString('pt-BR');
}
