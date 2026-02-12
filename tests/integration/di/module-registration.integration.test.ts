/**
 * Integration Tests: DI Module Registration
 * 
 * Verifica que todos os módulos DDD registram suas dependências
 * corretamente no container tsyringe.
 *
 * @module integration/di
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function readModule(modulePath: string): string {
  const fullPath = resolve(process.cwd(), modulePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

describe('Financial Module DI Registration', () => {
  const content = readModule('src/modules/financial/infrastructure/di/FinancialModule.ts');

  it('deve existir', () => {
    expect(content).toBeTruthy();
  });

  it('deve registrar PayableRepository', () => {
    expect(content).toMatch(/registerSingleton.*Payable.*Repository/);
  });

  it('deve registrar ReceivableRepository', () => {
    expect(content).toMatch(/registerSingleton.*Receivable.*Repository/);
  });

  it('deve registrar CreatePayableUseCase', () => {
    expect(content).toMatch(/CreatePayable/);
  });

  it('deve registrar CreateReceivableUseCase', () => {
    expect(content).toMatch(/CreateReceivable/);
  });

  it('deve registrar AutoReconcileUseCase', () => {
    expect(content).toMatch(/AutoReconcile/);
  });

  it('deve exportar FINANCIAL_TOKENS', () => {
    expect(content).toMatch(/export.*FINANCIAL_TOKENS/);
  });
});

describe('Accounting Module DI Registration', () => {
  const content = readModule('src/modules/accounting/infrastructure/di/AccountingModule.ts');

  it('deve existir', () => {
    expect(content).toBeTruthy();
  });

  it('deve registrar JournalEntryRepository', () => {
    expect(content).toMatch(/JournalEntryRepository/);
  });

  it('deve registrar CreateJournalEntryUseCase', () => {
    expect(content).toMatch(/CreateJournalEntry/);
  });

  it('deve registrar PostJournalEntryUseCase', () => {
    expect(content).toMatch(/PostJournalEntry/);
  });

  it('deve registrar CloseAccountingPeriodUseCase', () => {
    expect(content).toMatch(/CloseAccountingPeriod/);
  });

  it('deve registrar GenerateTrialBalanceUseCase', () => {
    expect(content).toMatch(/GenerateTrialBalance/);
  });

  it('deve registrar AccountDeterminationRepository', () => {
    expect(content).toMatch(/AccountDetermination/);
  });

  it('deve exportar ACCOUNTING_TOKENS', () => {
    expect(content).toMatch(/export.*ACCOUNTING_TOKENS/);
  });
});

describe('Fiscal Module DI Registration', () => {
  const content = readModule('src/modules/fiscal/infrastructure/di/FiscalModule.ts');

  it('deve existir', () => {
    expect(content).toBeTruthy();
  });

  it('deve registrar SpedDataRepository', () => {
    expect(content).toMatch(/SpedDataRepository/);
  });

  it('deve registrar GenerateSpedFiscalUseCase (V2)', () => {
    expect(content).toMatch(/GenerateSpedFiscalUseCaseV2/);
  });

  it('deve registrar GenerateSpedEcdUseCase (V2)', () => {
    expect(content).toMatch(/GenerateSpedEcdUseCaseV2/);
  });

  it('deve registrar GenerateSpedContributionsUseCase (V2)', () => {
    expect(content).toMatch(/GenerateSpedContributionsUseCaseV2/);
  });

  it('NÃO deve ter factory functions deprecated', () => {
    expect(content).not.toMatch(/createGenerateSpedFiscalUseCase/);
    expect(content).not.toMatch(/createGenerateSpedEcdUseCase/);
    expect(content).not.toMatch(/createGenerateSpedContributionsUseCase/);
  });

  it('NÃO deve importar de Legacy files', () => {
    // Verify no import statements reference Legacy files
    const importLines = content.split('\n').filter(l => l.trimStart().startsWith('import'));
    const legacyImports = importLines.filter(l => l.includes('Legacy'));
    expect(legacyImports).toHaveLength(0);
  });

  it('deve registrar CFOP Determination', () => {
    expect(content).toMatch(/CFOPDetermination/);
  });

  it('deve registrar UpdateCteBillingStatusUseCase (F4)', () => {
    expect(content).toMatch(/UpdateCteBillingStatus/);
  });

  it('deve exportar FISCAL_TOKENS', () => {
    expect(content).toMatch(/export.*FISCAL_TOKENS/);
  });
});
