import { Money } from '@/shared/domain';

/**
 * XML Builder: Grupo IS (Imposto Seletivo)
 * 
 * Gera XML conforme NT 2025.001 (CT-e) e NT 2025.002 (NF-e)
 * 
 * Estrutura:
 * <IS>
 *   <CST>00</CST>
 *   <vBC>1000.00</vBC>
 *   <pIS>10.00</pIS>
 *   <vIS>100.00</vIS>
 * </IS>
 * 
 * O Imposto Seletivo incide sobre produtos específicos
 * (cigarros, bebidas alcoólicas, veículos, etc)
 */

export interface ISInfo {
  cst: string; // CST do Imposto Seletivo (00-99)
  baseValue: Money; // Base de cálculo
  rate: number; // Alíquota do IS (0-100%)
  value: Money; // Valor do IS
}

export class GrupoIS {
  /**
   * Gera XML do grupo IS
   */
  static build(is: ISInfo): string {
    const xml: string[] = [];

    xml.push('<IS>');
    xml.push(`  <CST>${is.cst}</CST>`);
    xml.push(`  <vBC>${is.baseValue.amount.toFixed(2)}</vBC>`);
    xml.push(`  <pIS>${is.rate.toFixed(2)}</pIS>`);
    xml.push(`  <vIS>${is.value.amount.toFixed(2)}</vIS>`);
    xml.push('</IS>');

    return xml.join('\n');
  }

  /**
   * Valida campos obrigatórios
   */
  static validate(is: ISInfo): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!is.cst || is.cst.trim() === '') {
      errors.push('CST é obrigatório no grupo IS');
    }

    if (!is.baseValue || is.baseValue.amount < 0) {
      errors.push('Base de Cálculo não pode ser negativa');
    }

    if (is.rate < 0 || is.rate > 100) {
      errors.push('Alíquota deve estar entre 0 e 100%');
    }

    if (!is.value || is.value.amount < 0) {
      errors.push('Valor do IS não pode ser negativo');
    }

    // Return early se campos obrigatórios faltam (evita TypeError ao acessar .amount)
    if (errors.length > 0) {
      return {
        valid: false,
        errors,
      };
    }

    // Validar cálculo: valor = base * alíquota
    // Seguro acessar .amount aqui pois validamos acima
    const expectedValue = is.baseValue.amount * (is.rate / 100);
    const diff = Math.abs(is.value.amount - expectedValue);
    if (diff > 0.01) {
      errors.push(
        `Valor do IS (${is.value.amount.toFixed(2)}) não corresponde ao cálculo ` +
        `(base ${is.baseValue.amount.toFixed(2)} * alíquota ${is.rate.toFixed(2)}% = ${expectedValue.toFixed(2)})`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
