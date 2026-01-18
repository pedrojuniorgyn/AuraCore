/**
 * 💰 FINANCIAL MODULE - DEPENDENCY INJECTION
 * 
 * Dependency injection configuration for the Financial module
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 * Atualizado: E7.22.2 P3 - Migração para DI container com tsyringe
 */

import { container } from 'tsyringe';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { DrizzleFinancialTitleRepository } from "../persistence/DrizzleFinancialTitleRepository";
import { FinancialTitleGenerator } from "../../domain/services/FinancialTitleGenerator";
import {
  GeneratePayableTitleUseCase,
  GenerateReceivableTitleUseCase,
  ReverseTitlesUseCase,
} from "../../application/use-cases";
import { ConsoleLogger } from "@/shared/infrastructure/logging/ConsoleLogger";
import type { IGeneratePayableTitle } from '../../domain/ports/input/IGeneratePayableTitle';
import type { IGenerateReceivableTitle } from '../../domain/ports/input/IGenerateReceivableTitle';

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

/**
 * Initialize Financial Module DI Container
 * 
 * Registra todos os Use Cases, Services e Repositories no container tsyringe
 * 
 * @see E7.22.2 P3 - Migração para DI container
 */
export function initializeFinancialModule(): void {
  // Repositories
  container.registerSingleton(
    TOKENS.FinancialTitleRepository,
    DrizzleFinancialTitleRepository
  );
  
  // Domain Services
  container.registerSingleton(
    TOKENS.FinancialTitleGenerator,
    FinancialTitleGenerator
  );
  
  // Use Cases
  container.registerSingleton<IGeneratePayableTitle>(
    TOKENS.GeneratePayableTitleUseCase,
    GeneratePayableTitleUseCase
  );
  
  container.registerSingleton<IGenerateReceivableTitle>(
    TOKENS.GenerateReceivableTitleUseCase,
    GenerateReceivableTitleUseCase
  );
  
  container.registerSingleton(
    TOKENS.ReverseTitlesUseCase,
    ReverseTitlesUseCase
  );
}
