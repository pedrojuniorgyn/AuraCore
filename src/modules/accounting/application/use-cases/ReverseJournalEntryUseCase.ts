/**
 * Reverse Journal Entry Use Case
 * 
 * Orquestra a reversão de lançamento contábil
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 4/8 - accounting-engine.ts → JournalEntryGenerator
 */

import { Result } from "@/shared/domain";
import { JournalEntryGenerator } from "@/modules/accounting/domain/services";
import type { IJournalEntryRepository } from "@/modules/accounting/domain/ports";
import { AccountingError } from "@/modules/accounting/domain/errors";

export interface ReverseJournalEntryInput {
  journalEntryId: bigint;
  organizationId: bigint;
  branchId: number;
  userId: string;
}

export interface ReverseJournalEntryOutput {
  journalEntryId: bigint;
  status: string;
}

/**
 * Use Case: Reverter Lançamento Contábil
 * 
 * Fluxo:
 * 1. Buscar lançamento contábil
 * 2. Validar se pode ser revertido (Domain Service)
 * 3. Reverter lançamento
 * 4. Atualizar status do documento fiscal
 */
export class ReverseJournalEntryUseCase {
  constructor(
    private readonly journalEntryGenerator: JournalEntryGenerator,
    private readonly repository: IJournalEntryRepository
  ) {}

  async execute(
    input: ReverseJournalEntryInput
  ): Promise<Result<ReverseJournalEntryOutput, Error>> {
    try {
      // 1. Buscar lançamento contábil (com validação de organizationId)
      const entryResult = await this.repository.getJournalEntryById(
        input.journalEntryId,
        input.organizationId
      );

      if (Result.isFail(entryResult)) {
        return Result.fail(entryResult.error);
      }

      const entry = entryResult.value;

      if (!entry) {
        return Result.fail(new Error("Lançamento contábil não encontrado ou acesso negado"));
      }

      // Validação de multi-tenancy (branchId)
      if (entry.branchId !== BigInt(input.branchId)) {
        return Result.fail(new Error("Acesso negado: lançamento pertence a outra filial"));
      }

      // 2. Validar se pode ser revertido (Domain Service)
      const canReverseResult = this.journalEntryGenerator.canReverse(entry.status);

      if (Result.isFail(canReverseResult)) {
        return Result.fail(canReverseResult.error);
      }

      // 3. Reverter lançamento
      const reverseResult = await this.repository.reverseJournalEntry(
        input.journalEntryId,
        input.userId
      );

      if (Result.isFail(reverseResult)) {
        return Result.fail(reverseResult.error);
      }

      console.log(`✅ Lançamento contábil #${input.journalEntryId} revertido`);

      return Result.ok({
        journalEntryId: input.journalEntryId,
        status: 'REVERSED',
      });
    } catch (error) {
      if (error instanceof AccountingError) {
        return Result.fail(error);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao reverter lançamento: ${errorMessage}`));
    }
  }
}
