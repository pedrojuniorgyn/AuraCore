import { NextRequest, NextResponse } from "next/server";
import { createSefazService } from "@/services/sefaz-service";
import { getTenantContext } from "@/lib/auth/context";
import { ensureConnection } from "@/lib/db";

/**
 * GET /api/admin/debug-sefaz?branchId=1
 * Retorna o XML bruto da resposta da Sefaz para debug
 */
export async function GET(request: NextRequest) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    
    const branchIdParam = request.nextUrl.searchParams.get("branchId");
    const branchId = branchIdParam ? parseInt(branchIdParam) : 1;

    console.log(`🔍 Debug Sefaz para branch ${branchId}`);

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
    console.error("❌ Erro no debug Sefaz:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

