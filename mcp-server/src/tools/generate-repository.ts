/**
 * MCP Tool: generate_repository
 * 
 * Gera Repository completo seguindo padrões DDD/Hexagonal do AuraCore:
 * - Interface em domain/ports/output/
 * - Implementação Drizzle em infrastructure/persistence/repositories/
 * - Mapper em infrastructure/persistence/mappers/
 * - Schema Drizzle em infrastructure/persistence/schemas/
 * 
 * @see REPO-001 a REPO-012 no regrasmcp.mdc
 * @see SCHEMA-001 a SCHEMA-010 no regrasmcp.mdc
 * @see MAPPER-001 a MAPPER-008 no regrasmcp.mdc
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface PropertyDefinition {
  name: string;
  type: string;
  isNullable: boolean;
  isUnique: boolean;
  hasIndex: boolean;
  dbColumnName?: string;
}

export interface CustomMethodDefinition {
  name: string;
  parameters: { name: string; type: string }[];
  returnType: 'single' | 'array' | 'paginated';
  description: string;
}

export interface GenerateRepositoryInput {
  entityName: string;
  module: string;
  entity: {
    properties: PropertyDefinition[];
    hasMultiTenancy: boolean;
  };
  options: {
    includeSoftDelete: boolean;
    includePagination: boolean;
    includeSearch: boolean;
    customMethods: CustomMethodDefinition[];
  };
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerateRepositoryOutput {
  success: boolean;
  files: {
    interface: GeneratedFile;
    implementation: GeneratedFile;
    mapper: GeneratedFile;
    schema: GeneratedFile;
  };
  diRegistration: string;
  instructions: string[];
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

export async function generateRepository(
  input: GenerateRepositoryInput
): Promise<GenerateRepositoryOutput> {
  // Validar input
  validateInput(input);

  const { entityName, module, entity, options } = input;
  
  // Gerar arquivos
  const interfaceFile = generateInterface(entityName, module, entity, options);
  const schemaFile = generateSchema(entityName, module, entity, options);
  const mapperFile = generateMapper(entityName, module, entity);
  const implementationFile = generateImplementation(entityName, module, entity, options);
  
  // Gerar código de registro DI
  const diRegistration = generateDIRegistration(entityName, module);

  // Instruções
  const instructions = generateInstructions(entityName, module);

  return {
    success: true,
    files: {
      interface: interfaceFile,
      implementation: implementationFile,
      mapper: mapperFile,
      schema: schemaFile,
    },
    diRegistration,
    instructions,
  };
}

// ============================================================================
// VALIDAÇÃO
// ============================================================================

function validateInput(input: GenerateRepositoryInput): void {
  if (!input.entityName || typeof input.entityName !== 'string') {
    throw new Error('entityName é obrigatório e deve ser string');
  }

  if (!input.entityName.match(/^[A-Z][a-zA-Z0-9]*$/)) {
    throw new Error('entityName deve ser PascalCase (ex: FreightContract)');
  }

  if (!input.module || typeof input.module !== 'string') {
    throw new Error('module é obrigatório e deve ser string');
  }

  if (!input.module.match(/^[a-z][a-z0-9-]*$/)) {
    throw new Error('module deve ser lowercase (ex: tms, fiscal, wms)');
  }

  if (!input.entity || typeof input.entity !== 'object') {
    throw new Error('entity é obrigatório e deve ser objeto');
  }

  if (!Array.isArray(input.entity.properties)) {
    throw new Error('entity.properties é obrigatório e deve ser array');
  }

  if (input.entity.properties.length === 0) {
    throw new Error('entity.properties deve ter pelo menos uma propriedade');
  }

  // Validar cada propriedade
  for (const prop of input.entity.properties) {
    if (!prop.name || typeof prop.name !== 'string') {
      throw new Error('Cada property deve ter name como string');
    }
    if (!prop.type || typeof prop.type !== 'string') {
      throw new Error('Cada property deve ter type como string');
    }
  }
}

// ============================================================================
// GERAÇÃO DE INTERFACE
// ============================================================================

function generateInterface(
  entityName: string,
  module: string,
  entity: GenerateRepositoryInput['entity'],
  options: GenerateRepositoryInput['options']
): GeneratedFile {
  const interfaceName = `I${entityName}Repository`;
  const filterName = `Find${entityName}Filter`;
  
  const lines: string[] = [
    `/**`,
    ` * Repository Interface: ${interfaceName}`,
    ` * `,
    ` * Port de saída para persistência de ${entityName}.`,
    ` * `,
    ` * REGRAS CRÍTICAS (REPO-001 a REPO-012):`,
    ` * - TODOS os métodos DEVEM filtrar por organizationId + branchId (INFRA-004)`,
    ` * - branchId NUNCA é opcional (ENFORCE-004)`,
    ` * - Soft delete com deletedAt (filtrar IS NULL)`,
    ` * `,
    ` * @see regrasmcp.mdc`,
    ` */`,
    ``,
    `import type { ${entityName} } from '../../entities/${entityName}';`,
    ``,
  ];

  // Gerar interface de filtro
  lines.push(`/**`);
  lines.push(` * Filtros para busca de ${entityName}`);
  lines.push(` * `);
  lines.push(` * IMPORTANTE (ENFORCE-003, ENFORCE-004):`);
  lines.push(` * - branchId é OBRIGATÓRIO (nunca opcional)`);
  lines.push(` */`);
  lines.push(`export interface ${filterName} {`);
  lines.push(`  organizationId: number;`);
  lines.push(`  branchId: number; // OBRIGATÓRIO (ENFORCE-004)`);
  
  // Adicionar propriedades como filtros opcionais
  for (const prop of entity.properties) {
    if (prop.hasIndex || prop.isUnique) {
      lines.push(`  ${prop.name}?: ${mapTypeToTS(prop.type)};`);
    }
  }
  
  if (options.includePagination) {
    lines.push(`  page?: number;`);
    lines.push(`  pageSize?: number;`);
  }
  
  if (options.includeSearch) {
    lines.push(`  searchTerm?: string;`);
  }
  
  lines.push(`}`);
  lines.push(``);

  // Interface de paginação
  if (options.includePagination) {
    lines.push(`export interface PaginatedResult<T> {`);
    lines.push(`  items: T[];`);
    lines.push(`  total: number;`);
    lines.push(`  page: number;`);
    lines.push(`  pageSize: number;`);
    lines.push(`  totalPages: number;`);
    lines.push(`}`);
    lines.push(``);
  }

  // Interface principal
  lines.push(`/**`);
  lines.push(` * Port: Repository de ${entityName}`);
  lines.push(` */`);
  lines.push(`export interface ${interfaceName} {`);
  
  // findById - SEMPRE com organizationId + branchId
  lines.push(`  /**`);
  lines.push(`   * Busca por ID`);
  lines.push(`   */`);
  lines.push(`  findById(`);
  lines.push(`    id: string,`);
  lines.push(`    organizationId: number,`);
  lines.push(`    branchId: number`);
  lines.push(`  ): Promise<${entityName} | null>;`);
  lines.push(``);

  // findMany
  if (options.includePagination) {
    lines.push(`  /**`);
    lines.push(`   * Busca com filtros e paginação`);
    lines.push(`   */`);
    lines.push(`  findMany(`);
    lines.push(`    filter: ${filterName}`);
    lines.push(`  ): Promise<PaginatedResult<${entityName}>>;`);
  } else {
    lines.push(`  /**`);
    lines.push(`   * Busca com filtros`);
    lines.push(`   */`);
    lines.push(`  findMany(`);
    lines.push(`    filter: ${filterName}`);
    lines.push(`  ): Promise<${entityName}[]>;`);
  }
  lines.push(``);

  // save
  lines.push(`  /**`);
  lines.push(`   * Salva (insert ou update)`);
  lines.push(`   */`);
  lines.push(`  save(entity: ${entityName}): Promise<void>;`);
  lines.push(``);

  // delete
  if (options.includeSoftDelete) {
    lines.push(`  /**`);
    lines.push(`   * Soft delete`);
    lines.push(`   */`);
    lines.push(`  delete(`);
    lines.push(`    id: string,`);
    lines.push(`    organizationId: number,`);
    lines.push(`    branchId: number`);
    lines.push(`  ): Promise<void>;`);
  } else {
    lines.push(`  /**`);
    lines.push(`   * Hard delete`);
    lines.push(`   */`);
    lines.push(`  delete(`);
    lines.push(`    id: string,`);
    lines.push(`    organizationId: number,`);
    lines.push(`    branchId: number`);
    lines.push(`  ): Promise<void>;`);
  }
  lines.push(``);

  // exists
  lines.push(`  /**`);
  lines.push(`   * Verifica existência`);
  lines.push(`   */`);
  lines.push(`  exists(`);
  lines.push(`    id: string,`);
  lines.push(`    organizationId: number,`);
  lines.push(`    branchId: number`);
  lines.push(`  ): Promise<boolean>;`);

  // Custom methods
  for (const method of options.customMethods) {
    lines.push(``);
    lines.push(`  /**`);
    lines.push(`   * ${method.description}`);
    lines.push(`   */`);
    
    const params = method.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
    let returnType: string;
    
    switch (method.returnType) {
      case 'single':
        returnType = `${entityName} | null`;
        break;
      case 'array':
        returnType = `${entityName}[]`;
        break;
      case 'paginated':
        returnType = `PaginatedResult<${entityName}>`;
        break;
    }
    
    lines.push(`  ${method.name}(${params}): Promise<${returnType}>;`);
  }

  lines.push(`}`);

  const content = lines.join('\n');
  const path = `src/modules/${module}/domain/ports/output/I${entityName}Repository.ts`;

  return { path, content };
}

// ============================================================================
// GERAÇÃO DE SCHEMA
// ============================================================================

function generateSchema(
  entityName: string,
  module: string,
  entity: GenerateRepositoryInput['entity'],
  options: GenerateRepositoryInput['options']
): GeneratedFile {
  const tableName = toSnakeCase(entityName);
  const schemaVarName = `${module}${entityName}`;
  
  const lines: string[] = [
    `/**`,
    ` * Schema: ${entityName}`,
    ` * `,
    ` * Schema Drizzle para ${entityName}`,
    ` * Segue SCHEMA-001 a SCHEMA-010 do regrasmcp.mdc`,
    ` */`,
    ``,
    `import { sql } from 'drizzle-orm';`,
    `import { mssqlTable, char, int, varchar, datetime, decimal, bit } from 'drizzle-orm/mssql-core';`,
    ``,
  ];

  // Início da tabela
  lines.push(`export const ${schemaVarName} = mssqlTable('${tableName}', {`);
  
  // ID sempre primeiro
  lines.push(`  id: char('id', { length: 36 }).primaryKey(),`);
  
  // Multi-tenancy (SEMPRE obrigatório se hasMultiTenancy)
  if (entity.hasMultiTenancy) {
    lines.push(`  organizationId: int('organization_id').notNull(),`);
    lines.push(`  branchId: int('branch_id').notNull(),`);
  }
  
  // Propriedades
  for (const prop of entity.properties) {
    const columnName = prop.dbColumnName || toSnakeCase(prop.name);
    const drizzleType = mapTypeToDrizzle(prop.type, prop.name);
    
    let line = `  ${prop.name}: ${drizzleType}`;
    
    if (!prop.isNullable) {
      line += '.notNull()';
    }
    
    if (prop.isUnique) {
      line += '.unique()';
    }
    
    line += ',';
    lines.push(line);
    
    // Money = 2 colunas (SCHEMA-007)
    if (prop.type === 'Money') {
      lines.push(`  ${prop.name}Currency: varchar('${columnName}_currency', { length: 3 }).notNull().default('BRL'),`);
    }
  }
  
  // Timestamps (SCHEMA-005)
  lines.push(`  `);
  lines.push(`  // Timestamps (SCHEMA-005)`);
  lines.push(`  createdAt: datetime('created_at', { mode: 'date' }).notNull().default(sql\`GETDATE()\`),`);
  lines.push(`  updatedAt: datetime('updated_at', { mode: 'date' }).notNull().default(sql\`GETDATE()\`),`);
  
  // Soft delete (SCHEMA-006)
  if (options.includeSoftDelete) {
    lines.push(`  deletedAt: datetime('deleted_at', { mode: 'date' }), // Soft delete (SCHEMA-006)`);
  }
  
  lines.push(`});`);
  lines.push(``);

  // Índice composto (SCHEMA-003)
  if (entity.hasMultiTenancy) {
    lines.push(`// Índice composto obrigatório (SCHEMA-003)`);
    lines.push(`// CREATE INDEX idx_${tableName}_tenant ON ${tableName} (organization_id, branch_id)`);
    lines.push(`// WHERE deleted_at IS NULL;`);
    lines.push(``);
  }

  // Tipos inferidos (SCHEMA-009)
  lines.push(`// Tipos inferidos (SCHEMA-009)`);
  lines.push(`export type ${entityName}Persistence = typeof ${schemaVarName}.$inferSelect;`);
  lines.push(`export type ${entityName}Insert = typeof ${schemaVarName}.$inferInsert;`);

  const content = lines.join('\n');
  const path = `src/modules/${module}/infrastructure/persistence/schemas/${toKebabCase(entityName)}.schema.ts`;

  return { path, content };
}

// ============================================================================
// GERAÇÃO DE MAPPER
// ============================================================================

function generateMapper(
  entityName: string,
  module: string,
  entity: GenerateRepositoryInput['entity']
): GeneratedFile {
  const lines: string[] = [
    `/**`,
    ` * Mapper: ${entityName}Mapper`,
    ` * `,
    ` * Conversão entre Domain Entity e Persistence Row.`,
    ` * `,
    ` * REGRAS CRÍTICAS (MAPPER-001 a MAPPER-008):`,
    ` * - toDomain usa reconstitute(), NUNCA create()`,
    ` * - Money → 2 campos (amount, currency)`,
    ` * `,
    ` * @see regrasmcp.mdc`,
    ` */`,
    ``,
    `import { Result } from '@/shared/domain';`,
    `import { ${entityName} } from '../../../domain/entities/${entityName}';`,
    `import type { ${entityName}Persistence, ${entityName}Insert } from '../schemas/${toKebabCase(entityName)}.schema';`,
  ];

  // Imports adicionais para Money
  const hasMoneyProps = entity.properties.some(p => p.type === 'Money');
  if (hasMoneyProps) {
    lines.push(`import { Money } from '@/shared/domain/value-objects/Money';`);
  }

  lines.push(``);
  lines.push(`/**`);
  lines.push(` * ${entityName}Mapper`);
  lines.push(` * `);
  lines.push(` * Métodos estáticos para conversão bidirecional.`);
  lines.push(` */`);
  lines.push(`export class ${entityName}Mapper {`);
  
  // toDomain
  lines.push(`  /**`);
  lines.push(`   * Persistence → Domain`);
  lines.push(`   * `);
  lines.push(`   * IMPORTANTE: Usa reconstitute(), NÃO create() (MAPPER-004)`);
  lines.push(`   */`);
  lines.push(`  static toDomain(row: ${entityName}Persistence): Result<${entityName}, string> {`);
  
  // Criar VOs para Money
  for (const prop of entity.properties) {
    if (prop.type === 'Money') {
      lines.push(`    const ${prop.name}Result = Money.create(`);
      lines.push(`      Number(row.${prop.name}),`);
      lines.push(`      row.${prop.name}Currency`);
      lines.push(`    );`);
      lines.push(`    if (${prop.name}Result.isFail()) {`);
      lines.push(`      return Result.fail(${prop.name}Result.error);`);
      lines.push(`    }`);
      lines.push(``);
    }
  }
  
  lines.push(`    return ${entityName}.reconstitute({`);
  lines.push(`      id: row.id,`);
  
  if (entity.hasMultiTenancy) {
    lines.push(`      organizationId: row.organizationId,`);
    lines.push(`      branchId: row.branchId,`);
  }
  
  for (const prop of entity.properties) {
    if (prop.type === 'Money') {
      lines.push(`      ${prop.name}: ${prop.name}Result.value,`);
    } else if (prop.type === 'Date') {
      lines.push(`      ${prop.name}: row.${prop.name} ? new Date(row.${prop.name}) : ${prop.isNullable ? 'undefined' : 'new Date()'},`);
    } else {
      lines.push(`      ${prop.name}: row.${prop.name}${prop.isNullable ? ' ?? undefined' : ''},`);
    }
  }
  
  lines.push(`      createdAt: row.createdAt,`);
  lines.push(`      updatedAt: row.updatedAt,`);
  lines.push(`    });`);
  lines.push(`  }`);
  lines.push(``);
  
  // toPersistence
  lines.push(`  /**`);
  lines.push(`   * Domain → Persistence`);
  lines.push(`   */`);
  lines.push(`  static toPersistence(entity: ${entityName}): ${entityName}Insert {`);
  lines.push(`    return {`);
  lines.push(`      id: entity.id,`);
  
  if (entity.hasMultiTenancy) {
    lines.push(`      organizationId: entity.organizationId,`);
    lines.push(`      branchId: entity.branchId,`);
  }
  
  for (const prop of entity.properties) {
    if (prop.type === 'Money') {
      lines.push(`      ${prop.name}: entity.${prop.name}.amount.toString(),`);
      lines.push(`      ${prop.name}Currency: entity.${prop.name}.currency,`);
    } else {
      lines.push(`      ${prop.name}: entity.${prop.name},`);
    }
  }
  
  lines.push(`      createdAt: entity.createdAt,`);
  lines.push(`      updatedAt: entity.updatedAt,`);
  lines.push(`    };`);
  lines.push(`  }`);
  lines.push(`}`);

  const content = lines.join('\n');
  const path = `src/modules/${module}/infrastructure/persistence/mappers/${entityName}Mapper.ts`;

  return { path, content };
}

// ============================================================================
// GERAÇÃO DE IMPLEMENTAÇÃO
// ============================================================================

function generateImplementation(
  entityName: string,
  module: string,
  entity: GenerateRepositoryInput['entity'],
  options: GenerateRepositoryInput['options']
): GeneratedFile {
  const className = `Drizzle${entityName}Repository`;
  const interfaceName = `I${entityName}Repository`;
  const schemaVarName = `${module}${entityName}`;
  const filterName = `Find${entityName}Filter`;
  
  const lines: string[] = [
    `/**`,
    ` * Repository: ${className}`,
    ` * `,
    ` * Implementação Drizzle do ${interfaceName}.`,
    ` * `,
    ` * REGRAS CRÍTICAS (REPO-001 a REPO-012):`,
    ` * - TODA query filtra organizationId + branchId`,
    ` * - Usa Mapper para conversão`,
    ` * - Soft delete: filtrar deletedAt IS NULL`,
    ` * `,
    ` * @see regrasmcp.mdc`,
    ` */`,
    ``,
    `import { injectable } from 'tsyringe';`,
    `import { eq, and, isNull, desc, sql } from 'drizzle-orm';`,
    `import { db } from '@/lib/db';`,
    `import { Result } from '@/shared/domain';`,
    `import type { ${interfaceName}${options.includePagination ? `, ${filterName}, PaginatedResult` : `, ${filterName}`} } from '../../../domain/ports/output/${interfaceName}';`,
    `import { ${entityName} } from '../../../domain/entities/${entityName}';`,
    `import { ${entityName}Mapper } from '../mappers/${entityName}Mapper';`,
    `import { ${schemaVarName} } from '../schemas/${toKebabCase(entityName)}.schema';`,
    ``,
    `@injectable()`,
    `export class ${className} implements ${interfaceName} {`,
  ];

  // findById
  lines.push(`  async findById(`);
  lines.push(`    id: string,`);
  lines.push(`    organizationId: number,`);
  lines.push(`    branchId: number`);
  lines.push(`  ): Promise<${entityName} | null> {`);
  lines.push(`    const rows = await db`);
  lines.push(`      .select()`);
  lines.push(`      .from(${schemaVarName})`);
  lines.push(`      .where(`);
  lines.push(`        and(`);
  lines.push(`          eq(${schemaVarName}.id, id),`);
  if (entity.hasMultiTenancy) {
    lines.push(`          eq(${schemaVarName}.organizationId, organizationId),`);
    lines.push(`          eq(${schemaVarName}.branchId, branchId),`);
  }
  if (options.includeSoftDelete) {
    lines.push(`          isNull(${schemaVarName}.deletedAt)`);
  }
  lines.push(`        )`);
  lines.push(`      );`);
  lines.push(``);
  lines.push(`    if (rows.length === 0) return null;`);
  lines.push(``);
  lines.push(`    const result = ${entityName}Mapper.toDomain(rows[0]);`);
  lines.push(`    return Result.isOk(result) ? result.value : null;`);
  lines.push(`  }`);
  lines.push(``);

  // findMany
  if (options.includePagination) {
    lines.push(`  async findMany(filter: ${filterName}): Promise<PaginatedResult<${entityName}>> {`);
    lines.push(`    const page = filter.page ?? 1;`);
    lines.push(`    const pageSize = filter.pageSize ?? 20;`);
    lines.push(`    const offset = (page - 1) * pageSize;`);
    lines.push(``);
    lines.push(`    // Count total`);
    lines.push(`    const countResult = await db`);
    lines.push(`      .select({ count: sql<number>\`COUNT(*)\` })`);
    lines.push(`      .from(${schemaVarName})`);
    lines.push(`      .where(`);
    lines.push(`        and(`);
    if (entity.hasMultiTenancy) {
      lines.push(`          eq(${schemaVarName}.organizationId, filter.organizationId),`);
      lines.push(`          eq(${schemaVarName}.branchId, filter.branchId),`);
    }
    if (options.includeSoftDelete) {
      lines.push(`          isNull(${schemaVarName}.deletedAt)`);
    }
    lines.push(`        )`);
    lines.push(`      );`);
    lines.push(``);
    lines.push(`    const total = countResult[0]?.count ?? 0;`);
    lines.push(``);
    lines.push(`    // Fetch items`);
    lines.push(`    const rows = await db`);
    lines.push(`      .select()`);
    lines.push(`      .from(${schemaVarName})`);
    lines.push(`      .where(`);
    lines.push(`        and(`);
    if (entity.hasMultiTenancy) {
      lines.push(`          eq(${schemaVarName}.organizationId, filter.organizationId),`);
      lines.push(`          eq(${schemaVarName}.branchId, filter.branchId),`);
    }
    if (options.includeSoftDelete) {
      lines.push(`          isNull(${schemaVarName}.deletedAt)`);
    }
    lines.push(`        )`);
    lines.push(`      )`);
    lines.push(`      .orderBy(desc(${schemaVarName}.createdAt))`);
    lines.push(`      .offset(offset)`);
    lines.push(`      .limit(pageSize);`);
    lines.push(``);
    lines.push(`    const items = rows`);
    lines.push(`      .map(row => ${entityName}Mapper.toDomain(row))`);
    lines.push(`      .filter(Result.isOk)`);
    lines.push(`      .map(r => r.value);`);
    lines.push(``);
    lines.push(`    return {`);
    lines.push(`      items,`);
    lines.push(`      total,`);
    lines.push(`      page,`);
    lines.push(`      pageSize,`);
    lines.push(`      totalPages: Math.ceil(total / pageSize),`);
    lines.push(`    };`);
    lines.push(`  }`);
  } else {
    lines.push(`  async findMany(filter: ${filterName}): Promise<${entityName}[]> {`);
    lines.push(`    const rows = await db`);
    lines.push(`      .select()`);
    lines.push(`      .from(${schemaVarName})`);
    lines.push(`      .where(`);
    lines.push(`        and(`);
    if (entity.hasMultiTenancy) {
      lines.push(`          eq(${schemaVarName}.organizationId, filter.organizationId),`);
      lines.push(`          eq(${schemaVarName}.branchId, filter.branchId),`);
    }
    if (options.includeSoftDelete) {
      lines.push(`          isNull(${schemaVarName}.deletedAt)`);
    }
    lines.push(`        )`);
    lines.push(`      )`);
    lines.push(`      .orderBy(desc(${schemaVarName}.createdAt));`);
    lines.push(``);
    lines.push(`    return rows`);
    lines.push(`      .map(row => ${entityName}Mapper.toDomain(row))`);
    lines.push(`      .filter(Result.isOk)`);
    lines.push(`      .map(r => r.value);`);
    lines.push(`  }`);
  }
  lines.push(``);

  // save (upsert)
  lines.push(`  async save(entity: ${entityName}): Promise<void> {`);
  lines.push(`    const data = ${entityName}Mapper.toPersistence(entity);`);
  lines.push(``);
  lines.push(`    await db`);
  lines.push(`      .insert(${schemaVarName})`);
  lines.push(`      .values(data)`);
  lines.push(`      .onConflictDoUpdate({`);
  lines.push(`        target: ${schemaVarName}.id,`);
  lines.push(`        set: {`);
  lines.push(`          ...data,`);
  lines.push(`          updatedAt: new Date(),`);
  lines.push(`        },`);
  lines.push(`      });`);
  lines.push(`  }`);
  lines.push(``);

  // delete
  if (options.includeSoftDelete) {
    lines.push(`  async delete(`);
    lines.push(`    id: string,`);
    lines.push(`    organizationId: number,`);
    lines.push(`    branchId: number`);
    lines.push(`  ): Promise<void> {`);
    lines.push(`    await db`);
    lines.push(`      .update(${schemaVarName})`);
    lines.push(`      .set({ deletedAt: new Date() })`);
    lines.push(`      .where(`);
    lines.push(`        and(`);
    lines.push(`          eq(${schemaVarName}.id, id),`);
    if (entity.hasMultiTenancy) {
      lines.push(`          eq(${schemaVarName}.organizationId, organizationId),`);
      lines.push(`          eq(${schemaVarName}.branchId, branchId)`);
    }
    lines.push(`        )`);
    lines.push(`      );`);
    lines.push(`  }`);
  } else {
    lines.push(`  async delete(`);
    lines.push(`    id: string,`);
    lines.push(`    organizationId: number,`);
    lines.push(`    branchId: number`);
    lines.push(`  ): Promise<void> {`);
    lines.push(`    await db`);
    lines.push(`      .delete(${schemaVarName})`);
    lines.push(`      .where(`);
    lines.push(`        and(`);
    lines.push(`          eq(${schemaVarName}.id, id),`);
    if (entity.hasMultiTenancy) {
      lines.push(`          eq(${schemaVarName}.organizationId, organizationId),`);
      lines.push(`          eq(${schemaVarName}.branchId, branchId)`);
    }
    lines.push(`        )`);
    lines.push(`      );`);
    lines.push(`  }`);
  }
  lines.push(``);

  // exists
  lines.push(`  async exists(`);
  lines.push(`    id: string,`);
  lines.push(`    organizationId: number,`);
  lines.push(`    branchId: number`);
  lines.push(`  ): Promise<boolean> {`);
  lines.push(`    const result = await db`);
  lines.push(`      .select({ count: sql<number>\`1\` })`);
  lines.push(`      .from(${schemaVarName})`);
  lines.push(`      .where(`);
  lines.push(`        and(`);
  lines.push(`          eq(${schemaVarName}.id, id),`);
  if (entity.hasMultiTenancy) {
    lines.push(`          eq(${schemaVarName}.organizationId, organizationId),`);
    lines.push(`          eq(${schemaVarName}.branchId, branchId),`);
  }
  if (options.includeSoftDelete) {
    lines.push(`          isNull(${schemaVarName}.deletedAt)`);
  }
  lines.push(`        )`);
  lines.push(`      )`);
  lines.push(`      .limit(1);`);
  lines.push(``);
  lines.push(`    return result.length > 0;`);
  lines.push(`  }`);

  // Custom methods
  for (const method of options.customMethods) {
    lines.push(``);
    lines.push(`  // TODO: Implementar ${method.name}`);
    lines.push(`  async ${method.name}(${method.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}): Promise<${method.returnType === 'single' ? `${entityName} | null` : method.returnType === 'array' ? `${entityName}[]` : `PaginatedResult<${entityName}>`}> {`);
    lines.push(`    throw new Error('Not implemented: ${method.name}');`);
    lines.push(`  }`);
  }

  lines.push(`}`);

  const content = lines.join('\n');
  const path = `src/modules/${module}/infrastructure/persistence/repositories/Drizzle${entityName}Repository.ts`;

  return { path, content };
}

// ============================================================================
// GERAÇÃO DE DI REGISTRATION
// ============================================================================

function generateDIRegistration(entityName: string, module: string): string {
  const lines: string[] = [
    `// Adicionar ao arquivo src/modules/${module}/infrastructure/di/container.ts`,
    ``,
    `import { container } from 'tsyringe';`,
    `import { Drizzle${entityName}Repository } from '../persistence/repositories/Drizzle${entityName}Repository';`,
    ``,
    `// Registrar token em src/shared/infrastructure/di/tokens.ts:`,
    `// ${entityName}Repository: Symbol('${entityName}Repository'),`,
    ``,
    `container.registerSingleton(`,
    `  TOKENS.${entityName}Repository,`,
    `  Drizzle${entityName}Repository`,
    `);`,
  ];

  return lines.join('\n');
}

// ============================================================================
// INSTRUÇÕES
// ============================================================================

function generateInstructions(entityName: string, module: string): string[] {
  return [
    `1. Criar Entity ${entityName} em src/modules/${module}/domain/entities/${entityName}.ts`,
    `2. Adicionar token ${entityName}Repository em src/shared/infrastructure/di/tokens.ts`,
    `3. Registrar repository no container DI do módulo`,
    `4. Executar migration para criar tabela no banco`,
    `5. Adicionar índice composto (organization_id, branch_id) no banco`,
    `6. Criar testes unitários para o repository`,
  ];
}

// ============================================================================
// HELPERS
// ============================================================================

function mapTypeToTS(type: string): string {
  const typeMap: Record<string, string> = {
    'string': 'string',
    'number': 'number',
    'boolean': 'boolean',
    'Date': 'Date',
    'Money': 'Money',
  };
  return typeMap[type] || type;
}

function mapTypeToDrizzle(type: string, name: string): string {
  const snakeName = toSnakeCase(name);
  
  switch (type) {
    case 'string':
      return `varchar('${snakeName}', { length: 255 })`;
    case 'number':
      return `int('${snakeName}')`;
    case 'boolean':
      return `bit('${snakeName}')`;
    case 'Date':
      return `datetime('${snakeName}', { mode: 'date' })`;
    case 'Money':
      return `decimal('${snakeName}', { precision: 18, scale: 2 })`;
    default:
      return `varchar('${snakeName}', { length: 255 })`;
  }
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
