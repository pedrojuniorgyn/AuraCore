/**
 * MCP Tool: create_feature
 * 
 * Cria uma feature completa DDD de uma vez:
 * - Entity (com behaviors e Domain Events)
 * - Repository Interface (domain/ports/output/)
 * - Repository Implementation (infrastructure/persistence/)
 * - Mapper (toDomain/toPersistence)
 * - Schema (Drizzle)
 * - Use Cases (commands/queries)
 * - API Routes (opcional)
 * - Testes (opcional)
 * 
 * @see regrasmcp.mdc - Estrutura de Módulos
 * @see Evans, E. (2003). Domain-Driven Design
 */

import { generateEntity, PropertyDefinition as EntityPropertyDefinition } from './generate-entity.js';
import { generateUseCase, FieldDefinition, OutputFieldDefinition } from './generate-use-case.js';

// ============================================================================
// TIPOS
// ============================================================================

export interface PropertyDefinition {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface UseCaseDefinition {
  name: string;
  type: 'command' | 'query';
  description: string;
}

export interface FeatureOptions {
  createApiRoute: boolean;
  createTests: boolean;
  isAggregateRoot: boolean;
}

export interface CreateFeatureInput {
  name: string;
  module: string;
  description: string;
  entity: {
    properties: PropertyDefinition[];
    behaviors: string[];
  };
  useCases: UseCaseDefinition[];
  options: FeatureOptions;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'entity' | 'use-case' | 'repository' | 'mapper' | 'schema' | 'api-route' | 'test' | 'di' | 'event';
}

export interface CreateFeatureOutput {
  success: boolean;
  files: GeneratedFile[];
  summary: {
    entities: number;
    useCases: number;
    repositories: number;
    mappers: number;
    schemas: number;
    apiRoutes: number;
    tests: number;
  };
  nextSteps: string[];
}

// ============================================================================
// MAPEAMENTOS DE TIPOS
// ============================================================================

const TS_TO_DB_TYPE: Record<string, string> = {
  'string': "varchar('${column}', { length: 255 })",
  'number': "int('${column}')",
  'bigint': "bigint('${column}', { mode: 'number' })",
  'boolean': "bit('${column}')",
  'Date': "datetime2('${column}')",
  'Money': "decimal('${column}_amount', { precision: 18, scale: 2 })",
};

const TYPE_DEFAULT_VALUE: Record<string, string> = {
  'string': "''",
  'number': '0',
  'bigint': '0',
  'boolean': 'false',
  'Date': 'new Date()',
  'Money': "Money.create(0, 'BRL').value",
};

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

export async function createFeature(
  input: CreateFeatureInput
): Promise<CreateFeatureOutput> {
  // Validar input
  validateInput(input);

  const { name, module, description, entity, useCases, options } = input;
  const files: GeneratedFile[] = [];
  const summary = {
    entities: 0,
    useCases: 0,
    repositories: 0,
    mappers: 0,
    schemas: 0,
    apiRoutes: 0,
    tests: 0,
  };

  // 1. Gerar Entity
  const entityResult = await generateEntity({
    name,
    module,
    properties: entity.properties as EntityPropertyDefinition[],
    behaviors: entity.behaviors,
    isAggregateRoot: options.isAggregateRoot,
    hasMultiTenancy: true, // Sempre true no AuraCore
  });

  if (entityResult.success) {
    for (const file of entityResult.files) {
      const fileType = file.path.includes('events') ? 'event' : 'entity';
      files.push({
        path: file.path,
        content: file.content,
        type: fileType,
      });
    }
    summary.entities = 1;
  }

  // 2. Gerar Repository Interface
  const repoInterfaceFile = generateRepositoryInterface(name, module, entity.properties);
  files.push(repoInterfaceFile);
  summary.repositories++;

  // 3. Gerar Repository Implementation
  const repoImplFile = generateRepositoryImplementation(name, module);
  files.push(repoImplFile);

  // 4. Gerar Mapper
  const mapperFile = generateMapper(name, module, entity.properties);
  files.push(mapperFile);
  summary.mappers++;

  // 5. Gerar Schema
  const schemaFile = generateSchema(name, module, entity.properties);
  files.push(schemaFile);
  summary.schemas++;

  // 6. Gerar Use Cases
  for (const useCase of useCases) {
    const useCaseResult = await generateUseCase({
      name: useCase.name,
      type: useCase.type,
      module,
      description: useCase.description,
      inputFields: generateUseCaseInputFields(useCase, name, entity.properties),
      outputFields: generateUseCaseOutputFields(useCase, name, entity.properties),
      repositories: [`I${name}Repository`],
      domainServices: [],
    });

    if (useCaseResult.success) {
      for (const file of useCaseResult.files) {
        files.push({
          path: file.path,
          content: file.content,
          type: 'use-case',
        });
      }
      summary.useCases++;
    }
  }

  // 7. Gerar API Routes (opcional)
  if (options.createApiRoute) {
    const apiRouteFiles = generateApiRoutes(name, module, useCases);
    files.push(...apiRouteFiles);
    summary.apiRoutes = apiRouteFiles.length;
  }

  // 8. Gerar Testes (opcional)
  if (options.createTests) {
    const testFiles = generateTests(name, module, entity, useCases);
    files.push(...testFiles);
    summary.tests = testFiles.length;
  }

  // 9. Gerar DI Registration
  const diFile = generateDIRegistration(name, module, useCases);
  files.push(diFile);

  // 10. Gerar próximos passos
  const nextSteps = generateNextSteps(name, module, options);

  return {
    success: true,
    files,
    summary,
    nextSteps,
  };
}

// ============================================================================
// VALIDAÇÃO
// ============================================================================

function validateInput(input: CreateFeatureInput): void {
  if (!input.name || typeof input.name !== 'string') {
    throw new Error('name é obrigatório e deve ser string');
  }

  if (!input.name.match(/^[A-Z][a-zA-Z0-9]*$/)) {
    throw new Error('name deve ser PascalCase (ex: FreightQuote)');
  }

  if (!input.module || typeof input.module !== 'string') {
    throw new Error('module é obrigatório e deve ser string');
  }

  if (!input.module.match(/^[a-z][a-z0-9-]*$/)) {
    throw new Error('module deve ser lowercase (ex: tms, fiscal, wms)');
  }

  if (!input.description || typeof input.description !== 'string') {
    throw new Error('description é obrigatório e deve ser string');
  }

  if (!input.entity || !Array.isArray(input.entity.properties)) {
    throw new Error('entity.properties é obrigatório e deve ser array');
  }

  if (!Array.isArray(input.entity.behaviors)) {
    throw new Error('entity.behaviors é obrigatório e deve ser array');
  }

  if (!Array.isArray(input.useCases)) {
    throw new Error('useCases é obrigatório e deve ser array');
  }

  if (!input.options || typeof input.options !== 'object') {
    throw new Error('options é obrigatório e deve ser objeto');
  }
}

// ============================================================================
// GERADORES
// ============================================================================

function generateRepositoryInterface(
  name: string,
  module: string,
  properties: PropertyDefinition[]
): GeneratedFile {
  const entityLower = name.charAt(0).toLowerCase() + name.slice(1);
  
  const filterFields = properties
    .filter(p => ['string', 'number', 'Date'].includes(p.type))
    .slice(0, 5) // Limitar a 5 campos de filtro
    .map(p => `  ${p.name}?: ${p.type === 'Date' ? 'Date' : p.type};`)
    .join('\n');

  const content = `/**
 * Repository Interface: ${name}
 * 
 * Define contrato para persistência de ${name}.
 * Implementação em infrastructure/persistence/repositories/
 * 
 * @see REPO-001 a REPO-012 no regrasmcp.mdc
 * @see ARCH-011: Repositories implementam interface de domain/ports/output/
 */

import type { ${name} } from '../../entities/${name}';

/**
 * Filtros para busca de ${name}
 */
export interface ${name}Filter {
  organizationId: number;
  branchId: number; // NUNCA opcional (multi-tenancy)
${filterFields}
  page?: number;
  pageSize?: number;
}

/**
 * Resultado paginado
 */
export interface Paginated${name}Result {
  items: ${name}[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Interface do Repository
 */
export interface I${name}Repository {
  /**
   * Busca por ID
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<${name} | null>;

  /**
   * Busca com filtros e paginação
   */
  findMany(filter: ${name}Filter): Promise<Paginated${name}Result>;

  /**
   * Salva (insert ou update)
   */
  save(${entityLower}: ${name}): Promise<void>;

  /**
   * Remove (soft delete)
   */
  delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<void>;
}
`;

  return {
    path: `src/modules/${module}/domain/ports/output/I${name}Repository.ts`,
    content,
    type: 'repository',
  };
}

function generateRepositoryImplementation(
  name: string,
  module: string
): GeneratedFile {
  const entityLower = name.charAt(0).toLowerCase() + name.slice(1);
  const snakeName = toSnakeCase(name);

  const content = `/**
 * Drizzle Repository: ${name}
 * 
 * Implementação do I${name}Repository usando Drizzle ORM.
 * 
 * @implements I${name}Repository
 * @see REPO-001 a REPO-012 no regrasmcp.mdc
 */

import { injectable } from 'tsyringe';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db } from '@/shared/infrastructure/database/connection';
import type { I${name}Repository, ${name}Filter, Paginated${name}Result } from '../../domain/ports/output/I${name}Repository';
import type { ${name} } from '../../domain/entities/${name}';
import { ${entityLower}Table } from './schemas/${entityLower}.schema';
import { ${name}Mapper } from './mappers/${name}Mapper';

@injectable()
export class Drizzle${name}Repository implements I${name}Repository {
  
  async findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<${name} | null> {
    const rows = await db
      .select()
      .from(${entityLower}Table)
      .where(
        and(
          eq(${entityLower}Table.id, id),
          eq(${entityLower}Table.organizationId, organizationId),
          eq(${entityLower}Table.branchId, branchId),
          isNull(${entityLower}Table.deletedAt)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const result = ${name}Mapper.toDomain(rows[0]);
    if (result.isFail()) {
      throw new Error(\`Failed to map ${name}: \${result.error}\`);
    }

    return result.value;
  }

  async findMany(filter: ${name}Filter): Promise<Paginated${name}Result> {
    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 20, 100);
    const offset = (page - 1) * pageSize;

    // Base query conditions
    const conditions = [
      eq(${entityLower}Table.organizationId, filter.organizationId),
      eq(${entityLower}Table.branchId, filter.branchId),
      isNull(${entityLower}Table.deletedAt),
    ];

    // Count total
    const countResult = await db
      .select({ count: sql<number>\`COUNT(*)\` })
      .from(${entityLower}Table)
      .where(and(...conditions));
    
    const total = countResult[0]?.count ?? 0;

    // Fetch items
    const rows = await db
      .select()
      .from(${entityLower}Table)
      .where(and(...conditions))
      .orderBy(desc(${entityLower}Table.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items: ${name}[] = [];
    for (const row of rows) {
      const result = ${name}Mapper.toDomain(row);
      if (result.isOk()) {
        items.push(result.value);
      }
    }

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async save(${entityLower}: ${name}): Promise<void> {
    const data = ${name}Mapper.toPersistence(${entityLower});

    await db
      .insert(${entityLower}Table)
      .values(data)
      .onConflictDoUpdate({
        target: ${entityLower}Table.id,
        set: {
          ...data,
          updatedAt: new Date(),
        },
      });
  }

  async delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<void> {
    await db
      .update(${entityLower}Table)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(${entityLower}Table.id, id),
          eq(${entityLower}Table.organizationId, organizationId),
          eq(${entityLower}Table.branchId, branchId)
        )
      );
  }
}
`;

  return {
    path: `src/modules/${module}/infrastructure/persistence/repositories/Drizzle${name}Repository.ts`,
    content,
    type: 'repository',
  };
}

function generateMapper(
  name: string,
  module: string,
  properties: PropertyDefinition[]
): GeneratedFile {
  const entityLower = name.charAt(0).toLowerCase() + name.slice(1);

  // Gerar mapeamento toDomain
  const toDomainFields = properties
    .map(p => {
      if (p.type === 'Money') {
        return `      ${p.name}: Money.create(row.${p.name}Amount, row.${p.name}Currency).value,`;
      }
      return `      ${p.name}: row.${p.name},`;
    })
    .join('\n');

  // Gerar mapeamento toPersistence
  const toPersistenceFields = properties
    .map(p => {
      if (p.type === 'Money') {
        return `      ${p.name}Amount: entity.${p.name}.amount,\n      ${p.name}Currency: entity.${p.name}.currency,`;
      }
      return `      ${p.name}: entity.${p.name},`;
    })
    .join('\n');

  // Imports para Value Objects
  const hasMoneyType = properties.some(p => p.type === 'Money');
  const moneyImport = hasMoneyType ? "import { Money } from '@/shared/domain/value-objects/Money';\n" : '';

  const content = `/**
 * Mapper: ${name}
 * 
 * Converte entre Domain Entity e Persistence Row.
 * 
 * @see MAPPER-001 a MAPPER-008 no regrasmcp.mdc
 * @see MAPPER-004: toDomain usa reconstitute(), NUNCA create()
 */

import { Result } from '@/shared/domain';
import { ${name} } from '../../../domain/entities/${name}';
import type { ${name}Row, ${name}Insert } from '../schemas/${entityLower}.schema';
${moneyImport}
export class ${name}Mapper {
  /**
   * DB Row → Domain Entity
   * Usa reconstitute() para não repetir validações
   */
  static toDomain(row: ${name}Row): Result<${name}, string> {
    return ${name}.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      branchId: row.branchId,
${toDomainFields}
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  /**
   * Domain Entity → DB Insert
   */
  static toPersistence(entity: ${name}): ${name}Insert {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      branchId: entity.branchId,
${toPersistenceFields}
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
`;

  return {
    path: `src/modules/${module}/infrastructure/persistence/mappers/${name}Mapper.ts`,
    content,
    type: 'mapper',
  };
}

function generateSchema(
  name: string,
  module: string,
  properties: PropertyDefinition[]
): GeneratedFile {
  const entityLower = name.charAt(0).toLowerCase() + name.slice(1);
  const snakeName = toSnakeCase(name);

  // Gerar colunas
  const columns = properties
    .map(p => {
      const columnName = toSnakeCase(p.name);
      if (p.type === 'Money') {
        return `    ${p.name}Amount: decimal('${columnName}_amount', { precision: 18, scale: 2 })${p.required ? '.notNull()' : ''},
    ${p.name}Currency: varchar('${columnName}_currency', { length: 3 })${p.required ? ".notNull().default('BRL')" : ''},`;
      }
      
      const dbType = getDbType(p.type, columnName);
      const nullable = p.required ? '.notNull()' : '';
      return `    ${p.name}: ${dbType}${nullable},`;
    })
    .join('\n');

  const content = `/**
 * Schema: ${name}
 * 
 * Definição da tabela ${snakeName} para Drizzle ORM.
 * 
 * @see SCHEMA-001 a SCHEMA-010 no regrasmcp.mdc
 */

import { int, varchar, decimal, datetime2, bit, index } from 'drizzle-orm/mssql-core';
import { mssqlTable } from '@/shared/infrastructure/database/table-creator';

export const ${entityLower}Table = mssqlTable(
  '${snakeName}',
  {
    // Primary Key
    id: varchar('id', { length: 36 }).primaryKey(),
    
    // Multi-tenancy (OBRIGATÓRIO)
    organizationId: int('organization_id').notNull(),
    branchId: int('branch_id').notNull(),

    // Business Fields
${columns}

    // Audit Fields
    createdAt: datetime2('created_at').notNull().defaultNow(),
    updatedAt: datetime2('updated_at').notNull().defaultNow(),
    deletedAt: datetime2('deleted_at'), // Soft delete
  },
  (table) => ({
    // Índice composto OBRIGATÓRIO para multi-tenancy
    tenantIdx: index('idx_${snakeName}_tenant').on(
      table.organizationId,
      table.branchId
    ),
  })
);

// Tipos inferidos
export type ${name}Row = typeof ${entityLower}Table.$inferSelect;
export type ${name}Insert = typeof ${entityLower}Table.$inferInsert;
`;

  return {
    path: `src/modules/${module}/infrastructure/persistence/schemas/${entityLower}.schema.ts`,
    content,
    type: 'schema',
  };
}

function generateApiRoutes(
  name: string,
  module: string,
  useCases: UseCaseDefinition[]
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const entityLower = name.charAt(0).toLowerCase() + name.slice(1);
  const kebabName = toKebabCase(name);

  // Determinar métodos HTTP baseado nos use cases
  const hasCreate = useCases.some(uc => 
    uc.name.toLowerCase().includes('create') && uc.type === 'command'
  );
  const hasList = useCases.some(uc => 
    uc.name.toLowerCase().includes('list') && uc.type === 'query'
  );
  const hasGet = useCases.some(uc => 
    uc.name.toLowerCase().includes('get') && uc.type === 'query'
  );
  const hasUpdate = useCases.some(uc => 
    uc.name.toLowerCase().includes('update') && uc.type === 'command'
  );
  const hasDelete = useCases.some(uc => 
    uc.name.toLowerCase().includes('delete') && uc.type === 'command'
  );

  // Rota principal (GET list, POST create)
  const mainRouteMethods: string[] = [];

  if (hasList) {
    mainRouteMethods.push(`/**
 * GET /api/${module}/${kebabName}
 * Lista ${name} com paginação
 */
export async function GET(request: NextRequest) {
  const { ctx, error } = await withAuth(request);
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  const useCase = container.resolve(List${name}UseCase);
  const result = await useCase.execute(
    { page, pageSize },
    ctx
  );

  if (Result.isFail(result)) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.value);
}`);
  }

  if (hasCreate) {
    mainRouteMethods.push(`/**
 * POST /api/${module}/${kebabName}
 * Cria novo ${name}
 */
export async function POST(request: NextRequest) {
  const { ctx, error } = await withAuth(request);
  if (error) return error;

  const body = await request.json();

  const useCase = container.resolve(Create${name}UseCase);
  const result = await useCase.execute(body, ctx);

  if (Result.isFail(result)) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.value, { status: 201 });
}`);
  }

  if (mainRouteMethods.length > 0) {
    const imports = [
      "import { NextRequest, NextResponse } from 'next/server';",
      "import { container } from 'tsyringe';",
      "import { Result } from '@/shared/domain';",
      "import { withAuth } from '@/shared/infrastructure/auth/withAuth';",
    ];

    if (hasList) {
      imports.push(`import { List${name}UseCase } from '@/modules/${module}/application/queries/List${name}UseCase';`);
    }
    if (hasCreate) {
      imports.push(`import { Create${name}UseCase } from '@/modules/${module}/application/commands/Create${name}UseCase';`);
    }

    files.push({
      path: `src/app/api/${module}/${kebabName}/route.ts`,
      content: `${imports.join('\n')}\n\n${mainRouteMethods.join('\n\n')}`,
      type: 'api-route',
    });
  }

  // Rota [id] (GET, PUT, DELETE)
  if (hasGet || hasUpdate || hasDelete) {
    const idRouteMethods: string[] = [];
    const idImports = [
      "import { NextRequest, NextResponse } from 'next/server';",
      "import { container } from 'tsyringe';",
      "import { Result } from '@/shared/domain';",
      "import { withAuth } from '@/shared/infrastructure/auth/withAuth';",
    ];

    if (hasGet) {
      idImports.push(`import { Get${name}ByIdUseCase } from '@/modules/${module}/application/queries/Get${name}ByIdUseCase';`);
      idRouteMethods.push(`/**
 * GET /api/${module}/${kebabName}/[id]
 * Busca ${name} por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await withAuth(request);
  if (error) return error;

  const useCase = container.resolve(Get${name}ByIdUseCase);
  const result = await useCase.execute({ id: params.id }, ctx);

  if (Result.isFail(result)) {
    const status = result.error.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.value);
}`);
    }

    if (hasUpdate) {
      idImports.push(`import { Update${name}UseCase } from '@/modules/${module}/application/commands/Update${name}UseCase';`);
      idRouteMethods.push(`/**
 * PUT /api/${module}/${kebabName}/[id]
 * Atualiza ${name}
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await withAuth(request);
  if (error) return error;

  const body = await request.json();

  const useCase = container.resolve(Update${name}UseCase);
  const result = await useCase.execute({ id: params.id, ...body }, ctx);

  if (Result.isFail(result)) {
    const status = result.error.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.value);
}`);
    }

    if (hasDelete) {
      idImports.push(`import { Delete${name}UseCase } from '@/modules/${module}/application/commands/Delete${name}UseCase';`);
      idRouteMethods.push(`/**
 * DELETE /api/${module}/${kebabName}/[id]
 * Remove ${name} (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await withAuth(request);
  if (error) return error;

  const useCase = container.resolve(Delete${name}UseCase);
  const result = await useCase.execute({ id: params.id }, ctx);

  if (Result.isFail(result)) {
    const status = result.error.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ success: true });
}`);
    }

    if (idRouteMethods.length > 0) {
      files.push({
        path: `src/app/api/${module}/${kebabName}/[id]/route.ts`,
        content: `${idImports.join('\n')}\n\n${idRouteMethods.join('\n\n')}`,
        type: 'api-route',
      });
    }
  }

  return files;
}

function generateTests(
  name: string,
  module: string,
  entity: { properties: PropertyDefinition[]; behaviors: string[] },
  useCases: UseCaseDefinition[]
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const entityLower = name.charAt(0).toLowerCase() + name.slice(1);

  // Teste da Entity
  const entityTestContent = `import { describe, it, expect } from 'vitest';
import { ${name} } from '@/modules/${module}/domain/entities/${name}';

describe('${name}', () => {
  const validProps = {
    organizationId: 1,
    branchId: 1,
    // TODO: Adicionar propriedades obrigatórias
  };

  describe('create', () => {
    it('deve criar ${name} com dados válidos', () => {
      const result = ${name}.create(validProps);
      
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.organizationId).toBe(validProps.organizationId);
        expect(result.value.branchId).toBe(validProps.branchId);
      }
    });

    it('deve falhar sem organizationId', () => {
      const result = ${name}.create({ ...validProps, organizationId: 0 });
      expect(result.isFail()).toBe(true);
    });

    it('deve falhar sem branchId', () => {
      const result = ${name}.create({ ...validProps, branchId: 0 });
      expect(result.isFail()).toBe(true);
    });
  });

  describe('reconstitute', () => {
    it('deve reconstituir ${name} sem validações', () => {
      const result = ${name}.reconstitute({
        id: 'test-id',
        ...validProps,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(result.isOk()).toBe(true);
    });
  });

${entity.behaviors.map(b => `  describe('${b}', () => {
    it('deve executar ${b} com sucesso', () => {
      const createResult = ${name}.create(validProps);
      expect(createResult.isOk()).toBe(true);
      
      if (createResult.isOk()) {
        const result = createResult.value.${b}();
        expect(result.isOk()).toBe(true);
      }
    });
  });
`).join('\n')}});
`;

  files.push({
    path: `tests/unit/modules/${module}/domain/entities/${name}.test.ts`,
    content: entityTestContent,
    type: 'test',
  });

  // Testes dos Use Cases
  for (const useCase of useCases) {
    const useCaseTestContent = `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ${useCase.name}UseCase } from '@/modules/${module}/application/${useCase.type === 'command' ? 'commands' : 'queries'}/${useCase.name}UseCase';

describe('${useCase.name}UseCase', () => {
  let useCase: ${useCase.name}UseCase;
  let mockRepository: {
    findById: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const mockContext = {
    userId: 'user-1',
    organizationId: 1,
    branchId: 1,
    isAdmin: false,
  };

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findMany: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };

    // TODO: Injetar mock no constructor
    // useCase = new ${useCase.name}UseCase(mockRepository);
  });

  it('deve executar ${useCase.description}', async () => {
    // TODO: Implementar teste
    expect(true).toBe(true);
  });
});
`;

    files.push({
      path: `tests/unit/modules/${module}/application/${useCase.type === 'command' ? 'commands' : 'queries'}/${useCase.name}UseCase.test.ts`,
      content: useCaseTestContent,
      type: 'test',
    });
  }

  return files;
}

function generateDIRegistration(
  name: string,
  module: string,
  useCases: UseCaseDefinition[]
): GeneratedFile {
  const moduleName = module.charAt(0).toUpperCase() + module.slice(1);
  
  const useCaseImports = useCases.map(uc => {
    const folder = uc.type === 'command' ? 'commands' : 'queries';
    return `import { ${uc.name}UseCase } from '../../application/${folder}/${uc.name}UseCase';`;
  }).join('\n');

  const useCaseRegistrations = useCases.map(uc => {
    return `  container.registerSingleton(${uc.name}UseCase);`;
  }).join('\n');

  const content = `/**
 * DI Module: ${name} Feature
 * 
 * Registra dependências da feature ${name} no container.
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 * @see ARCH-011: Repositories implementam interface de domain/ports/output/
 */

import { container } from 'tsyringe';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import { Drizzle${name}Repository } from '../persistence/repositories/Drizzle${name}Repository';
${useCaseImports}

/**
 * Registra dependências da feature ${name}
 * Chamar em registerModule${moduleName}()
 */
export function register${name}Feature(): void {
  // Repository
  container.registerSingleton(
    TOKENS.${name}Repository,
    Drizzle${name}Repository
  );

  // Use Cases
${useCaseRegistrations}
}
`;

  return {
    path: `src/modules/${module}/infrastructure/di/${name}Feature.ts`,
    content,
    type: 'di',
  };
}

function generateNextSteps(
  name: string,
  module: string,
  options: FeatureOptions
): string[] {
  const steps: string[] = [];

  steps.push(`1. Revisar Entity gerada em src/modules/${module}/domain/entities/${name}.ts`);
  steps.push(`2. Adicionar validações de negócio no método create()`);
  steps.push(`3. Registrar feature no módulo: chamar register${name}Feature() em ${module}Module.ts`);
  steps.push(`4. Adicionar token no TOKENS: TOKENS.${name}Repository = Symbol('${name}Repository')`);
  steps.push(`5. Executar migration para criar tabela: npx drizzle-kit generate`);

  if (options.createTests) {
    steps.push(`6. Completar testes unitários em tests/unit/modules/${module}/`);
  }

  if (options.createApiRoute) {
    steps.push(`7. Testar endpoints: GET/POST /api/${module}/${toKebabCase(name)}`);
  }

  return steps;
}

// ============================================================================
// HELPERS
// ============================================================================

function generateUseCaseInputFields(
  useCase: UseCaseDefinition,
  entityName: string,
  properties: PropertyDefinition[]
): FieldDefinition[] {
  const name = useCase.name.toLowerCase();

  // Create: todos os campos obrigatórios
  if (name.includes('create')) {
    return properties
      .filter(p => p.required)
      .map(p => ({
        name: p.name,
        type: p.type,
        required: true,
        description: p.description,
      }));
  }

  // Update: id + campos opcionais
  if (name.includes('update')) {
    return [
      { name: 'id', type: 'string', required: true, description: `ID do ${entityName}` },
      ...properties.map(p => ({
        name: p.name,
        type: p.type,
        required: false,
        description: p.description,
      })),
    ];
  }

  // Delete/Get: apenas id
  if (name.includes('delete') || name.includes('get')) {
    return [
      { name: 'id', type: 'string', required: true, description: `ID do ${entityName}` },
    ];
  }

  // List: paginação
  if (name.includes('list')) {
    return [
      { name: 'page', type: 'number', required: false, description: 'Página (default: 1)' },
      { name: 'pageSize', type: 'number', required: false, description: 'Itens por página (default: 20)' },
    ];
  }

  // Default: campos vazios
  return [];
}

function generateUseCaseOutputFields(
  useCase: UseCaseDefinition,
  entityName: string,
  properties: PropertyDefinition[]
): OutputFieldDefinition[] {
  const name = useCase.name.toLowerCase();

  // Create/Update/Get: retorna entidade
  if (name.includes('create') || name.includes('update') || name.includes('get')) {
    return [
      { name: 'id', type: 'string', description: `ID do ${entityName}` },
      ...properties.map(p => ({
        name: p.name,
        type: p.type,
        description: p.description,
      })),
      { name: 'createdAt', type: 'Date' },
      { name: 'updatedAt', type: 'Date' },
    ];
  }

  // Delete: apenas confirmação
  if (name.includes('delete')) {
    return [
      { name: 'success', type: 'boolean', description: 'Indica se foi excluído' },
    ];
  }

  // List: array paginado
  if (name.includes('list')) {
    return [
      { name: 'items', type: `${entityName}[]`, description: 'Lista de itens' },
      { name: 'total', type: 'number', description: 'Total de itens' },
      { name: 'page', type: 'number', description: 'Página atual' },
      { name: 'pageSize', type: 'number', description: 'Itens por página' },
    ];
  }

  return [];
}

function getDbType(tsType: string, columnName: string): string {
  const template = TS_TO_DB_TYPE[tsType];
  if (template) {
    return template.replace('${column}', columnName);
  }
  // Default para string
  return `varchar('${columnName}', { length: 255 })`;
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}
