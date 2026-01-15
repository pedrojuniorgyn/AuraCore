/**
 * Barrel export para Input Ports Fiscal
 * 
 * @see ARCH-010: Use Cases implementam interfaces de Input Ports
 */

// ===== SPED (E7.18) =====
export type { ExecutionContext } from './IGenerateSpedFiscal';
export * from './IGenerateSpedFiscal';
export * from './IGenerateSpedEcd';
export * from './IGenerateSpedContributions';

// ===== DOCUMENTOS FISCAIS (E7.22) =====
export * from './IAuthorizeFiscalDocument';
export * from './ICancelFiscalDocument';
export * from './ICreateFiscalDocument';
export * from './ISubmitFiscalDocument';
export * from './IGetFiscalDocumentById';
export * from './IListFiscalDocuments';

// ===== CÁLCULOS E SIMULAÇÕES (E7.22) =====
export * from './ICalculateTax';
export * from './ISimulateTaxReform';
export * from './ICompareTaxRegimes';
export * from './IValidateFiscalDocument';

// ===== SEFAZ (E7.22) =====
export * from './ITransmitToSefaz';
export * from './IQuerySefazStatus';
export * from './IGenerateDanfe';
