/**
 * Converte respostas de erro do DRF/axios em texto legível para Alert.
 */
export function formatarErroApi(error: unknown): string {
  const err = error as { message?: string; response?: { data?: unknown } };
  const data = err?.response?.data;
  if (data == null || data === '') {
    return err?.message || 'Erro de rede ou servidor sem resposta.';
  }
  if (typeof data === 'string') return data;
  const d = data as Record<string, unknown>;
  if (typeof d.error === 'string') {
    let msg = d.error;
    const det = d.detalhes as { erros?: unknown[]; tickets_ok?: number } | undefined;
    if (det?.erros && Array.isArray(det.erros) && det.erros.length) {
      const extra = det.erros
        .slice(0, 5)
        .map((x) => String(x))
        .join('\n');
      if (extra.trim()) {
        msg = `${msg}\n\nDetalhes (Expo):\n${extra}`;
      }
    }
    if (typeof d.destinatarios_tokens === 'number' && d.destinatarios_tokens > 0) {
      msg = `${msg}\n\nDispositivos na fila: ${d.destinatarios_tokens}`;
    }
    return msg;
  }
  if (d.detail != null) {
    if (typeof d.detail === 'string') return d.detail;
    if (Array.isArray(d.detail)) return (d.detail as string[]).join('\n');
  }
  const parts: string[] = [];
  for (const [k, v] of Object.entries(d)) {
    if (k === 'detail') continue;
    const msg = Array.isArray(v) ? (v as string[]).join(', ') : String(v);
    parts.push(`${k}: ${msg}`);
  }
  if (parts.length) return parts.join('\n');
  try {
    return JSON.stringify(data);
  } catch {
    return 'Erro ao processar resposta do servidor.';
  }
}

/** Aceita ex.: "3500", "3.500,00", "3500,50" — retorna undefined se inválido ou vazio. */
export function parseDecimalBrasil(valor: string): number | undefined {
  const t = String(valor || '').trim();
  if (!t) return undefined;
  const s = t.replace(/\s/g, '');
  const normalized = s.includes(',')
    ? s.replace(/\./g, '').replace(',', '.')
    : s.replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : undefined;
}
