/**
 * 💰 GENERATE PAYABLE TITLE USE CASE
 * 
 * Application use case orchestrating payable title generation
 * 
 * Implementa IGeneratePayableTitle (Input Port)
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 * 
 * @see ARCH-010: Use Cases implementam Input Ports
 */

import { injectable, inject } from 'tsyringe';
import { Result } from "@/shared/domain";
import type { ILogger } from "@/shared/infrastructure";
import { ConsoleLogger } from "@/shared/infrastructure/logging/ConsoleLogger";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import {
  FinancialTitleGenerator,
  GeneratePayableInput as DomainGeneratePayableInput,
  TitleGenerationOutput,
} from "../services/FinancialTitleGenerator";
import { FinancialTitleError } from "../../domain/errors";
import type {
  IGeneratePayableTitle,
  GeneratePayableTitleInput,
  GeneratePayableTitleOutput,
  ExecutionContext,
} from "../../domain/ports/input";

@injectable()
export class GeneratePayableTitleUseCase implements IGeneratePayableTitle {
  constructor(
    @inject(TOKENS.FinancialTitleGenerator) private readonly financialTitleGenerator: FinancialTitleGenerator,
    @inject(TOKENS.Logger) private readonly logger: ConsoleLogger
  ) {}

  async execute(
    input: GeneratePayableTitleInput,
    ctx: ExecutionContext
  ): Promise<Result<GeneratePayableTitleOutput, string>> {
    this.logger.info(
      `Gerando títulos a pagar para conta ${input.payableId}`
    );

    // Adaptar input para Domain Service
    // TODO: Ajustar quando refatorar FinancialTitleGenerator
    const domainInput = {
      fiscalDocumentId: input.payableId, // Temporário
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
    } as unknown as DomainGeneratePayableInput;

    const result = await this.financialTitleGenerator.generatePayable(domainInput);

    if (result.isSuccess) {
      this.logger.info(
        `Títulos gerados com sucesso para conta ${input.payableId}`
      );
      
      return Result.ok({
        payableId: input.payableId,
        titleIds: [String(result.value.titleId)],
        titlesCount: 1,
      });
    } else {
      const errorMessage = result.error instanceof FinancialTitleError 
        ? result.error.message 
        : String(result.error);
      this.logger.error(`Erro ao gerar títulos: ${errorMessage}`);
      return Result.fail(errorMessage);
    }
  }
}

