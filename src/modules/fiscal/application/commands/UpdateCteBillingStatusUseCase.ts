/**
 * 📋 UpdateCteBillingStatusUseCase - Command (ARCH-012)
 * 
 * Atualiza o status de faturamento (billing) de CTes quando uma fatura é finalizada.
 * Integracao cross-module: Financial (Billing) -> Fiscal (CTe)
 * 
 * F4: Cross-Module Integration
 * 
 * Chamado pelo event handler de BillingFinalizedEvent.
 * Marca os CTes vinculados à fatura como BILLED.
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export interface UpdateCteBillingStatusInput {
  organizationId: number;
  branchId: number;
  billingInvoiceId: string;
  cteIds: string[];
  status: 'BILLED' | 'UNBILLED';
  updatedBy: string;
}

export interface UpdateCteBillingStatusOutput {
  updatedCount: number;
  cteIds: string[];
}

@injectable()
export class UpdateCteBillingStatusUseCase {
  async execute(input: UpdateCteBillingStatusInput): Promise<Result<UpdateCteBillingStatusOutput, string>> {
    if (!input.cteIds || input.cteIds.length === 0) {
      return Result.fail('Nenhum CTe informado');
    }

    if (!input.billingInvoiceId?.trim()) {
      return Result.fail('billingInvoiceId obrigatório');
    }

    let updatedCount = 0;

    for (const cteId of input.cteIds) {
      // Atualizar billing_status e billing_invoice_id nos CTes
      const result = await db.execute(
        sql`UPDATE fiscal_documents 
            SET billing_status = ${input.status},
                billing_invoice_id = ${input.status === 'BILLED' ? input.billingInvoiceId : null},
                updated_at = GETDATE()
            WHERE id = ${cteId}
              AND organization_id = ${input.organizationId}
              AND deleted_at IS NULL`
      );

      // Count affected rows
      const affected = (result as unknown as { rowsAffected?: number[] })?.rowsAffected?.[0] ?? 0;
      updatedCount += affected;
    }

    return Result.ok({
      updatedCount,
      cteIds: input.cteIds,
    });
  }
}
