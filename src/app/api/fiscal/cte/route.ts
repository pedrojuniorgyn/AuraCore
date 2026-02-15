import { NextResponse, NextRequest } from "next/server";
import { withDI } from "@/shared/infrastructure/di/with-di";
import { auth } from "@/lib/auth";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { cteHeader } from "@/modules/fiscal/infrastructure/persistence/schemas";
import { eq, and, isNull, desc } from "drizzle-orm";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { ICreateCteUseCase } from "@/modules/fiscal/domain/ports/input/ICreateCteUseCase";
import { Result } from "@/shared/domain";
import { CreateCteSchema, ListCteQuerySchema } from "@/modules/fiscal/presentation/validators";

import { logger } from '@/shared/infrastructure/logging';
/**
 * GET /api/fiscal/cte
 * Lista CTes da organização
 * 
 * Multi-tenancy: ✅ organizationId
 * Validação: ✅ Zod query params
 */
export const GET = withDI(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    // Validar query params com Zod
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validation = ListCteQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetros inválidos",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { page, limit, status } = validation.data;

    const ctes = await db
      .select()
      .from(cteHeader)
      .where(
        and(
          eq(cteHeader.organizationId, organizationId),
          isNull(cteHeader.deletedAt)
        )
      )
      .orderBy(desc(cteHeader.createdAt));

    return NextResponse.json({
      success: true,
      data: ctes,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao buscar CTes:", error);
    return NextResponse.json(
      { error: "Erro ao buscar CTes", details: errorMessage },
      { status: 500 }
    );
  }
});

/**
 * POST /api/fiscal/cte
 * Cria CTe a partir de uma Ordem de Coleta via Use Case (DDD)
 * 🔐 Requer permissão: fiscal.cte.create
 * 
 * Multi-tenancy: ✅ organizationId + branchId
 * Validação: ✅ Zod schema
 * 
 * @since E8 Fase 3 - Use Case orquestrador
 *   - CreateCteUseCase via DI
 *   - Encapsula: validação seguro, geração XML
 */
export const POST = withDI(async (req: NextRequest) => {
  return withPermission(req, "fiscal.cte.create", async (user, ctx) => {
    try {
      const body = await req.json();

      // Validar body com Zod
      const validation = CreateCteSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Dados inválidos",
            details: validation.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const { pickupOrderId, modal, tipoServico, finalidade, notes } = validation.data;

      if (!ctx.branchId) {
        return NextResponse.json(
          { error: "branchId obrigatório" },
          { status: 400 }
        );
      }

      // Resolver Use Case via DI
      const createCteUseCase = container.resolve<ICreateCteUseCase>(
        TOKENS.CreateCteUseCase
      );

      // Executar Use Case
      const result = await createCteUseCase.execute({
        pickupOrderId,
        organizationId: ctx.organizationId,
        branchId: ctx.branchId,
        userId: ctx.userId,
      });

      if (Result.isFail(result)) {
        const error = result.error;

        if (error.includes('não encontrada')) {
          return NextResponse.json({ error }, { status: 404 });
        }
        if (error.includes('seguro') || error.includes('Averbação')) {
          return NextResponse.json(
            { error, hint: "Configure a averbação de seguro antes de criar o CTe" },
            { status: 400 }
          );
        }

        return NextResponse.json({ error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "CTe criado!",
        data: result.value,
      });
    } catch (error: unknown) {
      // Propagar erros de auth (getTenantContext throws Response)
      if (error instanceof Response) {
        return error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("❌ Erro ao criar CTe:", error);
      return NextResponse.json(
        { error: "Erro ao criar CTe", details: errorMessage },
        { status: 500 }
      );
    }
  });
});
