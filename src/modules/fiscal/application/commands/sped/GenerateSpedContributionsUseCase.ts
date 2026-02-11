/**
 * Use Case: Geração de SPED Contribuições (PIS/COFINS)
 */

import { createHash } from 'crypto';
import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type {
  IGenerateSpedContributions,
  GenerateSpedContributionsInput,
  GenerateSpedContributionsOutput,
} from '@/modules/fiscal/domain/ports/input/IGenerateSpedContributions';
import type { ExecutionContext } from '@/modules/fiscal/domain/ports/input/IGenerateSpedFiscal';
import type {
  ISpedDataRepository,
  SpedContributionsPeriod,
} from '@/modules/fiscal/domain/ports/output/ISpedDataRepository';
import type {
  SpedContributionsInput,
  SpedContributionsData,
  CompanyDataContrib,
  CteContrib,
  NFeContrib,
  TaxTotalsContrib,
} from '@/modules/fiscal/domain/services/SpedContributionsGenerator';
import { SpedContributionsGenerator } from '@/modules/fiscal/domain/services/SpedContributionsGenerator';

@injectable()
export class GenerateSpedContributionsUseCase implements IGenerateSpedContributions {
  private readonly generator: SpedContributionsGenerator;

  constructor(
    @inject('ISpedDataRepository') private readonly repository: ISpedDataRepository
  ) {
    this.generator = new SpedContributionsGenerator();
  }

  async execute(
    input: GenerateSpedContributionsInput,
    context: ExecutionContext
  ): Promise<Result<GenerateSpedContributionsOutput, string>> {
    const competencia = input.competencia.trim();
    if (!/^\d{6}$/.test(competencia)) {
      return Result.fail('Competência deve estar no formato MMAAAA');
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

    const periodResult = this.parseCompetencia(competencia, input.finalidade, context.organizationId);
    if (Result.isFail(periodResult)) {
      return Result.fail(periodResult.error);
    }

    const orgResult = await this.repository.getOrganization(periodResult.value.organizationId);
    if (Result.isFail(orgResult)) {
      return Result.fail(`Erro ao buscar organização: ${orgResult.error.message}`);
    }

    const companyData: CompanyDataContrib = {
      document: orgResult.value.document,
    };

    const ctesResult = await this.repository.getCtesForContributions(periodResult.value);
    if (Result.isFail(ctesResult)) {
      return Result.fail(`Erro ao buscar CTes: ${ctesResult.error.message}`);
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

    const nfesResult = await this.repository.getNFesEntradaForContributions(periodResult.value);
    if (Result.isFail(nfesResult)) {
      return Result.fail(`Erro ao buscar NFes de entrada: ${nfesResult.error.message}`);
    }

    const nfesEntrada: NFeContrib[] = nfesResult.value.map((nfe) => ({
      documentNumber: nfe.documentNumber,
      accessKey: nfe.accessKey,
      issueDate: nfe.issueDate,
      partnerDocument: nfe.partnerDocument,
      netAmount: nfe.netAmount,
      cfop: nfe.cfop,
    }));

    const totalsResult = await this.repository.getTaxTotalsContributions(periodResult.value);
    if (Result.isFail(totalsResult)) {
      return Result.fail(`Erro ao buscar totais de PIS/COFINS: ${totalsResult.error.message}`);
    }

    const taxTotals: TaxTotalsContrib = {
      baseDebito: totalsResult.value.baseDebito,
      baseCredito: totalsResult.value.baseCredito,
    };

    const contributionsData: SpedContributionsData = {
      company: companyData,
      ctes,
      nfesEntrada,
      taxTotals,
    };

    const generatorInput: SpedContributionsInput = {
      organizationId: context.organizationId,
      branchId: context.branchId,
      referenceMonth: periodResult.value.referenceMonth,
      referenceYear: periodResult.value.referenceYear,
      finality: periodResult.value.finality,
    };

    const result = this.generator.generate(generatorInput, contributionsData);
    if (Result.isFail(result)) {
      return Result.fail(result.error);
    }

    const document = result.value;
    const content = document.toFileContent();
    const totalRegistros = content.split('\n').filter((line) => line.trim()).length;

    return Result.ok({
      content,
      filename: `SPED_CONTRIBUICOES_${competencia}.txt`,
      hash: this.calculateHash(content),
      totalRegistros,
      geradoEm: new Date(),
    });
  }

  private parseCompetencia(
    competencia: string,
    finalidade: GenerateSpedContributionsInput['finalidade'],
    organizationId: number
  ): Result<SpedContributionsPeriod, string> {
    const referenceMonth = Number(competencia.slice(0, 2));
    const referenceYear = Number(competencia.slice(2));

    if (referenceMonth < 1 || referenceMonth > 12) {
      return Result.fail('Competência inválida: mês deve estar entre 01 e 12');
    }

    if (referenceYear < 2000 || referenceYear > 2100) {
      return Result.fail('Competência inválida: ano deve estar entre 2000 e 2100');
    }

    const mappedFinality = finalidade === 'ORIGINAL' ? 'ORIGINAL' : 'SUBSTITUTION';

    return Result.ok({
      organizationId: BigInt(organizationId),
      referenceMonth,
      referenceYear,
      finality: mappedFinality,
    });
  }

  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}
