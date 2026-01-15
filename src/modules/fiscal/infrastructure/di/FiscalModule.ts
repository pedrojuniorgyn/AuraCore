import { container } from 'tsyringe';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// Repository
import { DrizzleFiscalDocumentRepository } from '../persistence/DrizzleFiscalDocumentRepository';

// Services
import { MockSefazService } from '../services/MockSefazService';
import { SefazGatewayAdapter, createSefazGatewayAdapter } from '../adapters/sefaz/SefazGatewayAdapter';
import { MockPdfGenerator } from '../services/MockPdfGenerator';
import { FiscalAccountingIntegration } from '../../application/services/FiscalAccountingIntegration';

// Use Cases
import { CreateFiscalDocumentUseCase } from '../../application/use-cases/CreateFiscalDocumentUseCase';
import { SubmitFiscalDocumentUseCase } from '../../application/use-cases/SubmitFiscalDocumentUseCase';
import { AuthorizeFiscalDocumentUseCase } from '../../application/use-cases/AuthorizeFiscalDocumentUseCase';
import { CancelFiscalDocumentUseCase } from '../../application/use-cases/CancelFiscalDocumentUseCase';
import { CalculateTaxesUseCase } from '../../application/use-cases/CalculateTaxesUseCase';
import type { IGenerateSpedFiscal } from '../../domain/ports/input/IGenerateSpedFiscal';
import type { IGenerateSpedEcd } from '../../domain/ports/input/IGenerateSpedEcd';
import type { IGenerateSpedContributions } from '../../domain/ports/input/IGenerateSpedContributions';
import type { ISpedDataRepository } from '../../domain/ports/ISpedDataRepository';
import { GenerateSpedFiscalUseCase as GenerateSpedFiscalUseCaseV2 } from '../../application/use-cases/sped/GenerateSpedFiscalUseCase';
import { GenerateSpedEcdUseCase as GenerateSpedEcdUseCaseV2 } from '../../application/use-cases/sped/GenerateSpedEcdUseCase';
import { GenerateSpedContributionsUseCase as GenerateSpedContributionsUseCaseV2 } from '../../application/use-cases/sped/GenerateSpedContributionsUseCase';

/**
 * Fiscal Module: Dependency Injection Registration
 *
 * Registra todas as dependências do módulo Fiscal no container tsyringe:
 * - Repository
 * - Services (Sefaz, PDF, Accounting Integration)
 * - Use Cases
 *
 * Este módulo deve ser inicializado no bootstrap da aplicação.
 */
export function registerFiscalModule(): void {
  // Repository
  container.registerSingleton(TOKENS.FiscalDocumentRepository, DrizzleFiscalDocumentRepository);

  // Services
  // SEFAZ: Usar adapter real (com modo mock interno) ao invés de MockSefazService
  // O adapter detecta automaticamente NODE_ENV e usa mock em development/test
  const sefazAdapter = createSefazGatewayAdapter();
  container.registerInstance(TOKENS.SefazService, sefazAdapter);
  
  container.registerSingleton(TOKENS.FiscalDocumentPdfGenerator, MockPdfGenerator);
  container.registerSingleton(TOKENS.FiscalAccountingIntegration, FiscalAccountingIntegration);

  // Use Cases
  container.registerSingleton(TOKENS.CreateFiscalDocumentUseCase, CreateFiscalDocumentUseCase);
  container.registerSingleton(TOKENS.SubmitFiscalDocumentUseCase, SubmitFiscalDocumentUseCase);
  container.registerSingleton(TOKENS.AuthorizeFiscalDocumentUseCase, AuthorizeFiscalDocumentUseCase);
  container.registerSingleton(TOKENS.CancelFiscalDocumentUseCase, CancelFiscalDocumentUseCase);
  container.registerSingleton(TOKENS.CalculateTaxesUseCase, CalculateTaxesUseCase);
}

/**
 * Fiscal SPED Module: Dependency Injection Registration
 */
export function initializeFiscalSpedModule(): void {
  container.register<ISpedDataRepository>('ISpedDataRepository', {
    useClass: DrizzleSpedDataRepository,
  });

  container.register<IGenerateSpedFiscal>('IGenerateSpedFiscal', {
    useClass: GenerateSpedFiscalUseCaseV2,
  });

  container.register<IGenerateSpedEcd>('IGenerateSpedEcd', {
    useClass: GenerateSpedEcdUseCaseV2,
  });

  container.register<IGenerateSpedContributions>('IGenerateSpedContributions', {
    useClass: GenerateSpedContributionsUseCaseV2,
  });
}

/**
 * SPED Module Factories (DDD Architecture)
 * 
 * Factories para criação de Use Cases SPED sem container DI
 */

import { DrizzleSpedDataRepository, createSpedDataRepository } from '../persistence/DrizzleSpedDataRepository';
import { SpedFiscalGenerator } from '../../domain/services/SpedFiscalGenerator';
import { GenerateSpedFiscalUseCase } from '../../application/use-cases/GenerateSpedFiscalUseCase';
import { ConsoleLogger } from '@/shared/infrastructure/logging/ConsoleLogger';

/**
 * Factory: Create SPED Fiscal Generator Use Case
 */
export function createGenerateSpedFiscalUseCase(): GenerateSpedFiscalUseCase {
  const repository = createSpedDataRepository();
  const generator = new SpedFiscalGenerator(repository);
  const logger = new ConsoleLogger();
  return new GenerateSpedFiscalUseCase(generator, logger);
}

// SPED ECD (Contábil) imports
import { SpedEcdGenerator } from '../../domain/services/SpedEcdGenerator';
import { GenerateSpedEcdUseCase } from '../../application/use-cases/GenerateSpedEcdUseCase';

/**
 * Factory: Create SPED ECD Generator Use Case
 */
export function createGenerateSpedEcdUseCase(): GenerateSpedEcdUseCase {
  const repository = createSpedDataRepository();
  const generator = new SpedEcdGenerator();
  return new GenerateSpedEcdUseCase(repository, generator);
}

// SPED Contributions (PIS/COFINS) imports
import { SpedContributionsGenerator } from '../../domain/services/SpedContributionsGenerator';
import { GenerateSpedContributionsUseCase } from '../../application/use-cases/GenerateSpedContributionsUseCase';

/**
 * Factory: Create SPED Contributions Generator Use Case
 */
export function createGenerateSpedContributionsUseCase(): GenerateSpedContributionsUseCase {
  const repository = createSpedDataRepository();
  const generator = new SpedContributionsGenerator();
  return new GenerateSpedContributionsUseCase(repository, generator);
}

