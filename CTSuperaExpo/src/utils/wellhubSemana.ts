/** Helpers de navegação semanal (segunda a domingo) para listagem Wellhub. */

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function mondayOf(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = copy.getDay();
  const diff = wd === 0 ? -6 : 1 - wd;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function semanaInicioPadrao(ano: number, mes: number): string {
  const hoje = new Date();
  const primeiro = new Date(ano, mes - 1, 1);
  const ultimo = new Date(ano, mes, 0);
  let ref = hoje;
  if (hoje.getFullYear() !== ano || hoje.getMonth() + 1 !== mes) {
    ref = primeiro;
  }
  let inicio = mondayOf(ref);
  while (inicio.getTime() + 6 * 86400000 < primeiro.getTime()) {
    inicio.setDate(inicio.getDate() + 7);
  }
  while (inicio.getTime() > ultimo.getTime()) {
    inicio.setDate(inicio.getDate() - 7);
  }
  return toIsoDate(inicio);
}

export function formatarLabelSemana(semanaInicioIso: string): string {
  const ini = parseIsoDate(semanaInicioIso);
  const fim = new Date(ini);
  fim.setDate(fim.getDate() + 6);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(ini)} – ${fmt(fim)}`;
}

export function podeSemanaAnterior(semanaInicioIso: string, ano: number, mes: number): boolean {
  const ini = parseIsoDate(semanaInicioIso);
  const prev = new Date(ini);
  prev.setDate(prev.getDate() - 7);
  const fimPrev = new Date(prev);
  fimPrev.setDate(fimPrev.getDate() + 6);
  const primeiro = new Date(ano, mes - 1, 1);
  return fimPrev >= primeiro;
}

export function podeSemanaProxima(semanaInicioIso: string, ano: number, mes: number): boolean {
  const ini = parseIsoDate(semanaInicioIso);
  const next = new Date(ini);
  next.setDate(next.getDate() + 7);
  const ultimo = new Date(ano, mes, 0);
  return next <= ultimo;
}

export function semanaAnteriorIso(semanaInicioIso: string): string {
  const d = parseIsoDate(semanaInicioIso);
  d.setDate(d.getDate() - 7);
  return toIsoDate(d);
}

export function semanaProximaIso(semanaInicioIso: string): string {
  const d = parseIsoDate(semanaInicioIso);
  d.setDate(d.getDate() + 7);
  return toIsoDate(d);
}

export function semanaPadraoAtual(): string {
  const n = new Date();
  return semanaInicioPadrao(n.getFullYear(), n.getMonth() + 1);
}
