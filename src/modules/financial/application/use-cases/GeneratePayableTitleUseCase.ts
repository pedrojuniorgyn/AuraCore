/**
 * 💰 GENERATE PAYABLE TITLE USE CASE
 * 
 * Application use case orchestrating payable title generation
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 */

import { Result } from "@/shared/domain";
import { ILogger } from "@/shared/infrastructure";
import {
  FinancialTitleGenerator,
  GeneratePayableInput,
  TitleGenerationOutput,
} from "../../domain/services/FinancialTitleGenerator";
import { FinancialTitleError } from "../../domain/errors";
import { IUseCase } from "@/shared/application/IUseCase";

export class GeneratePayableTitleUseCase
  implements IUseCase<GeneratePayableInput, TitleGenerationOutput>
{
  constructor(
    private readonly financialTitleGenerator: FinancialTitleGenerator,
    private readonly logger: ILogger
  ) {}

  async execute(
    input: GeneratePayableInput
  ): Promise<Result<TitleGenerationOutput, FinancialTitleError>> {
    this.logger.info(
      `Gerando Conta a Pagar para documento fiscal ${input.fiscalDocumentId}`
    );

    const result = await this.financialTitleGenerator.generatePayable(input);

    if (result.isSuccess) {
      this.logger.info(
        `Conta a Pagar #${result.value.titleId} gerada com sucesso - R$ ${result.value.amount.toFixed(2)}`
      );
    } else {
      this.logger.error(
        `Erro ao gerar Conta a Pagar: ${result.error.message}`
      );
    }

    return result;
  }
}

