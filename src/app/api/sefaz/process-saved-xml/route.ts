import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { processSefazResponse } from "@/services/sefaz-processor";
import { ensureConnection } from "@/lib/db";

/**
 * POST /api/sefaz/process-saved-xml
 * 
 * Processa uma resposta XML da Sefaz salva previamente
 * 
 * Body: { xmlContent: string }
 */
export async function POST(request: NextRequest) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();

    const { xmlContent, branchId } = body;

    if (!xmlContent || typeof xmlContent !== "string") {
      return NextResponse.json(
        { error: "xmlContent é obrigatório e deve ser uma string" },
        { status: 400 }
      );
    }

    const finalBranchId = branchId || ctx.defaultBranchId || 1;

    console.log(`📦 Processando XML salvo para branch ${finalBranchId}...`);
    console.log(`📄 Tamanho do XML: ${xmlContent.length} bytes`);

    // Processa o XML da Sefaz
    const result = await processSefazResponse(
      xmlContent,
      ctx.organizationId,
      finalBranchId,
      ctx.userId
    );

    return NextResponse.json({
      success: true,
      message: result.message || "Processamento concluído!",
      data: result,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao processar XML salvo:", error);
    return NextResponse.json(
      { error: "Falha ao processar XML.", details: error.message },
      { status: 500 }
    );
  }
}








