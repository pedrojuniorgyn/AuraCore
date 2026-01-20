import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { IDownloadNfesUseCase } from "@/modules/fiscal/domain/ports/input/IDownloadNfesUseCase";
import { Result } from "@/shared/domain";

/**
 * 🔧 FORÇA EXECUÇÃO MANUAL DA IMPORTAÇÃO DE NFes
 * 
 * Útil para:
 * - Testes
 * - Debug
 * - Forçar importação sem aguardar cron
 * 
 * Uso:
 * curl -X POST http://localhost:3000/api/admin/force-auto-import?branchId=1
 * 
 * @since E8 Fase 3 - Migrado para Use Case DDD
 *   - DownloadNfesUseCase via DI
 *   - Elimina dependência de @/services/cron/
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    
    const branchIdParam = request.nextUrl.searchParams.get("branchId");
    const branchId = branchIdParam ? parseInt(branchIdParam) : ctx.defaultBranchId || 1;

    console.log("🔧 [FORCE] Iniciando importação manual forçada...");
    console.log(`   Branch: ${branchId}, Organization: ${ctx.organizationId}`);
    console.log("━".repeat(80));

    // Resolver Use Case via DI
    const downloadNfesUseCase = container.resolve<IDownloadNfesUseCase>(
      TOKENS.DownloadNfesUseCase
    );

    // Executar Use Case
    const result = await downloadNfesUseCase.execute({
      organizationId: ctx.organizationId,
      branchId,
      userId: ctx.userId,
    });

    console.log("━".repeat(80));

    if (Result.isFail(result)) {
      console.log(`⚠️ [FORCE] Importação retornou erro: ${result.error}`);
      return NextResponse.json({
        success: false,
        error: result.error,
        hint: "Verifique se o certificado digital está configurado corretamente.",
      }, { status: 400 });
    }

    const output = result.value;
    console.log(`✅ [FORCE] Importação concluída: ${output.message}`);

    return NextResponse.json({
      success: true,
      message: output.message,
      data: {
        totalDocuments: output.totalDocuments,
        maxNsu: output.maxNsu,
        processing: output.processing,
      },
      note: "Verifique os logs do terminal para detalhes.",
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ [FORCE] Erro ao executar importação manual:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        hint: "Verifique os logs do terminal para mais detalhes.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Mostra instruções de uso
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/admin/force-auto-import",
    method: "POST",
    description: "Força execução manual da importação de NFes via SEFAZ",
    usage: {
      curl: "curl -X POST http://localhost:3000/api/admin/force-auto-import?branchId=1",
      browser: "POST http://localhost:3000/api/admin/force-auto-import?branchId=1",
    },
    parameters: {
      branchId: "ID da filial (opcional, usa padrão se não informado)",
    },
    note: "A importação será executada imediatamente usando DownloadNfesUseCase.",
    since: "E8 Fase 3 - Use Case DDD",
  });
}
