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

import { Result } from "@/shared/domain";
import { ILogger } from "@/shared/infrastructure";
import {
  FinancialTitleGenerator,
  GeneratePayableInput as DomainGeneratePayableInput,
  TitleGenerationOutput,
} from "../../domain/services/FinancialTitleGenerator";
import { FinancialTitleError } from "../../domain/errors";
import type {
  IGeneratePayableTitle,
  GeneratePayableTitleInput,
  GeneratePayableTitleOutput,
  ExecutionContext,
} from "../../domain/ports/input";

export class GeneratePayableTitleUseCase implements IGeneratePayableTitle {
  constructor(
    private readonly financialTitleGenerator: FinancialTitleGenerator,
    private readonly logger: ILogger
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

