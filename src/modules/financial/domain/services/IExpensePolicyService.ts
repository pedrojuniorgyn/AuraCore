import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import { ExpenseCategory } from '../value-objects/expense/ExpenseCategory';
import { ExpenseItem } from '../entities/expense/ExpenseItem';

/**
 * Resultado da validação de política
 */
export interface PolicyValidationResult {
  valid: boolean;
  violationReason?: string;
}

/**
 * Domain Service: Política de Despesas
 * 
 * Define as regras e limites para despesas corporativas.
 * Cada organização pode ter políticas específicas.
 * 
 * Exemplos de políticas:
 * - Hospedagem: máximo R$ 300/dia
 * - Alimentação: máximo R$ 80/refeição
 * - Transporte aplicativo: máximo R$ 50/viagem
 * - Comprovante obrigatório acima de R$ 50
 */
export interface IExpensePolicyService {
  /**
   * Valida se um item está dentro da política
   */
  validateItem(
    item: ExpenseItem,
    organizationId: number
  ): Promise<Result<PolicyValidationResult, string>>;

  /**
   * Retorna o valor máximo permitido para uma categoria
   */
  getMaxAmountByCategory(
    category: ExpenseCategory,
    organizationId: number
  ): Promise<Result<Money, string>>;

  /**
   * Verifica se comprovante é obrigatório
   */
  requiresReceipt(
    category: ExpenseCategory,
    amount: Money
  ): boolean;

  /**
   * Verifica se categoria requer aprovação especial
   */
  requiresSpecialApproval(
    category: ExpenseCategory,
    amount: Money,
    organizationId: number
  ): Promise<boolean>;
}

