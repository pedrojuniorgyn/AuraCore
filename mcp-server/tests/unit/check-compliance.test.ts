import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkCompliance } from '../../src/tools/check-compliance.js';
import { validateCode } from '../../src/tools/validate-code.js';
import * as fs from 'fs/promises';

vi.mock('fs/promises');
vi.mock('../../src/tools/validate-code.js');

describe('checkCompliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('casos felizes', () => {
    it('deve retornar relatorio completo para arquivo valido', async () => {
      const mockCode = `
        export async function handler(req: Request) {
          return Response.json({ ok: true });
        }
      `;
      
      vi.mocked(fs.readFile).mockResolvedValue(mockCode);
      vi.mocked(validateCode).mockResolvedValue({
        valid: true,
        violations: [],
        contractsChecked: ['api-contract'],
        summary: 'OK'
      });

      const result = await checkCompliance('src/app/api/test/route.ts');

      expect(result.file).toBe('src/app/api/test/route.ts');
      expect(result.language).toBe('typescript');
      expect(result.summary.compliant).toBe(true);
      expect(result.summary.errors).toBe(0);
    });

    it('deve detectar contratos relevantes por path', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('const x = 1;');
      vi.mocked(validateCode).mockResolvedValue({
        valid: true,
        violations: [],
        contractsChecked: ['api-contract'],
        summary: 'OK'
      });

      await checkCompliance('src/app/api/users/route.ts');

      expect(validateCode).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['api-contract']),
        'typescript'
      );
    });

    it('deve detectar linguagem typescript por extensao .ts', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('const x: number = 1;');
      vi.mocked(validateCode).mockResolvedValue({
        valid: true,
        violations: [],
        contractsChecked: [],
        summary: 'OK'
      });

      const result = await checkCompliance('src/lib/utils.ts');

      expect(result.language).toBe('typescript');
      expect(validateCode).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        'typescript'
      );
    });

    it('deve detectar linguagem typescript por extensao .tsx', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('export const Component = () => <div />;');
      vi.mocked(validateCode).mockResolvedValue({
        valid: true,
        violations: [],
        contractsChecked: [],
        summary: 'OK'
      });

      const result = await checkCompliance('src/components/Button.tsx');

      expect(result.language).toBe('typescript');
    });

    it('deve detectar linguagem javascript por extensao .js', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('const x = 1;');
      vi.mocked(validateCode).mockResolvedValue({
        valid: true,
        violations: [],
        contractsChecked: [],
        summary: 'OK'
      });

      const result = await checkCompliance('src/lib/utils.js');

      expect(result.language).toBe('javascript');
    });

    it('deve detectar linguagem sql por extensao .sql', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('SELECT * FROM users;');
      vi.mocked(validateCode).mockResolvedValue({
        valid: true,
        violations: [],
        contractsChecked: [],
        summary: 'OK'
      });

      const result = await checkCompliance('migrations/001_init.sql');

      expect(result.language).toBe('sql');
    });

    it('deve incluir type-safety para todos arquivos', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('const x = 1;');
      vi.mocked(validateCode).mockResolvedValue({
        valid: true,
        violations: [],
        contractsChecked: ['type-safety'],
        summary: 'OK'
      });

      await checkCompliance('src/lib/utils.ts');

      expect(validateCode).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['type-safety']),
        'typescript'
      );
    });

    it('deve detectar multi-tenancy quando codigo menciona organizationId', async () => {
      const code = 'const user = await prisma.user.findMany({ where: { organizationId } });';
      vi.mocked(fs.readFile).mockResolvedValue(code);
      vi.mocked(validateCode).mockResolvedValue({
        valid: true,
        violations: [],
        contractsChecked: ['type-safety', 'multi-tenancy'],
        summary: 'OK'
      });

      await checkCompliance('src/lib/users.ts');

      expect(validateCode).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['multi-tenancy']),
        'typescript'
      );
    });

    it('deve detectar database-transactions quando codigo menciona transaction', async () => {
      const code = 'await prisma.$transaction([...]);';
      vi.mocked(fs.readFile).mockResolvedValue(code);
      vi.mocked(validateCode).mockResolvedValue({
        valid: true,
        violations: [],
        contractsChecked: ['type-safety', 'database-transactions'],
        summary: 'OK'
      });

      await checkCompliance('src/lib/db.ts');

      expect(validateCode).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['database-transactions']),
        'typescript'
      );
    });

    it('deve detectar input-validation quando codigo menciona zod', async () => {
      const code = 'const schema = z.object({ name: z.string() });';
      vi.mocked(fs.readFile).mockResolvedValue(code);
      vi.mocked(validateCode).mockResolvedValue({
        valid: true,
        violations: [],
        contractsChecked: ['type-safety', 'input-validation'],
        summary: 'OK'
      });

      await checkCompliance('src/lib/validation.ts');

      expect(validateCode).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['input-validation']),
        'typescript'
      );
    });
  });

  describe('validacao de entrada', () => {
    it('deve rejeitar file_path vazio', async () => {
      await expect(checkCompliance('')).rejects.toThrow('file_path must be a non-empty string');
    });

    it('deve rejeitar file_path apenas com espacos', async () => {
      await expect(checkCompliance('   ')).rejects.toThrow('file_path must be a non-empty string');
    });

    it('deve rejeitar file_path undefined', async () => {
      await expect(checkCompliance(undefined as unknown as string)).rejects.toThrow('file_path must be a non-empty string');
    });

    it('deve rejeitar file_path null', async () => {
      await expect(checkCompliance(null as unknown as string)).rejects.toThrow('file_path must be a non-empty string');
    });

    it('deve rejeitar extensao nao suportada', async () => {
      await expect(checkCompliance('file.py')).rejects.toThrow('Unsupported file type');
    });

    it('deve rejeitar extensao nao suportada .txt', async () => {
      await expect(checkCompliance('readme.txt')).rejects.toThrow('Unsupported file type');
    });
  });

  describe('tratamento de erros', () => {
    it('deve lancar erro quando arquivo nao existe', async () => {
      vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT' });

      await expect(checkCompliance('non-existent.ts')).rejects.toThrow('File not found');
    });

    it('deve re-lancar erro quando nao e ENOENT', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Permission denied'));

      await expect(checkCompliance('test.ts')).rejects.toThrow('Permission denied');
    });

    it('deve continuar quando validateCode falha', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('const x = 1;');
      vi.mocked(validateCode).mockRejectedValue(new Error('Validation failed'));

      // Se validateCode falha, checkCompliance deve re-lancar o erro
      await expect(checkCompliance('test.ts')).rejects.toThrow('Validation failed');
    });
  });

  describe('summary e compliance', () => {
    it('deve gerar summary COMPLIANT quando sem violacoes', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('const x = 1;');
      vi.mocked(validateCode).mockResolvedValue({
        valid: true,
        violations: [],
        contractsChecked: ['type-safety'],
        summary: 'OK'
      });

      const result = await checkCompliance('test.ts');

      expect(result.summary.compliant).toBe(true);
      expect(result.summary.errors).toBe(0);
      expect(result.summary.warnings).toBe(0);
      expect(result.summary.total).toBe(0);
    });

    it('deve gerar summary NON-COMPLIANT quando ha erros', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('const x = 1;');
      vi.mocked(validateCode).mockResolvedValue({
        valid: false,
        violations: [
          { 
            contractId: 'test', 
            rule: 'test rule', 
            severity: 'error', 
            message: 'test error',
            suggestion: 'fix it'
          }
        ],
        contractsChecked: ['test'],
        summary: 'Failed'
      });

      const result = await checkCompliance('test.ts');

      expect(result.summary.compliant).toBe(false);
      expect(result.summary.errors).toBe(1);
      expect(result.summary.total).toBe(1);
    });

    it('deve contar warnings separadamente', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('const x = 1;');
      vi.mocked(validateCode).mockResolvedValue({
        valid: true,
        violations: [
          { 
            contractId: 'test', 
            rule: 'test rule', 
            severity: 'warning', 
            message: 'test warning'
          }
        ],
        contractsChecked: ['test'],
        summary: 'OK with warnings'
      });

      const result = await checkCompliance('test.ts');

      expect(result.summary.compliant).toBe(true); // Warnings nao bloqueiam compliance
      expect(result.summary.warnings).toBe(1);
      expect(result.summary.errors).toBe(0);
    });

    it('deve incluir violations no relatorio', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('const x = 1;');
      vi.mocked(validateCode).mockResolvedValue({
        valid: false,
        violations: [
          { 
            contractId: 'test', 
            rule: 'test rule', 
            severity: 'error', 
            message: 'test error',
            suggestion: 'fix it'
          }
        ],
        contractsChecked: ['test'],
        summary: 'Failed'
      });

      const result = await checkCompliance('test.ts');

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].contractId).toBe('test');
      expect(result.violations[0].severity).toBe('error');
    });

    it('deve incluir contractsChecked no relatorio', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('const x = 1;');
      vi.mocked(validateCode).mockResolvedValue({
        valid: true,
        violations: [],
        contractsChecked: ['type-safety'],
        summary: 'OK'
      });

      const result = await checkCompliance('test.ts');

      expect(result.contractsChecked).toContain('type-safety');
      expect(result.contractsChecked.length).toBeGreaterThan(0);
    });
  });
});

