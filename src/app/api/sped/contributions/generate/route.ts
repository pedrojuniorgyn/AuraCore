import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateSpedContributions } from "@/services/sped-contributions-generator";

/**
 * POST /api/sped/contributions/generate
 * Gera arquivo SPED Contribuições (PIS/COFINS)
 * 
 * Body: { month: 12, year: 2024 }
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

    console.log(`📄 Gerando SPED Contribuições ${month}/${year}...`);

    const spedContent = await generateSpedContributions(config);

    const fileName = `SPED_CONTRIBUICOES_${config.referenceMonth.toString().padStart(2, '0')}_${config.referenceYear}.txt`;

    return new NextResponse(spedContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao gerar SPED Contribuições:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}


















