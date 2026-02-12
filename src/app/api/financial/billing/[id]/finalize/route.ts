import { NextRequest, NextResponse } from "next/server";
import { withDI, type RouteContext } from "@/shared/infrastructure/di/with-di";
import { withPermission } from "@/lib/auth/api-guard";
import { getTenantContext } from "@/lib/auth/context";
import { resolveBranchIdOrThrow } from "@/lib/auth/branch";
import { container } from 'tsyringe';
import { FINANCIAL_TOKENS } from '@/modules/financial/infrastructure/di/FinancialModule';
import type { FinalizeBillingInvoiceUseCase } from '@/modules/financial/application/commands/FinalizeBillingInvoiceUseCase';
import { Result } from '@/shared/domain';
import { logger } from '@/shared/infrastructure/logging';

/**
 * POST /api/financial/billing/:id/finalize
 * 
 * Finaliza fatura e cria título no Contas a Receber.
 * Calcula retenções (IRRF/PIS/COFINS/CSLL/ISS).
 * Emite BillingFinalizedEvent para contabilização automática.
 * 
 * Migrado para DDD Use Case (F1.5).
 * 
 * @permission financial.billing.approve
 */
export const POST = withDI(async (request: NextRequest, context: RouteContext) => {
  return withPermission(request, "financial.billing.approve", async (user, ctx) => {
    const resolvedParams = await context.params;
    const billingId = Number(resolvedParams.id);

    if (!Number.isFinite(billingId) || billingId <= 0) {
      return NextResponse.json(
        { error: "ID de fatura inválido" },
        { status: 400 }
      );
    }

    try {
      const tenant = await getTenantContext();
      const branchId = resolveBranchIdOrThrow(request.headers, tenant);

      // Resolver use case via DI
      const useCase = container.resolve<FinalizeBillingInvoiceUseCase>(
        FINANCIAL_TOKENS.FinalizeBillingInvoiceUseCase
      );

      const result = await useCase.execute(
        { billingId },
        {
          organizationId: tenant.organizationId,
          branchId,
          userId: tenant.userId,
        }
      );

      if (Result.isFail(result)) {
        // Determinar HTTP status baseado no erro
        const errorMsg = result.error;
        const status = errorMsg.includes('não encontrada') ? 404
          : errorMsg.includes('já foi finalizada') || errorMsg.includes('Gere o boleto') ? 400
          : 422;

        return NextResponse.json({ error: errorMsg }, { status });
      }

      return NextResponse.json({
        success: true,
        message: "Fatura finalizada com sucesso!",
        data: result.value,
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof Response) return error;
      logger.error("Erro ao finalizar fatura:", error instanceof Error ? error : undefined);
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  });
});
