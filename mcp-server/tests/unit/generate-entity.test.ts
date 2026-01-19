import { describe, it, expect } from 'vitest';
import { generateEntity } from '../../src/tools/generate-entity.js';

describe('generateEntity', () => {
  describe('validação de entrada', () => {
    it('deve rejeitar name vazio', async () => {
      await expect(
        generateEntity({
          name: '',
          module: 'tms',
          properties: [],
          behaviors: [],
          isAggregateRoot: true,
          hasMultiTenancy: true,
        })
      ).rejects.toThrow('name é obrigatório');
    });

    it('deve rejeitar name não PascalCase', async () => {
      await expect(
        generateEntity({
          name: 'freightContract', // lowercase
          module: 'tms',
          properties: [],
          behaviors: [],
          isAggregateRoot: true,
          hasMultiTenancy: true,
        })
      ).rejects.toThrow('name deve ser PascalCase');
    });

    it('deve rejeitar module vazio', async () => {
      await expect(
        generateEntity({
          name: 'FreightContract',
          module: '',
          properties: [],
          behaviors: [],
          isAggregateRoot: true,
          hasMultiTenancy: true,
        })
      ).rejects.toThrow('module é obrigatório');
    });

    it('deve rejeitar module não lowercase', async () => {
      await expect(
        generateEntity({
          name: 'FreightContract',
          module: 'TMS', // uppercase
          properties: [],
          behaviors: [],
          isAggregateRoot: true,
          hasMultiTenancy: true,
        })
      ).rejects.toThrow('module deve ser lowercase');
    });

    it('deve rejeitar property sem name', async () => {
      await expect(
        generateEntity({
          name: 'FreightContract',
          module: 'tms',
          properties: [{ name: '', type: 'string', required: true }],
          behaviors: [],
          isAggregateRoot: true,
          hasMultiTenancy: true,
        })
      ).rejects.toThrow('Cada property deve ter name');
    });

    it('deve rejeitar property sem type', async () => {
      await expect(
        generateEntity({
          name: 'FreightContract',
          module: 'tms',
          properties: [{ name: 'contractNumber', type: '', required: true }],
          behaviors: [],
          isAggregateRoot: true,
          hasMultiTenancy: true,
        })
      ).rejects.toThrow('Cada property deve ter type');
    });
  });

  describe('geração de Entity simples', () => {
    it('deve gerar Entity com AggregateRoot', async () => {
      const result = await generateEntity({
        name: 'FreightContract',
        module: 'tms',
        properties: [
          { name: 'contractNumber', type: 'string', required: true },
          { name: 'value', type: 'Money', required: true },
          { name: 'notes', type: 'string', required: false },
        ],
        behaviors: ['approve', 'cancel'],
        isAggregateRoot: true,
        hasMultiTenancy: true,
      });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2); // Entity + Events
      
      // Verificar path do Entity
      expect(result.files[0].path).toBe(
        'src/modules/tms/domain/entities/FreightContract.ts'
      );
      
      // Verificar path dos Events
      expect(result.files[1].path).toBe(
        'src/modules/tms/domain/events/FreightContractEvents.ts'
      );

      // Verificar conteúdo do Entity
      const entityContent = result.files[0].content;
      expect(entityContent).toContain('extends AggregateRoot<string>');
      expect(entityContent).toContain('static create(props:');
      expect(entityContent).toContain('static reconstitute(props:');
      expect(entityContent).toContain('get contractNumber()');
      expect(entityContent).toContain('get value()');
      expect(entityContent).toContain('get notes()');
      expect(entityContent).toContain('get organizationId()');
      expect(entityContent).toContain('get branchId()');
      expect(entityContent).toContain('approve():');
      expect(entityContent).toContain('cancel():');
    });

    it('deve gerar Entity com Entity base (não AggregateRoot)', async () => {
      const result = await generateEntity({
        name: 'ContractItem',
        module: 'tms',
        properties: [
          { name: 'description', type: 'string', required: true },
          { name: 'quantity', type: 'number', required: true },
        ],
        behaviors: [],
        isAggregateRoot: false,
        hasMultiTenancy: false,
      });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1); // Apenas Entity, sem Events
      
      const entityContent = result.files[0].content;
      expect(entityContent).toContain('extends Entity<string>');
      expect(entityContent).not.toContain('AggregateRoot');
      expect(entityContent).not.toContain('organizationId');
      expect(entityContent).not.toContain('branchId');
    });
  });

  describe('validações no código gerado', () => {
    it('deve incluir validação para campos required string', async () => {
      const result = await generateEntity({
        name: 'TestEntity',
        module: 'test',
        properties: [
          { name: 'name', type: 'string', required: true },
        ],
        behaviors: [],
        isAggregateRoot: true,
        hasMultiTenancy: false,
      });

      const entityContent = result.files[0].content;
      expect(entityContent).toContain("if (!props.name || props.name.trim() === '')");
      expect(entityContent).toContain("return Result.fail('name é obrigatório')");
    });

    it('deve incluir validação para campos required number', async () => {
      const result = await generateEntity({
        name: 'TestEntity',
        module: 'test',
        properties: [
          { name: 'amount', type: 'number', required: true },
        ],
        behaviors: [],
        isAggregateRoot: true,
        hasMultiTenancy: false,
      });

      const entityContent = result.files[0].content;
      expect(entityContent).toContain('if (props.amount === undefined || props.amount === null)');
    });

    it('deve incluir validação de multi-tenancy quando habilitado', async () => {
      const result = await generateEntity({
        name: 'TestEntity',
        module: 'test',
        properties: [],
        behaviors: [],
        isAggregateRoot: true,
        hasMultiTenancy: true,
      });

      const entityContent = result.files[0].content;
      expect(entityContent).toContain('if (!props.organizationId || props.organizationId <= 0)');
      expect(entityContent).toContain('if (!props.branchId || props.branchId <= 0)');
    });
  });

  describe('Domain Events', () => {
    it('deve gerar Domain Events para cada behavior', async () => {
      const result = await generateEntity({
        name: 'Order',
        module: 'sales',
        properties: [],
        behaviors: ['submit', 'approve', 'cancel'],
        isAggregateRoot: true,
        hasMultiTenancy: false,
      });

      expect(result.files).toHaveLength(2);
      
      const eventsContent = result.files[1].content;
      expect(eventsContent).toContain('OrderSubmittedEvent');
      expect(eventsContent).toContain('OrderApprovedEvent');
      expect(eventsContent).toContain('OrderCancelledEvent');
      expect(eventsContent).toContain('extends BaseDomainEvent');
    });

    it('não deve gerar arquivo de Events se não houver behaviors', async () => {
      const result = await generateEntity({
        name: 'SimpleEntity',
        module: 'test',
        properties: [{ name: 'value', type: 'string', required: true }],
        behaviors: [],
        isAggregateRoot: true,
        hasMultiTenancy: false,
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0].path).toContain('entities/');
      expect(result.files[0].path).not.toContain('events/');
    });
  });

  describe('Props Interface', () => {
    it('deve gerar Props interface com todos os campos', async () => {
      const result = await generateEntity({
        name: 'Product',
        module: 'inventory',
        properties: [
          { name: 'sku', type: 'string', required: true, description: 'Código do produto' },
          { name: 'price', type: 'Money', required: true },
          { name: 'stockLevel', type: 'number', required: false },
        ],
        behaviors: [],
        isAggregateRoot: true,
        hasMultiTenancy: true,
      });

      const entityContent = result.files[0].content;
      
      // Props interface
      expect(entityContent).toContain('export interface ProductProps');
      expect(entityContent).toContain('id: string;');
      expect(entityContent).toContain('organizationId: number;');
      expect(entityContent).toContain('branchId: number;');
      expect(entityContent).toContain('sku: string;');
      expect(entityContent).toContain('price: Money;');
      expect(entityContent).toContain('stockLevel?: number;'); // Optional
      expect(entityContent).toContain('createdAt: Date;');
      expect(entityContent).toContain('updatedAt: Date;');
      expect(entityContent).toContain('/** Código do produto */');
    });
  });

  describe('instruções', () => {
    it('deve incluir instruções úteis', async () => {
      const result = await generateEntity({
        name: 'TestEntity',
        module: 'test',
        properties: [],
        behaviors: ['approve'],
        isAggregateRoot: true,
        hasMultiTenancy: true,
      });

      expect(result.instructions.length).toBeGreaterThan(0);
      expect(result.instructions.some(i => i.includes('Repository'))).toBe(true);
      expect(result.instructions.some(i => i.includes('Mapper'))).toBe(true);
      expect(result.instructions.some(i => i.includes('Schema'))).toBe(true);
      expect(result.instructions.some(i => i.includes('multi-tenancy') || i.includes('organizationId'))).toBe(true);
    });
  });

  describe('imports', () => {
    it('deve incluir import de Money quando usado', async () => {
      const result = await generateEntity({
        name: 'Invoice',
        module: 'billing',
        properties: [
          { name: 'total', type: 'Money', required: true },
        ],
        behaviors: [],
        isAggregateRoot: true,
        hasMultiTenancy: false,
      });

      const entityContent = result.files[0].content;
      expect(entityContent).toContain('Money');
      expect(entityContent).toContain("from '@/shared/domain'");
    });

    it('deve incluir BaseDomainEvent quando há behaviors', async () => {
      const result = await generateEntity({
        name: 'Task',
        module: 'workflow',
        properties: [],
        behaviors: ['complete'],
        isAggregateRoot: true,
        hasMultiTenancy: false,
      });

      const entityContent = result.files[0].content;
      expect(entityContent).toContain('BaseDomainEvent');
    });
  });
});
