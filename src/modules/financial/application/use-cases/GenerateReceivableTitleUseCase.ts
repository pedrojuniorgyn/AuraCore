/**
 * 💰 GENERATE RECEIVABLE TITLE USE CASE
 * 
 * Application use case orchestrating receivable title generation
 * 
 * Implementa IGenerateReceivableTitle (Input Port)
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 * 
 * @see ARCH-010: Use Cases implementam Input Ports
 */

import { Result } from "@/shared/domain";
import { ILogger } from "@/shared/infrastructure";
import {
  FinancialTitleGenerator,
  GenerateReceivableInput as DomainGenerateReceivableInput,
  TitleGenerationOutput,
} from "../../domain/services/FinancialTitleGenerator";
import { FinancialTitleError } from "../../domain/errors";
import type {
  IGenerateReceivableTitle,
  GenerateReceivableTitleInput,
  GenerateReceivableTitleOutput,
  ExecutionContext,
} from "../../domain/ports/input";

export class GenerateReceivableTitleUseCase implements IGenerateReceivableTitle {
  constructor(
    private readonly financialTitleGenerator: FinancialTitleGenerator,
    private readonly logger: ILogger
  ) {}

  async execute(
    input: GenerateReceivableTitleInput,
    ctx: ExecutionContext
  ): Promise<Result<GenerateReceivableTitleOutput, string>> {
    this.logger.info(
      `Gerando títulos a receber para conta ${input.receivableId}`
    );

    // Adaptar input para Domain Service
    // TODO: Ajustar quando refatorar FinancialTitleGenerator
    const domainInput = {
      fiscalDocumentId: input.receivableId, // Temporário
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
    } as unknown as DomainGenerateReceivableInput;

    const result = await this.financialTitleGenerator.generateReceivable(domainInput);

    if (result.isSuccess) {
      this.logger.info(
        `Títulos gerados com sucesso para conta ${input.receivableId}`
      );
      
      return Result.ok({
        receivableId: input.receivableId,
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

