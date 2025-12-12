/**
 * API: FISCAL FLAGS BY NCM
 * 
 * Endpoint para buscar flags fiscais de um NCM específico.
 * Usado para auto-preencher checkboxes fiscais em formulários.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantContext } from "@/lib/auth/context";
import { getFiscalFlagsByNcm } from "@/services/accounting/pcg-ncm-classifier";

/**
 * GET /api/pcg-ncm-rules/fiscal-flags
 * 
 * Query Params:
 * - ncm_code: Código NCM (8 dígitos) - OBRIGATÓRIO
 * 
 * Exemplo:
 * - GET /api/pcg-ncm-rules/fiscal-flags?ncm_code=27101251
 *   → Retorna: {
 *       success: true,
 *       data: {
 *         pcgCode: "G-1000",
 *         pcgName: "Custo Gerencial Diesel",
 *         flags: {
 *           pisCofinsMono: true,
 *           icmsSt: false,
 *           icmsDif: false,
 *           ipiSuspenso: false,
 *           importacao: false
 *         },
 *         matchType: "EXACT"
 *       }
 *     }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { organizationId } = getTenantContext();
    const { searchParams } = new URL(request.url);
    const ncmCode = searchParams.get("ncm_code");

    if (!ncmCode) {
      return NextResponse.json(
        { 
          error: "Query parameter 'ncm_code' é obrigatório",
          usage: "/api/pcg-ncm-rules/fiscal-flags?ncm_code=27101251",
        },
        { status: 400 }
      );
    }

    // Valida formato NCM (8 dígitos)
    const cleanNcm = ncmCode.replace(/\D/g, "");
    if (cleanNcm.length !== 8) {
      return NextResponse.json(
        { 
          error: "NCM deve ter 8 dígitos",
          received: ncmCode,
          cleaned: cleanNcm,
        },
        { status: 400 }
      );
    }

    const flags = await getFiscalFlagsByNcm(cleanNcm, organizationId);

    if (!flags) {
      return NextResponse.json({
        success: true,
        data: null,
        message: `NCM ${cleanNcm} não encontrado nas regras configuradas`,
        suggestion: "Configure uma regra em /api/admin/pcg-ncm-rules (POST)",
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        pcgId: flags.pcgId,
        pcgCode: flags.pcgCode,
        pcgName: flags.pcgName,
        ncmCode: flags.ncmCode,
        ncmDescription: flags.ncmDescription,
        flags: flags.flags,
        matchType: flags.matchType,
        priority: flags.priority,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro em /api/pcg-ncm-rules/fiscal-flags:", error);
    return NextResponse.json(
      { 
        error: error.message || "Erro interno ao buscar flags fiscais",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

