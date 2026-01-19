/**
 * Testes unitários para generate_api_route tool
 */

import { describe, it, expect } from 'vitest';
import { generateApiRoute } from '../../src/tools/generate-api-route.js';

describe('generate_api_route', () => {
  describe('validação de input', () => {
    it('deve rejeitar name vazio', async () => {
      await expect(generateApiRoute({
        name: '',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'GET', path: '/', action: 'list', useCaseName: 'ListFreightContracts', description: 'Lista contratos', responseType: 'paginated' },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      })).rejects.toThrow('name é obrigatório');
    });

    it('deve rejeitar name não kebab-case', async () => {
      await expect(generateApiRoute({
        name: 'FreightContracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'GET', path: '/', action: 'list', useCaseName: 'ListFreightContracts', description: 'Lista contratos', responseType: 'paginated' },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      })).rejects.toThrow('kebab-case');
    });

    it('deve rejeitar basePath sem /api/', async () => {
      await expect(generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'GET', path: '/', action: 'list', useCaseName: 'ListFreightContracts', description: 'Lista contratos', responseType: 'paginated' },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      })).rejects.toThrow('/api/');
    });

    it('deve rejeitar endpoints vazio', async () => {
      await expect(generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      })).rejects.toThrow('pelo menos um item');
    });

    it('deve rejeitar método inválido', async () => {
      await expect(generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'INVALID' as 'GET', path: '/', action: 'list', useCaseName: 'ListFreightContracts', description: 'Lista contratos', responseType: 'paginated' },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      })).rejects.toThrow('Método inválido');
    });
  });

  describe('geração de schemas Zod', () => {
    it('deve gerar QuerySchema', async () => {
      const result = await generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'GET', path: '/', action: 'list', useCaseName: 'ListFreightContracts', description: 'Lista contratos', responseType: 'paginated' },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      });

      expect(result.files.schemas.content).toContain('FreightContractsQuerySchema');
      expect(result.files.schemas.content).toContain('z.object');
      expect(result.files.schemas.content).toContain('page:');
      expect(result.files.schemas.content).toContain('pageSize:');
    });

    it('deve gerar CreateSchema quando há POST', async () => {
      const result = await generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { 
            method: 'POST', 
            path: '/', 
            action: 'create', 
            useCaseName: 'CreateFreightContract', 
            description: 'Cria contrato', 
            responseType: 'single',
            requestBody: {
              properties: [
                { name: 'code', type: 'string', required: true },
                { name: 'value', type: 'number', required: true },
              ],
            },
          },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      });

      expect(result.files.schemas.content).toContain('CreateFreightContractsSchema');
      expect(result.files.schemas.content).toContain('code:');
      expect(result.files.schemas.content).toContain('value:');
    });

    it('deve gerar IdParamSchema', async () => {
      const result = await generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'GET', path: '/', action: 'list', useCaseName: 'ListFreightContracts', description: 'Lista contratos', responseType: 'paginated' },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      });

      expect(result.files.schemas.content).toContain('IdParamSchema');
      expect(result.files.schemas.content).toContain('z.string().uuid()');
    });
  });

  describe('geração de route base', () => {
    it('deve gerar route.ts com handlers corretos', async () => {
      const result = await generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'GET', path: '/', action: 'list', useCaseName: 'ListFreightContracts', description: 'Lista contratos', responseType: 'paginated' },
          { 
            method: 'POST', 
            path: '/', 
            action: 'create', 
            useCaseName: 'CreateFreightContract', 
            description: 'Cria contrato', 
            responseType: 'single',
            requestBody: {
              properties: [{ name: 'code', type: 'string', required: true }],
            },
          },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      });

      expect(result.files.route.path).toBe('src/app/api/tms/freight-contracts/route.ts');
      expect(result.files.route.content).toContain('export async function GET');
      expect(result.files.route.content).toContain('export async function POST');
    });

    it('deve usar getTenantContext e resolveBranchIdOrThrow', async () => {
      const result = await generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'GET', path: '/', action: 'list', useCaseName: 'ListFreightContracts', description: 'Lista contratos', responseType: 'paginated' },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      });

      expect(result.files.route.content).toContain('getTenantContext');
      expect(result.files.route.content).toContain('resolveBranchIdOrThrow');
    });

    it('deve usar Result pattern corretamente', async () => {
      const result = await generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'GET', path: '/', action: 'list', useCaseName: 'ListFreightContracts', description: 'Lista contratos', responseType: 'paginated' },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      });

      expect(result.files.route.content).toContain('Result.isFail(result)');
    });

    it('deve usar container.resolve para use cases', async () => {
      const result = await generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'GET', path: '/', action: 'list', useCaseName: 'ListFreightContracts', description: 'Lista contratos', responseType: 'paginated' },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      });

      expect(result.files.route.content).toContain('container.resolve(TMS_TOKENS.ListFreightContracts)');
    });
  });

  describe('geração de route dinâmica [id]', () => {
    it('deve gerar [id]/route.ts quando há endpoints com :id', async () => {
      const result = await generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'GET', path: '/:id', action: 'getById', useCaseName: 'GetFreightContractById', description: 'Busca por ID', responseType: 'single' },
          { method: 'DELETE', path: '/:id', action: 'delete', useCaseName: 'DeleteFreightContract', description: 'Remove contrato', responseType: 'void' },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      });

      expect(result.files.dynamicRoute).toBeDefined();
      expect(result.files.dynamicRoute?.path).toBe('src/app/api/tms/freight-contracts/[id]/route.ts');
      expect(result.files.dynamicRoute?.content).toContain('export async function GET');
      expect(result.files.dynamicRoute?.content).toContain('export async function DELETE');
    });

    it('deve usar Promise<{ id: string }> para params em Next.js 15', async () => {
      const result = await generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'GET', path: '/:id', action: 'getById', useCaseName: 'GetFreightContractById', description: 'Busca por ID', responseType: 'single' },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      });

      expect(result.files.dynamicRoute?.content).toContain('params: Promise<{ id: string }>');
      expect(result.files.dynamicRoute?.content).toContain('await params');
    });
  });

  describe('geração de action routes', () => {
    it('deve gerar route para ações específicas (ex: approve)', async () => {
      const result = await generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'POST', path: '/:id/approve', action: 'approve', useCaseName: 'ApproveFreightContract', description: 'Aprova contrato', responseType: 'single' },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      });

      expect(result.files.actionRoutes).toBeDefined();
      expect(result.files.actionRoutes?.length).toBe(1);
      expect(result.files.actionRoutes?.[0].path).toBe('src/app/api/tms/freight-contracts/[id]/approve/route.ts');
      expect(result.files.actionRoutes?.[0].content).toContain('export async function POST');
    });
  });

  describe('opções extras', () => {
    it('deve incluir cache headers quando includeCache=true', async () => {
      const result = await generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'GET', path: '/', action: 'list', useCaseName: 'ListFreightContracts', description: 'Lista contratos', responseType: 'paginated' },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: true },
      });

      expect(result.files.route.content).toContain('Cache-Control');
    });

    it('deve gerar OpenAPI spec quando includeOpenAPI=true', async () => {
      const result = await generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'GET', path: '/', action: 'list', useCaseName: 'ListFreightContracts', description: 'Lista contratos', responseType: 'paginated' },
        ],
        options: { includeOpenAPI: true, includeRateLimit: false, includeCache: false },
      });

      expect(result.files.openapi).toBeDefined();
      expect(result.files.openapi?.path).toContain('openapi.json');
      expect(result.files.openapi?.content).toContain('"openapi"');
      expect(result.files.openapi?.content).toContain('"3.0.3"');
    });
  });

  describe('instruções', () => {
    it('deve incluir instruções de próximos passos', async () => {
      const result = await generateApiRoute({
        name: 'freight-contracts',
        module: 'tms',
        basePath: '/api/tms/freight-contracts',
        entity: {
          name: 'FreightContract',
          properties: [{ name: 'code', type: 'string', required: true }],
        },
        endpoints: [
          { method: 'GET', path: '/', action: 'list', useCaseName: 'ListFreightContracts', description: 'Lista contratos', responseType: 'paginated' },
        ],
        options: { includeOpenAPI: false, includeRateLimit: false, includeCache: false },
      });

      expect(result.instructions.length).toBeGreaterThan(0);
      expect(result.instructions.some(i => i.includes('Use Case'))).toBe(true);
    });
  });
});
