import { NextRequest, NextResponse } from "next/server";
import { createSefazService } from "@/services/sefaz-service";

/**
 * 🔍 DEBUG: Ver resposta completa da SEFAZ
 */
export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const body = await request.json();
    const branchId = body.branch_id || 1;
    const organizationId = body.organization_id || 1;

    console.log("🔍 Consultando SEFAZ em modo DEBUG...");

    const sefazService = createSefazService(branchId, organizationId);
    const result = await sefazService.getDistribuicaoDFe();

    // Parse da resposta para extrair status
    const cStatMatch = result.xml.match(/<cStat>(\d+)<\/cStat>/);
    const xMotivoMatch = result.xml.match(/<xMotivo>(.*?)<\/xMotivo>/);
    const ultNSUMatch = result.xml.match(/<ultNSU>(\d+)<\/ultNSU>/);
    const maxNSUMatch = result.xml.match(/<maxNSU>(\d+)<\/maxNSU>/);

    const debug = {
      success: result.success,
      totalDocuments: result.totalDocuments,
      maxNsu: result.maxNsu,
      responseSize: result.xml.length,
      
      // Parse manual
      parsed: {
        cStat: cStatMatch ? cStatMatch[1] : null,
        xMotivo: xMotivoMatch ? xMotivoMatch[1] : null,
        ultNSU: ultNSUMatch ? ultNSUMatch[1] : null,
        maxNSU: maxNSUMatch ? maxNSUMatch[1] : null,
      },
      
      // XML completo (para análise)
      xmlResponse: result.xml,
      
      // Códigos de status da SEFAZ
      statusExplanation: {
        "137": "Nenhum documento localizado",
        "138": "Documento localizado",
        "656": "Consumo Indevido",
        "other": "Ver xMotivo para detalhes"
      }
    };

    return NextResponse.json(debug, { status: 200 });

  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: errorMessage,
        stack: (error instanceof Error ? error.stack : undefined),
      },
      { status: 500 }
    );
  }
}






















