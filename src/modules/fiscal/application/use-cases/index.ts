/**
 * Use Cases
 * 
 * Exporta casos de uso do módulo Fiscal
 */

// CRUD Operations
export { CreateFiscalDocumentUseCase } from './CreateFiscalDocumentUseCase';
export { AuthorizeFiscalDocumentUseCase } from './AuthorizeFiscalDocumentUseCase';
export { CancelFiscalDocumentUseCase } from './CancelFiscalDocumentUseCase';
export { SubmitFiscalDocumentUseCase } from './SubmitFiscalDocumentUseCase';
export { CalculateTaxesUseCase } from './CalculateTaxesUseCase';

// Tax Reform Use Cases
export { AuditTaxTransitionUseCase } from './AuditTaxTransitionUseCase';
export { CalculateIbsCbsUseCase } from './CalculateIbsCbsUseCase';
export { CompareTaxRegimesUseCase } from './CompareTaxRegimesUseCase';
export { CalculateCompensationUseCase } from './CalculateCompensationUseCase';
export { GetTaxRatesUseCase } from './GetTaxRatesUseCase';
export { SimulateTaxScenarioUseCase } from './SimulateTaxScenarioUseCase';
export { ValidateIbsCbsGroupUseCase } from './ValidateIbsCbsGroupUseCase';

// Tax Credits
export { ProcessTaxCreditsUseCase, createProcessTaxCreditsUseCase } from './ProcessTaxCreditsUseCase';
export type { ProcessTaxCreditsRequest, ProcessTaxCreditsResponse } from './ProcessTaxCreditsUseCase';

// SPED Generation
export { GenerateSpedFiscalUseCase } from './GenerateSpedFiscalUseCase';
export { GenerateSpedEcdUseCase } from './GenerateSpedEcdUseCase';
export { GenerateSpedContributionsUseCase } from './GenerateSpedContributionsUseCase';

// CTe Cancellation / NFe Manifest / XML Import
export { CancelCteUseCase } from './CancelCteUseCase';
export { ManifestNfeUseCase } from './ManifestNfeUseCase';
export { ImportNfeXmlUseCase } from './ImportNfeXmlUseCase';

// CTe Use Cases (E8 Fase 3)
export { ListCtesUseCase } from './ListCtesUseCase';
export { GetCteByIdUseCase } from './GetCteByIdUseCase';
export { UpdateCteUseCase } from './UpdateCteUseCase';
