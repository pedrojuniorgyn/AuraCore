import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { branches, fiscalSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { ISefazGateway } from "@/modules/integrations/domain/ports/output/ISefazGateway";
import { Result } from "@/shared/domain";

/**
 * POST /api/fiscal/cte/inutilize
 * 🔐 Requer permissão: fiscal.cte.create
 * 
 * Inutiliza numeração de CTe na Sefaz
 * 
 * @since E8 Fase 2.4 - Migrado para DI
 */
export async function POST(request: NextRequest) {
  return withPermission(request, "fiscal.cte.create", async (user, ctx) => {
    try {
      const body = await request.json();
      const { serie, numberFrom, numberTo, year, justification } = body;

      // Validações
      if (!serie || !numberFrom || !numberTo || !year || !justification) {
        return NextResponse.json(
          { error: "Todos os campos são obrigatórios" },
          { status: 400 }
        );
      }

      if (justification.length < 15) {
        return NextResponse.json(
          { error: "Justificativa deve ter no mínimo 15 caracteres" },
          { status: 400 }
        );
      }

      if (numberFrom > numberTo) {
        return NextResponse.json(
          { error: "Número inicial deve ser menor que o final" },
          { status: 400 }
        );
      }

      // Validação de multi-tenancy
      if (!ctx.branchId) {
        return NextResponse.json(
          { error: "branchId é obrigatório para inutilização de CTe" },
          { status: 400 }
        );
      }

      // 1. Buscar dados da filial (CNPJ e UF)
      const [branch] = await db
        .select()
        .from(branches)
        .where(eq(branches.id, ctx.branchId));

      if (!branch) {
        return NextResponse.json(
          { error: "Filial não encontrada" },
          { status: 404 }
        );
      }

      if (!branch.document) {
        return NextResponse.json(
          { error: "Filial sem CNPJ cadastrado" },
          { status: 400 }
        );
      }

      // 2. Buscar ambiente
      const [settings] = await db
        .select()
        .from(fiscalSettings)
        .where(
          and(
            eq(fiscalSettings.organizationId, ctx.organizationId),
            eq(fiscalSettings.branchId, ctx.branchId)
          )
        );

      const environment = settings?.cteEnvironment === "production" ? "production" : "homologation";

      // 3. Inutilizar via ISefazGateway (DI)
      const sefazGateway = container.resolve<ISefazGateway>(TOKENS.SefazGateway);
      
      const inutResult = await sefazGateway.inutilizeCte({
        year: parseInt(year, 10),
        series: parseInt(serie, 10),
        startNumber: parseInt(numberFrom, 10),
        endNumber: parseInt(numberTo, 10),
        justification,
        cnpj: branch.document.replace(/\D/g, ''),
        environment,
        uf: branch.state || 'SP', // UF da filial
      });

      if (Result.isFail(inutResult)) {
        return NextResponse.json(
          {
            success: false,
            error: "Falha ao inutilizar",
            message: inutResult.error,
          },
          { status: 422 }
        );
      }

      const resultado = inutResult.value;

      return NextResponse.json({
        success: true,
        message: "Numeração inutilizada com sucesso!",
        data: {
          protocol: resultado.protocolNumber,
          inutilizationDate: resultado.inutilizationDate,
          status: resultado.status,
          message: resultado.message,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Erro ao inutilizar:", error);
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  });
}
