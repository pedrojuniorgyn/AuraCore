/**
 * API: FISCAL FLAGS BY NCM
 * 
 * GET /api/pcg-ncm-rules/fiscal-flags
 * Busca flags fiscais de um NCM específico.
 * 
 * @since E9 Fase 2 - Migrado para IPcgNcmGateway via DI
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantContext } from "@/lib/auth/context";
import { container } from "@/shared/infrastructure/di/container";
import { FISCAL_TOKENS } from "@/modules/fiscal/infrastructure/di/FiscalModule";
import type { IPcgNcmGateway } from "@/modules/fiscal/domain/ports/output/IPcgNcmGateway";
import { Result } from "@/shared/domain";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { organizationId, branchId } = await getTenantContext();
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

    // Resolver gateway via DI
    const pcgNcmGateway = container.resolve<IPcgNcmGateway>(
      FISCAL_TOKENS.PcgNcmGateway
    );

    const result = await pcgNcmGateway.getFiscalFlagsByNcm({
      ncm: cleanNcm,
      organizationId,
      branchId,
    });

    if (Result.isFail(result)) {
      return NextResponse.json(
        { 
          error: result.error,
          details: process.env.NODE_ENV === "development" ? result.error : undefined,
        },
        { status: 500 }
      );
    }

    const flags = result.value;

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro em /api/pcg-ncm-rules/fiscal-flags:", error);
    return NextResponse.json(
      { 
        error: errorMessage || "Erro interno ao buscar flags fiscais",
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}
