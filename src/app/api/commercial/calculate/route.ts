/**
 * API: Calcular/Simular Frete
 * POST /api/commercial/calculate
 * 
 * @since E9 Fase 1 - Migrado para IFreightCalculatorGateway via DI
 * @since E9 Bug Fix - Adicionada validação de tenant (SECURITY)
 */

import { NextRequest, NextResponse } from "next/server";
import { container } from "@/shared/infrastructure/di/container";
import { TMS_TOKENS } from "@/modules/tms/infrastructure/di/TmsModule";
import type { IFreightCalculatorGateway } from "@/modules/tms/domain/ports/output/IFreightCalculatorGateway";
import { Result } from "@/shared/domain";
import { getTenantContext } from "@/lib/auth/context";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const POST = withDI(async (request: NextRequest) => {
  try {
    // SECURITY: Validar tenant antes de qualquer operação
    const ctx = await getTenantContext();
    
    const body = await request.json();
    
    const {
      customerId,
      realWeight,
      volume,
      invoiceValue,
      originState,
      destinationState,
      transportType = "LTL_FRACIONADO",
    } = body;
    
    // Usar IDs do usuário autenticado (NUNCA do body)
    const organizationId = ctx.organizationId;
    const branchId = ctx.branchId ?? 1;

    // Validações
    if (!realWeight || realWeight <= 0) {
      return NextResponse.json(
        { error: "Peso real é obrigatório e deve ser maior que zero" },
        { status: 400 }
      );
    }

    if (!invoiceValue || invoiceValue <= 0) {
      return NextResponse.json(
        { error: "Valor da nota fiscal é obrigatório" },
        { status: 400 }
      );
    }

    // Resolver gateway via DI
    const freightCalculator = container.resolve<IFreightCalculatorGateway>(
      TMS_TOKENS.FreightCalculatorGateway
    );

    // Calcular frete via Gateway
    const result = await freightCalculator.calculate({
      organizationId,
      branchId,
      customerId,
      realWeight: Number(realWeight),
      volume: volume ? Number(volume) : undefined,
      invoiceValue: Number(invoiceValue),
      originState,
      destinationState,
      transportType,
    });

    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      calculation: result.value,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao calcular frete:", error);
    return NextResponse.json(
      { error: errorMessage || "Falha ao calcular frete" },
      { status: 500 }
    );
  }
});
