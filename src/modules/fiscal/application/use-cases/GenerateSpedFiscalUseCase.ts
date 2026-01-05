/**
 * 📄 GENERATE SPED FISCAL USE CASE
 * 
 * Application use case orchestrating SPED Fiscal file generation
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 */

import { Result } from "@/shared/domain";
import { ILogger } from "@/shared/infrastructure";
import {
  SpedFiscalGenerator,
  GenerateSpedFiscalInput,
} from "../../domain/services/SpedFiscalGenerator";
import { SpedDocument } from "../../domain/value-objects";
import { SpedError } from "../../domain/errors";
import { IUseCase } from "@/shared/application/IUseCase";

export class GenerateSpedFiscalUseCase
  implements IUseCase<GenerateSpedFiscalInput, SpedDocument>
{
  constructor(
    private readonly generator: SpedFiscalGenerator,
    private readonly logger: ILogger
  ) {}

  async execute(
    input: GenerateSpedFiscalInput
  ): Promise<Result<SpedDocument, SpedError>> {
    const { period } = input;

    this.logger.info(
      `Gerando SPED Fiscal para org ${period.organizationId} período ${period.referenceMonth}/${period.referenceYear}`
    );

    const result = await this.generator.generate(input);

    if (result.isSuccess) {
      this.logger.info(
        `SPED Fiscal gerado com sucesso - ${result.value.totalLines} linhas, ${result.value.blockCount} blocos`
      );
    } else {
      this.logger.error(
        `Erro ao gerar SPED Fiscal: ${result.error.message}`
      );
    }

    return result;
  }
}

