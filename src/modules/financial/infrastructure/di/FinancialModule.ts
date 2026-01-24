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
  const reg = (name: string, fn: () => void) => {
    try { fn(); } catch (e) { console.error(`[Financial] ❌ ${name}:`, e); throw e; }
  };
  
  // Repositories
  reg('DrizzleFinancialTitleRepository', () => container.registerSingleton(TOKENS.FinancialTitleRepository, DrizzleFinancialTitleRepository));
  reg('DrizzleReceivableRepository', () => container.registerSingleton('IReceivableRepository', DrizzleReceivableRepository));
  
  // Application Services
  reg('FinancialTitleGenerator', () => container.registerSingleton(TOKENS.FinancialTitleGenerator, FinancialTitleGenerator));
  
  // Title Use Cases
  reg('GeneratePayableTitleUseCase', () => container.registerSingleton<IGeneratePayableTitle>(TOKENS.GeneratePayableTitleUseCase, GeneratePayableTitleUseCase));
  reg('GenerateReceivableTitleUseCase', () => container.registerSingleton<IGenerateReceivableTitle>(TOKENS.GenerateReceivableTitleUseCase, GenerateReceivableTitleUseCase));
  reg('ReverseTitlesUseCase', () => container.registerSingleton(TOKENS.ReverseTitlesUseCase, ReverseTitlesUseCase));
  
  // Receivable Use Cases
  reg('CreateReceivableUseCase', () => container.registerSingleton(CreateReceivableUseCase));
  reg('GetReceivableByIdUseCase', () => container.registerSingleton(GetReceivableByIdUseCase));
  reg('ListReceivablesUseCase', () => container.registerSingleton(ListReceivablesUseCase));
  reg('CancelReceivableUseCase', () => container.registerSingleton(CancelReceivableUseCase));
  reg('ReceivePaymentUseCase', () => container.registerSingleton(ReceivePaymentUseCase));
  
  // Gateways
  reg('BillingPdfAdapter', () => container.registerSingleton<IBillingPdfGateway>(FINANCIAL_TOKENS.BillingPdfGateway, BillingPdfAdapter));
  reg('BoletoAdapter', () => container.registerSingleton<IBoletoGateway>(FINANCIAL_TOKENS.BoletoGateway, BoletoAdapter));
  reg('CnabAdapter', () => container.registerSingleton<ICnabGateway>(FINANCIAL_TOKENS.CnabGateway, CnabAdapter));
  
  console.log('[Financial Module] DI configured - Receivables Use Cases + 3 Gateways');
}
