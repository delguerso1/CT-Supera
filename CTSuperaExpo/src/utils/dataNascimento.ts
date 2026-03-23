/**
 * Data de nascimento em formato brasileiro (dd/mm/aaaa) no app,
 * enviada ao backend como yyyy-mm-dd.
 */

export function formatarDataBrMascara(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Converte dd/mm/aaaa válida em yyyy-mm-dd; senão null. */
export function dataBrParaIso(br: string): string | null {
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
  return `${year}-${mm}-${dd}`;
}

/** Exibe data vinda da API (yyyy-mm-dd ou ISO) como dd/mm/aaaa. */
export function isoParaBrDisplay(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = String(iso).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Idade a partir de yyyy-mm-dd. */
export function calcularIdade(isoYmd: string): number | null {
  if (!isoYmd) return null;
  const m = isoYmd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2] - 1;
  const day = +m[3];
  const nasc = new Date(y, mo, day);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  if (hoje.getMonth() < mo || (hoje.getMonth() === mo && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  return idade;
}

export function calcularIdadeDeBr(br: string): number | null {
  const iso = dataBrParaIso(br);
  if (!iso) return null;
  return calcularIdade(iso);
}

/** Aceita dd/mm/aaaa ou yyyy-mm-dd e devolve yyyy-mm-dd para a API. */
export function normalizarDataNascimentoParaApi(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return dataBrParaIso(t);
}
