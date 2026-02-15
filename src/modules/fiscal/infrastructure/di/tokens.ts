/**
 * 📋 FISCAL_TOKENS - DI Token Registry
 * 
 * Extraído de FiscalModule.ts para evitar dependências circulares.
 * Use Cases que precisam de @inject(FISCAL_TOKENS.xxx) devem importar daqui.
 */

export const FISCAL_TOKENS = {
  TaxCalculatorGateway: Symbol.for('ITaxCalculatorGateway'),
  FiscalClassificationGateway: Symbol.for('IFiscalClassificationGateway'),
  PcgNcmGateway: Symbol.for('IPcgNcmGateway'),
  SefazClientService: Symbol.for('ISefazClientService'),
  CertificateManagerService: Symbol.for('ICertificateManagerService'),
  CteParserService: Symbol.for('ICteParserService'),
  NcmCategorizationService: Symbol.for('INcmCategorizationService'),
  NfeParserService: Symbol.for('INfeParserService'),
  // F3.1: Real SEFAZ communication
  SefazHttpClient: Symbol.for('SefazHttpClient'),
  // F3.3: CFOP Determination
  CFOPDeterminationRepository: Symbol.for('ICFOPDeterminationRepository'),
  SeedCFOPDeterminationUseCase: Symbol.for('SeedCFOPDeterminationUseCase'),
  DetermineCFOPUseCase: Symbol.for('DetermineCFOPUseCase'),
  // F4: Cross-Module Integration
  UpdateCteBillingStatusUseCase: Symbol.for('UpdateCteBillingStatusUseCase'),
  // R1.3: Repositories DDD
  CteRepository: Symbol.for('ICteRepository'),
  MdfeRepository: Symbol.for('IMdfeRepository'),
  TaxRuleRepository: Symbol.for('ITaxRuleRepository'),
};
