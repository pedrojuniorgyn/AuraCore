/**
 * 💰 REVERSE TITLES USE CASE
 * 
 * Application use case orchestrating title reversal (soft delete)
 * 
 * Implementa IReverseTitles (Input Port)
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 * 
 * @see ARCH-010: Use Cases implementam Input Ports
 */

import { Result } from "@/shared/domain";
import { ILogger } from "@/shared/infrastructure";
import {
  FinancialTitleGenerator,
  ReverseTitlesInput as DomainReverseTitlesInput,
} from "../../domain/services/FinancialTitleGenerator";
import { FinancialTitleError } from "../../domain/errors";
import type {
  IReverseTitles,
  ReverseTitlesInput,
  ReverseTitlesOutput,
  ExecutionContext,
} from "../../domain/ports/input";

export class ReverseTitlesUseCase implements IReverseTitles {
  constructor(
    private readonly financialTitleGenerator: FinancialTitleGenerator,
    private readonly logger: ILogger
  ) {}

  async execute(
    input: ReverseTitlesInput,
    ctx: ExecutionContext
  ): Promise<Result<ReverseTitlesOutput, string>> {
    this.logger.info(
      `Revertendo ${input.titleIds.length} títulos - Motivo: ${input.reason}`
    );

    // Adaptar input para Domain Service
    // TODO: Ajustar quando refatorar FinancialTitleGenerator
    const domainInput = {
      fiscalDocumentId: input.titleIds[0] || '', // Temporário
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      reason: input.reason,
    } as unknown as DomainReverseTitlesInput;

    const result = await this.financialTitleGenerator.reverseTitles(domainInput);

    if (result.isSuccess) {
      this.logger.info(
        `Títulos revertidos com sucesso`
      );
      
      return Result.ok({
        reversedTitleIds: input.titleIds,
        count: input.titleIds.length,
        journalEntryIds: [], // TODO: Retornar IDs dos lançamentos contábeis
      });
    } else {
      const errorMessage = result.error instanceof FinancialTitleError 
        ? result.error.message 
        : String(result.error);
      this.logger.error(`Erro ao reverter títulos: ${errorMessage}`);
      return Result.fail(errorMessage);
    }
  }
}

