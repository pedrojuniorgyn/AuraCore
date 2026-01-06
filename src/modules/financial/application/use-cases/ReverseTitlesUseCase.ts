/**
 * 💰 REVERSE TITLES USE CASE
 * 
 * Application use case orchestrating title reversal (soft delete)
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 */

import { Result } from "@/shared/domain";
import { ILogger } from "@/shared/infrastructure";
import {
  FinancialTitleGenerator,
  ReverseTitlesInput,
} from "../../domain/services/FinancialTitleGenerator";
import { FinancialTitleError } from "../../domain/errors";
import { IUseCase } from "@/shared/application/IUseCase";

export class ReverseTitlesUseCase
  implements IUseCase<ReverseTitlesInput, void, FinancialTitleError>
{
  constructor(
    private readonly financialTitleGenerator: FinancialTitleGenerator,
    private readonly logger: ILogger
  ) {}

  async execute(
    input: ReverseTitlesInput
  ): Promise<Result<void, FinancialTitleError>> {
    this.logger.info(
      `Revertendo títulos do documento fiscal ${input.fiscalDocumentId}`
    );

    const result = await this.financialTitleGenerator.reverseTitles(input);

    if (result.isSuccess) {
      this.logger.info(
        `Títulos do documento #${input.fiscalDocumentId} revertidos com sucesso`
      );
    } else {
      this.logger.error(`Erro ao reverter títulos: ${result.error.message}`);
    }

    return result;
  }
}

