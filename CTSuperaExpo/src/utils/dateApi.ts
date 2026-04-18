/**
 * Datas na API: DD-MM-AAAA (também aceita leitura legada AAAA-MM-DD).
 */

export function parseApiDateToParts(
  value: unknown
): { d: number; m: number; y: number } | null {
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

export function formatApiDateDisplay(value: unknown): string {
  const p = parseApiDateToParts(value);
  if (!p) {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value ?? '') : d.toLocaleDateString('pt-BR');
  }
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString('pt-BR');
}

export function formatApiMonthYearDisplay(
  value: unknown,
  locales: string | string[] = 'pt-BR'
): string {
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
 * Formata data vinda da API com opções de locale (evita parse ISO incorreto de DD-MM-AAAA).
 */
export function formatApiDateLocale(
  value: unknown,
  locales: string | string[] = 'pt-BR',
  options?: Intl.DateTimeFormatOptions
): string {
  const opts: Intl.DateTimeFormatOptions = options ?? {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  };
  const p = parseApiDateToParts(value);
  if (!p) {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime())
      ? String(value ?? '')
      : d.toLocaleDateString(locales, opts);
  }
  return new Date(p.y, p.m - 1, p.d).toLocaleDateString(locales, opts);
}

/** Data/hora da API: "DD-MM-AAAA HH:MM", ISO ou só data. */
export function parseApiDateTimeParts(value: unknown): {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
} | null {
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
  const dp = parseApiDateToParts(value);
  if (dp) return { day: dp.d, month: dp.m, year: dp.y, hour: 0, minute: 0 };
  return null;
}

export function apiDateTimeStringToLocalDate(value: unknown): Date | null {
  const p = parseApiDateTimeParts(value);
  if (!p) return null;
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0);
}

export function formatApiDateTimeDisplay(
  value: unknown,
  locales: string | string[] = 'pt-BR',
  options?: Intl.DateTimeFormatOptions
): string {
  const opts: Intl.DateTimeFormatOptions = options ?? {
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
