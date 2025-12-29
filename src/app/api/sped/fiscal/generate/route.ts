import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateSpedFiscal, validateSpedData } from "@/services/sped-fiscal-generator";

/**
 * POST /api/sped/fiscal/generate
 * Gera arquivo SPED Fiscal (EFD-ICMS/IPI)
 * 
 * Body: { month: 12, year: 2024, finality: "ORIGINAL" }
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { month, year, finality = "ORIGINAL" } = body;

    if (!month || !year) {
      return NextResponse.json(
        { error: "month e year são obrigatórios" },
        { status: 400 }
      );
    }

    const config = {
      organizationId: BigInt(session.user.organizationId),
      referenceMonth: parseInt(month),
      referenceYear: parseInt(year),
      finality,
    };

    // Validar dados antes de gerar
    const validation = await validateSpedData(config);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: "Dados inválidos para geração do SPED",
          details: validation.errors 
        },
        { status: 400 }
      );
    }

    console.log(`📄 Gerando SPED Fiscal ${month}/${year}...`);

    const spedContent = await generateSpedFiscal(config);

    // Gerar nome do arquivo
    const fileName = `SPED_FISCAL_${config.referenceMonth.toString().padStart(2, '0')}_${config.referenceYear}.txt`;

    return new NextResponse(spedContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao gerar SPED Fiscal:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
























