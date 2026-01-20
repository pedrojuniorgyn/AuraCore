/**
 * POST /api/financial/cost-centers/allocations
 * Cria rateio multi-CC para uma linha de lançamento
 * 
 * @since E9 Fase 2 - Migrado para ICostCenterAllocationGateway via DI
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { container } from "@/shared/infrastructure/di/container";
import { ACCOUNTING_TOKENS } from "@/modules/accounting/infrastructure/di/AccountingModule";
import type { ICostCenterAllocationGateway } from "@/modules/accounting/domain/ports/output/ICostCenterAllocationGateway";
import { Result } from "@/shared/domain";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { journalEntryLineId, allocations } = body;

    if (!journalEntryLineId || !allocations || allocations.length === 0) {
      return NextResponse.json(
        { error: "journalEntryLineId e allocations são obrigatórios" },
        { status: 400 }
      );
    }

    // Resolver gateway via DI
    const allocationGateway = container.resolve<ICostCenterAllocationGateway>(
      ACCOUNTING_TOKENS.CostCenterAllocationGateway
    );

    const result = await allocationGateway.createAllocations({
      organizationId: session.user.organizationId,
      branchId: session.user.defaultBranchId || 1,
      allocations: allocations.map((a: Record<string, unknown>) => ({
        ...a,
        documentId: journalEntryLineId,
        documentType: 'JOURNAL_ENTRY_LINE',
      })),
    });

    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Rateio criado com sucesso!",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao criar rateio:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
