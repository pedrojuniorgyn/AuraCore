/**
 * 💰 GENERATE RECEIVABLE TITLE USE CASE
 * 
 * Application use case orchestrating receivable title generation
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 */

import { Result } from "@/shared/domain";
import { ILogger } from "@/shared/infrastructure";
import {
  FinancialTitleGenerator,
  GenerateReceivableInput,
  TitleGenerationOutput,
} from "../../domain/services/FinancialTitleGenerator";
import { FinancialTitleError } from "../../domain/errors";
import { IUseCase } from "@/shared/application/IUseCase";

export class GenerateReceivableTitleUseCase
  implements IUseCase<GenerateReceivableInput, TitleGenerationOutput, FinancialTitleError>
{
  constructor(
    private readonly financialTitleGenerator: FinancialTitleGenerator,
    private readonly logger: ILogger
  ) {}

  async execute(
    input: GenerateReceivableInput
  ): Promise<Result<TitleGenerationOutput, FinancialTitleError>> {
    this.logger.info(
      `Gerando Conta a Receber para documento fiscal ${input.fiscalDocumentId}`
    );

    const result = await this.financialTitleGenerator.generateReceivable(input);

    if (result.isSuccess) {
      this.logger.info(
        `Conta a Receber #${result.value.titleId} gerada com sucesso - R$ ${result.value.amount.toFixed(2)}`
      );
    } else {
      this.logger.error(
        `Erro ao gerar Conta a Receber: ${result.error.message}`
      );
    }

    return result;
  }
}

