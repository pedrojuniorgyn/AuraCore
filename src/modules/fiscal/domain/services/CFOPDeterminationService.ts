/**
 * 📋 CFOPDeterminationService - Domain Service (DOMAIN-SVC-001)
 * 
 * Determina o CFOP correto com base na operação, direção e escopo.
 * 100% stateless, ZERO dependências de infraestrutura.
 * 
 * F3.3: CFOP Determination
 * 
 * Regras de determinação:
 * 1. Busca regra customizada (isDefault=false) por organização
 * 2. Se não encontrar, usa regra padrão (isDefault=true)
 * 3. Prioridade menor = maior prioridade
 * 4. Direção e escopo derivados automaticamente quando possível
 * 
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 */

import { Result } from '@/shared/domain';
import type { CFOPDetermination } from '../entities/CFOPDetermination';

export interface CFOPLookupInput {
  operationType: string;
  direction: 'ENTRY' | 'EXIT';
  scope: 'INTRASTATE' | 'INTERSTATE' | 'FOREIGN';
  taxRegime?: string;
  documentType?: string;
}

export interface CFOPDeterminationResult {
  cfopCode: string;
  cfopDescription: string;
  isDefault: boolean;
  ruleId: string;
}

export class CFOPDeterminationService {
  private constructor() {} // DOMAIN-SVC-002

  /**
   * Determina CFOP a partir de regras carregadas.
   * Recebe array de regras (já filtradas por org e status ACTIVE).
   */
  static determine(
    input: CFOPLookupInput,
    rules: CFOPDetermination[]
  ): Result<CFOPDeterminationResult, string> {
    // 1. Filtrar regras que fazem match
    const matches = rules.filter((rule) => {
      if (rule.operationType !== input.operationType) return false;
      if (rule.direction !== input.direction) return false;
      if (rule.scope !== input.scope) return false;
      if (input.taxRegime && rule.taxRegime && rule.taxRegime !== input.taxRegime) return false;
      if (input.documentType && rule.documentType && rule.documentType !== input.documentType) return false;
      return true;
    });

    if (matches.length === 0) {
      return Result.fail(
        `Nenhum CFOP encontrado para operação=${input.operationType} ` +
        `direção=${input.direction} escopo=${input.scope}`
      );
    }

    // 2. Priorizar: customizada > padrão, menor priority primeiro
    const sorted = matches.sort((a, b) => {
      // Customizada (isDefault=false) tem prioridade sobre padrão
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? 1 : -1;
      }
      // Menor priority = maior prioridade
      return a.priority - b.priority;
    });

    const best = sorted[0];
    return Result.ok({
      cfopCode: best.cfopCode,
      cfopDescription: best.cfopDescription,
      isDefault: best.isDefault,
      ruleId: best.id,
    });
  }

  /**
   * Infere scope (INTRASTATE/INTERSTATE/FOREIGN) a partir das UFs.
   */
  static inferScope(
    originUf: string,
    destUf: string
  ): 'INTRASTATE' | 'INTERSTATE' | 'FOREIGN' {
    if (!originUf || !destUf) return 'INTRASTATE';
    if (originUf.toUpperCase() === 'EX' || destUf.toUpperCase() === 'EX') {
      return 'FOREIGN';
    }
    if (originUf.toUpperCase() === destUf.toUpperCase()) {
      return 'INTRASTATE';
    }
    return 'INTERSTATE';
  }

  /**
   * Infere direction (ENTRY/EXIT) a partir do tipo de operação.
   */
  static inferDirection(operationType: string): 'ENTRY' | 'EXIT' {
    const entryTypes = new Set([
      'COMPRA', 'PURCHASE', 'DEVOLUCAO_VENDA', 'RETURN_SALE',
      'TRANSFERENCIA_ENTRADA', 'TRANSFER_IN', 'IMPORT',
    ]);

    return entryTypes.has(operationType.toUpperCase()) ? 'ENTRY' : 'EXIT';
  }

  /**
   * Converte CFOP de saída para entrada (e vice-versa).
   * Ex: 5353 (saída estadual) → 1353 (entrada estadual)
   * Ex: 6102 (saída interestadual) → 2102 (entrada interestadual)
   */
  static convertDirection(cfopCode: string, targetDirection: 'ENTRY' | 'EXIT'): string {
    const firstDigit = parseInt(cfopCode[0], 10);
    const rest = cfopCode.slice(1);

    if (targetDirection === 'ENTRY') {
      // Saída → Entrada: 5→1, 6→2, 7→3
      const map: Record<number, number> = { 5: 1, 6: 2, 7: 3, 1: 1, 2: 2, 3: 3 };
      return `${map[firstDigit] ?? firstDigit}${rest}`;
    } else {
      // Entrada → Saída: 1→5, 2→6, 3→7
      const map: Record<number, number> = { 1: 5, 2: 6, 3: 7, 5: 5, 6: 6, 7: 7 };
      return `${map[firstDigit] ?? firstDigit}${rest}`;
    }
  }
}
