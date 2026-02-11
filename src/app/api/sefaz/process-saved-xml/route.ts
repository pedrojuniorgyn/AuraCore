import { NextRequest, NextResponse } from "next/server";
import { withDI } from '@/shared/infrastructure/di/with-di';
import { getTenantContext } from "@/lib/auth/context";
import { ensureConnection } from "@/lib/db";
import { SefazDocumentProcessor } from "@/modules/fiscal/domain/services";
import { createFiscalDocumentImportAdapter } from "@/modules/fiscal/infrastructure/adapters";
import { Result } from "@/shared/domain";

import { logger } from '@/shared/infrastructure/logging';
/**
 * POST /api/sefaz/process-saved-xml
 * 
 * Processa uma resposta XML da Sefaz salva previamente
 * 
 * Body: { xmlContent: string }
 */
export const POST = withDI(async (request: NextRequest) => {
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

    logger.info(`📦 Processando XML salvo para branch ${finalBranchId}...`);
    logger.info(`📄 Tamanho do XML: ${xmlContent.length} bytes`);

    // Garantir que os valores são números válidos
    const orgId = typeof ctx.organizationId === 'number' 
      ? ctx.organizationId 
      : Number(ctx.organizationId);
    const branchIdNum = typeof finalBranchId === 'number' 
      ? finalBranchId 
      : Number(finalBranchId);

    if (isNaN(orgId) || isNaN(branchIdNum)) {
      return NextResponse.json(
        { success: false, error: 'IDs de organização/filial inválidos' },
        { status: 400 }
      );
    }

    // Cria adapter de importação
    const importAdapter = createFiscalDocumentImportAdapter(
      orgId,
      branchIdNum,
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
    logger.error("❌ Erro ao processar XML salvo:", error);
    return NextResponse.json(
      { error: "Falha ao processar XML.", details: errorMessage },
      { status: 500 }
    );
  }
});



































