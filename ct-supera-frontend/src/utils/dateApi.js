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
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value || '') : d.toLocaleDateString('pt-BR');
  }
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString('pt-BR');
}

/** Mês e ano legíveis a partir de data da API (ex.: vencimento de mensalidade). */
export function formatApiMonthYearDisplay(value, locales = 'pt-BR') {
  const p = parseApiDateToParts(value);
  if (!p) {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime())
      ? String(value ?? '')
      : d.toLocaleDateString(locales, { month: 'long', year: 'numeric' });
  }
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString(locales, {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formata data vinda da API (DD-MM-AAAA ou AAAA-MM-DD) com opções de locale.
 * Evita `new Date(str + 'T12:00:00')`, que quebra com DD-MM-AAAA (não é ISO 8601).
 */
export function formatApiDateLocale(value, locales = 'pt-BR', options) {
  const opts =
    options ??
    {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    };
  const p = parseApiDateToParts(value);
  if (!p) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value ?? '') : d.toLocaleDateString(locales, opts);
  }
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString(locales, opts);
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

export function formatApiDateTimeDisplay(value, locales = 'pt-BR', options) {
  const opts =
    options ??
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
  const d = apiDateTimeStringToLocalDate(value);
  if (!d) return String(value ?? '');
  return d.toLocaleString(locales, opts);
}
