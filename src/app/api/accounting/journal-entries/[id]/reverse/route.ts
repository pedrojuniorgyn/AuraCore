import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Result } from "@/shared/domain";
import { ReverseJournalEntryUseCase } from "@/modules/accounting/application/use-cases";
import { JournalEntryGenerator } from "@/modules/accounting/domain/services";
import { createJournalEntryRepository } from "@/modules/accounting/infrastructure/persistence";

/**
 * 🔄 POST /api/accounting/journal-entries/:id/reverse
 * 
 * Reverter lançamento contábil
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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const journalEntryId = BigInt(resolvedParams.id);
    const userId = session.user.id;

    // DDD: Instanciar Use Case com dependências
    const repository = createJournalEntryRepository();
    const domainService = new JournalEntryGenerator();
    const useCase = new ReverseJournalEntryUseCase(domainService, repository);

    // Executar Use Case
    const result = await useCase.execute({
      journalEntryId,
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
      message: "Lançamento contábil revertido com sucesso",
      journalEntryId: Number(result.value.journalEntryId),
      status: result.value.status,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao reverter:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
