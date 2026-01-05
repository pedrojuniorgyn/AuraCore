/**
 * 📄 GENERATE SPED ECD USE CASE
 * 
 * Orchestrates the generation of SPED ECD (Escrituração Contábil Digital) files
 * 
 * Responsibilities:
 * - Validate input parameters
 * - Fetch accounting data from repository
 * - Call domain service to generate SPED document
 * - Handle errors and return Result
 * 
 * @epic E7.13 - Services → DDD/Hexagonal
 * @layer Application
 */

import { Result } from '@/shared/domain';
import {
  SpedEcdGenerator,
  SpedEcdInput,
  SpedEcdData,
  CompanyData,
  ChartAccount,
  JournalEntryData,
  JournalEntryLine,
  AccountBalance,
} from '../../domain/services/SpedEcdGenerator';
import { SpedDocument } from '../../domain/value-objects';
import { SpedError } from '../../domain/errors/SpedError';
import {
  ISpedDataRepository,
  SpedEcdPeriod,
} from '../../domain/ports/ISpedDataRepository';

// ==========================================
// INPUT DTO
// ==========================================

export interface GenerateSpedEcdInput {
  organizationId: number;
  branchId: number;
  referenceYear: number;
  bookType: 'G' | 'R';
}

// ==========================================
// USE CASE
// ==========================================

export class GenerateSpedEcdUseCase {
  constructor(
    private readonly repository: ISpedDataRepository,
    private readonly generator: SpedEcdGenerator
  ) {}

  async execute(input: GenerateSpedEcdInput): Promise<Result<SpedDocument, SpedError>> {
    try {
      // Validar input
      const validationResult = this.validateInput(input);
      if (Result.isFail(validationResult)) {
        return validationResult;
      }

      // Preparar período
      const period: SpedEcdPeriod = {
        organizationId: BigInt(input.organizationId),
        referenceYear: input.referenceYear,
        bookType: input.bookType,
      };

      // Buscar dados da organização
      const orgResult = await this.repository.getOrganization(period.organizationId);
      if (Result.isFail(orgResult)) {
        return Result.fail(new SpedError(`Erro ao buscar organização: ${orgResult.error.message}`));
      }

      const companyData: CompanyData = {
        document: orgResult.value.document,
        name: orgResult.value.name,
      };

      // Buscar plano de contas
      const accountsResult = await this.repository.getChartOfAccounts(period);
      if (Result.isFail(accountsResult)) {
        return Result.fail(new SpedError(`Erro ao buscar plano de contas: ${accountsResult.error.message}`));
      }

      const accounts: ChartAccount[] = accountsResult.value.map((acc) => ({
        code: acc.code,
        name: acc.name,
        type: acc.type,
        parentCode: acc.parentCode,
        isAnalytical: acc.isAnalytical,
      }));

      // Buscar lançamentos contábeis
      const entriesResult = await this.repository.getJournalEntries(period);
      if (Result.isFail(entriesResult)) {
        return Result.fail(new SpedError(`Erro ao buscar lançamentos: ${entriesResult.error.message}`));
      }

      // Buscar linhas de cada lançamento
      const journalEntriesMap = new Map<string, { entry: JournalEntryData; lines: JournalEntryLine[] }>();

      for (const entryData of entriesResult.value) {
        const linesResult = await this.repository.getJournalEntryLines(entryData.id, period);
        if (Result.isFail(linesResult)) {
          return Result.fail(new SpedError(`Erro ao buscar linhas do lançamento ${entryData.id}: ${linesResult.error.message}`));
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

      // Buscar saldos das contas
      const balancesResult = await this.repository.getAccountBalances(period);
      if (Result.isFail(balancesResult)) {
        return Result.fail(new SpedError(`Erro ao buscar saldos: ${balancesResult.error.message}`));
      }

      const balances: AccountBalance[] = balancesResult.value.map((bal) => ({
        code: bal.code,
        totalDebit: bal.totalDebit,
        totalCredit: bal.totalCredit,
      }));

      // Preparar dados para o generator
      const ecdData: SpedEcdData = {
        company: companyData,
        accounts,
        journalEntries: journalEntriesMap,
        balances,
      };

      // Preparar input para o generator
      const generatorInput: SpedEcdInput = {
        organizationId: input.organizationId,
        branchId: input.branchId,
        referenceYear: input.referenceYear,
        bookType: input.bookType,
      };

      // Gerar documento SPED
      return this.generator.generate(generatorInput, ecdData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new SpedError(`Erro ao gerar SPED ECD: ${errorMessage}`));
    }
  }

  private validateInput(input: GenerateSpedEcdInput): Result<void, SpedError> {
    if (!input.organizationId || input.organizationId <= 0) {
      return Result.fail(new SpedError('organizationId inválido'));
    }

    if (!input.branchId || input.branchId <= 0) {
      return Result.fail(new SpedError('branchId inválido'));
    }

    if (!input.referenceYear || input.referenceYear < 2000 || input.referenceYear > 2100) {
      return Result.fail(new SpedError('referenceYear inválido. Deve estar entre 2000 e 2100'));
    }

    if (!input.bookType || !['G', 'R'].includes(input.bookType)) {
      return Result.fail(new SpedError('bookType inválido. Use "G" (Geral) ou "R" (Razão Auxiliar)'));
    }

    return Result.ok(undefined);
  }
}

