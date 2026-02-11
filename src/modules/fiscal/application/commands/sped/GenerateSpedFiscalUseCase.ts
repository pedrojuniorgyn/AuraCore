/**
 * Use Case: Geração de SPED Fiscal
 *
 * Orquestra a geração do arquivo SPED Fiscal (EFD-ICMS/IPI)
 * delegando a lógica de negócio para o Domain Service.
 */

import { createHash } from 'crypto';
import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type {
  IGenerateSpedFiscal,
  GenerateSpedFiscalInput,
  GenerateSpedFiscalOutput,
  ExecutionContext,
} from '@/modules/fiscal/domain/ports/input/IGenerateSpedFiscal';
import type {
  ISpedDataRepository,
  SpedFiscalPeriod,
} from '@/modules/fiscal/domain/ports/output/ISpedDataRepository';
import { SpedFiscalGenerator } from '@/modules/fiscal/domain/services/SpedFiscalGenerator';

@injectable()
export class GenerateSpedFiscalUseCase implements IGenerateSpedFiscal {
  private readonly generator: SpedFiscalGenerator;

  constructor(
    @inject('ISpedDataRepository') private readonly repository: ISpedDataRepository
  ) {
    this.generator = new SpedFiscalGenerator(repository);
  }

  async execute(
    input: GenerateSpedFiscalInput,
    context: ExecutionContext
  ): Promise<Result<GenerateSpedFiscalOutput, string>> {
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

    const generateResult = await this.generator.generate({
      period: periodResult.value,
    });

    if (Result.isFail(generateResult)) {
      return Result.fail(generateResult.error);
    }

    const document = generateResult.value;
    const content = document.toFileContent();
    const totalRegistros = content.split('\n').filter((line) => line.trim()).length;

    return Result.ok({
      content,
      filename: `SPED_FISCAL_${competencia}.txt`,
      hash: this.calculateHash(content),
      totalRegistros,
      geradoEm: new Date(),
    });
  }

  private parseCompetencia(
    competencia: string,
    finalidade: GenerateSpedFiscalInput['finalidade'],
    organizationId: number
  ): Result<SpedFiscalPeriod, string> {
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
