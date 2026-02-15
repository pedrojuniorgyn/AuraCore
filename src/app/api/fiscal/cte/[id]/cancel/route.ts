import { NextRequest, NextResponse } from "next/server";
import { withDI } from "@/shared/infrastructure/di/with-di";
import type { RouteContext } from "@/shared/infrastructure/di/with-di";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { cteHeader, fiscalSettings } from "@/modules/fiscal/infrastructure/persistence/schemas";
import { eq, and } from "drizzle-orm";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { ISefazGateway } from "@/modules/integrations/domain/ports/output/ISefazGateway";
import { Result } from "@/shared/domain";
import { idParamSchema } from "@/lib/validation/common-schemas";
import { CancelCteSchema } from "@/modules/fiscal/presentation/validators";

import { logger } from '@/shared/infrastructure/logging';
/**
 * POST /api/fiscal/cte/:id/cancel
 * 🔐 Requer permissão: fiscal.cte.cancel
 * 
 * Cancela um CTe na Sefaz
 * 
 * Multi-tenancy: ✅ organizationId + branchId
 * Validação: ✅ Zod path params + body
 * 
 * @since E8 Fase 2.4 - Migrado para DI
 */
export const POST = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  const resolvedParams = await context.params;
  return withPermission(request, "fiscal.cte.cancel", async (user, ctx) => {
    // Validar path param com Zod
    const paramValidation = idParamSchema.safeParse(resolvedParams);
    if (!paramValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "ID de CTe inválido",
          details: paramValidation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const cteId = paramValidation.data.id;

    const body = await request.json();

    // Validar body com Zod
    const bodyValidation = CancelCteSchema.safeParse({
      reason: body.justificativa, // Mapear campo antigo para schema
      protocolNumber: body.protocolNumber,
    });

    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados inválidos",
          details: bodyValidation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { reason: justificativa, protocolNumber } = bodyValidation.data;

    try {
      // 1. Buscar CTe
      const [cte] = await db
        .select()
        .from(cteHeader)
        .where(eq(cteHeader.id, cteId));

      if (!cte) {
        return NextResponse.json(
          { error: "CTe não encontrado" },
          { status: 404 }
        );
      }

      if (!cte.cteKey) {
        return NextResponse.json(
          { error: "CTe sem chave de acesso, não pode ser cancelado" },
          { status: 400 }
        );
      }

      if (!cte.protocolNumber) {
        return NextResponse.json(
          { error: "CTe sem protocolo de autorização, não pode ser cancelado" },
          { status: 400 }
        );
      }

      if (cte.status === "CANCELLED") {
        return NextResponse.json(
          { error: "CTe já está cancelado" },
          { status: 400 }
        );
      }

      // 2. Buscar ambiente
      const [settings] = await db
        .select()
        .from(fiscalSettings)
        .where(
          and(
            eq(fiscalSettings.organizationId, ctx.organizationId),
            eq(fiscalSettings.branchId, ctx.branchId ?? 0)
          )
        );

      const environment = settings?.cteEnvironment === "production" ? "production" : "homologation";

      // 3. Cancelar via ISefazGateway (DI)
      const sefazGateway = container.resolve<ISefazGateway>(TOKENS.SefazGateway);
      
      const cancelResult = await sefazGateway.cancelCte({
        cteKey: cte.cteKey,
        protocolNumber: cte.protocolNumber,
        justification: justificativa,
        environment,
      });

      if (Result.isFail(cancelResult)) {
        return NextResponse.json(
          {
            success: false,
            error: "Falha ao cancelar CTe",
            motivo: cancelResult.error,
          },
          { status: 422 }
        );
      }

      const resultado = cancelResult.value;

      // 4. Atualizar status no banco
      await db
        .update(cteHeader)
        .set({
          status: "CANCELLED",
          updatedAt: new Date(),
        })
        .where(eq(cteHeader.id, cteId));

      return NextResponse.json({
        success: true,
        message: "CTe cancelado com sucesso na Sefaz!",
        data: {
          cteId,
          status: resultado.status,
          protocolNumber: resultado.protocolNumber,
          cancellationDate: resultado.cancellationDate,
          motivo: resultado.message,
        },
      });
    } catch (error: unknown) {
      // Propagar erros de auth (getTenantContext throws Response)
      if (error instanceof Response) {
        return error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("❌ Erro ao cancelar CTe:", error);
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  });
});
