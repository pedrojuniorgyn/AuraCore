/**
 * 💰 FINANCIAL MODULE - DEPENDENCY INJECTION
 * 
 * Dependency injection configuration for the Financial module
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 * Atualizado: E7.22.2 P3 - Migração para DI container com tsyringe
 * Atualizado: Onda 7.2 - Adicionados Receivables Use Cases
 */

import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { DrizzleFinancialTitleRepository } from "../persistence/DrizzleFinancialTitleRepository";
import { FinancialTitleGenerator } from "../../application/services/FinancialTitleGenerator";
import {
  GeneratePayableTitleUseCase,
  GenerateReceivableTitleUseCase,
  ReverseTitlesUseCase,
  CreateReceivableUseCase,
  GetReceivableByIdUseCase,
  ListReceivablesUseCase,
  CancelReceivableUseCase,
  ReceivePaymentUseCase,
} from "../../application/use-cases";
import { ConsoleLogger } from "@/shared/infrastructure/logging/ConsoleLogger";
import type { IGeneratePayableTitle } from '../../domain/ports/input/IGeneratePayableTitle';
import type { IGenerateReceivableTitle } from '../../domain/ports/input/IGenerateReceivableTitle';
import { DrizzleReceivableRepository } from '../persistence/DrizzleReceivableRepository';

// Gateways (E9 Fase 2)
import { BillingPdfAdapter } from '../adapters/BillingPdfAdapter';
import type { IBillingPdfGateway } from '../../domain/ports/output/IBillingPdfGateway';
import { BoletoAdapter } from '../adapters/BoletoAdapter';
import type { IBoletoGateway } from '../../domain/ports/output/IBoletoGateway';
import { CnabAdapter } from '../adapters/CnabAdapter';
import type { ICnabGateway } from '../../domain/ports/output/ICnabGateway';

// Tokens locais (E9 Fase 2)
export const FINANCIAL_TOKENS = {
  BillingPdfGateway: Symbol.for('IBillingPdfGateway'),
  BoletoGateway: Symbol.for('IBoletoGateway'),
  CnabGateway: Symbol.for('ICnabGateway'),
};

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
 * @see Onda 7.2 - Receivables Use Cases
 */
export function initializeFinancialModule(): void {
  // Repositories
  container.registerSingleton(
    TOKENS.FinancialTitleRepository,
    DrizzleFinancialTitleRepository
  );
  
  container.registerSingleton(
    'IReceivableRepository',
    DrizzleReceivableRepository
  );
  
  // Application Services (com @injectable)
  container.registerSingleton(
    TOKENS.FinancialTitleGenerator,
    FinancialTitleGenerator
  );
  
  // Title Use Cases
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
  
  // Receivable Use Cases
  container.registerSingleton(CreateReceivableUseCase);
  container.registerSingleton(GetReceivableByIdUseCase);
  container.registerSingleton(ListReceivablesUseCase);
  container.registerSingleton(CancelReceivableUseCase);
  container.registerSingleton(ReceivePaymentUseCase);
  
  // Gateways (E9 Fase 2)
  container.registerSingleton<IBillingPdfGateway>(
    FINANCIAL_TOKENS.BillingPdfGateway,
    BillingPdfAdapter
  );
  container.registerSingleton<IBoletoGateway>(
    FINANCIAL_TOKENS.BoletoGateway,
    BoletoAdapter
  );
  container.registerSingleton<ICnabGateway>(
    FINANCIAL_TOKENS.CnabGateway,
    CnabAdapter
  );
  
  console.log('[Financial Module] DI configured - Receivables Use Cases + 3 Gateways');
}
