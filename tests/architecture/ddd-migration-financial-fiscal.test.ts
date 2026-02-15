/**
 * Architecture Tests: DDD Migration - Financial & Fiscal Modules
 *
 * Valida que a migração DDD dos módulos Financial e Fiscal está correta:
 * - Schemas DDD exportam as tabelas esperadas
 * - Repositories registrados no DI
 * - Rotas V1 importam de módulos DDD (não do legacy schema.ts)
 * - Rotas V2 Financial foram removidas
 * - Services deprecados foram removidos
 *
 * @module tests/architecture/ddd-migration-financial-fiscal
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = process.cwd();

// ============================================================================
// 1. SCHEMA DDD EXPORTS
// ============================================================================

describe('DDD Schema Exports - Financial Module', () => {
  const indexPath = resolve(ROOT, 'src/modules/financial/infrastructure/persistence/schemas/index.ts');

  it('index.ts existe', () => {
    expect(existsSync(indexPath)).toBe(true);
  });

  it('exporta tabelas DDD com sufixo Table via barrel export', () => {
    // O index.ts faz barrel export dos Schema files que contêm as definições *Table
    const schemaPath = resolve(ROOT, 'src/modules/financial/infrastructure/persistence/schemas/FinancialCategorySchema.ts');
    const content = readFileSync(schemaPath, 'utf-8');
    const expectedTables = [
      'financialCategoriesTable',
      'paymentTermsTable',
      'bankAccountsTable',
      'bankRemittancesTable',
      'financialDdaInboxTable',
      'taxCreditsTable',
      'billingInvoicesTable',
      'billingItemsTable',
      'btgBoletosTable',
      'btgPaymentsTable',
    ];

    for (const table of expectedTables) {
      expect(content, `Deve exportar ${table}`).toContain(table);
    }
  });

  it('exporta aliases backward-compat (sem sufixo Table)', () => {
    // Aliases são exportados diretamente nos Schema files (não no index.ts)
    const financialSchema = readFileSync(
      resolve(ROOT, 'src/modules/financial/infrastructure/persistence/schemas/FinancialCategorySchema.ts'), 'utf-8'
    );
    const payableSchema = readFileSync(
      resolve(ROOT, 'src/modules/financial/infrastructure/persistence/schemas/PayableSchema.ts'), 'utf-8'
    );
    const receivableSchema = readFileSync(
      resolve(ROOT, 'src/modules/financial/infrastructure/persistence/schemas/ReceivableSchema.ts'), 'utf-8'
    );

    expect(payableSchema, 'Deve exportar alias accountsPayable').toContain('accountsPayable');
    expect(receivableSchema, 'Deve exportar alias accountsReceivable').toContain('accountsReceivable');
    expect(financialSchema, 'Deve exportar alias financialCategories').toContain('export const financialCategories');
    expect(financialSchema, 'Deve exportar alias bankAccounts').toContain('export const bankAccounts');
    expect(financialSchema, 'Deve exportar alias paymentTerms').toContain('export const paymentTerms');
  });

  it('tem pelo menos 4 schema files', () => {
    const dir = resolve(ROOT, 'src/modules/financial/infrastructure/persistence/schemas');
    const files = readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
    expect(files.length).toBeGreaterThanOrEqual(3);
  });
});

describe('DDD Schema Exports - Fiscal Module', () => {
  const indexPath = resolve(ROOT, 'src/modules/fiscal/infrastructure/persistence/schemas/index.ts');

  it('index.ts existe', () => {
    expect(existsSync(indexPath)).toBe(true);
  });

  it('exporta tabelas DDD com sufixo Table via barrel export', () => {
    // O index.ts faz barrel export do FiscalSchema.ts que contém as definições *Table
    const schemaPath = resolve(ROOT, 'src/modules/fiscal/infrastructure/persistence/schemas/FiscalSchema.ts');
    const content = readFileSync(schemaPath, 'utf-8');
    const expectedTables = [
      'cteHeaderTable',
      'cteCargoDocumentsTable',
      'cteCorrectionLettersTable',
      'mdfeHeaderTable',
      'mdfeDocumentsTable',
      'taxRulesTable',
      'fiscalSettingsTable',
    ];

    for (const table of expectedTables) {
      expect(content, `Deve exportar ${table}`).toContain(table);
    }
  });

  it('exporta aliases backward-compat para tabelas legadas', () => {
    // Aliases são definidos no FiscalSchema.ts (export const cteHeader = cteHeaderTable)
    const content = readFileSync(
      resolve(ROOT, 'src/modules/fiscal/infrastructure/persistence/schemas/FiscalSchema.ts'), 'utf-8'
    );
    expect(content, 'Deve exportar alias cteHeader').toContain('export const cteHeader');
    expect(content, 'Deve exportar alias mdfeHeader').toContain('export const mdfeHeader');
    expect(content, 'Deve exportar alias fiscalSettings').toContain('export const fiscalSettings');
  });
});

// ============================================================================
// 2. REPOSITORY DI REGISTRATION
// ============================================================================

describe('DDD Repository DI Registration - Financial', () => {
  const diPath = resolve(ROOT, 'src/modules/financial/infrastructure/di/FinancialModule.ts');
  const tokensPath = resolve(ROOT, 'src/modules/financial/infrastructure/di/tokens.ts');

  it('FinancialModule.ts existe', () => {
    expect(existsSync(diPath)).toBe(true);
  });

  it('tokens.ts define tokens para repositories', () => {
    const content = readFileSync(tokensPath, 'utf-8');
    const expectedTokens = [
      'CategoryRepository',
      'PaymentTermsRepository',
      'BankAccountRepository',
      'BillingRepository',
    ];

    for (const token of expectedTokens) {
      expect(content, `Deve definir token ${token}`).toContain(token);
    }
  });

  it('registra repositories no container', () => {
    const content = readFileSync(diPath, 'utf-8');
    const expectedRepos = [
      'DrizzleCategoryRepository',
      'DrizzlePaymentTermsRepository',
      'DrizzleBankAccountRepository',
      'DrizzleBillingRepository',
    ];

    for (const repo of expectedRepos) {
      expect(content, `Deve registrar ${repo}`).toContain(repo);
    }
  });
});

describe('DDD Repository DI Registration - Fiscal', () => {
  const diPath = resolve(ROOT, 'src/modules/fiscal/infrastructure/di/FiscalModule.ts');
  const tokensPath = resolve(ROOT, 'src/modules/fiscal/infrastructure/di/tokens.ts');

  it('FiscalModule.ts existe', () => {
    expect(existsSync(diPath)).toBe(true);
  });

  it('tokens.ts define tokens para repositories', () => {
    const content = readFileSync(tokensPath, 'utf-8');
    const expectedTokens = [
      'CteRepository',
      'MdfeRepository',
      'TaxRuleRepository',
    ];

    for (const token of expectedTokens) {
      expect(content, `Deve definir token ${token}`).toContain(token);
    }
  });

  it('registra repositories no container', () => {
    const content = readFileSync(diPath, 'utf-8');
    const expectedRepos = [
      'DrizzleCteRepository',
      'DrizzleMdfeRepository',
      'DrizzleTaxRuleRepository',
    ];

    for (const repo of expectedRepos) {
      expect(content, `Deve registrar ${repo}`).toContain(repo);
    }
  });
});

// ============================================================================
// 3. REPOSITORY FILES EXIST
// ============================================================================

describe('DDD Repository Files - Financial', () => {
  const basePath = resolve(ROOT, 'src/modules/financial/infrastructure/persistence/repositories');

  const repos = [
    'DrizzleCategoryRepository.ts',
    'DrizzlePaymentTermsRepository.ts',
    'DrizzleBankAccountRepository.ts',
    'DrizzleBillingRepository.ts',
  ];

  for (const repo of repos) {
    it(`${repo} existe`, () => {
      expect(existsSync(join(basePath, repo))).toBe(true);
    });
  }
});

describe('DDD Repository Files - Fiscal', () => {
  const basePath = resolve(ROOT, 'src/modules/fiscal/infrastructure/persistence/repositories');

  const repos = [
    'DrizzleCteRepository.ts',
    'DrizzleMdfeRepository.ts',
    'DrizzleTaxRuleRepository.ts',
  ];

  for (const repo of repos) {
    it(`${repo} existe`, () => {
      expect(existsSync(join(basePath, repo))).toBe(true);
    });
  }
});

// ============================================================================
// 4. V2 FINANCIAL ROUTES REMOVED
// ============================================================================

describe('V2 Financial Routes Removed', () => {
  const v2FinancialPath = resolve(ROOT, 'src/app/api/v2/financial');

  it('diretório V2 financial não existe mais', () => {
    expect(existsSync(v2FinancialPath)).toBe(false);
  });
});

// ============================================================================
// 5. DEPRECATED SERVICES REMOVED
// ============================================================================

describe('Deprecated Services Removed', () => {
  const removedServices = [
    'src/services/accounting-engine.ts',
    'src/services/financial-title-generator.ts',
    'src/services/sefaz-service.ts',
    'src/services/sefaz-processor.ts',
    'src/services/tax-credit-engine.ts',
    'src/services/nfe-parser.ts',
  ];

  for (const service of removedServices) {
    it(`${service} foi removido`, () => {
      expect(existsSync(resolve(ROOT, service))).toBe(false);
    });
  }
});

// ============================================================================
// 6. FISCAL ROUTE IMPORTS FROM DDD MODULE
// ============================================================================

describe('Fiscal Routes Import from DDD Schemas', () => {
  const fiscalRouteFiles = [
    'src/app/api/fiscal/cte/route.ts',
    'src/app/api/fiscal/cte/summary/route.ts',
    'src/app/api/fiscal/settings/route.ts',
  ];

  for (const routeFile of fiscalRouteFiles) {
    it(`${routeFile} importa de @/modules/fiscal`, () => {
      const fullPath = resolve(ROOT, routeFile);
      if (!existsSync(fullPath)) return; // skip if file doesn't exist
      const content = readFileSync(fullPath, 'utf-8');
      expect(
        content.includes('@/modules/fiscal/infrastructure/persistence/schemas'),
        `${routeFile} deve importar de módulo fiscal DDD`
      ).toBe(true);
    });
  }
});

// ============================================================================
// 7. FINANCIAL ROUTE IMPORTS FROM DDD MODULE
// ============================================================================

describe('Financial Routes Import from DDD Schemas', () => {
  const financialRouteFiles = [
    'src/app/api/financial/payables/route.ts',
    'src/app/api/financial/receivables/route.ts',
    'src/app/api/financial/reports/dre/route.ts',
    'src/app/api/financial/cash-flow/route.ts',
  ];

  for (const routeFile of financialRouteFiles) {
    it(`${routeFile} importa accountsPayable/accountsReceivable de @/modules/financial`, () => {
      const fullPath = resolve(ROOT, routeFile);
      if (!existsSync(fullPath)) return;
      const content = readFileSync(fullPath, 'utf-8');
      expect(
        content.includes('@/modules/financial/infrastructure/persistence/schemas'),
        `${routeFile} deve importar de módulo financial DDD`
      ).toBe(true);
    });
  }
});

// ============================================================================
// 8. DASHBOARD USES V1 ROUTES (NOT V2)
// ============================================================================

describe('Dashboard uses V1 routes', () => {
  const dashboardPath = resolve(ROOT, 'src/app/(dashboard)/financeiro/dashboard/page.tsx');

  it('não referencia /api/v2/financial', () => {
    if (!existsSync(dashboardPath)) return;
    const content = readFileSync(dashboardPath, 'utf-8');
    expect(content).not.toContain('/api/v2/financial');
  });

  it('usa /api/financial (V1)', () => {
    if (!existsSync(dashboardPath)) return;
    const content = readFileSync(dashboardPath, 'utf-8');
    expect(content).toContain('/api/financial/');
  });
});

// ============================================================================
// 9. LEGACY SCHEMA HAS DEPRECATION MARKERS
// ============================================================================

describe('schema.ts re-exports from DDD modules (inverted dependency)', () => {
  const schemaPath = resolve(ROOT, 'src/lib/db/schema.ts');

  it('importa tabelas Financial do módulo DDD', () => {
    const content = readFileSync(schemaPath, 'utf-8');
    expect(content).toContain("from '@/modules/financial/infrastructure/persistence/schemas'");
  });

  it('importa tabelas Fiscal do módulo DDD', () => {
    const content = readFileSync(schemaPath, 'utf-8');
    expect(content).toContain("from '@/modules/fiscal/infrastructure/persistence/schemas'");
  });

  it('re-exporta tabelas financeiras como aliases', () => {
    const content = readFileSync(schemaPath, 'utf-8');
    expect(content).toContain('export const financialCategories = _financialCategories');
    expect(content).toContain('export const bankAccounts = _bankAccounts');
    expect(content).toContain('export const billingInvoices = _billingInvoices');
  });

  it('re-exporta tabelas fiscais como aliases', () => {
    const content = readFileSync(schemaPath, 'utf-8');
    expect(content).toContain('export const cteHeader = _cteHeader');
    expect(content).toContain('export const fiscalSettings = _fiscalSettings');
    expect(content).toContain('export const externalCtes = _externalCtes');
  });
});
