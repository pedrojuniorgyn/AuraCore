/**
 * 📋 CreatePayableFromTripUseCase - Command (ARCH-012)
 * 
 * Cria contas a pagar quando uma viagem (trip) é completada no TMS.
 * Integracao cross-module: TMS -> Financial
 * 
 * F4: Cross-Module Integration
 * 
 * Cenários:
 * 1. Pagamento de frete ao motorista (FRETE_MOTORISTA)
 * 2. Pagamento de pedágio/vale-pedágio (PEDAGIO)
 * 3. Outras despesas de viagem (DESPESA_VIAGEM)
 */
import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export interface TripCostItem {
  costType: 'FRETE_MOTORISTA' | 'PEDAGIO' | 'DESPESA_VIAGEM' | 'ADIANTAMENTO';
  description: string;
  amount: number;
  currency?: string;
  dueDate?: Date;
  supplierId?: number; // Para pedágio, pode ser a operadora
}

export interface CreatePayableFromTripInput {
  organizationId: number;
  branchId: number;
  tripId: string;
  tripNumber: string;
  driverId?: number;
  driverName?: string;
  costs: TripCostItem[];
  completedAt: Date;
  createdBy: string;
}

export interface CreatePayableFromTripOutput {
  payableIds: string[];
  totalAmount: number;
  tripId: string;
}

@injectable()
export class CreatePayableFromTripUseCase {
  async execute(input: CreatePayableFromTripInput): Promise<Result<CreatePayableFromTripOutput, string>> {
    if (!input.tripId?.trim()) {
      return Result.fail('tripId obrigatório');
    }

    if (!input.costs || input.costs.length === 0) {
      return Result.fail('Pelo menos um custo de viagem é necessário');
    }

    // Verificar se já existe payable para esta trip (idempotência)
    const existingRows = await db.execute(
      sql`SELECT id FROM accounts_payable
          WHERE organization_id = ${input.organizationId}
            AND branch_id = ${input.branchId}
            AND source_type = 'TMS_TRIP'
            AND source_id = ${input.tripId}
            AND deleted_at IS NULL`
    ) as unknown as Array<{ id: string }>;

    if (existingRows.length > 0) {
      return Result.fail(`Já existem contas a pagar para a viagem ${input.tripNumber}`);
    }

    const payableIds: string[] = [];
    let totalAmount = 0;

    for (const cost of input.costs) {
      if (cost.amount <= 0) continue;

      const payableId = globalThis.crypto.randomUUID();
      const dueDate = cost.dueDate || new Date(input.completedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 dias
      const currency = cost.currency || 'BRL';

      const description = `${cost.description} - Viagem ${input.tripNumber}` +
        (input.driverName ? ` - ${input.driverName}` : '');

      await db.execute(
        sql`INSERT INTO accounts_payable
            (id, organization_id, branch_id, supplier_id, supplier_name,
             description, amount, amount_currency, due_date, 
             category, source_type, source_id,
             status, created_at, updated_at, created_by)
            VALUES (
              ${payableId}, ${input.organizationId}, ${input.branchId},
              ${cost.supplierId ?? input.driverId ?? null},
              ${input.driverName ?? 'Motorista'},
              ${description}, ${cost.amount}, ${currency},
              ${dueDate},
              ${cost.costType}, 'TMS_TRIP', ${input.tripId},
              'OPEN', GETDATE(), GETDATE(), ${input.createdBy}
            )`
      );

      payableIds.push(payableId);
      totalAmount += cost.amount;
    }

    return Result.ok({
      payableIds,
      totalAmount,
      tripId: input.tripId,
    });
  }
}
