/**
 * 💰 FINANCIAL MODULE - DEPENDENCY INJECTION
 * 
 * Dependency injection configuration for the Financial module
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 * Atualizado: E7.22.2 P3 - Migração para DI container com tsyringe
 * Atualizado: Onda 7.2 - Adicionados Receivables Use Cases
 * Atualizado: 2026-01-24 - Adicionado PayableRepository + Payable Use Cases
 */

import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// Repositories
import { DrizzleFinancialTitleRepository } from "../persistence/DrizzleFinancialTitleRepository";
import { DrizzleReceivableRepository } from '../persistence/DrizzleReceivableRepository';
import { DrizzlePayableRepository } from '../persistence/DrizzlePayableRepository';

// Services
import { FinancialTitleGenerator } from "../../application/services/FinancialTitleGenerator";
import { ConsoleLogger } from "@/shared/infrastructure/logging/ConsoleLogger";

// Use Cases - Titles
import { GeneratePayableTitleUseCase } from "../../application/use-cases/GeneratePayableTitleUseCase";
import { GenerateReceivableTitleUseCase } from "../../application/use-cases/GenerateReceivableTitleUseCase";
import { ReverseTitlesUseCase } from "../../application/use-cases/ReverseTitlesUseCase";

// Use Cases - Receivables
import { CreateReceivableUseCase } from "../../application/use-cases/CreateReceivableUseCase";
import { GetReceivableByIdUseCase } from "../../application/use-cases/GetReceivableByIdUseCase";
import { ListReceivablesUseCase } from "../../application/use-cases/ListReceivablesUseCase";
import { CancelReceivableUseCase } from "../../application/use-cases/CancelReceivableUseCase";
import { ReceivePaymentUseCase } from "../../application/use-cases/ReceivePaymentUseCase";

// Use Cases - Payables (TEMPORARIAMENTE COMENTADO - investigar TypeError)
// import { CreatePayableUseCase } from "../../application/use-cases/CreatePayableUseCase";
// import { GetPayableByIdUseCase } from "../../application/use-cases/GetPayableByIdUseCase";
// import { ListPayablesUseCase } from "../../application/use-cases/ListPayablesUseCase";
// import { PayAccountPayableUseCase } from "../../application/use-cases/PayAccountPayableUseCase";
// import { CancelPayableUseCase } from "../../application/use-cases/CancelPayableUseCase";

// Types
import type { IGeneratePayableTitle } from '../../domain/ports/input/IGeneratePayableTitle';
import type { IGenerateReceivableTitle } from '../../domain/ports/input/IGenerateReceivableTitle';
import type { IPayableRepository } from '../../domain/ports/output/IPayableRepository';

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
 * @see 2026-01-24 - Payables Use Cases
 */
export function initializeFinancialModule(): void {
  // ============================================================
  // REPOSITORIES (DEVEM ser registrados PRIMEIRO)
  // ============================================================
  console.log('[Financial] 1/19 DrizzleFinancialTitleRepository');
  container.registerSingleton(TOKENS.FinancialTitleRepository, DrizzleFinancialTitleRepository);
  
  console.log('[Financial] 2/19 DrizzleReceivableRepository');
  container.registerSingleton('IReceivableRepository', DrizzleReceivableRepository);
  
  console.log('[Financial] 3/19 DrizzlePayableRepository');
  container.registerSingleton<IPayableRepository>(TOKENS.PayableRepository, DrizzlePayableRepository);
  
  // ============================================================
  // SERVICES
  // ============================================================
  console.log('[Financial] 4/19 FinancialTitleGenerator');
  container.registerSingleton(TOKENS.FinancialTitleGenerator, FinancialTitleGenerator);
  
  // ============================================================
  // USE CASES - TITLES
  // ============================================================
  console.log('[Financial] 5/19 GeneratePayableTitleUseCase');
  container.registerSingleton<IGeneratePayableTitle>(TOKENS.GeneratePayableTitleUseCase, GeneratePayableTitleUseCase);
  
  console.log('[Financial] 6/19 GenerateReceivableTitleUseCase');
  container.registerSingleton<IGenerateReceivableTitle>(TOKENS.GenerateReceivableTitleUseCase, GenerateReceivableTitleUseCase);
  
  console.log('[Financial] 7/19 ReverseTitlesUseCase');
  container.registerSingleton(TOKENS.ReverseTitlesUseCase, ReverseTitlesUseCase);
  
  // ============================================================
  // USE CASES - RECEIVABLES
  // ============================================================
  console.log('[Financial] 8/19 CreateReceivableUseCase');
  container.registerSingleton(CreateReceivableUseCase);
  
  console.log('[Financial] 9/19 GetReceivableByIdUseCase');
  container.registerSingleton(GetReceivableByIdUseCase);
  
  console.log('[Financial] 10/19 ListReceivablesUseCase');
  container.registerSingleton(ListReceivablesUseCase);
  
  console.log('[Financial] 11/19 CancelReceivableUseCase');
  container.registerSingleton(CancelReceivableUseCase);
  
  console.log('[Financial] 12/19 ReceivePaymentUseCase');
  container.registerSingleton(ReceivePaymentUseCase);
  
  // ============================================================
  // USE CASES - PAYABLES (TEMPORARIAMENTE DESABILITADO - investigar TypeError)
  // ============================================================
  // console.log('[Financial] 13/19 CreatePayableUseCase');
  // container.registerSingleton(CreatePayableUseCase);
  // 
  // console.log('[Financial] 14/19 GetPayableByIdUseCase');
  // container.registerSingleton(GetPayableByIdUseCase);
  // 
  // console.log('[Financial] 15/19 ListPayablesUseCase');
  // container.registerSingleton(ListPayablesUseCase);
  // 
  // console.log('[Financial] 16/19 PayAccountPayableUseCase');
  // container.registerSingleton(PayAccountPayableUseCase);
  // 
  // console.log('[Financial] 17/19 CancelPayableUseCase');
  // container.registerSingleton(CancelPayableUseCase);
  
  // ============================================================
  // GATEWAYS (E9 Fase 2)
  // ============================================================
  console.log('[Financial] 13/14 BillingPdfAdapter');
  container.registerSingleton<IBillingPdfGateway>(FINANCIAL_TOKENS.BillingPdfGateway, BillingPdfAdapter);
  
  console.log('[Financial] 14/14 BoletoAdapter + CnabAdapter');
  container.registerSingleton<IBoletoGateway>(FINANCIAL_TOKENS.BoletoGateway, BoletoAdapter);
  container.registerSingleton<ICnabGateway>(FINANCIAL_TOKENS.CnabGateway, CnabAdapter);
  
  console.log('[Financial Module] DI configured - 3 Repos + 7 UseCases + 3 Gateways (Payables disabled for debug)');
}
