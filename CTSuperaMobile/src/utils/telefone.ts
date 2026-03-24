/**
 * Mesma lógica do painel web / Expo: +55, zeros à esquerda; DDD 55 (11 dígitos) preservado.
 */
export function normalizarTelefoneBrParaApi(valor: string): string {
  let d = String(valor || '').replace(/\D/g, '');
  while (d.length > 11 && d.startsWith('0')) {
    d = d.slice(1);
  }
  if (d.length >= 12 && d.startsWith('55')) {
    d = d.slice(2);
  }
  while (d.length > 11 && d.startsWith('0')) {
    d = d.slice(1);
  }
  if (d.length > 11) {
    d = d.slice(-11);
  }
  return d;
}

export function telefoneBrValido(texto: string): boolean {
  const d = normalizarTelefoneBrParaApi(texto);
  return d.length === 10 || d.length === 11;
}
