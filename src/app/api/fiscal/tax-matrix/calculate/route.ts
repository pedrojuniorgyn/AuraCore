/**
 * GET /api/fiscal/tax-matrix/calculate
 * Calcula ICMS e CFOP para uma rota específica
 * 
 * @since E9 Fase 2 - Migrado para ITaxCalculatorGateway via DI
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { container } from "@/shared/infrastructure/di/container";
import { FISCAL_TOKENS } from "@/modules/fiscal/infrastructure/di/FiscalModule";
import type { ITaxCalculatorGateway } from "@/modules/fiscal/domain/ports/output/ITaxCalculatorGateway";
import { Result } from "@/shared/domain";
import { withDI } from '@/shared/infrastructure/di/with-di';

import { logger } from '@/shared/infrastructure/logging';

export const GET = withDI(async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const branchId = session.user.defaultBranchId || 1;

    const { searchParams } = new URL(req.url);
    const originUf = searchParams.get("originUf");
    const destUf = searchParams.get("destUf");
    const regime = searchParams.get("regime") || "NORMAL";
    const serviceValue = searchParams.get("serviceValue");

    if (!originUf || !destUf) {
      return NextResponse.json(
        { error: "Parâmetros originUf e destUf são obrigatórios" },
        { status: 400 }
      );
    }

    // Resolver gateway via DI
    const taxCalculator = container.resolve<ITaxCalculatorGateway>(
      FISCAL_TOKENS.TaxCalculatorGateway
    );

    // Buscar regra fiscal
    const taxResult = await taxCalculator.calculateTax({
      organizationId,
      branchId,
      originUf,
      destinationUf: destUf,
      regime,
    });

    if (Result.isFail(taxResult)) {
      const errorMessage = taxResult.error;
      if (errorMessage.includes("não configurada")) {
        return NextResponse.json(
          {
            error: errorMessage,
            suggestion: "Configure a matriz tributária para esta rota em /fiscal/matriz-tributaria",
          },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Erro ao calcular imposto", details: errorMessage },
        { status: 500 }
      );
    }

    const taxInfo = taxResult.value;

    // Se foi passado o valor do serviço, calcular ICMS
    let icmsCalculation = null;
    if (serviceValue) {
      const icmsResult = taxCalculator.calculateIcmsValue({
        value: parseFloat(serviceValue),
        taxInfo: taxInfo,
      });
      if (!Result.isFail(icmsResult)) {
        icmsCalculation = icmsResult.value;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        route: `${originUf} → ${destUf}`,
        regime,
        taxInfo,
        icmsCalculation,
      },
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao calcular imposto:", error);
    return NextResponse.json(
      { error: "Erro ao calcular imposto", details: errorMessage },
      { status: 500 }
    );
  }
});
