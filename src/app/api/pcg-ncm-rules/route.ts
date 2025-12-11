/**
 * API: PCG NCM RULES
 * 
 * Endpoint para sugerir NCMs baseado na conta gerencial selecionada.
 * Usado em formulários de entrada de mercadoria, produtos, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantContext } from "@/lib/auth/context";
import { suggestNcmsByPcg, listActivePcgs } from "@/services/accounting/pcg-ncm-classifier";

/**
 * GET /api/pcg-ncm-rules
 * 
 * Query Params:
 * - pcg_id: ID da conta gerencial (opcional)
 * - list_pcgs: "true" para listar todas as contas gerenciais
 * 
 * Exemplos:
 * - GET /api/pcg-ncm-rules?pcg_id=1
 *   → Retorna NCMs sugeridos para PCG ID 1
 * 
 * - GET /api/pcg-ncm-rules?list_pcgs=true
 *   → Retorna todas as contas gerenciais ativas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { organizationId } = getTenantContext();
    const { searchParams } = new URL(request.url);
    
    // Opção 1: Listar PCGs
    const listPcgs = searchParams.get("list_pcgs");
    if (listPcgs === "true") {
      const pcgs = await listActivePcgs(organizationId);
      return NextResponse.json({
        success: true,
        data: pcgs,
        total: pcgs.length,
      });
    }

    // Opção 2: Sugerir NCMs por PCG
    const pcgId = searchParams.get("pcg_id");
    if (!pcgId) {
      return NextResponse.json(
        { 
          error: "Query parameter 'pcg_id' ou 'list_pcgs=true' é obrigatório",
          usage: {
            suggestions: "/api/pcg-ncm-rules?pcg_id=1",
            listPcgs: "/api/pcg-ncm-rules?list_pcgs=true",
          }
        },
        { status: 400 }
      );
    }

    const suggestions = await suggestNcmsByPcg(
      parseInt(pcgId),
      organizationId
    );

    return NextResponse.json({
      success: true,
      data: suggestions,
      total: suggestions.length,
      pcgId: parseInt(pcgId),
    });
  } catch (error: any) {
    console.error("❌ Erro em /api/pcg-ncm-rules:", error);
    return NextResponse.json(
      { 
        error: error.message || "Erro interno ao buscar regras PCG-NCM",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
