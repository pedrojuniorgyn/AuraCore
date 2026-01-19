/**
 * Domain Ports
 *
 * Exporta interfaces (Ports) do módulo Accounting
 *
 * Input Ports: Contratos de entrada para Use Cases
 * Output Ports: Contratos de saída para Repositories e Services externos
 */

// Input Ports (Use Cases)
export * from './input';

// Output Ports (Repositories)
export * from './output';

// Fiscal Accounting Repository (para contabilização de documentos fiscais)
export type {
  IFiscalAccountingRepository,
  FiscalDocumentData,
  FiscalDocumentItem,
  ChartAccount,
  JournalEntryData,
} from './IFiscalAccountingRepository';
