/**
 * @deprecated Import from commands/ or queries/ instead
 * Backward compatibility re-exports for E16.1 migration
 */
export { CreateFiscalDocumentUseCase } from '../commands/fiscal/CreateFiscalDocumentUseCase';
export { SubmitFiscalDocumentUseCase } from '../commands/fiscal/SubmitFiscalDocumentUseCase';
export { AuthorizeFiscalDocumentUseCase } from '../commands/fiscal/AuthorizeFiscalDocumentUseCase';
export { CancelFiscalDocumentUseCase } from '../commands/fiscal/CancelFiscalDocumentUseCase';
export { CreateCteUseCase } from '../commands/cte/CreateCteUseCase';
export { AuthorizeCteUseCase } from '../commands/cte/AuthorizeCteUseCase';
export { UpdateCteUseCase } from '../commands/cte/UpdateCteUseCase';
export { CancelCteUseCase } from '../commands/cte/CancelCteUseCase';
export { DownloadNfesUseCase } from '../commands/cte/DownloadNfesUseCase';
export { ImportNfeXmlUseCase } from '../commands/cte/ImportNfeXmlUseCase';
export { ManifestNfeUseCase } from '../commands/cte/ManifestNfeUseCase';
export { TransmitToSefazUseCase } from '../commands/fiscal/TransmitToSefazUseCase';
export { GenerateDanfeUseCase } from '../commands/fiscal/GenerateDanfeUseCase';
export { CalculateTaxesUseCase } from '../commands/fiscal/CalculateTaxesUseCase';
export { ProcessTaxCreditsUseCase } from '../commands/fiscal/ProcessTaxCreditsUseCase';
export { AuditTaxTransitionUseCase } from '../commands/fiscal/AuditTaxTransitionUseCase';
export { CalculateCompensationUseCase } from '../commands/fiscal/CalculateCompensationUseCase';
export { ListFiscalDocumentsUseCase } from '../queries/fiscal/ListFiscalDocumentsUseCase';
export { GetFiscalDocumentByIdUseCase } from '../queries/fiscal/GetFiscalDocumentByIdUseCase';
export { ListCtesUseCase } from '../queries/cte/ListCtesUseCase';
export { GetCteByIdUseCase } from '../queries/cte/GetCteByIdUseCase';
export { QuerySefazStatusUseCase } from '../queries/fiscal/QuerySefazStatusUseCase';
export { GetTaxRatesUseCase } from '../queries/tax-reform/GetTaxRatesUseCase';
export { SimulateTaxScenarioUseCase } from '../queries/tax-reform/SimulateTaxScenarioUseCase';
export { CompareTaxRegimesUseCase } from '../queries/tax-reform/CompareTaxRegimesUseCase';
export { CalculateIbsCbsUseCase } from '../queries/tax-reform/CalculateIbsCbsUseCase';
export { ValidateIbsCbsGroupUseCase } from '../queries/tax-reform/ValidateIbsCbsGroupUseCase';
export { ValidateFiscalDocumentUseCase } from '../queries/fiscal/ValidateFiscalDocumentUseCase';
