/**
 * Domain Services
 * 
 * Exporta serviços de domínio do módulo Accounting
 */

export { JournalEntryGenerator } from './JournalEntryGenerator';
export type {
  GenerateJournalLinesInput,
  GenerateJournalLinesOutput,
} from './JournalEntryGenerator';

export { AccountingEngine } from './AccountingEngine';
export type {
  FiscalClassification,
  AccountingStatus,
  JournalEntryStatus,
  DocumentEligibilityInput,
  CounterpartInput,
  CounterpartAccountRule,
  EntryDescriptionInput,
  PeriodValidationInput,
  BalanceLine,
  BalanceValidationResult,
  AccountValidationInput,
  JournalItemInput,
  GeneratedJournalLine,
  JournalEntryGenerationResult,
} from './AccountingEngine';

