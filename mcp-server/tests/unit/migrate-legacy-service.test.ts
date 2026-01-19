import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { migrateLegacyService } from '../../src/tools/migrate-legacy-service.js';

// Mock do fs
vi.mock('fs');

describe('migrateLegacyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue('/project');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validação de entrada', () => {
    it('deve rejeitar servicePath vazio', async () => {
      await expect(
        migrateLegacyService({
          servicePath: '',
          targetModule: 'fiscal',
          options: { generateCode: false, preserveInterface: true, dryRun: true },
        })
      ).rejects.toThrow('servicePath é obrigatório');
    });

    it('deve rejeitar servicePath que não começa com src/services/', async () => {
      await expect(
        migrateLegacyService({
          servicePath: 'src/modules/fiscal/service.ts',
          targetModule: 'fiscal',
          options: { generateCode: false, preserveInterface: true, dryRun: true },
        })
      ).rejects.toThrow('servicePath deve começar com src/services/');
    });

    it('deve rejeitar servicePath que não é .ts', async () => {
      await expect(
        migrateLegacyService({
          servicePath: 'src/services/fiscal/calculator.js',
          targetModule: 'fiscal',
          options: { generateCode: false, preserveInterface: true, dryRun: true },
        })
      ).rejects.toThrow('servicePath deve ser um arquivo .ts');
    });

    it('deve rejeitar targetModule não lowercase', async () => {
      await expect(
        migrateLegacyService({
          servicePath: 'src/services/fiscal/calculator.ts',
          targetModule: 'Fiscal',
          options: { generateCode: false, preserveInterface: true, dryRun: true },
        })
      ).rejects.toThrow('targetModule deve ser lowercase');
    });
  });

  describe('arquivo não encontrado', () => {
    it('deve rejeitar quando arquivo não existe', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(
        migrateLegacyService({
          servicePath: 'src/services/fiscal/calculator.ts',
          targetModule: 'fiscal',
          options: { generateCode: false, preserveInterface: true, dryRun: true },
        })
      ).rejects.toThrow('Arquivo não encontrado');
    });
  });

  describe('análise de serviço', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it('deve analisar função pura como domain-service', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(`
/**
 * Calcula ICMS
 */
export function calculateICMS(value: number, rate: number): number {
  return value * rate;
}
`);

      const result = await migrateLegacyService({
        servicePath: 'src/services/fiscal/tax-calculator.ts',
        targetModule: 'fiscal',
        options: { generateCode: false, preserveInterface: true, dryRun: true },
      });

      expect(result.analysis.functions.length).toBeGreaterThan(0);
      const fn = result.analysis.functions[0];
      expect(fn.name).toBe('calculateICMS');
      expect(fn.isStateless).toBe(true);
      expect(fn.hasSideEffects).toBe(false);
      expect(fn.suggestedLocation).toBe('domain-service');
    });

    it('deve analisar função com db como infrastructure-adapter', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(`
import { db } from '@/lib/db';

export async function fetchTaxRules(uf: string): Promise<TaxRule[]> {
  const result = await db.query('SELECT * FROM tax_rules WHERE uf = ?', [uf]);
  return result.rows;
}
`);

      const result = await migrateLegacyService({
        servicePath: 'src/services/fiscal/tax-repository.ts',
        targetModule: 'fiscal',
        options: { generateCode: false, preserveInterface: true, dryRun: true },
      });

      expect(result.analysis.functions.length).toBeGreaterThan(0);
      const fn = result.analysis.functions[0];
      expect(fn.hasSideEffects).toBe(true);
      expect(fn.suggestedLocation).toBe('infrastructure-adapter');
    });

    it('deve analisar função async que orquestra como use-case', async () => {
      // Função async com side effects (console.log) que não acessa db/fetch/axios diretamente
      // Deve ser classificada como use-case (não infrastructure-adapter)
      vi.mocked(fs.readFileSync).mockReturnValue(`
export async function processInvoice(invoiceId: string): Promise<void> {
  console.log('Processing invoice');
  const invoice = await getInvoice(invoiceId);
  const validated = await validateInvoice(invoice);
  const taxes = await calculateTaxes(validated);
  await saveInvoice(taxes);
}
`);

      const result = await migrateLegacyService({
        servicePath: 'src/services/fiscal/invoice-processor.ts',
        targetModule: 'fiscal',
        options: { generateCode: false, preserveInterface: true, dryRun: true },
      });

      expect(result.analysis.functions.length).toBeGreaterThan(0);
      const fn = result.analysis.functions[0];
      expect(fn.isAsync).toBe(true);
      // Função async com side effects (console) mas sem db/fetch/axios é use-case
      expect(fn.suggestedLocation).toBe('application-use-case');
    });
  });

  describe('plano de migração', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
export function calculateTax(value: number): number {
  return value * 0.17;
}

export async function processTax(data: TaxData): Promise<Result> {
  const tax = calculateTax(data.value);
  await saveTax(tax);
  return { success: true };
}
`);
    });

    it('deve gerar steps de migração', async () => {
      const result = await migrateLegacyService({
        servicePath: 'src/services/fiscal/tax-service.ts',
        targetModule: 'fiscal',
        options: { generateCode: false, preserveInterface: true, dryRun: true },
      });

      expect(result.migrationPlan.steps.length).toBeGreaterThan(0);
      
      // Deve ter step de criar estrutura
      const createStep = result.migrationPlan.steps.find(s => 
        s.action === 'create' && s.description.includes('estrutura')
      );
      expect(createStep).toBeDefined();

      // Deve ter step de atualizar imports
      const updateImportsStep = result.migrationPlan.steps.find(s => 
        s.action === 'update-imports'
      );
      expect(updateImportsStep).toBeDefined();
    });

    it('deve estimar esforço', async () => {
      const result = await migrateLegacyService({
        servicePath: 'src/services/fiscal/tax-service.ts',
        targetModule: 'fiscal',
        options: { generateCode: false, preserveInterface: true, dryRun: true },
      });

      expect(result.migrationPlan.estimatedEffort).toBeDefined();
      expect(typeof result.migrationPlan.estimatedEffort).toBe('string');
    });

    it('deve identificar riscos', async () => {
      const result = await migrateLegacyService({
        servicePath: 'src/services/fiscal/tax-service.ts',
        targetModule: 'fiscal',
        options: { generateCode: false, preserveInterface: true, dryRun: true },
      });

      expect(Array.isArray(result.migrationPlan.risks)).toBe(true);
    });
  });

  describe('geração de código', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(`
export function calculateICMS(value: number, rate: number): number {
  return value * rate;
}
`);
    });

    it('deve gerar arquivos quando generateCode=true', async () => {
      const result = await migrateLegacyService({
        servicePath: 'src/services/fiscal/tax-calculator.ts',
        targetModule: 'fiscal',
        options: { generateCode: true, preserveInterface: true, dryRun: false },
      });

      expect(result.generatedFiles).toBeDefined();
      expect(result.generatedFiles?.length).toBeGreaterThan(0);
    });

    it('não deve gerar arquivos quando dryRun=true', async () => {
      const result = await migrateLegacyService({
        servicePath: 'src/services/fiscal/tax-calculator.ts',
        targetModule: 'fiscal',
        options: { generateCode: true, preserveInterface: true, dryRun: true },
      });

      expect(result.generatedFiles).toBeUndefined();
    });

    it('deve gerar compatibility export quando preserveInterface=true', async () => {
      const result = await migrateLegacyService({
        servicePath: 'src/services/fiscal/tax-calculator.ts',
        targetModule: 'fiscal',
        options: { generateCode: true, preserveInterface: true, dryRun: false },
      });

      const indexFile = result.generatedFiles?.find(f => f.path.includes('index.ts'));
      expect(indexFile).toBeDefined();
      expect(indexFile?.content).toContain('@deprecated');
    });
  });

  describe('complexidade', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it('deve detectar complexidade baixa para arquivo pequeno', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(`
export function simple(): void {}
`);

      const result = await migrateLegacyService({
        servicePath: 'src/services/fiscal/simple.ts',
        targetModule: 'fiscal',
        options: { generateCode: false, preserveInterface: true, dryRun: true },
      });

      expect(result.analysis.complexity).toBe('low');
    });

    it('deve detectar complexidade alta para arquivo grande', async () => {
      // Gerar arquivo com muitas linhas e funções (> 500 linhas, > 10 funções)
      const longFunctions = Array.from({ length: 15 }, (_, i) => {
        // Cada função com ~40 linhas para totalizar > 500 linhas
        const body = Array.from({ length: 35 }, (_, j) => 
          `  const value${j} = ${i * 100 + j};`
        ).join('\n');
        return `export function complexFn${i}(input: string): number {\n${body}\n  return input.length;\n}`;
      }).join('\n\n');

      vi.mocked(fs.readFileSync).mockReturnValue(longFunctions);

      const result = await migrateLegacyService({
        servicePath: 'src/services/fiscal/complex.ts',
        targetModule: 'fiscal',
        options: { generateCode: false, preserveInterface: true, dryRun: true },
      });

      // Com 15 funções e > 500 linhas, deve ser high
      expect(result.analysis.complexity).toBe('high');
    });
  });

  describe('dependências', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it('deve classificar imports internos e externos', async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(`
import { db } from '@/lib/db';
import axios from 'axios';
import { helper } from './helper';

export function test(): void {}
`);

      const result = await migrateLegacyService({
        servicePath: 'src/services/fiscal/service.ts',
        targetModule: 'fiscal',
        options: { generateCode: false, preserveInterface: true, dryRun: true },
      });

      expect(result.analysis.dependencies.internal).toContain('@/lib/db');
      expect(result.analysis.dependencies.internal).toContain('./helper');
      expect(result.analysis.dependencies.external).toContain('axios');
    });
  });
});
