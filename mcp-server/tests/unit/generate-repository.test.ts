/**
 * Testes unitários para generate_repository tool
 */

import { describe, it, expect } from 'vitest';
import { generateRepository } from '../../src/tools/generate-repository.js';

describe('generate_repository', () => {
  describe('validação de input', () => {
    it('deve rejeitar entityName vazio', async () => {
      await expect(generateRepository({
        entityName: '',
        module: 'tms',
        entity: {
          properties: [{ name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true }],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: true,
          includeSearch: false,
          customMethods: [],
        },
      })).rejects.toThrow('entityName é obrigatório');
    });

    it('deve rejeitar entityName não PascalCase', async () => {
      await expect(generateRepository({
        entityName: 'freightContract',
        module: 'tms',
        entity: {
          properties: [{ name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true }],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: true,
          includeSearch: false,
          customMethods: [],
        },
      })).rejects.toThrow('PascalCase');
    });

    it('deve rejeitar module não lowercase', async () => {
      await expect(generateRepository({
        entityName: 'FreightContract',
        module: 'TMS',
        entity: {
          properties: [{ name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true }],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: true,
          includeSearch: false,
          customMethods: [],
        },
      })).rejects.toThrow('lowercase');
    });

    it('deve rejeitar entity.properties vazio', async () => {
      await expect(generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: true,
          includeSearch: false,
          customMethods: [],
        },
      })).rejects.toThrow('pelo menos uma propriedade');
    });
  });

  describe('geração de interface', () => {
    it('deve gerar interface com métodos padrão', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true },
            { name: 'value', type: 'number', isNullable: false, isUnique: false, hasIndex: false },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: true,
          includeSearch: false,
          customMethods: [],
        },
      });

      expect(result.success).toBe(true);
      expect(result.files.interface.path).toBe('src/modules/tms/domain/ports/output/IFreightContractRepository.ts');
      expect(result.files.interface.content).toContain('interface IFreightContractRepository');
      expect(result.files.interface.content).toContain('findById(');
      expect(result.files.interface.content).toContain('findMany(');
      expect(result.files.interface.content).toContain('save(');
      expect(result.files.interface.content).toContain('delete(');
      expect(result.files.interface.content).toContain('exists(');
    });

    it('deve incluir organizationId e branchId obrigatórios nos filtros', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: false,
          includeSearch: false,
          customMethods: [],
        },
      });

      expect(result.files.interface.content).toContain('organizationId: number');
      expect(result.files.interface.content).toContain('branchId: number');
      // branchId NUNCA é opcional (ENFORCE-004)
      expect(result.files.interface.content).not.toContain('branchId?:');
    });

    it('deve gerar PaginatedResult quando includePagination=true', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: true,
          includeSearch: false,
          customMethods: [],
        },
      });

      expect(result.files.interface.content).toContain('PaginatedResult<');
      expect(result.files.interface.content).toContain('page?: number');
      expect(result.files.interface.content).toContain('pageSize?: number');
    });
  });

  describe('geração de schema', () => {
    it('deve gerar schema com campos corretos', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true },
            { name: 'value', type: 'number', isNullable: true, isUnique: false, hasIndex: false },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: true,
          includeSearch: false,
          customMethods: [],
        },
      });

      expect(result.files.schema.path).toContain('freight-contract.schema.ts');
      expect(result.files.schema.content).toContain('mssqlTable');
      expect(result.files.schema.content).toContain('organizationId');
      expect(result.files.schema.content).toContain('branchId');
      expect(result.files.schema.content).toContain('createdAt');
      expect(result.files.schema.content).toContain('updatedAt');
    });

    it('deve incluir deletedAt quando includeSoftDelete=true', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: false,
          includeSearch: false,
          customMethods: [],
        },
      });

      expect(result.files.schema.content).toContain('deletedAt');
    });

    it('deve gerar tipos inferidos ($inferSelect, $inferInsert)', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: false,
          includeSearch: false,
          customMethods: [],
        },
      });

      expect(result.files.schema.content).toContain('$inferSelect');
      expect(result.files.schema.content).toContain('$inferInsert');
    });

    it('deve gerar 2 colunas para Money (amount + currency)', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'totalAmount', type: 'Money', isNullable: false, isUnique: false, hasIndex: false },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: false,
          includeSearch: false,
          customMethods: [],
        },
      });

      expect(result.files.schema.content).toContain('totalAmount:');
      expect(result.files.schema.content).toContain('totalAmountCurrency:');
    });
  });

  describe('geração de mapper', () => {
    it('deve usar reconstitute no toDomain', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: false,
          includeSearch: false,
          customMethods: [],
        },
      });

      expect(result.files.mapper.content).toContain('toDomain');
      expect(result.files.mapper.content).toContain('reconstitute');
      expect(result.files.mapper.content).not.toContain('.create(');
    });

    it('deve ter toPersistence', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: false,
          includeSearch: false,
          customMethods: [],
        },
      });

      expect(result.files.mapper.content).toContain('toPersistence');
    });
  });

  describe('geração de implementação', () => {
    it('deve usar @injectable decorator', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: false,
          includeSearch: false,
          customMethods: [],
        },
      });

      expect(result.files.implementation.content).toContain('@injectable()');
    });

    it('deve filtrar por organizationId e branchId em findById', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: false,
          includeSearch: false,
          customMethods: [],
        },
      });

      expect(result.files.implementation.content).toContain('eq(tmsFreightContract.organizationId, organizationId)');
      expect(result.files.implementation.content).toContain('eq(tmsFreightContract.branchId, branchId)');
    });

    it('deve usar soft delete quando includeSoftDelete=true', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: false,
          includeSearch: false,
          customMethods: [],
        },
      });

      expect(result.files.implementation.content).toContain('isNull(tmsFreightContract.deletedAt)');
      expect(result.files.implementation.content).toContain('set({ deletedAt:');
    });

    it('deve gerar custom methods como placeholders', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: false,
          includeSearch: false,
          customMethods: [
            {
              name: 'findByStatus',
              parameters: [
                { name: 'status', type: 'string' },
                { name: 'organizationId', type: 'number' },
                { name: 'branchId', type: 'number' },
              ],
              returnType: 'array',
              description: 'Busca por status',
            },
          ],
        },
      });

      expect(result.files.implementation.content).toContain('findByStatus');
      expect(result.files.implementation.content).toContain('TODO: Implementar findByStatus');
    });
  });

  describe('DI registration', () => {
    it('deve gerar código de registro DI', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: false,
          includeSearch: false,
          customMethods: [],
        },
      });

      expect(result.diRegistration).toContain('TOKENS.FreightContractRepository');
      expect(result.diRegistration).toContain('DrizzleFreightContractRepository');
    });
  });

  describe('instruções', () => {
    it('deve incluir instruções de próximos passos', async () => {
      const result = await generateRepository({
        entityName: 'FreightContract',
        module: 'tms',
        entity: {
          properties: [
            { name: 'code', type: 'string', isNullable: false, isUnique: true, hasIndex: true },
          ],
          hasMultiTenancy: true,
        },
        options: {
          includeSoftDelete: true,
          includePagination: false,
          includeSearch: false,
          customMethods: [],
        },
      });

      expect(result.instructions.length).toBeGreaterThan(0);
      expect(result.instructions.some(i => i.includes('Entity'))).toBe(true);
      expect(result.instructions.some(i => i.includes('token'))).toBe(true);
    });
  });
});
