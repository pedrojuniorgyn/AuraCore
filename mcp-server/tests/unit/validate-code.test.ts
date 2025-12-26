import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateCode } from '../../src/tools/validate-code.js';
import { getContractTool } from '../../src/tools/get-contract-tool.js';
import { mockApiContract, mockRbacContract } from '../fixtures/contracts.js';

// Mock getContractTool
vi.mock('../../src/tools/get-contract-tool.js');

describe('validateCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('casos felizes', () => {
    it('deve validar codigo sem violacoes', async () => {
      const contractWithoutRules = {
        ...mockApiContract,
        rules: []
      };
      vi.mocked(getContractTool).mockResolvedValue(contractWithoutRules);

      const code = `
        export async function handler(req: Request) {
          const data = schema.parse(req.body);
          return Response.json(data);
        }
      `;

      const result = await validateCode(code, ['api-contract'], 'typescript');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.contractsChecked).toContain('api-contract');
    });

    it('deve detectar SQL injection', async () => {
      const contractWithSqlRule = {
        ...mockApiContract,
        rules: ['Prevenir SQL injection usando parametros']
      };
      vi.mocked(getContractTool).mockResolvedValue(contractWithSqlRule);

      const code = `
        const query = "SELECT * FROM users WHERE id = " + userId;
        db.execute(query);
      `;

      const result = await validateCode(code, ['api-contract'], 'typescript');

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe('error');
      expect(result.violations[0].message).toContain('SQL injection');
    });

    it('deve detectar multiple writes sem transaction', async () => {
      const contractWithTxRule = {
        ...mockApiContract,
        rules: ['Usar transactions para operacoes multiplas']
      };
      vi.mocked(getContractTool).mockResolvedValue(contractWithTxRule);

      const code = `
        await prisma.user.create({ data });
        await prisma.log.create({ data: { action: 'user_created' } });
      `;

      const result = await validateCode(code, ['api-contract'], 'typescript');

      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.message.includes('transaction'))).toBe(true);
    });

    it('deve validar multiplos contratos', async () => {
      vi.mocked(getContractTool)
        .mockResolvedValueOnce(mockApiContract)
        .mockResolvedValueOnce(mockRbacContract);

      const code = `export function test() { return true; }`;

      const result = await validateCode(code, ['api-contract', 'rbac-contract'], 'typescript');

      expect(result.contractsChecked).toHaveLength(2);
      expect(result.contractsChecked).toContain('api-contract');
      expect(result.contractsChecked).toContain('rbac-contract');
    });

    it('deve suportar diferentes linguagens', async () => {
      vi.mocked(getContractTool).mockResolvedValue(mockApiContract);

      const jsCode = `function test() { return true; }`;
      const sqlCode = `SELECT * FROM users;`;

      const result1 = await validateCode(jsCode, ['api-contract'], 'javascript');
      const result2 = await validateCode(sqlCode, ['api-contract'], 'sql');

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('nao deve reportar Prisma como SQL injection', async () => {
      const contractWithSqlRule = {
        ...mockApiContract,
        rules: ['Prevenir SQL injection']
      };
      vi.mocked(getContractTool).mockResolvedValue(contractWithSqlRule);

      const code = `
        const user = await prisma.user.findUnique({ where: { id: userId } });
      `;

      const result = await validateCode(code, ['api-contract'], 'typescript');

      // Prisma e seguro, nao deve ter violacoes de SQL injection
      const hasSqlInjection = result.violations.some(v => v.message.includes('SQL injection'));
      expect(hasSqlInjection).toBe(false);
    });

    it('deve usar language default typescript', async () => {
      vi.mocked(getContractTool).mockResolvedValue(mockApiContract);

      const code = `const x: number = 1;`;
      const result = await validateCode(code, ['api-contract']);

      expect(result).toBeDefined();
      expect(result.contractsChecked).toContain('api-contract');
    });
  });

  describe('validacao de entrada', () => {
    it('deve rejeitar code vazio', async () => {
      await expect(validateCode('', ['api-contract'])).rejects.toThrow('code must be a non-empty string');
    });

    it('deve rejeitar code apenas com espacos', async () => {
      await expect(validateCode('   ', ['api-contract'])).rejects.toThrow('code must be a non-empty string');
    });

    it('deve rejeitar code undefined', async () => {
      await expect(validateCode(undefined as unknown as string, ['api-contract'])).rejects.toThrow('code must be a non-empty string');
    });

    it('deve rejeitar code null', async () => {
      await expect(validateCode(null as unknown as string, ['api-contract'])).rejects.toThrow('code must be a non-empty string');
    });

    it('deve rejeitar contract_ids vazio', async () => {
      await expect(validateCode('const x = 1;', [])).rejects.toThrow('contract_ids must be a non-empty array');
    });

    it('deve rejeitar contract_ids nao-array', async () => {
      await expect(validateCode('const x = 1;', 'not-array' as unknown as string[])).rejects.toThrow('contract_ids must be a non-empty array');
    });

    it('deve rejeitar contract_ids undefined', async () => {
      await expect(validateCode('const x = 1;', undefined as unknown as string[])).rejects.toThrow('contract_ids must be a non-empty array');
    });

    it('deve filtrar contract_ids vazios', async () => {
      vi.mocked(getContractTool).mockResolvedValue(mockApiContract);
      
      const result = await validateCode('const x = 1;', ['api-contract', '', '  '], 'typescript');
      
      expect(result.contractsChecked).toContain('api-contract');
      expect(result.contractsChecked).not.toContain('');
    });
  });

  describe('tratamento de erros', () => {
    it('deve continuar validacao quando contrato nao existe', async () => {
      vi.mocked(getContractTool).mockRejectedValue(new Error('Contract not found'));

      const result = await validateCode('const x = 1;', ['non-existent'], 'typescript');

      expect(result).toBeDefined();
      expect(result.violations).toBeDefined();
    });

    it('deve continuar validacao mesmo com contrato invalido', async () => {
      vi.mocked(getContractTool)
        .mockRejectedValueOnce(new Error('Invalid'))
        .mockResolvedValueOnce(mockApiContract);

      const result = await validateCode('const x = 1;', ['invalid', 'api-contract'], 'typescript');

      expect(result.contractsChecked).toContain('api-contract');
    });

    it('deve tratar gracefully quando getContractTool falha', async () => {
      vi.mocked(getContractTool).mockRejectedValue(new Error('Filesystem error'));

      const result = await validateCode('const x = 1;', ['test'], 'typescript');

      expect(result).toBeDefined();
      expect(result.valid).toBe(true); // Sem violacoes se contratos nao carregam
    });
  });

  describe('summary', () => {
    it('deve gerar summary correto sem violacoes', async () => {
      const contractWithoutRules = {
        ...mockApiContract,
        rules: []
      };
      vi.mocked(getContractTool).mockResolvedValue(contractWithoutRules);

      const result = await validateCode('const x = 1;', ['api-contract'], 'typescript');

      expect(result.summary).toContain('successfully');
      expect(result.summary).toContain('0 warning(s)');
    });

    it('deve gerar summary correto com violacoes', async () => {
      const contractWithRule = {
        ...mockApiContract,
        rules: ['Usar transactions para operacoes multiplas']
      };
      vi.mocked(getContractTool).mockResolvedValue(contractWithRule);

      const code = `
        await prisma.user.create({ data });
        await prisma.log.create({ data });
      `;

      const result = await validateCode(code, ['api-contract'], 'typescript');

      expect(result.summary).toContain('failed');
      expect(result.summary).toMatch(/\d+ error\(s\)/);
    });

    it('deve contar errors e warnings separadamente', async () => {
      const contractWithRules = {
        ...mockApiContract,
        rules: [
          'Usar transactions para operacoes multiplas',
          'Usar try-catch para error handling'
        ]
      };
      vi.mocked(getContractTool).mockResolvedValue(contractWithRules);

      const code = `
        async function test() {
          await prisma.user.create({ data });
          await prisma.log.create({ data });
          const result = await riskyOperation();
          return result;
        }
      `;

      const result = await validateCode(code, ['api-contract'], 'typescript');

      const errors = result.violations.filter(v => v.severity === 'error').length;
      const warnings = result.violations.filter(v => v.severity === 'warning').length;

      expect(result.summary).toContain(`${errors} error(s)`);
      expect(result.summary).toContain(`${warnings} warning(s)`);
    });
  });
});

