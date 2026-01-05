/**
 * Generate Journal Entry Use Case
 * 
 * Orquestra a geração de lançamento contábil a partir de documento fiscal
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 4/8 - accounting-engine.ts → JournalEntryGenerator
 */

import { Result } from "@/shared/domain";
import { JournalEntryGenerator } from "@/modules/accounting/domain/services";
import type { IJournalEntryRepository } from "@/modules/accounting/domain/ports";
import {
  DocumentAlreadyPostedError,
  AccountingError,
} from "@/modules/accounting/domain/errors";

export interface GenerateJournalEntryInput {
  fiscalDocumentId: bigint;
  organizationId: bigint;
  userId: string;
}

export interface GenerateJournalEntryOutput {
  journalEntryId: bigint;
  totalDebit: number;
  totalCredit: number;
  linesCount: number;
}

/**
 * Use Case: Gerar Lançamento Contábil
 * 
 * Fluxo:
 * 1. Buscar documento fiscal
 * 2. Validar se já foi contabilizado
 * 3. Buscar itens categorizados
 * 4. Buscar conta de contrapartida
 * 5. Gerar linhas de lançamento (Domain Service)
 * 6. Persistir lançamento e linhas
 * 7. Atualizar status do documento
 */
export class GenerateJournalEntryUseCase {
  constructor(
    private readonly journalEntryGenerator: JournalEntryGenerator,
    private readonly repository: IJournalEntryRepository
  ) {}

  async execute(
    input: GenerateJournalEntryInput
  ): Promise<Result<GenerateJournalEntryOutput, Error>> {
    try {
      // 1. Buscar documento fiscal
      const documentResult = await this.repository.getFiscalDocumentData(
        input.fiscalDocumentId,
        input.organizationId
      );

      if (Result.isFail(documentResult)) {
        return Result.fail(documentResult.error);
      }

      const document = documentResult.value;

      if (!document) {
        return Result.fail(new Error("Documento fiscal não encontrado"));
      }

      // 2. Validar se já foi contabilizado
      if (document.accountingStatus === "POSTED") {
        return Result.fail(new DocumentAlreadyPostedError(document.id));
      }

      // 3. Buscar itens categorizados
      const itemsResult = await this.repository.getFiscalDocumentItems(input.fiscalDocumentId);

      if (Result.isFail(itemsResult)) {
        return Result.fail(itemsResult.error);
      }

      const items = itemsResult.value;

      if (items.length === 0) {
        return Result.fail(new Error("Documento sem itens para contabilizar"));
      }

      // 4. Buscar conta de contrapartida
      const counterpartAccountResult = await this.repository.getCounterpartAccount(
        input.organizationId,
        document.fiscalClassification
      );

      if (Result.isFail(counterpartAccountResult)) {
        return Result.fail(counterpartAccountResult.error);
      }

      const counterpartAccount = counterpartAccountResult.value;

      if (!counterpartAccount) {
        const accountType = document.fiscalClassification === "PURCHASE" 
          ? "Fornecedores (2.1.01%)" 
          : "Clientes (1.1.01%)";
        return Result.fail(new Error(`Conta de contrapartida não encontrada: ${accountType}`));
      }

      // 5. Gerar linhas de lançamento (Domain Service)
      const linesResult = await this.journalEntryGenerator.generateJournalLines({
        items,
        counterpartAccount,
        totalAmount: document.netAmount,
        validateAccount: async (accountId) => {
          const result = await this.repository.getChartAccountById(accountId, input.organizationId);
          if (Result.isFail(result)) {
            return Result.fail(result.error);
          }
          if (!result.value) {
            return Result.fail(new Error(`Conta contábil ${accountId} não encontrada`));
          }
          return Result.ok(result.value);
        },
        getAnalyticalAccounts: async (parentAccountId) => {
          return this.repository.getAnalyticalAccounts(parentAccountId, input.organizationId);
        },
      });

      if (Result.isFail(linesResult)) {
        return Result.fail(linesResult.error);
      }

      const { lines, totalDebit, totalCredit } = linesResult.value;

      // 6. Persistir lançamento principal
      const entryResult = await this.repository.createJournalEntry({
        organizationId: document.organizationId,
        branchId: document.branchId,
        fiscalDocumentId: document.id,
        entryType: 'FISCAL_DOCUMENT',
        entryDate: document.issueDate,
        description: `Lançamento automático - ${document.documentType} ${document.documentNumber}`,
        totalDebit,
        totalCredit,
        status: 'POSTED',
        createdBy: input.userId,
      });

      if (Result.isFail(entryResult)) {
        return Result.fail(entryResult.error);
      }

      const journalEntryId = entryResult.value;

      // 7. Persistir linhas do lançamento
      const linesInsertResult = await this.repository.createJournalEntryLines(journalEntryId, lines);

      if (Result.isFail(linesInsertResult)) {
        return Result.fail(linesInsertResult.error);
      }

      // 8. Atualizar status do documento fiscal
      const updateStatusResult = await this.repository.updateFiscalDocumentAccountingStatus(
        document.id,
        journalEntryId,
        'POSTED'
      );

      if (Result.isFail(updateStatusResult)) {
        return Result.fail(updateStatusResult.error);
      }

      console.log(`✅ Lançamento contábil #${journalEntryId} gerado`);
      console.log(`   Total Débitos: R$ ${totalDebit.toFixed(2)}`);
      console.log(`   Total Créditos: R$ ${totalCredit.toFixed(2)}`);
      console.log(`   Linhas: ${lines.length}`);

      return Result.ok({
        journalEntryId,
        totalDebit,
        totalCredit,
        linesCount: lines.length,
      });
    } catch (error) {
      if (error instanceof AccountingError) {
        return Result.fail(error);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao gerar lançamento contábil: ${errorMessage}`));
    }
  }
}

