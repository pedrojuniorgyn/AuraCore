/**
 * Journal Entry Generator - Domain Service
 * 
 * Lógica pura de geração de lançamentos contábeis (Partidas Dobradas)
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 4/8 - accounting-engine.ts → JournalEntryGenerator
 */

import { Result } from "@/shared/domain";
import { Money } from "@/shared/domain";
import { JournalLine } from "../value-objects/JournalLine";
import type { FiscalDocumentItem, ChartAccount } from "../ports/IJournalEntryRepository";
import {
  SyntheticAccountError,
  UnbalancedEntryError,
  AccountingError,
} from "../errors";

export interface GenerateJournalLinesInput {
  items: FiscalDocumentItem[];
  counterpartAccount: ChartAccount;
  totalAmount: number;
  validateAccount: (accountId: bigint) => Promise<Result<ChartAccount, Error>>;
  getAnalyticalAccounts: (parentAccountId: bigint) => Promise<Result<ChartAccount[], Error>>;
}

export interface GenerateJournalLinesOutput {
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
}

/**
 * Domain Service: Geração de lançamentos contábeis
 * 
 * Responsabilidades:
 * - Validar contas contábeis (analíticas vs sintéticas)
 * - Gerar linhas de débito (itens do documento)
 * - Gerar linha de crédito (contrapartida)
 * - Validar balanceamento (Débitos = Créditos)
 */
export class JournalEntryGenerator {
  /**
   * Gera linhas de lançamento contábil a partir de documento fiscal
   * 
   * Regra: Partidas Dobradas
   * - DÉBITO: Contas de Custo/Despesa/Ativo (itens do documento)
   * - CRÉDITO: Fornecedores a Pagar (compra) ou Clientes a Receber (venda)
   */
  async generateJournalLines(
    input: GenerateJournalLinesInput
  ): Promise<Result<GenerateJournalLinesOutput, Error>> {
    try {
      const lines: JournalLine[] = [];
      let lineNumber = 1;
      let totalDebit = 0;

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // DÉBITOS: Uma linha por item (agrupado por plano de contas)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      for (const item of input.items) {
        if (!item.chartAccountId) {
          continue; // Pular itens sem conta contábil
        }

        // 1. Validar se conta é analítica
        const accountResult = await input.validateAccount(item.chartAccountId);

        if (Result.isFail(accountResult)) {
          return Result.fail(accountResult.error);
        }

        const account = accountResult.value;

        // 2. Bloquear lançamento em conta sintética
        if (!account.isAnalytical) {
          const analyticalAccountsResult = await input.getAnalyticalAccounts(account.id);

          if (Result.isFail(analyticalAccountsResult)) {
            return Result.fail(analyticalAccountsResult.error);
          }

          const analyticalAccounts = analyticalAccountsResult.value;

          throw new SyntheticAccountError(
            account.code,
            account.name,
            analyticalAccounts.map(a => ({ code: a.code, name: a.name }))
          );
        }

        // 3. Criar linha de DÉBITO
        const amountResult = Money.create(item.netAmount, 'BRL');

        if (Result.isFail(amountResult)) {
          return Result.fail(new Error(`Erro ao criar Money: ${amountResult.error}`));
        }

        const lineResult = JournalLine.create({
          lineNumber,
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          type: 'DEBIT',
          amount: amountResult.value,
          description: item.chartAccountName || account.name,
        });

        if (Result.isFail(lineResult)) {
          return Result.fail(lineResult.error);
        }

        lines.push(lineResult.value);
        totalDebit += item.netAmount;
        lineNumber++;
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // CRÉDITO: Contrapartida (Fornecedores ou Clientes)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      const creditAmountResult = Money.create(input.totalAmount, 'BRL');

      if (Result.isFail(creditAmountResult)) {
        return Result.fail(new Error(`Erro ao criar Money: ${creditAmountResult.error}`));
      }

      const creditLineResult = JournalLine.create({
        lineNumber,
        accountId: input.counterpartAccount.id,
        accountCode: input.counterpartAccount.code,
        accountName: input.counterpartAccount.name,
        type: 'CREDIT',
        amount: creditAmountResult.value,
        description: input.counterpartAccount.name,
      });

      if (Result.isFail(creditLineResult)) {
        return Result.fail(creditLineResult.error);
      }

      lines.push(creditLineResult.value);
      const totalCredit = input.totalAmount;

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // VALIDAÇÃO: Balanceamento (Débitos = Créditos)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new UnbalancedEntryError(totalDebit, totalCredit);
      }

      return Result.ok({
        lines,
        totalDebit,
        totalCredit,
      });
    } catch (error) {
      if (error instanceof AccountingError) {
        return Result.fail(error);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new Error(`Erro ao gerar linhas de lançamento: ${errorMessage}`));
    }
  }

  /**
   * Valida se lançamento pode ser revertido
   */
  canReverse(status: string): Result<boolean, Error> {
    if (status === 'REVERSED') {
      return Result.fail(new Error("Lançamento já foi revertido"));
    }

    if (status === 'CANCELLED') {
      return Result.fail(new Error("Lançamento cancelado não pode ser revertido"));
    }

    return Result.ok(true);
  }
}

