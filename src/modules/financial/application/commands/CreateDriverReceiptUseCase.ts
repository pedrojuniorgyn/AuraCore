/**
 * 📋 CreateDriverReceiptUseCase - Command (ARCH-012)
 * 
 * Cria um recibo/comprovante automaticamente quando um pagamento
 * de motorista (TMS_TRIP) é efetuado.
 * Integracao cross-module: Financial (Payment) -> Financial (Receipt)
 * 
 * F4: Cross-Module Integration
 * 
 * Chamado pelo event handler de PaymentProcessedEvent quando o
 * payable tem source_type = 'TMS_TRIP'.
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export interface CreateDriverReceiptInput {
  organizationId: number;
  branchId: number;
  payableId: string;
  paymentId: string;
  driverId: number;
  driverName: string;
  driverDocument: string; // CPF
  tripNumber: string;
  amount: number;
  currency?: string;
  paymentDate: Date;
  paymentMethod: string; // PIX, TRANSFERENCIA, BOLETO
  createdBy: string;
}

export interface CreateDriverReceiptOutput {
  receiptId: string;
  receiptNumber: string;
  driverName: string;
  amount: number;
  createdAt: Date;
}

@injectable()
export class CreateDriverReceiptUseCase {
  async execute(input: CreateDriverReceiptInput): Promise<Result<CreateDriverReceiptOutput, string>> {
    if (input.amount <= 0) {
      return Result.fail('Valor do recibo deve ser positivo');
    }

    if (!input.driverDocument?.trim()) {
      return Result.fail('CPF do motorista obrigatório para emissão de recibo');
    }

    // Gerar número do recibo (YYYYMMDD-SEQ)
    const datePrefix = input.paymentDate.toISOString().slice(0, 10).replace(/-/g, '');
    
    const seqRows = await db.execute(
      sql`SELECT COUNT(*) + 1 AS next_seq 
          FROM driver_receipts 
          WHERE organization_id = ${input.organizationId}
            AND branch_id = ${input.branchId}
            AND CONVERT(DATE, created_at) = CONVERT(DATE, ${input.paymentDate})`
    ) as unknown as Array<{ next_seq: number }>;

    const seq = Number(seqRows[0]?.next_seq ?? 1);
    const receiptNumber = `REC-${datePrefix}-${String(seq).padStart(4, '0')}`;
    const receiptId = globalThis.crypto.randomUUID();
    const currency = input.currency || 'BRL';
    const now = new Date();

    await db.execute(
      sql`INSERT INTO driver_receipts
          (id, organization_id, branch_id, receipt_number,
           driver_id, driver_name, driver_document,
           trip_number, payable_id, payment_id,
           amount, amount_currency, payment_date, payment_method,
           status, created_at, created_by)
          VALUES (
            ${receiptId}, ${input.organizationId}, ${input.branchId}, ${receiptNumber},
            ${input.driverId}, ${input.driverName}, ${input.driverDocument},
            ${input.tripNumber}, ${input.payableId}, ${input.paymentId},
            ${input.amount}, ${currency}, ${input.paymentDate}, ${input.paymentMethod},
            'GENERATED', ${now}, ${input.createdBy}
          )`
    );

    return Result.ok({
      receiptId,
      receiptNumber,
      driverName: input.driverName,
      amount: input.amount,
      createdAt: now,
    });
  }
}
