import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Result } from "@/shared/domain";
import { GenerateJournalEntryUseCase } from "@/modules/accounting/application/use-cases";
import { JournalEntryGenerator } from "@/modules/accounting/domain/services";
import { createJournalEntryRepository } from "@/modules/accounting/infrastructure/persistence";

/**
 * 📊 POST /api/accounting/journal-entries/:id/post
 * 
 * Contabilizar documento fiscal (gerar lançamento)
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 4/8 - accounting-engine.ts → JournalEntryGenerator
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const fiscalDocumentId = BigInt(resolvedParams.id);
    const userId = session.user.id;
    const organizationId = BigInt(session.user.organizationId);

    // DDD: Instanciar Use Case com dependências
    const repository = createJournalEntryRepository();
    const domainService = new JournalEntryGenerator();
    const useCase = new GenerateJournalEntryUseCase(domainService, repository);

    // Executar Use Case
    const result = await useCase.execute({
      fiscalDocumentId,
      organizationId,
      userId,
    });

    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lançamento contábil gerado com sucesso",
      journalEntryId: result.value.journalEntryId.toString(), // BigInt → string para preservar precisão
      totalDebit: result.value.totalDebit,
      totalCredit: result.value.totalCredit,
      lines: result.value.linesCount,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao contabilizar:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
