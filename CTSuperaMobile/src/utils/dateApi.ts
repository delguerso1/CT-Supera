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
