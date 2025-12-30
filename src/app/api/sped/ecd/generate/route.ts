import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateSpedECD } from "@/services/sped-ecd-generator";

/**
 * POST /api/sped/ecd/generate
 * Gera arquivo ECD (Escrituração Contábil Digital)
 * 
 * Body: { year: 2024, bookType: "G" }
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { year, bookType = "G" } = body;

    if (!year) {
      return NextResponse.json(
        { error: "year é obrigatório" },
        { status: 400 }
      );
    }

    const config = {
      organizationId: BigInt(session.user.organizationId),
      referenceYear: parseInt(year),
      bookType,
    };

    console.log(`📄 Gerando ECD ${year}...`);

    const ecdContent = await generateSpedECD(config);

    const fileName = `ECD_${config.referenceYear}.txt`;

    return new NextResponse(ecdContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao gerar ECD:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}


























