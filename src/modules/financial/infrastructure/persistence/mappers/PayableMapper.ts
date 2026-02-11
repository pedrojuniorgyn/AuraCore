import { Result, Money } from '@/shared/domain';
import { AccountPayable } from '../../../domain/entities/AccountPayable';
import { Payment, PaymentMethod, PaymentStatus } from '../../../domain/entities/Payment';
import { PaymentTerms } from '../../../domain/value-objects/PaymentTerms';
import { 
  AccountPayableRow, 
  AccountPayableSchemaInsert,
  PaymentRow,
  PaymentInsert 
} from '../schemas/PayableSchema';

/**
 * Mapper: Converte entre Domain Models e Persistence Models
 * 
 * Por que separar?
 * - Domain Model: comportamentos, invariantes, regras de negócio
 * - Persistence Model: estrutura de banco, tipos SQL
 */
export class PayableMapper {
  
  /**
   * Domain → Persistence (para INSERT/UPDATE)
   */
  static toPersistence(payable: AccountPayable): AccountPayableSchemaInsert {
    return {
      id: payable.id,
      organizationId: payable.organizationId,
      branchId: payable.branchId,
      partnerId: payable.supplierId, // Domain supplierId → Schema partnerId
      documentNumber: payable.documentNumber,
      description: payable.description,
      amount: payable.originalAmount.amount.toString(),
      currency: payable.originalAmount.currency,
      dueDate: payable.terms.dueDate,
      discountUntil: payable.terms.discountUntil ?? null,
      discountAmount: payable.terms.discountAmount?.amount.toString() ?? null,
      fineRate: payable.terms.fineRate.toString(),
      interestRate: payable.terms.interestRate.toString(),
      status: payable.status,
      categoryId: payable.categoryId ?? null,
      costCenterId: payable.costCenterId ?? null,
      notes: payable.notes ?? null,
      version: payable.version,
      createdAt: payable.createdAt,
      updatedAt: payable.updatedAt,
    };
  }

  /**
   * Persistence → Domain (para SELECT)
   */
  static toDomain(
    row: AccountPayableRow, 
    paymentRows: PaymentRow[] = []
  ): Result<AccountPayable, string> {
    // 1. Criar Money
    const amountResult = Money.create(
      parseFloat(row.amount as string), 
      row.currency
    );
    if (Result.isFail(amountResult)) {
      return Result.fail(`Invalid amount: ${amountResult.error}`);
    }

    // 2. Criar desconto (se houver)
    let discountAmount: Money | undefined;
    if (row.discountAmount) {
      const discountResult = Money.create(
        parseFloat(row.discountAmount as string),
        row.currency
      );
      if (Result.isOk(discountResult)) {
        discountAmount = discountResult.value;
      }
    }

    // 3. Criar PaymentTerms
    const termsResult = PaymentTerms.create({
      dueDate: new Date(row.dueDate),
      amount: amountResult.value,
      discountUntil: row.discountUntil ? new Date(row.discountUntil) : undefined,
      discountAmount,
      fineRate: parseFloat(row.fineRate as string),
      interestRate: parseFloat(row.interestRate as string),
    });

    if (Result.isFail(termsResult)) {
      return Result.fail(`Invalid terms: ${termsResult.error}`);
    }

    // 4. Mapear payments
    const payments: Payment[] = [];
    for (const paymentRow of paymentRows) {
      const paymentResult = PayableMapper.paymentToDomain(paymentRow);
      if (Result.isOk(paymentResult)) {
        payments.push(paymentResult.value);
      }
    }

    // 5. Reconstituir AccountPayable
    const payable = AccountPayable.reconstitute(
      row.id,
      {
        organizationId: row.organizationId,
        branchId: row.branchId,
        supplierId: row.partnerId ?? 0, // Schema partnerId → Domain supplierId
        documentNumber: row.documentNumber ?? '',
        description: row.description,
        terms: termsResult.value,
        status: row.status as 'OPEN' | 'PROCESSING' | 'PARTIAL' | 'PAID' | 'CANCELLED',
        payments,
        categoryId: row.categoryId ?? undefined,
        costCenterId: row.costCenterId ?? undefined,
        notes: row.notes ?? undefined,
        version: row.version,
      },
      new Date(row.createdAt),
      new Date(row.updatedAt)
    );

    return Result.ok(payable);
  }

  /**
   * Payment Domain → Persistence
   */
  static paymentToPersistence(payment: Payment, payableId: string, organizationId: number, branchId: number): PaymentInsert {
    return {
      id: payment.id,
      organizationId,
      branchId,
      payableId,
      amount: payment.amount.amount.toString(),
      currency: payment.amount.currency,
      method: payment.method,
      status: payment.status,
      bankAccountId: payment.bankAccountId ?? null,
      transactionId: payment.transactionId ?? null,
      notes: payment.notes ?? null,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /**
   * Payment Persistence → Domain
   */
  static paymentToDomain(row: PaymentRow): Result<Payment, string> {
    const amountResult = Money.create(
      parseFloat(row.amount as string),
      row.currency
    );
    
    if (Result.isFail(amountResult)) {
      return Result.fail(`Invalid payment amount: ${amountResult.error}`);
    }

    const payment = Payment.reconstitute(
      row.id,
      {
        payableId: row.payableId,
        amount: amountResult.value,
        method: row.method as PaymentMethod,
        paidAt: new Date(row.paidAt),
        status: row.status as PaymentStatus,
        bankAccountId: row.bankAccountId ?? undefined,
        transactionId: row.transactionId ?? undefined,
        notes: row.notes ?? undefined,
      },
      new Date(row.createdAt),
      new Date(row.updatedAt)
    );

    return Result.ok(payment);
  }
}

