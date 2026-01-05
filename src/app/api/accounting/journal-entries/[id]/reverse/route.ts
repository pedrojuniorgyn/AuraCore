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
    
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const journalEntryId = BigInt(resolvedParams.id);
    const userId = session.user.id;
    
    // Validar organizationId antes de converter para BigInt
    const rawOrgId = session.user.organizationId;
    if (!rawOrgId || isNaN(Number(rawOrgId))) {
      return NextResponse.json(
        { success: false, error: 'organizationId inválido ou ausente' },
        { status: 400 }
      );
    }
    const organizationId = BigInt(rawOrgId);

    // DDD: Instanciar Use Case com dependências
    const repository = createJournalEntryRepository();
    const domainService = new JournalEntryGenerator();
    const useCase = new ReverseJournalEntryUseCase(domainService, repository);

    // Executar Use Case
    const result = await useCase.execute({
      journalEntryId,
      organizationId,
      userId,
    });

    if (Result.isFail(result)) {
      const errorMessage = result.error instanceof Error 
        ? result.error.message 
        : typeof result.error === 'string'
          ? result.error
          : 'Erro desconhecido ao reverter lançamento contábil';
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lançamento contábil revertido com sucesso",
      journalEntryId: result.value.journalEntryId.toString(), // BigInt → string para preservar precisão
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
