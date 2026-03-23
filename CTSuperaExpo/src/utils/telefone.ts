/** Telefone BR: só dígitos, DDD + número (10 fixo ou 11 celular), máx. 11. */
export function formatarTelefoneSoDigitos(texto: string): string {
  return String(texto || '')
    .replace(/\D/g, '')
    .slice(0, 11);
}

export function telefoneBrValido(digitos: string): boolean {
  const d = digitos.replace(/\D/g, '');
  return d.length === 10 || d.length === 11;
}
