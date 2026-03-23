/**
 * Mensagens padronizadas para validação de CPF (alinhadas ao backend em usuarios).
 */
export const MSG_CPF_11_DIGITOS = 'CPF deve conter exatamente 11 dígitos.';
export const MSG_CPF_MATRICULA = 'Informe o CPF com exatamente 11 dígitos.';

export function apenasDigitosCpf(s) {
  return String(s == null ? '' : s).replace(/\D/g, '');
}

/**
 * Máscara visual 000.000.000-00 (no máximo 11 dígitos numéricos).
 */
export function formatarCpfMascara(value) {
  const d = apenasDigitosCpf(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
