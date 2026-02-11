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

// ===== IMPORTAÇÃO (E-Agent-Fase-D2/D3) =====
export * from './IImportDANFeUseCase';
export * from './IImportDACTeUseCase';

// ===== RAG LEGISLAÇÃO (E-Agent-Fase-D4) =====
export * from './IIndexLegislationUseCase';
export * from './IQueryLegislationUseCase';

// ===== CTe/NFe USE CASES (E8 Fase 3) =====
export * from './IAuthorizeCteUseCase';
export * from './ICreateCteUseCase';
export * from './IDownloadNfesUseCase';

// ===== CTe CANCELAMENTO / NFe MANIFESTAÇÃO / IMPORTAÇÃO XML =====
export * from './ICancelCteUseCase';
export * from './IManifestNfeUseCase';
export * from './IImportNfeXmlUseCase';
export * from './IListCtesUseCase';
export * from './IGetCteByIdUseCase';
export * from './IUpdateCteUseCase';
