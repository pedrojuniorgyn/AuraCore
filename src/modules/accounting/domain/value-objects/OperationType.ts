import { ValueObject, Result } from '@/shared/domain';

/**
 * OperationType - Value Object
 * 
 * Tipos de operação para determinação automática de contas contábeis.
 * Baseado no SAP OBYS/OKB9 (Account Determination for Automatic Posting).
 * 
 * Cada operationType mapeia para um par de contas (débito/crédito) na
 * tabela account_determination, configurável por organização e filial.
 * 
 * @see ARCH-008: Value Objects imutáveis
 * @see VO-001 a VO-010
 */

/**
 * Enum de tipos de operação suportados
 */
export const OPERATION_TYPES = {
  // Fiscal → Contábil
  PURCHASE_NFE: 'PURCHASE_NFE',           // NFe de entrada (compra)
  SALE_NFE: 'SALE_NFE',                   // NFe de saída (venda)
  CTE_FREIGHT: 'CTE_FREIGHT',             // CTe (frete)
  GENERIC_FISCAL: 'GENERIC_FISCAL',       // Outros documentos fiscais

  // Financial → Contábil (Pagamentos)
  PAYMENT_SUPPLIER: 'PAYMENT_SUPPLIER',   // Pagamento a fornecedor
  PAYMENT_BANK: 'PAYMENT_BANK',           // Baixa bancária

  // Financial → Contábil (Recebimentos)
  RECEIPT_CUSTOMER: 'RECEIPT_CUSTOMER',    // Recebimento de cliente
  RECEIPT_BANK: 'RECEIPT_BANK',           // Entrada bancária

  // Financial → Contábil (Faturamento)
  BILLING_REVENUE: 'BILLING_REVENUE',     // Receita de faturamento
  BILLING_ISS: 'BILLING_ISS',             // ISS retido
  BILLING_IRRF: 'BILLING_IRRF',           // IRRF retido
  BILLING_PIS: 'BILLING_PIS',             // PIS retido
  BILLING_COFINS: 'BILLING_COFINS',       // COFINS retido
  BILLING_CSLL: 'BILLING_CSLL',           // CSLL retida

  // Financial → Contábil (Estornos e ajustes)
  CANCELLATION_REVERSAL: 'CANCELLATION_REVERSAL', // Estorno por cancelamento

  // Financial → Contábil (Juros/Multa/Desconto)
  INTEREST_INCOME: 'INTEREST_INCOME',     // Juros recebidos
  INTEREST_EXPENSE: 'INTEREST_EXPENSE',   // Juros pagos
  FINE_INCOME: 'FINE_INCOME',             // Multa recebida
  FINE_EXPENSE: 'FINE_EXPENSE',           // Multa paga
  DISCOUNT_GIVEN: 'DISCOUNT_GIVEN',       // Desconto concedido
  DISCOUNT_RECEIVED: 'DISCOUNT_RECEIVED', // Desconto obtido

  // Financial → Contábil (Outros)
  BANK_FEE: 'BANK_FEE',                  // Tarifa bancária
  IOF: 'IOF',                             // IOF
  GENERIC: 'GENERIC',                     // Genérico
} as const;

export type OperationTypeValue = typeof OPERATION_TYPES[keyof typeof OPERATION_TYPES];

const VALID_OPERATION_TYPES = new Set<string>(Object.values(OPERATION_TYPES));

interface OperationTypeProps extends Record<string, unknown> {
  value: OperationTypeValue;
}

export class OperationType extends ValueObject<OperationTypeProps> {
  private constructor(props: OperationTypeProps) {
    super(props);
  }

  get value(): OperationTypeValue {
    return this.props.value;
  }

  /**
   * Factory method com validação
   */
  static create(value: string): Result<OperationType, string> {
    const trimmed = value.trim();
    if (!trimmed) {
      return Result.fail('OperationType não pode ser vazio');
    }

    if (!VALID_OPERATION_TYPES.has(trimmed)) {
      return Result.fail(`OperationType inválido: ${trimmed}. Valores válidos: ${[...VALID_OPERATION_TYPES].join(', ')}`);
    }

    return Result.ok(new OperationType({ value: trimmed as OperationTypeValue }));
  }

  /**
   * Verifica se é uma operação fiscal
   */
  isFiscal(): boolean {
    const fiscalTypes: readonly OperationTypeValue[] = [
      OPERATION_TYPES.PURCHASE_NFE,
      OPERATION_TYPES.SALE_NFE,
      OPERATION_TYPES.CTE_FREIGHT,
      OPERATION_TYPES.GENERIC_FISCAL,
    ];
    return fiscalTypes.includes(this.props.value);
  }

  /**
   * Verifica se é uma operação financeira
   */
  isFinancial(): boolean {
    return !this.isFiscal();
  }

  /**
   * Verifica se é retenção
   */
  isWithholding(): boolean {
    const withholdingTypes: readonly OperationTypeValue[] = [
      OPERATION_TYPES.BILLING_ISS,
      OPERATION_TYPES.BILLING_IRRF,
      OPERATION_TYPES.BILLING_PIS,
      OPERATION_TYPES.BILLING_COFINS,
      OPERATION_TYPES.BILLING_CSLL,
    ];
    return withholdingTypes.includes(this.props.value);
  }

  toString(): string {
    return this.props.value;
  }
}
