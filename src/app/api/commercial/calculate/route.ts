/**
 * API: Calcular/Simular Frete
 * POST /api/commercial/calculate
 */

import { NextRequest, NextResponse } from "next/server";
import { calculateFreight } from "@/services/pricing/freight-calculator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      organizationId = 1,
      customerId,
      realWeight,
      volume,
      invoiceValue,
      originState,
      destinationState,
      transportType = "LTL_FRACIONADO",
    } = body;

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

    // Calcular frete
    const result = await calculateFreight({
      organizationId,
      customerId,
      realWeight: Number(realWeight),
      volume: volume ? Number(volume) : undefined,
      invoiceValue: Number(invoiceValue),
      originState,
      destinationState,
      transportType,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      calculation: result,
    });
  } catch (error: any) {
    console.error("❌ Erro ao calcular frete:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao calcular frete" },
      { status: 500 }
    );
  }
}




















