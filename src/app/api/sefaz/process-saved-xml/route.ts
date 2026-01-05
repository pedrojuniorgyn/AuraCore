import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { ensureConnection } from "@/lib/db";
import { SefazDocumentProcessor } from "@/modules/fiscal/domain/services";
import { createFiscalDocumentImportAdapter } from "@/modules/fiscal/infrastructure/adapters";
import { Result } from "@/shared/domain";

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

    // Cria adapter de importação
    const importAdapter = createFiscalDocumentImportAdapter(
      ctx.organizationId,
      finalBranchId,
      ctx.userId
    );

    // Cria processor
    const processor = new SefazDocumentProcessor(importAdapter);

    // Processa o XML da Sefaz
    const processResult = await processor.processResponse(xmlContent);

    if (Result.isFail(processResult)) {
      return NextResponse.json(
        { error: "Falha ao processar XML.", details: processResult.error.message },
        { status: 500 }
      );
    }

    const result = processResult.value;

    return NextResponse.json({
      success: true,
      message: result.message || "Processamento concluído!",
      data: result,
    });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao processar XML salvo:", error);
    return NextResponse.json(
      { error: "Falha ao processar XML.", details: errorMessage },
      { status: 500 }
    );
  }
}



































