import { container } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// Repository
import { DrizzleFiscalDocumentRepository } from '../persistence/DrizzleFiscalDocumentRepository';

// SPED Repository (deve estar no topo, antes de ser usado)
import { DrizzleSpedDataRepository, createSpedDataRepository } from '../persistence/DrizzleSpedDataRepository';

// Gateways (E9 Fase 2)
import { TaxCalculatorAdapter } from '../adapters/TaxCalculatorAdapter';
import type { ITaxCalculatorGateway } from '../../domain/ports/output/ITaxCalculatorGateway';
import { FiscalClassificationAdapter } from '../adapters/FiscalClassificationAdapter';
import type { IFiscalClassificationGateway } from '../../domain/ports/output/IFiscalClassificationGateway';
import { PcgNcmAdapter } from '../adapters/PcgNcmAdapter';
import type { IPcgNcmGateway } from '../../domain/ports/output/IPcgNcmGateway';

// Tokens locais (E9 Fase 2)
export const FISCAL_TOKENS = {
  TaxCalculatorGateway: Symbol.for('ITaxCalculatorGateway'),
  FiscalClassificationGateway: Symbol.for('IFiscalClassificationGateway'),
  PcgNcmGateway: Symbol.for('IPcgNcmGateway'),
};

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

// CRUD Use Cases
import { ListFiscalDocumentsUseCase } from '../../application/use-cases/ListFiscalDocumentsUseCase';
import { GetFiscalDocumentByIdUseCase } from '../../application/use-cases/GetFiscalDocumentByIdUseCase';
import { ValidateFiscalDocumentUseCase } from '../../application/use-cases/ValidateFiscalDocumentUseCase';
import { GenerateDanfeUseCase } from '../../application/use-cases/GenerateDanfeUseCase';
import { TransmitToSefazUseCase } from '../../application/use-cases/TransmitToSefazUseCase';
import { QuerySefazStatusUseCase } from '../../application/use-cases/QuerySefazStatusUseCase';

// CTe/NFe Use Cases (E8 Fase 3 + E10.2)
import { AuthorizeCteUseCase } from '../../application/use-cases/AuthorizeCteUseCase';
import { CreateCteUseCase } from '../../application/use-cases/CreateCteUseCase';
import { DownloadNfesUseCase } from '../../application/use-cases/DownloadNfesUseCase';
import { ListCtesUseCase } from '../../application/use-cases/ListCtesUseCase';
import { GetCteByIdUseCase } from '../../application/use-cases/GetCteByIdUseCase';
import { UpdateCteUseCase } from '../../application/use-cases/UpdateCteUseCase';
import { CancelCteUseCase as CancelCteUseCaseImpl } from '../../application/use-cases/CancelCteUseCase';
import { ManifestNfeUseCase } from '../../application/use-cases/ManifestNfeUseCase';
import { ImportNfeXmlUseCase } from '../../application/use-cases/ImportNfeXmlUseCase';

// CTe Legacy Adapters (Diagnostic Plan - Fase 3)
import { CteBuilderAdapter } from '../adapters/CteBuilderAdapter';
import { XmlSignerAdapter } from '../adapters/XmlSignerAdapter';
import { InsuranceValidatorAdapter } from '../adapters/InsuranceValidatorAdapter';
import type { ICteBuilderService } from '../../domain/ports/output/ICteBuilderService';
import type { IXmlSignerService } from '../../domain/ports/output/IXmlSignerService';
import type { IInsuranceValidatorService } from '../../domain/ports/output/IInsuranceValidatorService';
import type { IAuthorizeCteUseCase } from '../../domain/ports/input/IAuthorizeCteUseCase';
import type { ICreateCteUseCase } from '../../domain/ports/input/ICreateCteUseCase';
import type { IDownloadNfesUseCase } from '../../domain/ports/input/IDownloadNfesUseCase';
import type { IGenerateSpedFiscal } from '../../domain/ports/input/IGenerateSpedFiscal';
import type { IGenerateSpedEcd } from '../../domain/ports/input/IGenerateSpedEcd';
import type { IGenerateSpedContributions } from '../../domain/ports/input/IGenerateSpedContributions';
import type { ISpedDataRepository } from '../../domain/ports/output/ISpedDataRepository';
import { GenerateSpedFiscalUseCase as GenerateSpedFiscalUseCaseV2 } from '../../application/use-cases/sped/GenerateSpedFiscalUseCase';
import { GenerateSpedEcdUseCase as GenerateSpedEcdUseCaseV2 } from '../../application/use-cases/sped/GenerateSpedEcdUseCase';
import { GenerateSpedContributionsUseCase as GenerateSpedContributionsUseCaseV2 } from '../../application/use-cases/sped/GenerateSpedContributionsUseCase';

// SPED Generators (para factories deprecated)
import { SpedFiscalGenerator } from '../../domain/services/SpedFiscalGenerator';
import { GenerateSpedFiscalUseCase } from '../../application/use-cases/GenerateSpedFiscalUseCase';
import { SpedEcdGenerator } from '../../domain/services/SpedEcdGenerator';
import { GenerateSpedEcdUseCase } from '../../application/use-cases/GenerateSpedEcdUseCase';
import { SpedContributionsGenerator } from '../../domain/services/SpedContributionsGenerator';
import { GenerateSpedContributionsUseCase } from '../../application/use-cases/GenerateSpedContributionsUseCase';
import { ConsoleLogger } from '@/shared/infrastructure/logging/ConsoleLogger';

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

  // CRUD Use Cases (Diagnostic Plan - Fase 2)
  container.registerSingleton(TOKENS.ListFiscalDocumentsUseCase, ListFiscalDocumentsUseCase);
  container.registerSingleton(TOKENS.GetFiscalDocumentByIdUseCase, GetFiscalDocumentByIdUseCase);
  container.registerSingleton(TOKENS.ValidateFiscalDocumentUseCase, ValidateFiscalDocumentUseCase);
  container.registerSingleton(TOKENS.GenerateDanfeUseCase, GenerateDanfeUseCase);
  container.registerSingleton(TOKENS.TransmitToSefazUseCase, TransmitToSefazUseCase);
  container.registerSingleton(TOKENS.QuerySefazStatusUseCase, QuerySefazStatusUseCase);

  // CTe Legacy Adapters (Diagnostic Plan - Fase 3)
  container.registerSingleton<ICteBuilderService>(TOKENS.CteBuilderService, CteBuilderAdapter);
  container.registerSingleton<IXmlSignerService>(TOKENS.XmlSignerService, XmlSignerAdapter);
  container.registerSingleton<IInsuranceValidatorService>(TOKENS.InsuranceValidatorService, InsuranceValidatorAdapter);

  // CTe/NFe Use Cases (E8 Fase 3 + E10.2)
  container.registerSingleton<IAuthorizeCteUseCase>(TOKENS.AuthorizeCteUseCase, AuthorizeCteUseCase);
  container.registerSingleton<ICreateCteUseCase>(TOKENS.CreateCteUseCase, CreateCteUseCase);
  container.registerSingleton<IDownloadNfesUseCase>(TOKENS.DownloadNfesUseCase, DownloadNfesUseCase);
  container.registerSingleton(TOKENS.ListCtesUseCase, ListCtesUseCase);
  container.registerSingleton(TOKENS.GetCteByIdUseCase, GetCteByIdUseCase);
  container.registerSingleton(TOKENS.UpdateCteUseCase, UpdateCteUseCase);
  container.registerSingleton(TOKENS.CancelCteUseCase, CancelCteUseCaseImpl);
  container.registerSingleton(TOKENS.ManifestNfeUseCase, ManifestNfeUseCase);
  container.registerSingleton(TOKENS.ImportNfeXmlUseCase, ImportNfeXmlUseCase);

  // Gateways (E9 Fase 2)
  container.registerSingleton<ITaxCalculatorGateway>(
    FISCAL_TOKENS.TaxCalculatorGateway,
    TaxCalculatorAdapter
  );
  container.registerSingleton<IFiscalClassificationGateway>(
    FISCAL_TOKENS.FiscalClassificationGateway,
    FiscalClassificationAdapter
  );
  container.registerSingleton<IPcgNcmGateway>(
    FISCAL_TOKENS.PcgNcmGateway,
    PcgNcmAdapter
  );
  
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


/**
 * @deprecated Use container.resolve<IGenerateSpedEcd>(TOKENS.GenerateSpedEcdUseCase)
 * Mantido para retrocompatibilidade. Será removido em v2.0.
 */
export function createGenerateSpedEcdUseCase(): GenerateSpedEcdUseCase {
  const repository = createSpedDataRepository();
  const generator = new SpedEcdGenerator();
  return new GenerateSpedEcdUseCase(repository, generator);
}


/**
 * @deprecated Use container.resolve<IGenerateSpedContributions>(TOKENS.GenerateSpedContributionsUseCase)
 * Mantido para retrocompatibilidade. Será removido em v2.0.
 */
export function createGenerateSpedContributionsUseCase(): GenerateSpedContributionsUseCase {
  const repository = createSpedDataRepository();
  const generator = new SpedContributionsGenerator();
  return new GenerateSpedContributionsUseCase(repository, generator);
}

