import { container } from '@/shared/infrastructure/di/container';
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
import type { ISpedDataRepository } from '../../domain/ports/output/ISpedDataRepository';
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
  
  // SPED Use Cases (E7.18 Fase 3)
  initializeFiscalSpedModule();
}

/**
 * Fiscal SPED Module: Dependency Injection Registration
 * 
 * Registra Use Cases SPED com arquitetura DDD/Hexagonal completa
 * (Input Ports → Use Cases → Domain Services → Output Ports)
 */
export function initializeFiscalSpedModule(): void {
  // Repository
  container.registerSingleton<ISpedDataRepository>(TOKENS.SpedDataRepository, DrizzleSpedDataRepository);

  // Use Cases SPED
  container.registerSingleton<IGenerateSpedFiscal>(TOKENS.GenerateSpedFiscalUseCase, GenerateSpedFiscalUseCaseV2);
  container.registerSingleton<IGenerateSpedEcd>(TOKENS.GenerateSpedEcdUseCase, GenerateSpedEcdUseCaseV2);
  container.registerSingleton<IGenerateSpedContributions>(TOKENS.GenerateSpedContributionsUseCase, GenerateSpedContributionsUseCaseV2);
}

/**
 * SPED Module Factories (DEPRECATED - E7.18)
 * 
 * @deprecated Estas factories estão obsoletas. Use container.resolve() com TOKENS.
 * Mantidas para retrocompatibilidade. Serão removidas em v2.0.
 * 
 * @example
 * // ❌ Obsoleto
 * const useCase = createGenerateSpedFiscalUseCase();
 * 
 * // ✅ Use isto
 * import { container } from '@/shared/infrastructure/di/container';
 * import { TOKENS } from '@/shared/infrastructure/di/tokens';
 * const useCase = container.resolve<IGenerateSpedFiscal>(TOKENS.GenerateSpedFiscalUseCase);
 */

import { DrizzleSpedDataRepository, createSpedDataRepository } from '../persistence/DrizzleSpedDataRepository';
import { SpedFiscalGenerator } from '../../domain/services/SpedFiscalGenerator';
import { GenerateSpedFiscalUseCase } from '../../application/use-cases/GenerateSpedFiscalUseCase';
import { ConsoleLogger } from '@/shared/infrastructure/logging/ConsoleLogger';

/**
 * @deprecated Use container.resolve<IGenerateSpedFiscal>(TOKENS.GenerateSpedFiscalUseCase)
 * Mantido para retrocompatibilidade. Será removido em v2.0.
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
 * @deprecated Use container.resolve<IGenerateSpedEcd>(TOKENS.GenerateSpedEcdUseCase)
 * Mantido para retrocompatibilidade. Será removido em v2.0.
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
 * @deprecated Use container.resolve<IGenerateSpedContributions>(TOKENS.GenerateSpedContributionsUseCase)
 * Mantido para retrocompatibilidade. Será removido em v2.0.
 */
export function createGenerateSpedContributionsUseCase(): GenerateSpedContributionsUseCase {
  const repository = createSpedDataRepository();
  const generator = new SpedContributionsGenerator();
  return new GenerateSpedContributionsUseCase(repository, generator);
}

