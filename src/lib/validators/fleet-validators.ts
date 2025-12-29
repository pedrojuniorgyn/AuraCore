/**
 * 🚛 Fleet Validators
 * Validações para CPF, Placa (Antiga e Mercosul)
 */

/**
 * Valida CPF usando algoritmo oficial
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");

  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false; // Rejeita sequências iguais

  let sum = 0;
  let remainder;

  // Valida primeiro dígito
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

  // Valida segundo dígito
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

  return true;
}

/**
 * Formata CPF: 123.456.789-00
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Valida Placa (Antiga ABC-1234 ou Mercosul ABC1D23)
 */
export function validatePlate(plate: string): boolean {
  const cleaned = plate.replace(/[^A-Z0-9]/gi, "").toUpperCase();

  // Placa antiga: 3 letras + 4 números
  const oldFormat = /^[A-Z]{3}[0-9]{4}$/;
  
  // Placa Mercosul: 3 letras + 1 número + 1 letra + 2 números
  const mercosulFormat = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  return oldFormat.test(cleaned) || mercosulFormat.test(cleaned);
}

/**
 * Normaliza placa (remove traços, espaços, upper case)
 */
export function normalizePlate(plate: string): string {
  return plate.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

/**
 * Formata placa para exibição
 * Antiga: ABC-1234
 * Mercosul: ABC1D23 (sem traço)
 */
export function formatPlate(plate: string): string {
  const cleaned = normalizePlate(plate);

  // Detecta se é antiga ou Mercosul
  const isOldFormat = /^[A-Z]{3}[0-9]{4}$/.test(cleaned);

  if (isOldFormat) {
    return cleaned.replace(/([A-Z]{3})([0-9]{4})/, "$1-$2");
  }

  return cleaned; // Mercosul não usa traço
}

/**
 * Detecta se a placa é Mercosul
 */
export function isMercosulPlate(plate: string): boolean {
  const cleaned = normalizePlate(plate);
  return /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(cleaned);
}





























