import { NextRequest, NextResponse } from "next/server";

/**
 * 🔧 FORÇA EXECUÇÃO MANUAL DA IMPORTAÇÃO AUTOMÁTICA
 * 
 * Útil para:
 * - Testes
 * - Debug
 * - Forçar importação sem aguardar cron
 * 
 * Uso:
 * curl -X POST http://localhost:3000/api/admin/force-auto-import
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [FORCE] Iniciando importação manual forçada...");
    console.log("━".repeat(80));

    const { runManualImport } = await import("@/services/cron/auto-import-nfe");
    
    await runManualImport();

    console.log("━".repeat(80));
    console.log("✅ [FORCE] Importação manual concluída!");

    return NextResponse.json({
      success: true,
      message: "Importação automática executada com sucesso!",
      note: "Verifique os logs acima para detalhes da importação.",
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
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: "/api/admin/force-auto-import",
    method: "POST",
    description: "Força execução manual da importação automática de NFes",
    usage: {
      curl: "curl -X POST http://localhost:3000/api/admin/force-auto-import",
      browser: "POST http://localhost:3000/api/admin/force-auto-import",
    },
    note: "A importação será executada imediatamente, sem aguardar o cron job.",
  });
}






















