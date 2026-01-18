import { describe, it, expect } from 'vitest';
import { generateUseCase } from '../../src/tools/generate-use-case.js';

describe('generateUseCase', () => {
  describe('validação de entrada', () => {
    it('deve rejeitar name vazio', async () => {
      await expect(
        generateUseCase({
          name: '',
          type: 'command',
          module: 'tms',
          description: 'Test',
          inputFields: [],
          outputFields: [],
          repositories: [],
        })
      ).rejects.toThrow('name é obrigatório');
    });

    it('deve rejeitar name não PascalCase', async () => {
      await expect(
        generateUseCase({
          name: 'approveContract', // lowercase
          type: 'command',
          module: 'tms',
          description: 'Test',
          inputFields: [],
          outputFields: [],
          repositories: [],
        })
      ).rejects.toThrow('name deve ser PascalCase');
    });

    it('deve rejeitar type inválido', async () => {
      await expect(
        generateUseCase({
          name: 'ApproveContract',
          type: 'invalid' as 'command',
          module: 'tms',
          description: 'Test',
          inputFields: [],
          outputFields: [],
          repositories: [],
        })
      ).rejects.toThrow('type é obrigatório e deve ser "command" ou "query"');
    });

    it('deve rejeitar module vazio', async () => {
      await expect(
        generateUseCase({
          name: 'ApproveContract',
          type: 'command',
          module: '',
          description: 'Test',
          inputFields: [],
          outputFields: [],
          repositories: [],
        })
      ).rejects.toThrow('module é obrigatório');
    });

    it('deve rejeitar description vazia', async () => {
      await expect(
        generateUseCase({
          name: 'ApproveContract',
          type: 'command',
          module: 'tms',
          description: '',
          inputFields: [],
          outputFields: [],
          repositories: [],
        })
      ).rejects.toThrow('description é obrigatório');
    });

    it('deve rejeitar inputField sem name', async () => {
      await expect(
        generateUseCase({
          name: 'ApproveContract',
          type: 'command',
          module: 'tms',
          description: 'Aprova contrato',
          inputFields: [{ name: '', type: 'string', required: true }],
          outputFields: [],
          repositories: [],
        })
      ).rejects.toThrow('Cada inputField deve ter name');
    });

    it('deve rejeitar outputField sem type', async () => {
      await expect(
        generateUseCase({
          name: 'ApproveContract',
          type: 'command',
          module: 'tms',
          description: 'Aprova contrato',
          inputFields: [],
          outputFields: [{ name: 'result', type: '' }],
          repositories: [],
        })
      ).rejects.toThrow('Cada outputField deve ter type');
    });
  });

  describe('geração de Command', () => {
    it('deve gerar Command com Input Port e Use Case', async () => {
      const result = await generateUseCase({
        name: 'ApproveFreightContract',
        type: 'command',
        module: 'tms',
        description: 'Aprova um contrato de frete',
        inputFields: [
          { name: 'contractId', type: 'string', required: true },
          { name: 'notes', type: 'string', required: false },
        ],
        outputFields: [
          { name: 'success', type: 'boolean' },
          { name: 'approvedAt', type: 'Date' },
        ],
        repositories: ['IFreightContractRepository'],
      });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
      
      // Verificar paths
      expect(result.files[0].path).toBe(
        'src/modules/tms/domain/ports/input/IApproveFreightContract.ts'
      );
      expect(result.files[1].path).toBe(
        'src/modules/tms/application/commands/ApproveFreightContractUseCase.ts'
      );

      // Verificar Input Port
      const inputPortContent = result.files[0].content;
      expect(inputPortContent).toContain('export interface ApproveFreightContractInput');
      expect(inputPortContent).toContain('contractId: string;');
      expect(inputPortContent).toContain('notes?: string;');
      expect(inputPortContent).toContain('export interface ApproveFreightContractOutput');
      expect(inputPortContent).toContain('success: boolean;');
      expect(inputPortContent).toContain('approvedAt: Date;');
      expect(inputPortContent).toContain('export interface IApproveFreightContract');
      expect(inputPortContent).toContain('execute(');
      expect(inputPortContent).toContain('ExecutionContext');

      // Verificar Use Case
      const useCaseContent = result.files[1].content;
      expect(useCaseContent).toContain('@injectable()');
      expect(useCaseContent).toContain('implements IApproveFreightContract');
      expect(useCaseContent).toContain('Promise<Result<ApproveFreightContractOutput, string>>');
      expect(useCaseContent).toContain('@inject(TOKENS.FreightContractRepository)');
    });
  });

  describe('geração de Query', () => {
    it('deve gerar Query com Input Port e Use Case', async () => {
      const result = await generateUseCase({
        name: 'ListFreightContracts',
        type: 'query',
        module: 'tms',
        description: 'Lista contratos de frete com filtros',
        inputFields: [
          { name: 'status', type: 'string', required: false },
          { name: 'page', type: 'number', required: false },
          { name: 'pageSize', type: 'number', required: false },
        ],
        outputFields: [
          { name: 'items', type: 'FreightContract[]' },
          { name: 'total', type: 'number' },
        ],
        repositories: ['IFreightContractRepository'],
      });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
      
      // Verificar que vai para queries/
      expect(result.files[1].path).toBe(
        'src/modules/tms/application/queries/ListFreightContractsUseCase.ts'
      );

      // Verificar conteúdo da Query
      const useCaseContent = result.files[1].content;
      expect(useCaseContent).toContain('Queries NUNCA modificam estado');
      expect(useCaseContent).toContain('USE-CASE-013');
    });
  });

  describe('validações no código gerado', () => {
    it('deve incluir validação de multi-tenancy', async () => {
      const result = await generateUseCase({
        name: 'TestUseCase',
        type: 'command',
        module: 'test',
        description: 'Test',
        inputFields: [],
        outputFields: [{ name: 'ok', type: 'boolean' }],
        repositories: [],
      });

      const useCaseContent = result.files[1].content;
      expect(useCaseContent).toContain('if (!context.organizationId || context.organizationId <= 0)');
      expect(useCaseContent).toContain('if (!context.branchId || context.branchId <= 0)');
      expect(useCaseContent).toContain('USE-CASE-008');
    });

    it('deve incluir validação de input fields required', async () => {
      const result = await generateUseCase({
        name: 'TestUseCase',
        type: 'command',
        module: 'test',
        description: 'Test',
        inputFields: [
          { name: 'requiredField', type: 'string', required: true },
        ],
        outputFields: [{ name: 'ok', type: 'boolean' }],
        repositories: [],
      });

      const useCaseContent = result.files[1].content;
      expect(useCaseContent).toContain("if (!input.requiredField || input.requiredField.trim() === '')");
      expect(useCaseContent).toContain("return Result.fail('requiredField é obrigatório')");
    });
  });

  describe('DI e Repositories', () => {
    it('deve incluir múltiplos repositories no constructor', async () => {
      const result = await generateUseCase({
        name: 'ProcessPayment',
        type: 'command',
        module: 'financial',
        description: 'Processa pagamento',
        inputFields: [{ name: 'paymentId', type: 'string', required: true }],
        outputFields: [{ name: 'processed', type: 'boolean' }],
        repositories: ['IPaymentRepository', 'IAccountRepository'],
      });

      const useCaseContent = result.files[1].content;
      expect(useCaseContent).toContain('@inject(TOKENS.PaymentRepository)');
      expect(useCaseContent).toContain('@inject(TOKENS.AccountRepository)');
      expect(useCaseContent).toContain('private readonly iPaymentRepository');
      expect(useCaseContent).toContain('private readonly iAccountRepository');
    });

    it('deve incluir domain services quando fornecidos', async () => {
      const result = await generateUseCase({
        name: 'CalculateTax',
        type: 'command',
        module: 'fiscal',
        description: 'Calcula impostos',
        inputFields: [{ name: 'documentId', type: 'string', required: true }],
        outputFields: [{ name: 'totalTax', type: 'number' }],
        repositories: ['IFiscalDocumentRepository'],
        domainServices: ['TaxCalculator'],
      });

      const useCaseContent = result.files[1].content;
      expect(useCaseContent).toContain('@inject(TOKENS.TaxCalculator)');
      expect(useCaseContent).toContain("import { TaxCalculator } from '../../domain/services/TaxCalculator'");
    });
  });

  describe('ExecutionContext', () => {
    it('deve definir ExecutionContext no Input Port', async () => {
      const result = await generateUseCase({
        name: 'TestUseCase',
        type: 'query',
        module: 'test',
        description: 'Test',
        inputFields: [],
        outputFields: [{ name: 'data', type: 'string' }],
        repositories: [],
      });

      const inputPortContent = result.files[0].content;
      expect(inputPortContent).toContain('export interface ExecutionContext');
      expect(inputPortContent).toContain('userId: string;');
      expect(inputPortContent).toContain('organizationId: number;');
      expect(inputPortContent).toContain('branchId: number;');
    });
  });

  describe('instruções', () => {
    it('deve incluir instruções para Command', async () => {
      const result = await generateUseCase({
        name: 'ApproveContract',
        type: 'command',
        module: 'tms',
        description: 'Aprova contrato',
        inputFields: [],
        outputFields: [{ name: 'ok', type: 'boolean' }],
        repositories: ['IContractRepository'],
      });

      expect(result.instructions.some(i => i.includes('index.ts'))).toBe(true);
      expect(result.instructions.some(i => i.includes('DI'))).toBe(true);
      expect(result.instructions.some(i => i.includes('TOKENS'))).toBe(true);
      expect(result.instructions.some(i => i.includes('COMMAND'))).toBe(true);
    });

    it('deve incluir instruções para Query', async () => {
      const result = await generateUseCase({
        name: 'ListContracts',
        type: 'query',
        module: 'tms',
        description: 'Lista contratos',
        inputFields: [],
        outputFields: [{ name: 'items', type: 'Contract[]' }],
        repositories: ['IContractRepository'],
      });

      expect(result.instructions.some(i => i.includes('QUERY'))).toBe(true);
      expect(result.instructions.some(i => i.includes('NUNCA') || i.includes('leitura'))).toBe(true);
    });
  });

  describe('imports', () => {
    it('deve importar corretamente do Input Port', async () => {
      const result = await generateUseCase({
        name: 'ProcessOrder',
        type: 'command',
        module: 'sales',
        description: 'Processa pedido',
        inputFields: [{ name: 'orderId', type: 'string', required: true }],
        outputFields: [{ name: 'processed', type: 'boolean' }],
        repositories: ['IOrderRepository'],
      });

      const useCaseContent = result.files[1].content;
      expect(useCaseContent).toContain("import {");
      expect(useCaseContent).toContain("IProcessOrder,");
      expect(useCaseContent).toContain("ProcessOrderInput,");
      expect(useCaseContent).toContain("ProcessOrderOutput,");
      expect(useCaseContent).toContain("ExecutionContext,");
      expect(useCaseContent).toContain("} from '../../domain/ports/input/IProcessOrder';");
    });

    it('deve importar Result e TOKENS', async () => {
      const result = await generateUseCase({
        name: 'TestUseCase',
        type: 'command',
        module: 'test',
        description: 'Test',
        inputFields: [],
        outputFields: [{ name: 'ok', type: 'boolean' }],
        repositories: [],
      });

      const useCaseContent = result.files[1].content;
      expect(useCaseContent).toContain("import { Result } from '@/shared/domain';");
      expect(useCaseContent).toContain("import { TOKENS } from '@/shared/infrastructure/di/tokens';");
      expect(useCaseContent).toContain("import { inject, injectable } from 'tsyringe';");
    });
  });

  describe('Error handling', () => {
    it('deve incluir try-catch com tratamento de erro', async () => {
      const result = await generateUseCase({
        name: 'RiskyOperation',
        type: 'command',
        module: 'test',
        description: 'Operação arriscada',
        inputFields: [],
        outputFields: [{ name: 'done', type: 'boolean' }],
        repositories: [],
      });

      const useCaseContent = result.files[1].content;
      expect(useCaseContent).toContain('try {');
      expect(useCaseContent).toContain('} catch (error: unknown) {');
      expect(useCaseContent).toContain('const errorMessage = error instanceof Error');
      expect(useCaseContent).toContain('return Result.fail(');
    });
  });

  describe('output defaults', () => {
    it('deve gerar defaults corretos para diferentes tipos', async () => {
      const result = await generateUseCase({
        name: 'TestOutput',
        type: 'query',
        module: 'test',
        description: 'Test',
        inputFields: [],
        outputFields: [
          { name: 'stringField', type: 'string' },
          { name: 'numberField', type: 'number' },
          { name: 'booleanField', type: 'boolean' },
          { name: 'dateField', type: 'Date' },
          { name: 'arrayField', type: 'Item[]' },
        ],
        repositories: [],
      });

      const useCaseContent = result.files[1].content;
      expect(useCaseContent).toContain("stringField: ''");
      expect(useCaseContent).toContain('numberField: 0');
      expect(useCaseContent).toContain('booleanField: false');
      expect(useCaseContent).toContain('dateField: new Date()');
      expect(useCaseContent).toContain('arrayField: []');
    });
  });
});
