import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { createSefazService } from "@/services/sefaz-service";
import { processSefazResponse } from "@/services/sefaz-processor";

/**
 * POST /api/sefaz/download-nfes
 * 
 * Endpoint para testar download de NFes da Sefaz (DistribuicaoDFe).
 * 
 * Body: { branch_id: number }
 * 
 * Retorna:
 * - XML bruto da resposta
 * - Quantidade de documentos
 * - Novo maxNSU
 */
export async function POST(request: NextRequest) {
  try {
    // 🔗 Garante conexão com banco
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const body = await request.json();

    const branchId = body.branch_id || ctx.defaultBranchId || 1;

    console.log(`🤖 Iniciando download de NFes da Sefaz (Branch: ${branchId})...`);

    // Cria instância do serviço
    const sefazService = createSefazService(branchId, ctx.organizationId);

    // Consulta DistribuicaoDFe
    const downloadResult = await sefazService.getDistribuicaoDFe();

    console.log(`📦 Documentos recebidos: ${downloadResult.totalDocuments}`);

    // Se houver documentos, processa automaticamente
    let processResult = null;

    if (downloadResult.totalDocuments > 0) {
      console.log("🤖 Iniciando processamento automático...");

      try {
        processResult = await processSefazResponse(
          downloadResult.xml,
          ctx.organizationId,
          branchId,
          ctx.userId
        );

        console.log("✅ Processamento concluído:", processResult);
      } catch (error: any) {
        console.error("❌ Erro ao processar documentos:", error.message);
        // Continua e retorna os dados da consulta mesmo se o processamento falhar
      }
    }

    return NextResponse.json({
      success: downloadResult.success,
      message: processResult
        ? `${processResult.imported} NFe(s) importada(s) automaticamente!`
        : `${downloadResult.totalDocuments} documento(s) retornado(s) pela Sefaz`,
      data: {
        totalDocuments: downloadResult.totalDocuments,
        maxNsu: downloadResult.maxNsu,
        processing: processResult || null,
      },
    });

  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }

    console.error("❌ Error downloading NFes from Sefaz:", error);
    return NextResponse.json(
      { 
        error: "Falha ao consultar Sefaz", 
        details: error.message,
        hint: error.message.includes("Certificado") 
          ? "Faça o upload do certificado digital da filial primeiro."
          : undefined,
      },
      { status: 500 }
    );
  }
}

