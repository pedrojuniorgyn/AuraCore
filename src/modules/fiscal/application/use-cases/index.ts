export { type IUseCase, type IUseCaseWithContext, type ExecutionContext } from './BaseUseCase';
export { CreateFiscalDocumentUseCase } from './CreateFiscalDocumentUseCase';
export { SubmitFiscalDocumentUseCase } from './SubmitFiscalDocumentUseCase';
export { AuthorizeFiscalDocumentUseCase } from './AuthorizeFiscalDocumentUseCase';
export type { AuthorizeFiscalDocumentInput, AuthorizeFiscalDocumentOutput } from './AuthorizeFiscalDocumentUseCase';
export { CancelFiscalDocumentUseCase } from './CancelFiscalDocumentUseCase';
export type { CancelFiscalDocumentInput, CancelFiscalDocumentOutput } from './CancelFiscalDocumentUseCase';
export { CalculateTaxesUseCase } from './CalculateTaxesUseCase';

// E7.4.1 Semana 7 - Application Layer (IBS/CBS)
export { CalculateIbsCbsUseCase } from './CalculateIbsCbsUseCase';
export { SimulateTaxScenarioUseCase } from './SimulateTaxScenarioUseCase';
export { CompareTaxRegimesUseCase } from './CompareTaxRegimesUseCase';
export { GetTaxRatesUseCase } from './GetTaxRatesUseCase';
export { CalculateCompensationUseCase } from './CalculateCompensationUseCase';
export { AuditTaxTransitionUseCase } from './AuditTaxTransitionUseCase';
export { ValidateIbsCbsGroupUseCase } from './ValidateIbsCbsGroupUseCase';

