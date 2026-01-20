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

// DACTe Parser (E-Agent-Fase-D3)
export * from './dacte';

// NFe XML Parser (E8.3a)
export { NfeXmlParser } from './NfeXmlParser';
export type { ParsedNFe } from './NfeXmlParser';

// CTe Builder Service (E8 Fase 2.1)
export { CteBuilderService } from './CteBuilderService';
export type {
  CteBuilderInput,
  CteXmlResult,
  CteEmitente,
  CteRemetente,
  CteDestinatario,
  CteEndereco,
  CteIcms,
  CteCarga,
  CteDocumentoVinculado,
  CteSeguro,
} from './CteBuilderService';
