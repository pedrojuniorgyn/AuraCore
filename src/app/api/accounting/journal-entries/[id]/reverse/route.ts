import { NextRequest, NextResponse } from "next/server";
import { container } from '@/shared/infrastructure/di/container';
import { auth } from "@/lib/auth";
import { Result } from "@/shared/domain";
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IReverseJournalEntry, ReverseJournalEntryOutput } from "@/modules/accounting/domain/ports/input";

/**
 * 🔄 POST /api/accounting/journal-entries/:id/reverse
 *
 * Reverter lançamento contábil
 *
 * @epic E7.23 - Input Ports Accounting Module
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
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
    const journalEntryId = resolvedParams.id;
    const userId = session.user.id;

    // Validar organizationId
    const rawOrgId = session.user.organizationId;
    if (!rawOrgId || isNaN(Number(rawOrgId))) {
      return NextResponse.json(
        { success: false, error: 'organizationId inválido ou ausente' },
        { status: 400 }
      );
    }
    const organizationId = Number(rawOrgId);

    // Validar branchId (multi-tenancy)
    const branchId = session.user.defaultBranchId;
    if (!branchId) {
      return NextResponse.json(
        { success: false, error: 'branchId obrigatório' },
        { status: 400 }
      );
    }

    // Parse body para obter motivo
    const body = await request.json();
    const reason = body.reason || 'Estorno solicitado pelo usuário';

    // DI: Resolver Use Case via container
    const useCase = container.resolve<IReverseJournalEntry>(
      TOKENS.ReverseJournalEntryUseCase
    );

    // Executar Use Case com novo padrão
    const result = await useCase.execute(
      {
        journalEntryId,
        reason,
        reversalDate: body.reversalDate,
      },
      {
        userId,
        organizationId,
        branchId,
        isAdmin: session.user.role === 'ADMIN',
      }
    );

    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const output: ReverseJournalEntryOutput = result.value;

    return NextResponse.json({
      success: true,
      message: "Lançamento contábil revertido com sucesso",
      originalEntryId: output.originalEntryId,
      reversalEntryId: output.reversalEntryId,
      reversalEntryNumber: output.reversalEntryNumber,
      status: output.status,
      reversedAt: output.reversedAt,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao reverter:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
