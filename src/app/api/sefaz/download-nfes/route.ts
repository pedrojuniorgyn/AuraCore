import { NextRequest, NextResponse } from "next/server";
import { withDI } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from "@/lib/auth/context";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { IDownloadNfesUseCase } from "@/modules/fiscal/domain/ports/input/IDownloadNfesUseCase";
import { Result } from "@/shared/domain";

/**
 * POST /api/sefaz/download-nfes
 * 
 * Endpoint para download de NFes da Sefaz (DistribuicaoDFe) via Use Case (DDD).
 * 
 * Body: { branch_id: number }
 * 
 * Retorna:
 * - Quantidade de documentos
 * - Novo maxNSU
 * - Resultados do processamento
 * 
 * @since E8 Fase 3 - Use Case orquestrador
 *   - DownloadNfesUseCase via DI
 *   - Encapsula: consulta SEFAZ, processamento documentos
 */
export const POST = withDI(async (request: NextRequest) => {
  try {
    // Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const body = await request.json();

    const branchId = body.branch_id || ctx.defaultBranchId || 1;

    // Garantir que os valores são números válidos
    const orgId = typeof ctx.organizationId === 'number' 
      ? ctx.organizationId 
      : Number(ctx.organizationId);
    const branchIdNum = typeof branchId === 'number' 
      ? branchId 
      : Number(branchId);

    if (isNaN(orgId) || isNaN(branchIdNum)) {
      return NextResponse.json(
        { success: false, error: 'IDs de organização/filial inválidos' },
        { status: 400 }
      );
    }

    // Resolver Use Case via DI
    const downloadNfesUseCase = container.resolve<IDownloadNfesUseCase>(
      TOKENS.DownloadNfesUseCase
    );

    // Executar Use Case
    const result = await downloadNfesUseCase.execute({
      organizationId: orgId,
      branchId: branchIdNum,
      userId: ctx.userId,
    });

    if (Result.isFail(result)) {
      const error = result.error;

      // Determinar status code baseado no tipo de erro
      if (error.includes('Certificado')) {
        return NextResponse.json(
          { 
            success: false, 
            error,
            hint: "Faça o upload do certificado digital da filial primeiro.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error },
        { status: 500 }
      );
    }

    const output = result.value;

    return NextResponse.json({
      success: true,
      message: output.message,
      data: {
        totalDocuments: output.totalDocuments,
        maxNsu: output.maxNsu,
        processing: output.processing,
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error downloading NFes from Sefaz:", error);
    return NextResponse.json(
      { 
        error: "Falha ao consultar Sefaz", 
        details: errorMessage,
        hint: errorMessage.includes("Certificado") 
          ? "Faça o upload do certificado digital da filial primeiro."
          : undefined,
      },
      { status: 500 }
    );
  }
});
