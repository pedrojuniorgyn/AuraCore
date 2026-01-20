import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { ensureConnection } from "@/lib/db";

// Legacy: createSefazService ainda busca certificado/NSU do banco
// TODO (E8 Fase 3): Criar QueryNfeStatusUseCase que orquestre:
//   1. Buscar configuração (certificado, NSU) do banco
//   2. Chamar ISefazGateway.queryDistribuicaoDFe()
import { createSefazService } from "@/services/sefaz-service";

/**
 * GET /api/admin/debug-sefaz?branchId=1
 * Retorna o XML bruto da resposta da Sefaz para debug
 * 
 * ⚠️ ADMIN ONLY: Rota de debug para desenvolvimento
 * 
 * @since E8 Fase 2.5 - Migração parcial documentada
 */
export async function GET(request: NextRequest) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    
    const branchIdParam = request.nextUrl.searchParams.get("branchId");
    const branchId = branchIdParam ? parseInt(branchIdParam) : 1;

    console.log(`🔍 Debug Sefaz para branch ${branchId}`);

    // Legacy: Cria instância do serviço (busca certificado do banco)
    const sefazService = createSefazService(branchId, ctx.organizationId);
    const result = await sefazService.getDistribuicaoDFe();
    
    return new NextResponse(result.xml, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "X-Max-NSU": result.maxNsu,
        "X-Total-Documents": result.totalDocuments.toString(),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro no debug Sefaz:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
