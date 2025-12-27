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

    // Verifica se houve erro (ex: 656 - Consumo Indevido)
    if (downloadResult.error) {
      console.log(`⚠️  Erro SEFAZ: ${downloadResult.error.code} - ${downloadResult.error.message}`);
      
      return NextResponse.json({
        success: false,
        message: downloadResult.error.message,
        error: downloadResult.error,
        data: {
          totalDocuments: 0,
          maxNsu: downloadResult.maxNsu,
        },
      });
    }

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
      } catch (error: unknown) {
        console.error("❌ Erro ao processar documentos:", errorMessage);
        // Continua e retorna os dados da consulta mesmo se o processamento falhar
      }
    }

    return NextResponse.json({
      success: downloadResult.success,
      message: processResult
        ? `${processResult.imported} NFe(s) importada(s) automaticamente!`
        : downloadResult.totalDocuments === 0
        ? "Nenhum documento novo disponível"
        : `${downloadResult.totalDocuments} documento(s) retornado(s) pela Sefaz`,
      data: {
        totalDocuments: downloadResult.totalDocuments,
        maxNsu: downloadResult.maxNsu,
        processing: processResult || null,
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
}

