import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { IAuthorizeCteUseCase } from "@/modules/fiscal/domain/ports/input/IAuthorizeCteUseCase";
import { Result } from "@/shared/domain";
import { idParamSchema } from "@/lib/validation/common-schemas";

/**
 * POST /api/fiscal/cte/:id/authorize
 * 🔐 Requer permissão: fiscal.cte.authorize
 * 
 * Autoriza um CTe na Sefaz via Use Case (DDD)
 * 
 * Multi-tenancy: ✅ organizationId + branchId
 * Validação: ✅ Zod path params
 * 
 * @since E8 Fase 3 - Use Case orquestrador
 *   - AuthorizeCteUseCase via DI
 *   - Encapsula: busca CTe, gera XML, assina, transmite SEFAZ
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, "fiscal.cte.authorize", async (user, ctx) => {
    const resolvedParams = await params;

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

    if (!ctx.branchId) {
      return NextResponse.json(
        { error: "branchId obrigatório" },
        { status: 400 }
      );
    }

    try {
      // Resolver Use Case via DI
      const authorizeCteUseCase = container.resolve<IAuthorizeCteUseCase>(
        TOKENS.AuthorizeCteUseCase
      );

      // Executar Use Case
      const result = await authorizeCteUseCase.execute({
        cteId,
        organizationId: ctx.organizationId,
        branchId: ctx.branchId,
        userId: ctx.userId,
      });

      if (Result.isFail(result)) {
        // Determinar status code baseado no tipo de erro
        const error = result.error;
        
        if (error.includes('não encontrado')) {
          return NextResponse.json({ error }, { status: 404 });
        }
        if (error.includes('já está autorizado') || 
            error.includes('cancelado') || 
            error.includes('Certificado')) {
          return NextResponse.json({ error }, { status: 400 });
        }
        if (error.includes('rejeitado')) {
          return NextResponse.json(
            { error, success: false },
            { status: 422 }
          );
        }
        
        return NextResponse.json(
          { error, success: false },
          { status: 500 }
        );
      }

      const output = result.value;

      return NextResponse.json({
        success: true,
        message: "CTe autorizado com sucesso na Sefaz!",
        data: {
          cteId: output.cteId,
          chave: output.cteKey,
          protocolo: output.protocolNumber,
          dataAutorizacao: output.authorizationDate,
        },
      });
    } catch (error: unknown) {
      // Propagar erros de auth (getTenantContext throws Response)
      if (error instanceof Response) {
        return error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Erro ao autorizar CTe:", error);
      return NextResponse.json(
        {
          error: "Erro ao autorizar CTe",
          details: errorMessage,
        },
        { status: 500 }
      );
    }
  });
}
