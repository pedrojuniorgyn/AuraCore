import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculateTax, calculateIcmsValue } from "@/services/fiscal/tax-calculator";

/**
 * GET /api/fiscal/tax-matrix/calculate?originUf=SP&destUf=RJ&regime=NORMAL&serviceValue=1000
 * Calcula ICMS e CFOP para uma rota específica
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

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

    // Buscar regra fiscal
    const taxInfo = await calculateTax({
      organizationId,
      originUf,
      destinationUf: destUf,
      regime,
    });

    // Se foi passado o valor do serviço, calcular ICMS
    let icmsCalculation;
    if (serviceValue) {
      icmsCalculation = calculateIcmsValue(
        parseFloat(serviceValue),
        taxInfo
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        route: `${originUf} → ${destUf}`,
        regime,
        taxInfo,
        icmsCalculation: icmsCalculation || null,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao calcular imposto:", error);
    
    // Se for erro de matriz não configurada, retornar erro específico
    if (error.message.includes("não configurada")) {
      return NextResponse.json(
        {
          error: error.message,
          suggestion: "Configure a matriz tributária para esta rota em /fiscal/matriz-tributaria",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao calcular imposto", details: error.message },
      { status: 500 }
    );
  }
}










