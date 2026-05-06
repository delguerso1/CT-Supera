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

/** Partes de calendário { d, m, y } → DD-MM-AAAA */
function partsToDdMmYyyy(p) {
  const dd = String(p.d).padStart(2, '0');
  const mm = String(p.m).padStart(2, '0');
  return `${dd}-${mm}-${p.y}`;
}

/** `Date` em calendário local do ambiente → DD-MM-AAAA */
export function localDateToDdMmYyyy(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  return partsToDdMmYyyy({
    d: d.getDate(),
    m: d.getMonth() + 1,
    y: d.getFullYear(),
  });
}

/**
 * Data civil local como AAAA-MM-DD (ex.: max/min em &lt;input type="date"&gt;).
 * Evita `toISOString().slice(0, 10)`, que usa UTC e pode voltar o dia anterior no Brasil.
 */
export function localYmdForDateInput(date = new Date()) {
  const d =
    date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Carimbo local AAAA-MM-DD_HH-mm-ss para nomes de arquivo (evita UTC de toISOString). */
export function localDateTimeStampForFilename(date = new Date()) {
  const d =
    date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  if (Number.isNaN(d.getTime())) return 'invalid';
  const ymd = localYmdForDateInput(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${ymd}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

/** Valor para <input type="date"> (AAAA-MM-DD interno do navegador). */
export function apiDateToInputDate(isoOrApi) {
  const p = parseApiDateToParts(isoOrApi);
  if (p) {
    const dd = String(p.d).padStart(2, '0');
    const mm = String(p.m).padStart(2, '0');
    return `${p.y}-${mm}-${dd}`;
  }
  const d = new Date(String(isoOrApi ?? '').trim());
  if (!Number.isNaN(d.getTime())) return localYmdForDateInput(d);
  return '';
}

/** Converte valor do input date (AAAA-MM-DD) para formato da API (DD-MM-AAAA). */
export function inputDateToApiDate(htmlYmd) {
  if (!htmlYmd || typeof htmlYmd !== 'string') return htmlYmd || '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(htmlYmd.trim());
  if (!m) return htmlYmd;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Exibição de data: sempre DD-MM-AAAA (mesmo formato da API). */
export function formatApiDateDisplay(value) {
  if (value == null || value === '') return '';
  const p = parseApiDateToParts(value);
  if (p) return partsToDdMmYyyy(p);
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : localDateToDdMmYyyy(d);
}

/** Competência / qualquer data de calendário: DD-MM-AAAA. */
export function formatApiMonthYearDisplay(value) {
  return formatApiDateDisplay(value);
}

/**
 * Alias de exibição numérica DD-MM-AAAA (parâmetros de locale ignorados).
 * Evita parse ISO incorreto de DD-MM-AAAA.
 */
export function formatApiDateLocale(value) {
  return formatApiDateDisplay(value);
}

/**
 * Data/hora da API: "DD-MM-AAAA HH:MM" (format_datetime_api), ISO ou só data.
 */
export function parseApiDateTimeParts(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const br = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2})$/.exec(s);
  if (br) {
    return {
      day: +br[1],
      month: +br[2],
      year: +br[3],
      hour: +br[4],
      minute: +br[5],
    };
  }
  const dIso = new Date(s);
  if (!Number.isNaN(dIso.getTime())) {
    return {
      day: dIso.getDate(),
      month: dIso.getMonth() + 1,
      year: dIso.getFullYear(),
      hour: dIso.getHours(),
      minute: dIso.getMinutes(),
    };
  }
  const dp = parseApiDateToParts(s);
  if (dp) return { day: dp.d, month: dp.m, year: dp.y, hour: 0, minute: 0 };
  return null;
}

/** Converte string data/hora da API em Date no fuso local (cálculos, comparações). */
export function apiDateTimeStringToLocalDate(value) {
  const p = parseApiDateTimeParts(value);
  if (!p) return null;
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0);
}

/** Data e hora em DD-MM-AAAA HH:MM (fusos locais ao interpretar ISO). */
export function formatApiDateTimeDisplay(value) {
  if (value == null || value === '') return '';
  const pr = parseApiDateTimeParts(value);
  if (!pr) return String(value ?? '');
  const dd = String(pr.day).padStart(2, '0');
  const mm = String(pr.month).padStart(2, '0');
  const hh = String(pr.hour).padStart(2, '0');
  const min = String(pr.minute).padStart(2, '0');
  return `${dd}-${mm}-${pr.year} ${hh}:${min}`;
}
