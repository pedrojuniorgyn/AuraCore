/**
 * Testes unitários para validate_schema tool
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { validateSchema } from '../../src/tools/validate-schema.js';

// Mock do fs
vi.mock('fs');

const mockedFs = vi.mocked(fs);

describe('validate_schema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validação de input', () => {
    it('deve rejeitar schemaPath vazio', async () => {
      await expect(validateSchema({
        schemaPath: '',
      })).rejects.toThrow('schemaPath é obrigatório');
    });

    it('deve rejeitar schemaPath sem .ts', async () => {
      await expect(validateSchema({
        schemaPath: 'src/schemas/test.js',
      })).rejects.toThrow('.ts');
    });

    it('deve rejeitar se arquivo não existe', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      await expect(validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      })).rejects.toThrow('Schema não encontrado');
    });
  });

  describe('SCHEMA-001: Um arquivo por tabela', () => {
    it('deve passar quando nome segue padrão .schema.ts', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = mssqlTable('freight_contract', {});
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      });

      const check = result.checks.find(c => c.rule === 'SCHEMA-001');
      expect(check?.passed).toBe(true);
    });
  });

  describe('SCHEMA-002: Nome do arquivo', () => {
    it('deve passar para kebab-case.schema.ts', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = mssqlTable('freight_contract', {});
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      });

      const check = result.checks.find(c => c.rule === 'SCHEMA-002');
      expect(check?.passed).toBe(true);
    });

    it('deve passar para PascalCaseSchema.ts', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = mssqlTable('freight_contract', {});
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/FreightContractSchema.ts',
      });

      const check = result.checks.find(c => c.rule === 'SCHEMA-002');
      expect(check?.passed).toBe(true);
    });
  });

  describe('SCHEMA-003: Multi-tenancy', () => {
    it('deve falhar sem organizationId e branchId', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = mssqlTable('freight_contract', {
          id: char('id', { length: 36 }).primaryKey(),
          code: varchar('code', { length: 20 }).notNull(),
        });
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      });

      const check = result.checks.find(c => c.rule === 'SCHEMA-003');
      expect(check?.passed).toBe(false);
      expect(check?.details).toContain('organizationId');
      expect(check?.details).toContain('branchId');
    });

    it('deve passar com organizationId e branchId', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = mssqlTable('freight_contract', {
          id: char('id', { length: 36 }).primaryKey(),
          organizationId: int('organization_id').notNull(),
          branchId: int('branch_id').notNull(),
          code: varchar('code', { length: 20 }).notNull(),
        });
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      });

      const check = result.checks.find(c => c.rule === 'SCHEMA-003');
      expect(check?.passed).toBe(true);
    });
  });

  describe('SCHEMA-005: Timestamps obrigatórios', () => {
    it('deve falhar sem createdAt e updatedAt', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = mssqlTable('freight_contract', {
          id: char('id', { length: 36 }).primaryKey(),
          organizationId: int('organization_id').notNull(),
          branchId: int('branch_id').notNull(),
        });
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      });

      const check = result.checks.find(c => c.rule === 'SCHEMA-005');
      expect(check?.passed).toBe(false);
      expect(check?.severity).toBe('error');
    });

    it('deve passar com createdAt e updatedAt', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = mssqlTable('freight_contract', {
          id: char('id', { length: 36 }).primaryKey(),
          organizationId: int('organization_id').notNull(),
          branchId: int('branch_id').notNull(),
          createdAt: datetime('created_at').notNull(),
          updatedAt: datetime('updated_at').notNull(),
        });
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      });

      const check = result.checks.find(c => c.rule === 'SCHEMA-005');
      expect(check?.passed).toBe(true);
    });
  });

  describe('SCHEMA-006: Soft delete', () => {
    it('deve avisar se deletedAt está ausente', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = mssqlTable('freight_contract', {
          id: char('id', { length: 36 }).primaryKey(),
          organizationId: int('organization_id').notNull(),
          branchId: int('branch_id').notNull(),
          createdAt: datetime('created_at').notNull(),
          updatedAt: datetime('updated_at').notNull(),
        });
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      });

      const check = result.checks.find(c => c.rule === 'SCHEMA-006');
      expect(check?.details).toContain('deletedAt não encontrado');
    });

    it('deve falhar se deletedAt tem .notNull()', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = mssqlTable('freight_contract', {
          id: char('id', { length: 36 }).primaryKey(),
          organizationId: int('organization_id').notNull(),
          branchId: int('branch_id').notNull(),
          createdAt: datetime('created_at').notNull(),
          updatedAt: datetime('updated_at').notNull(),
          deletedAt: datetime('deleted_at').notNull(),
        });
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      });

      const check = result.checks.find(c => c.rule === 'SCHEMA-006');
      expect(check?.passed).toBe(false);
      expect(check?.details).toContain('não deve ter .notNull()');
    });
  });

  describe('SCHEMA-008: Export const = mssqlTable', () => {
    it('deve passar quando usa padrão correto', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = mssqlTable('freight_contract', {
          id: char('id', { length: 36 }).primaryKey(),
          organizationId: int('organization_id').notNull(),
          branchId: int('branch_id').notNull(),
          createdAt: datetime('created_at').notNull(),
          updatedAt: datetime('updated_at').notNull(),
        });
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      });

      const check = result.checks.find(c => c.rule === 'SCHEMA-008');
      expect(check?.passed).toBe(true);
    });

    it('deve falhar quando não usa mssqlTable', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = sqliteTable('freight_contract', {
          id: text('id').primaryKey(),
        });
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      });

      const check = result.checks.find(c => c.rule === 'SCHEMA-008');
      expect(check?.passed).toBe(false);
    });
  });

  describe('SCHEMA-009: Tipos inferidos', () => {
    it('deve passar quando tem $inferSelect e $inferInsert', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = mssqlTable('freight_contract', {
          id: char('id', { length: 36 }).primaryKey(),
          organizationId: int('organization_id').notNull(),
          branchId: int('branch_id').notNull(),
          createdAt: datetime('created_at').notNull(),
          updatedAt: datetime('updated_at').notNull(),
        });
        
        export type FreightContractPersistence = typeof freightContract.$inferSelect;
        export type FreightContractInsert = typeof freightContract.$inferInsert;
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      });

      const check = result.checks.find(c => c.rule === 'SCHEMA-009');
      expect(check?.passed).toBe(true);
    });

    it('deve falhar quando faltam tipos inferidos', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = mssqlTable('freight_contract', {
          id: char('id', { length: 36 }).primaryKey(),
          organizationId: int('organization_id').notNull(),
          branchId: int('branch_id').notNull(),
          createdAt: datetime('created_at').notNull(),
          updatedAt: datetime('updated_at').notNull(),
        });
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      });

      const check = result.checks.find(c => c.rule === 'SCHEMA-009');
      expect(check?.passed).toBe(false);
    });
  });

  describe('score calculation', () => {
    it('deve calcular score alto para schema válido', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = mssqlTable('freight_contract', {
          id: char('id', { length: 36 }).primaryKey(),
          organizationId: int('organization_id').notNull(),
          branchId: int('branch_id').notNull(),
          code: varchar('code', { length: 20 }).notNull().unique(),
          createdAt: datetime('created_at').notNull(),
          updatedAt: datetime('updated_at').notNull(),
          deletedAt: datetime('deleted_at'),
        });
        
        // idx_freight_contract_tenant
        export type FreightContractPersistence = typeof freightContract.$inferSelect;
        export type FreightContractInsert = typeof freightContract.$inferInsert;
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      });

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('deve calcular score baixo para schema inválido', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        const table = sqliteTable('test', {
          id: text('id'),
        });
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/test.schema.ts',
      });

      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThanOrEqual(50);
    });
  });

  describe('sugestões', () => {
    it('deve gerar sugestões para problemas encontrados', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        const table = mssqlTable('test', {
          id: char('id', { length: 36 }),
        });
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/test.schema.ts',
      });

      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('deve parabenizar para schema perfeito', async () => {
      mockedFs.readFileSync.mockReturnValue(`
        export const freightContract = mssqlTable('freight_contract', {
          id: char('id', { length: 36 }).primaryKey(),
          organizationId: int('organization_id').notNull(),
          branchId: int('branch_id').notNull(),
          code: varchar('code', { length: 20 }).notNull().unique(),
          status: varchar('status', { length: 20 }).notNull(),
          createdAt: datetime('created_at').notNull(),
          updatedAt: datetime('updated_at').notNull(),
          deletedAt: datetime('deleted_at'),
        });
        
        // idx_freight_contract_tenant
        export type FreightContractPersistence = typeof freightContract.$inferSelect;
        export type FreightContractInsert = typeof freightContract.$inferInsert;
      `);

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
      });

      expect(result.suggestions.some(s => s.includes('conformidade'))).toBe(true);
    });
  });

  describe('validação contra entity', () => {
    it('deve detectar Money sem currency quando entity tem Money', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        const path = String(filePath);
        if (path.includes('schema')) {
          return `
            export const freightContract = mssqlTable('freight_contract', {
              id: char('id', { length: 36 }).primaryKey(),
              organizationId: int('organization_id').notNull(),
              branchId: int('branch_id').notNull(),
              amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
              createdAt: datetime('created_at').notNull(),
              updatedAt: datetime('updated_at').notNull(),
            });
            
            export type FreightContractPersistence = typeof freightContract.$inferSelect;
            export type FreightContractInsert = typeof freightContract.$inferInsert;
          `;
        }
        return `
          import { Money } from '@/shared/domain/value-objects/Money';
          
          class FreightContract {
            amount: Money;
          }
        `;
      });

      const result = await validateSchema({
        schemaPath: 'src/modules/tms/infrastructure/persistence/schemas/freight-contract.schema.ts',
        entityPath: 'src/modules/tms/domain/entities/FreightContract.ts',
      });

      const check = result.checks.find(c => c.rule === 'SCHEMA-007');
      expect(check?.passed).toBe(false);
      expect(check?.details).toContain('currency');
    });
  });
});
