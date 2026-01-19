/**
 * Domain Services
 * 
 * Exporta serviços de domínio do módulo Fiscal
 */

export { SefazDocumentProcessor } from './SefazDocumentProcessor';
export type { ProcessDocumentResult, DocumentImporter, SefazDocZip, SefazDistDFeResponse } from './SefazDocumentProcessor';

export { TaxCreditCalculator, TaxCreditCalculationError } from './TaxCreditCalculator';
export type { FiscalDocumentData } from './TaxCreditCalculator';

// DANFe Parser (E-Agent-Fase-D2)
export * from './danfe';
