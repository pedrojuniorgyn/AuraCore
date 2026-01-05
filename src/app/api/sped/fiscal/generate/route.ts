import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createGenerateSpedFiscalUseCase } from "@/modules/fiscal/infrastructure/di/FiscalModule";

/**
 * POST /api/sped/fiscal/generate
 * Gera arquivo SPED Fiscal (EFD-ICMS/IPI)
 * 
 * Body: { month: 12, year: 2024, finality: "ORIGINAL" }
 * 
 * Épico: E7.13 - Migrated to DDD/Hexagonal Architecture
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

    // Validar organizationId antes de converter para BigInt
    const rawOrgId = session.user.organizationId;
    if (!rawOrgId || isNaN(Number(rawOrgId))) {
      return NextResponse.json(
        { error: 'organizationId inválido ou ausente' },
        { status: 400 }
      );
    }

    console.log(`📄 Gerando SPED Fiscal ${month}/${year}...`);

    // DDD: Instanciar Use Case com dependências
    const useCase = createGenerateSpedFiscalUseCase();

    // Executar Use Case
    const result = await useCase.execute({
      period: {
        organizationId: BigInt(rawOrgId),
        referenceMonth: parseInt(month),
        referenceYear: parseInt(year),
        finality,
      },
    });

    // Processar resultado
    if (result.isFailure) {
      const errorMessage = result.error instanceof Error 
        ? result.error.message 
        : typeof result.error === 'string'
          ? result.error
          : 'Erro desconhecido ao gerar SPED Fiscal';
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    // Obter conteúdo do documento SPED como Buffer (ISO-8859-1)
    const spedBuffer = result.value.toBuffer();

    // Gerar nome do arquivo
    const fileName = `SPED_FISCAL_${String(month).padStart(2, '0')}_${year}.txt`;

    return new NextResponse(spedBuffer, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=ISO-8859-1",
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































