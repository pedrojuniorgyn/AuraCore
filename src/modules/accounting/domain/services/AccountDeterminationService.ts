import { Result } from '@/shared/domain';
import type { AccountDetermination } from '../entities/AccountDetermination';
import type { OperationTypeValue } from '../value-objects/OperationType';

/**
 * AccountDeterminationService - Domain Service (Stateless)
 * 
 * Determina automaticamente as contas contábeis (débito/crédito) para uma
 * operação, consultando as regras configuradas por organização/filial.
 * 
 * Equivalente SAP: Account Determination Engine (OBYS/OKB9)
 * Equivalente TOTVS: CT5 (Lançamento Padrão)
 * 
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 * @see ARCH-009: Domain Services stateless (métodos estáticos)
 */

export interface DeterminedAccounts {
  debitAccountId: string;
  debitAccountCode: string;
  creditAccountId: string;
  creditAccountCode: string;
  description: string;
}

export class AccountDeterminationService {
  private constructor() {} // Impede instanciação (DOMAIN-SVC-002)

  /**
   * Determina contas contábeis para uma operação.
   * 
   * Busca regra ativa para o operationType na lista de regras fornecida.
   * Se não encontrar, retorna Result.fail.
   * 
   * @param rules - Lista de regras de determinação (filtrada por org/branch)
   * @param operationType - Tipo de operação
   * @returns Contas determinadas ou erro
   */
  static determineAccounts(
    rules: AccountDetermination[],
    operationType: OperationTypeValue
  ): Result<DeterminedAccounts, string> {
    const rule = rules.find(
      r => r.operationTypeValue === operationType && r.isActive
    );

    if (!rule) {
      return Result.fail(
        `Nenhuma regra de determinação contábil encontrada para operação: ${operationType}. ` +
        `Configure em Contabilidade > Determinação de Contas.`
      );
    }

    return Result.ok({
      debitAccountId: rule.debitAccountId,
      debitAccountCode: rule.debitAccountCode,
      creditAccountId: rule.creditAccountId,
      creditAccountCode: rule.creditAccountCode,
      description: rule.description,
    });
  }

  /**
   * Valida se todas as operações obrigatórias possuem regras configuradas.
   * 
   * @param rules - Lista de regras
   * @param requiredTypes - Tipos obrigatórios
   * @returns Lista de tipos sem regra
   */
  static validateCompleteness(
    rules: AccountDetermination[],
    requiredTypes: OperationTypeValue[]
  ): Result<OperationTypeValue[], string> {
    const activeTypes = new Set(
      rules.filter(r => r.isActive).map(r => r.operationTypeValue)
    );

    const missing = requiredTypes.filter(t => !activeTypes.has(t));
    return Result.ok(missing);
  }
}
