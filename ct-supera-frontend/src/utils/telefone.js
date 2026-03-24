/**
 * Normaliza telefone brasileiro para envio à API (só dígitos, 10 ou 11).
 * Aceita colagem com +55, zeros à esquerda ou máscaras; não confunde DDD 55 (RS)
 * com código do país (55 só é removido quando há 12+ dígitos).
 */
export function normalizarTelefoneBrParaApi(valor) {
  if (valor == null || String(valor).trim() === '') return '';
  let d = String(valor).replace(/\D/g, '');
  // +55 11 ... → 13 dígitos; DDD 55 (RS) com 9 dígitos → 11 dígitos (não remover 55)
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
