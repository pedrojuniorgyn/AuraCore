/**
 * 📄 GENERATE SPED CONTRIBUTIONS USE CASE
 * 
 * Orchestrates the generation of SPED Contributions (EFD-Contribuições PIS/COFINS) files
 * 
 * Responsibilities:
 * - Validate input parameters
 * - Fetch fiscal data from repository (CTes, NFes, tax totals)
 * - Call domain service to generate SPED document
 * - Handle errors and return Result
 * 
 * @epic E7.13 - Services → DDD/Hexagonal
 * @layer Application
 */

import { Result } from '@/shared/domain';
import {
  SpedContributionsGenerator,
  SpedContributionsInput,
  SpedContributionsData,
  CompanyDataContrib,
  CteContrib,
  NFeContrib,
  TaxTotalsContrib,
} from '../../../domain/services/SpedContributionsGenerator';
import { SpedDocument } from '../../../domain/value-objects';
import { SpedError } from '../../../domain/errors/SpedError';
import {
  ISpedDataRepository,
  SpedContributionsPeriod,
} from '../../../domain/ports/output/ISpedDataRepository';

// ==========================================
// INPUT DTO
// ==========================================

export interface GenerateSpedContributionsInput {
  organizationId: number;
  branchId: number;
  referenceMonth: number; // 1-12
  referenceYear: number;
  finality: 'ORIGINAL' | 'SUBSTITUTION';
}

// ==========================================
// USE CASE
// ==========================================

export class GenerateSpedContributionsUseCase {
  constructor(
    private readonly repository: ISpedDataRepository,
    private readonly generator: SpedContributionsGenerator
  ) {}

  async execute(input: GenerateSpedContributionsInput): Promise<Result<SpedDocument, SpedError>> {
    try {
      // Validar input
      const validationResult = this.validateInput(input);
      if (Result.isFail(validationResult)) {
        return validationResult;
      }

      // Preparar período
      const period: SpedContributionsPeriod = {
        organizationId: BigInt(input.organizationId),
        referenceMonth: input.referenceMonth,
        referenceYear: input.referenceYear,
        finality: input.finality,
      };

      // Buscar dados da organização
      const orgResult = await this.repository.getOrganization(period.organizationId);
      if (Result.isFail(orgResult)) {
        return Result.fail(new SpedError(`Erro ao buscar organização: ${orgResult.error.message}`));
      }

      const companyData: CompanyDataContrib = {
        document: orgResult.value.document,
      };

      // Buscar CTes (receitas - documentos de saída)
      const ctesResult = await this.repository.getCtesForContributions(period);
      if (Result.isFail(ctesResult)) {
        return Result.fail(new SpedError(`Erro ao buscar CTes: ${ctesResult.error.message}`));
      }

      const ctes: CteContrib[] = ctesResult.value.map((cte) => ({
        cteNumber: cte.cteNumber,
        accessKey: cte.accessKey,
        issueDate: cte.issueDate,
        customerDocument: cte.customerDocument,
        cfop: cte.cfop,
        totalAmount: cte.totalAmount,
        icmsAmount: cte.icmsAmount,
      }));

      // Buscar NFes de entrada (créditos)
      const nfesResult = await this.repository.getNFesEntradaForContributions(period);
      if (Result.isFail(nfesResult)) {
        return Result.fail(new SpedError(`Erro ao buscar NFes de entrada: ${nfesResult.error.message}`));
      }

      const nfesEntrada: NFeContrib[] = nfesResult.value.map((nfe) => ({
        documentNumber: nfe.documentNumber,
        accessKey: nfe.accessKey,
        issueDate: nfe.issueDate,
        partnerDocument: nfe.partnerDocument,
        netAmount: nfe.netAmount,
        cfop: nfe.cfop,
      }));

      // Buscar totais de PIS/COFINS
      const totalsResult = await this.repository.getTaxTotalsContributions(period);
      if (Result.isFail(totalsResult)) {
        return Result.fail(new SpedError(`Erro ao buscar totais de PIS/COFINS: ${totalsResult.error.message}`));
      }

      const taxTotals: TaxTotalsContrib = {
        baseDebito: totalsResult.value.baseDebito,
        baseCredito: totalsResult.value.baseCredito,
      };

      // Preparar dados para o generator
      const contributionsData: SpedContributionsData = {
        company: companyData,
        ctes,
        nfesEntrada,
        taxTotals,
      };

      // Preparar input para o generator
      const generatorInput: SpedContributionsInput = {
        organizationId: input.organizationId,
        branchId: input.branchId,
        referenceMonth: input.referenceMonth,
        referenceYear: input.referenceYear,
        finality: input.finality,
      };

      // Gerar documento SPED
      const result = this.generator.generate(generatorInput, contributionsData);
      
      // Converter Result<SpedDocument, string> para Result<SpedDocument, SpedError>
      if (Result.isFail(result)) {
        return Result.fail(new SpedError(result.error));
      }
      
      return Result.ok(result.value);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(new SpedError(`Erro ao gerar SPED Contributions: ${errorMessage}`));
    }
  }

  private validateInput(input: GenerateSpedContributionsInput): Result<void, SpedError> {
    if (!input.organizationId || input.organizationId <= 0) {
      return Result.fail(new SpedError('organizationId inválido'));
    }

    if (!input.branchId || input.branchId <= 0) {
      return Result.fail(new SpedError('branchId inválido'));
    }

    if (!input.referenceMonth || input.referenceMonth < 1 || input.referenceMonth > 12) {
      return Result.fail(new SpedError('referenceMonth inválido. Deve estar entre 1 e 12'));
    }

    if (!input.referenceYear || input.referenceYear < 2000 || input.referenceYear > 2100) {
      return Result.fail(new SpedError('referenceYear inválido. Deve estar entre 2000 e 2100'));
    }

    if (!input.finality || !['ORIGINAL', 'SUBSTITUTION'].includes(input.finality)) {
      return Result.fail(new SpedError('finality inválido. Use "ORIGINAL" ou "SUBSTITUTION"'));
    }

    return Result.ok(undefined);
  }
}

