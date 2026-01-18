import { describe, it, expect } from 'vitest';
import { createFeature } from '../../src/tools/create-feature.js';

describe('createFeature', () => {
  const validInput = {
    name: 'FreightQuote',
    module: 'tms',
    description: 'Cotação de frete',
    entity: {
      properties: [
        { name: 'origin', type: 'string', required: true, description: 'Cidade origem' },
        { name: 'destination', type: 'string', required: true, description: 'Cidade destino' },
        { name: 'weight', type: 'number', required: true, description: 'Peso em kg' },
        { name: 'value', type: 'Money', required: true, description: 'Valor da cotação' },
      ],
      behaviors: ['approve', 'reject', 'cancel'],
    },
    useCases: [
      { name: 'CreateFreightQuote', type: 'command' as const, description: 'Cria nova cotação' },
      { name: 'ListFreightQuotes', type: 'query' as const, description: 'Lista cotações' },
      { name: 'GetFreightQuoteById', type: 'query' as const, description: 'Busca cotação por ID' },
    ],
    options: {
      createApiRoute: true,
      createTests: true,
      isAggregateRoot: true,
    },
  };

  describe('validação de entrada', () => {
    it('deve rejeitar name vazio', async () => {
      await expect(
        createFeature({ ...validInput, name: '' })
      ).rejects.toThrow('name é obrigatório');
    });

    it('deve rejeitar name não PascalCase', async () => {
      await expect(
        createFeature({ ...validInput, name: 'freightQuote' })
      ).rejects.toThrow('name deve ser PascalCase');
    });

    it('deve rejeitar module vazio', async () => {
      await expect(
        createFeature({ ...validInput, module: '' })
      ).rejects.toThrow('module é obrigatório');
    });

    it('deve rejeitar module não lowercase', async () => {
      await expect(
        createFeature({ ...validInput, module: 'TMS' })
      ).rejects.toThrow('module deve ser lowercase');
    });

    it('deve rejeitar description vazia', async () => {
      await expect(
        createFeature({ ...validInput, description: '' })
      ).rejects.toThrow('description é obrigatório');
    });

    it('deve rejeitar entity.properties não array', async () => {
      await expect(
        createFeature({
          ...validInput,
          entity: { ...validInput.entity, properties: 'invalid' as unknown as typeof validInput.entity.properties },
        })
      ).rejects.toThrow('entity.properties é obrigatório e deve ser array');
    });

    it('deve rejeitar entity.behaviors não array', async () => {
      await expect(
        createFeature({
          ...validInput,
          entity: { ...validInput.entity, behaviors: 'invalid' as unknown as string[] },
        })
      ).rejects.toThrow('entity.behaviors é obrigatório e deve ser array');
    });

    it('deve rejeitar useCases não array', async () => {
      await expect(
        createFeature({
          ...validInput,
          useCases: 'invalid' as unknown as typeof validInput.useCases,
        })
      ).rejects.toThrow('useCases é obrigatório e deve ser array');
    });
  });

  describe('geração de arquivos', () => {
    it('deve gerar Entity com sucesso', async () => {
      const result = await createFeature(validInput);

      expect(result.success).toBe(true);
      expect(result.summary.entities).toBe(1);

      const entityFile = result.files.find(
        (f) => f.type === 'entity' && f.path.includes('FreightQuote.ts')
      );
      expect(entityFile).toBeDefined();
      expect(entityFile?.content).toContain('class FreightQuote');
      expect(entityFile?.content).toContain('extends AggregateRoot');
    });

    it('deve gerar Repository Interface', async () => {
      const result = await createFeature(validInput);

      expect(result.summary.repositories).toBeGreaterThanOrEqual(1);

      const repoInterfaceFile = result.files.find(
        (f) => f.path.includes('IFreightQuoteRepository.ts')
      );
      expect(repoInterfaceFile).toBeDefined();
      expect(repoInterfaceFile?.content).toContain('interface IFreightQuoteRepository');
      expect(repoInterfaceFile?.content).toContain('findById');
      expect(repoInterfaceFile?.content).toContain('findMany');
      expect(repoInterfaceFile?.content).toContain('save');
      expect(repoInterfaceFile?.content).toContain('delete');
    });

    it('deve gerar Repository Implementation', async () => {
      const result = await createFeature(validInput);

      const repoImplFile = result.files.find(
        (f) => f.path.includes('DrizzleFreightQuoteRepository.ts')
      );
      expect(repoImplFile).toBeDefined();
      expect(repoImplFile?.content).toContain('class DrizzleFreightQuoteRepository');
      expect(repoImplFile?.content).toContain('@injectable()');
      expect(repoImplFile?.content).toContain('implements IFreightQuoteRepository');
    });

    it('deve gerar Mapper', async () => {
      const result = await createFeature(validInput);

      expect(result.summary.mappers).toBe(1);

      const mapperFile = result.files.find(
        (f) => f.path.includes('FreightQuoteMapper.ts')
      );
      expect(mapperFile).toBeDefined();
      expect(mapperFile?.content).toContain('class FreightQuoteMapper');
      expect(mapperFile?.content).toContain('toDomain');
      expect(mapperFile?.content).toContain('toPersistence');
      expect(mapperFile?.content).toContain('reconstitute'); // MAPPER-004
    });

    it('deve gerar Schema', async () => {
      const result = await createFeature(validInput);

      expect(result.summary.schemas).toBe(1);

      const schemaFile = result.files.find(
        (f) => f.path.includes('freightQuote.schema.ts')
      );
      expect(schemaFile).toBeDefined();
      expect(schemaFile?.content).toContain('freightQuoteTable');
      expect(schemaFile?.content).toContain('organizationId');
      expect(schemaFile?.content).toContain('branchId');
      expect(schemaFile?.content).toContain('tenantIdx'); // Índice multi-tenancy
    });

    it('deve gerar Use Cases', async () => {
      const result = await createFeature(validInput);

      expect(result.summary.useCases).toBe(3);

      // Verifica se tem use cases nos arquivos
      const useCaseFiles = result.files.filter((f) => f.type === 'use-case');
      expect(useCaseFiles.length).toBeGreaterThanOrEqual(3);
    });

    it('deve gerar API Routes quando createApiRoute=true', async () => {
      const result = await createFeature(validInput);

      expect(result.summary.apiRoutes).toBeGreaterThan(0);

      const apiFiles = result.files.filter((f) => f.type === 'api-route');
      expect(apiFiles.length).toBeGreaterThan(0);

      // Deve ter rota principal
      const mainRoute = apiFiles.find((f) => f.path.includes('/freight-quote/route.ts'));
      expect(mainRoute).toBeDefined();
    });

    it('não deve gerar API Routes quando createApiRoute=false', async () => {
      const result = await createFeature({
        ...validInput,
        options: { ...validInput.options, createApiRoute: false },
      });

      expect(result.summary.apiRoutes).toBe(0);
    });

    it('deve gerar Testes quando createTests=true', async () => {
      const result = await createFeature(validInput);

      expect(result.summary.tests).toBeGreaterThan(0);

      const testFiles = result.files.filter((f) => f.type === 'test');
      expect(testFiles.length).toBeGreaterThan(0);
    });

    it('não deve gerar Testes quando createTests=false', async () => {
      const result = await createFeature({
        ...validInput,
        options: { ...validInput.options, createTests: false },
      });

      expect(result.summary.tests).toBe(0);
    });

    it('deve gerar DI Registration', async () => {
      const result = await createFeature(validInput);

      const diFile = result.files.find((f) => f.type === 'di');
      expect(diFile).toBeDefined();
      expect(diFile?.content).toContain('registerFreightQuoteFeature');
      expect(diFile?.content).toContain('container.registerSingleton');
    });
  });

  describe('tipos de dados', () => {
    it('deve mapear Money para 2 colunas no schema', async () => {
      const result = await createFeature(validInput);

      const schemaFile = result.files.find(
        (f) => f.path.includes('freightQuote.schema.ts')
      );
      expect(schemaFile?.content).toContain('valueAmount');
      expect(schemaFile?.content).toContain('valueCurrency');
    });

    it('deve incluir Money import no Mapper', async () => {
      const result = await createFeature(validInput);

      const mapperFile = result.files.find(
        (f) => f.path.includes('FreightQuoteMapper.ts')
      );
      expect(mapperFile?.content).toContain("import { Money }");
    });
  });

  describe('multi-tenancy', () => {
    it('deve incluir organizationId e branchId no schema', async () => {
      const result = await createFeature(validInput);

      const schemaFile = result.files.find(
        (f) => f.path.includes('freightQuote.schema.ts')
      );
      expect(schemaFile?.content).toContain('organizationId');
      expect(schemaFile?.content).toContain('branchId');
    });

    it('deve incluir branchId como NUNCA opcional no filter', async () => {
      const result = await createFeature(validInput);

      const repoFile = result.files.find(
        (f) => f.path.includes('IFreightQuoteRepository.ts')
      );
      expect(repoFile?.content).toContain('branchId: number; // NUNCA opcional');
    });
  });

  describe('next steps', () => {
    it('deve retornar próximos passos', async () => {
      const result = await createFeature(validInput);

      expect(result.nextSteps.length).toBeGreaterThan(0);
      expect(result.nextSteps.some((s) => s.includes('Revisar Entity'))).toBe(true);
      expect(result.nextSteps.some((s) => s.includes('TOKENS'))).toBe(true);
    });
  });

  describe('Entity como Entity (não AggregateRoot)', () => {
    it('deve gerar Entity simples quando isAggregateRoot=false', async () => {
      const result = await createFeature({
        ...validInput,
        options: { ...validInput.options, isAggregateRoot: false },
      });

      const entityFile = result.files.find(
        (f) => f.type === 'entity' && f.path.includes('FreightQuote.ts')
      );
      expect(entityFile?.content).toContain('extends Entity');
      expect(entityFile?.content).not.toContain('extends AggregateRoot');
    });
  });

  describe('Domain Events', () => {
    it('deve gerar arquivo de events para behaviors', async () => {
      const result = await createFeature(validInput);

      const eventsFile = result.files.find(
        (f) => f.type === 'event' && f.path.includes('events')
      );
      expect(eventsFile).toBeDefined();
      expect(eventsFile?.content).toContain('FreightQuoteApprovedEvent');
      expect(eventsFile?.content).toContain('FreightQuoteRejectedEvent');
      expect(eventsFile?.content).toContain('FreightQuoteCancelledEvent');
    });
  });

  describe('caso simples', () => {
    it('deve gerar feature mínima sem API e testes', async () => {
      const minimalInput = {
        name: 'SimpleItem',
        module: 'catalog',
        description: 'Item simples',
        entity: {
          properties: [
            { name: 'name', type: 'string', required: true },
          ],
          behaviors: [],
        },
        useCases: [
          { name: 'CreateSimpleItem', type: 'command' as const, description: 'Cria item' },
        ],
        options: {
          createApiRoute: false,
          createTests: false,
          isAggregateRoot: false,
        },
      };

      const result = await createFeature(minimalInput);

      expect(result.success).toBe(true);
      expect(result.summary.entities).toBe(1);
      expect(result.summary.useCases).toBe(1);
      expect(result.summary.repositories).toBeGreaterThanOrEqual(1);
      expect(result.summary.mappers).toBe(1);
      expect(result.summary.schemas).toBe(1);
      expect(result.summary.apiRoutes).toBe(0);
      expect(result.summary.tests).toBe(0);
    });
  });
});
