/**
 * Use Case: Geração de SPED ECD
 */

import { createHash } from 'crypto';
import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type {
  IGenerateSpedEcd,
  GenerateSpedEcdInput,
  GenerateSpedEcdOutput,
} from '@/modules/fiscal/domain/ports/input/IGenerateSpedEcd';
import type { ExecutionContext } from '@/modules/fiscal/domain/ports/input/IGenerateSpedFiscal';
import type {
  ISpedDataRepository,
  SpedEcdPeriod,
} from '@/modules/fiscal/domain/ports/ISpedDataRepository';
import type {
  SpedEcdInput,
  SpedEcdData,
  CompanyData,
  ChartAccount,
  JournalEntryData,
  JournalEntryLine,
  AccountBalance,
} from '@/modules/fiscal/domain/services/SpedEcdGenerator';
import { SpedEcdGenerator } from '@/modules/fiscal/domain/services/SpedEcdGenerator';

@injectable()
export class GenerateSpedEcdUseCase implements IGenerateSpedEcd {
  private readonly generator: SpedEcdGenerator;

  constructor(
    @inject('ISpedDataRepository') private readonly repository: ISpedDataRepository
  ) {
    this.generator = new SpedEcdGenerator();
  }

  async execute(
    input: GenerateSpedEcdInput,
    context: ExecutionContext
  ): Promise<Result<GenerateSpedEcdOutput, string>> {
    if (!Number.isFinite(input.anoExercicio) || input.anoExercicio < 2000 || input.anoExercicio > 2100) {
      return Result.fail('Ano de exercício inválido');
    }

    if (input.finalidade !== 'ORIGINAL') {
      const hashRetificado = input.hashRetificado?.trim();
      if (!hashRetificado) {
        return Result.fail('Hash do arquivo retificado é obrigatório para retificações');
      }
    }

    const userId = context.userId.trim();
    if (!userId) {
      return Result.fail('Contexto inválido: userId é obrigatório');
    }

    if (!Number.isFinite(context.organizationId) || context.organizationId <= 0) {
      return Result.fail('Contexto inválido: organizationId é obrigatório');
    }

    if (!Number.isFinite(context.branchId) || context.branchId <= 0) {
      return Result.fail('Contexto inválido: branchId é obrigatório');
    }

    const bookType: 'G' | 'R' = 'G';
    const period: SpedEcdPeriod = {
      organizationId: BigInt(context.organizationId),
      referenceYear: input.anoExercicio,
      bookType,
    };

    const orgResult = await this.repository.getOrganization(period.organizationId);
    if (Result.isFail(orgResult)) {
      return Result.fail(`Erro ao buscar organização: ${orgResult.error.message}`);
    }

    const companyData: CompanyData = {
      document: orgResult.value.document,
      name: orgResult.value.name,
    };

    const accountsResult = await this.repository.getChartOfAccounts(period);
    if (Result.isFail(accountsResult)) {
      return Result.fail(`Erro ao buscar plano de contas: ${accountsResult.error.message}`);
    }

    const accounts: ChartAccount[] = accountsResult.value.map((acc) => ({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      parentCode: acc.parentCode,
      isAnalytical: acc.isAnalytical,
    }));

    const entriesResult = await this.repository.getJournalEntries(period);
    if (Result.isFail(entriesResult)) {
      return Result.fail(`Erro ao buscar lançamentos: ${entriesResult.error.message}`);
    }

    const journalEntriesMap = new Map<string, { entry: JournalEntryData; lines: JournalEntryLine[] }>();

    for (const entryData of entriesResult.value) {
      const linesResult = await this.repository.getJournalEntryLines(entryData.id, period);
      if (Result.isFail(linesResult)) {
        return Result.fail(`Erro ao buscar linhas do lançamento ${entryData.id}: ${linesResult.error.message}`);
      }

      const entry: JournalEntryData = {
        id: entryData.id,
        entryNumber: entryData.entryNumber,
        entryDate: entryData.entryDate,
        description: entryData.description,
      };

      const lines: JournalEntryLine[] = linesResult.value.map((line) => ({
        lineNumber: line.lineNumber,
        accountCode: line.accountCode,
        debitAmount: line.debitAmount,
        creditAmount: line.creditAmount,
        description: line.description,
      }));

      journalEntriesMap.set(entryData.id, { entry, lines });
    }

    const balancesResult = await this.repository.getAccountBalances(period);
    if (Result.isFail(balancesResult)) {
      return Result.fail(`Erro ao buscar saldos: ${balancesResult.error.message}`);
    }

    const balances: AccountBalance[] = balancesResult.value.map((bal) => ({
      code: bal.code,
      totalDebit: bal.totalDebit,
      totalCredit: bal.totalCredit,
    }));

    const ecdData: SpedEcdData = {
      company: companyData,
      accounts,
      journalEntries: journalEntriesMap,
      balances,
    };

    const generatorInput: SpedEcdInput = {
      organizationId: context.organizationId,
      branchId: context.branchId,
      referenceYear: input.anoExercicio,
      bookType,
    };

    const result = this.generator.generate(generatorInput, ecdData);
    if (Result.isFail(result)) {
      return Result.fail(result.error);
    }

    const document = result.value;
    const content = document.toFileContent();
    const totalRegistros = content.split('\n').filter((line) => line.trim()).length;

    return Result.ok({
      content,
      filename: `SPED_ECD_${input.anoExercicio}.txt`,
      hash: this.calculateHash(content),
      totalRegistros,
      geradoEm: new Date(),
    });
  }

  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}
