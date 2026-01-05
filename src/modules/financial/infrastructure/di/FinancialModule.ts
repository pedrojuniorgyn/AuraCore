/**
 * 💰 FINANCIAL MODULE - DEPENDENCY INJECTION
 * 
 * Dependency injection configuration for the Financial module
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 */

import { DrizzleFinancialTitleRepository } from "../persistence/DrizzleFinancialTitleRepository";
import { FinancialTitleGenerator } from "../../domain/services/FinancialTitleGenerator";
import {
  GeneratePayableTitleUseCase,
  GenerateReceivableTitleUseCase,
  ReverseTitlesUseCase,
} from "../../application/use-cases";
import { ConsoleLogger } from "@/shared/infrastructure/logging/ConsoleLogger";

/**
 * Factory: Create Financial Title Repository
 */
export function createFinancialTitleRepository(): DrizzleFinancialTitleRepository {
  return new DrizzleFinancialTitleRepository();
}

/**
 * Factory: Create Financial Title Generator (Domain Service)
 */
export function createFinancialTitleGenerator(): FinancialTitleGenerator {
  const repository = createFinancialTitleRepository();
  return new FinancialTitleGenerator(repository);
}

/**
 * Factory: Create Generate Payable Title Use Case
 */
export function createGeneratePayableTitleUseCase(): GeneratePayableTitleUseCase {
  const generator = createFinancialTitleGenerator();
  const logger = new ConsoleLogger();
  return new GeneratePayableTitleUseCase(generator, logger);
}

/**
 * Factory: Create Generate Receivable Title Use Case
 */
export function createGenerateReceivableTitleUseCase(): GenerateReceivableTitleUseCase {
  const generator = createFinancialTitleGenerator();
  const logger = new ConsoleLogger();
  return new GenerateReceivableTitleUseCase(generator, logger);
}

/**
 * Factory: Create Reverse Titles Use Case
 */
export function createReverseTitlesUseCase(): ReverseTitlesUseCase {
  const generator = createFinancialTitleGenerator();
  const logger = new ConsoleLogger();
  return new ReverseTitlesUseCase(generator, logger);
}
