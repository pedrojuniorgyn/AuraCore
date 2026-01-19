import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import {
  IExpensePolicyService,
  PolicyValidationResult,
} from '../../domain/services/IExpensePolicyService';
import { ExpenseCategory } from '../../domain/value-objects/expense/ExpenseCategory';
import { ExpenseItem } from '../../domain/entities/expense/ExpenseItem';

/**
 * Limites padrão por categoria (em BRL)
 * Em produção, estes valores devem vir de configuração por organização
 */
const DEFAULT_LIMITS: Record<ExpenseCategory, number> = {
  TRANSPORTE_AEREO: 5000.00,      // R$ 5.000 por passagem
  TRANSPORTE_TERRESTRE: 200.00,   // R$ 200 por viagem
  TRANSPORTE_APLICATIVO: 100.00,  // R$ 100 por corrida
  HOSPEDAGEM: 500.00,              // R$ 500 por diária
  ALIMENTACAO: 150.00,             // R$ 150 por refeição
  COMBUSTIVEL: 300.00,             // R$ 300 por abastecimento
  ESTACIONAMENTO: 50.00,           // R$ 50 por dia
  PEDAGIO: 100.00,                 // R$ 100 por viagem
  COMUNICACAO: 200.00,             // R$ 200 por mês
  MATERIAL: 500.00,                // R$ 500 por compra
  OUTROS: 1000.00,                 // R$ 1.000 (requer justificativa)
};

/**
 * Valor mínimo para exigir comprovante (em BRL)
 */
const RECEIPT_REQUIRED_THRESHOLD = 50.00;

/**
 * Categorias que sempre requerem comprovante
 */
const ALWAYS_REQUIRE_RECEIPT: ExpenseCategory[] = [
  'TRANSPORTE_AEREO',
  'HOSPEDAGEM',
  'MATERIAL',
];

/**
 * Categorias que requerem aprovação especial acima de certo valor
 */
const SPECIAL_APPROVAL_THRESHOLD = 1000.00;

/**
 * Implementation: IExpensePolicyService
 * 
 * Implementação básica de políticas de despesas.
 * Em produção, deve ser configurável por organização
 * e armazenado em tabela expense_policies.
 */
@injectable()
export class ExpensePolicyService implements IExpensePolicyService {
  async validateItem(
    item: ExpenseItem,
    organizationId: number
  ): Promise<Result<PolicyValidationResult, string>> {
    try {
      // Verificar limite por categoria
      const maxAmountResult = await this.getMaxAmountByCategory(
        item.categoria,
        organizationId
      );

      if (Result.isFail(maxAmountResult)) {
        return Result.fail(maxAmountResult.error);
      }

      const maxAmount = maxAmountResult.value;

      if (item.valor.amount > maxAmount.amount) {
        return Result.ok({
          valid: false,
          violationReason: `Valor excede o limite de ${maxAmount.currency} ${maxAmount.amount.toFixed(2)} para categoria ${item.categoria}`,
        });
      }

      // Verificar comprovante obrigatório
      const requiresReceipt = this.requiresReceipt(item.categoria, item.valor);

      if (requiresReceipt && !item.comprovanteUrl) {
        return Result.ok({
          valid: false,
          violationReason: `Comprovante é obrigatório para categoria ${item.categoria} acima de R$ ${RECEIPT_REQUIRED_THRESHOLD.toFixed(2)}`,
        });
      }

      return Result.ok({
        valid: true,
      });
    } catch (error) {
      return Result.fail(`Failed to validate expense item: ${(error as Error).message}`);
    }
  }

  async getMaxAmountByCategory(
    category: ExpenseCategory,
    organizationId: number
  ): Promise<Result<Money, string>> {
    try {
      // TODO: Buscar de tabela expense_policies por organizationId
      // Por enquanto, usar limites padrão
      const limitAmount = DEFAULT_LIMITS[category];

      return Money.create(limitAmount, 'BRL');
    } catch (error) {
      return Result.fail(`Failed to get max amount for category: ${(error as Error).message}`);
    }
  }

  requiresReceipt(category: ExpenseCategory, amount: Money): boolean {
    // Categorias que sempre requerem
    if (ALWAYS_REQUIRE_RECEIPT.includes(category)) {
      return true;
    }

    // Acima do threshold
    if (amount.amount >= RECEIPT_REQUIRED_THRESHOLD) {
      return true;
    }

    return false;
  }

  async requiresSpecialApproval(
    category: ExpenseCategory,
    amount: Money,
    organizationId: number
  ): Promise<boolean> {
    // OUTROS sempre requer aprovação especial
    if (category === 'OUTROS') {
      return true;
    }

    // Acima do threshold geral
    if (amount.amount >= SPECIAL_APPROVAL_THRESHOLD) {
      return true;
    }

    return false;
  }
}

