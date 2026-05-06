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

function partsToDdMmYyyy(p: { d: number; m: number; y: number }): string {
  const dd = String(p.d).padStart(2, '0');
  const mm = String(p.m).padStart(2, '0');
  return `${dd}-${mm}-${p.y}`;
}

/** `Date` em calendário local → DD-MM-AAAA */
export function localDateToDdMmYyyy(d: Date): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  return partsToDdMmYyyy({
    d: d.getDate(),
    m: d.getMonth() + 1,
    y: d.getFullYear(),
  });
}

/** Calendário local (não UTC): AAAA-MM-DD; evita toISOString().slice(0, 10). */
export function localYmdForDateInput(date: Date = new Date()): string {
  const d =
    date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Carimbo local para nome de arquivo (AAAA-MM-DD_HH-mm-ss). */
export function localDateTimeStampForFilename(date: Date = new Date()): string {
  const d =
    date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  if (Number.isNaN(d.getTime())) return 'invalid';
  const ymd = localYmdForDateInput(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${ymd}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

/** Valor AAAA-MM-DD para campo de data (API DD-MM-AAAA / legado; fallback: instante em local). */
export function apiDateToInputDate(isoOrApi: unknown): string {
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

/** Exibição: sempre DD-MM-AAAA. */
export function formatApiDateDisplay(value: unknown): string {
  if (value == null || value === '') return '';
  const p = parseApiDateToParts(value);
  if (p) return partsToDdMmYyyy(p);
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : localDateToDdMmYyyy(d);
}

export function formatApiMonthYearDisplay(
  value: unknown,
  _locales?: string | string[]
): string {
  return formatApiDateDisplay(value);
}

/** DD-MM-AAAA (argumentos de locale ignorados). */
export function formatApiDateLocale(
  value: unknown,
  _locales?: string | string[],
  _options?: Intl.DateTimeFormatOptions
): string {
  return formatApiDateDisplay(value);
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
  _locales?: string | string[],
  _options?: Intl.DateTimeFormatOptions
): string {
  if (value == null || value === '') return '';
  const pr = parseApiDateTimeParts(value);
  if (!pr) return String(value ?? '');
  const dd = String(pr.day).padStart(2, '0');
  const mm = String(pr.month).padStart(2, '0');
  const hh = String(pr.hour).padStart(2, '0');
  const min = String(pr.minute).padStart(2, '0');
  return `${dd}-${mm}-${pr.year} ${hh}:${min}`;
}
