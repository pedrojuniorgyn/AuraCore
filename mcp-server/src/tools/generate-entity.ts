/**
 * MCP Tool: generate_entity
 * 
 * Gera Entity DDD completa seguindo os padrões do AuraCore:
 * - Factory method create() COM validações
 * - Factory method reconstitute() SEM validações
 * - Getters para todas as propriedades
 * - Behaviors que retornam Result<void, string>
 * - Domain Events para mudanças de estado
 * 
 * @see ENTITY-001 a ENTITY-012 no regrasmcp.mdc
 * @see Evans, E. (2003). Domain-Driven Design
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface PropertyDefinition {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface GenerateEntityInput {
  name: string;
  module: string;
  properties: PropertyDefinition[];
  behaviors: string[];
  isAggregateRoot: boolean;
  hasMultiTenancy: boolean;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerateEntityOutput {
  success: boolean;
  files: GeneratedFile[];
  instructions: string[];
}

// ============================================================================
// MAPEAMENTO DE TIPOS
// ============================================================================

const TYPE_IMPORTS: Record<string, string> = {
  Money: '@/shared/domain',
  Date: '', // Built-in
  string: '', // Built-in
  number: '', // Built-in
  boolean: '', // Built-in
  CNPJ: '@/shared/domain',
  CPF: '@/shared/domain',
  Email: '@/shared/domain',
};

const TYPE_DEFAULTS: Record<string, string> = {
  string: "''",
  number: '0',
  boolean: 'false',
  Date: 'new Date()',
};

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

export async function generateEntity(
  input: GenerateEntityInput
): Promise<GenerateEntityOutput> {
  // Validar input
  validateInput(input);

  const { name, module, properties, behaviors, isAggregateRoot, hasMultiTenancy } = input;
  
  // Gerar código
  const entityCode = generateEntityCode({
    name,
    module,
    properties,
    behaviors,
    isAggregateRoot,
    hasMultiTenancy,
  });

  // Gerar Domain Events se houver behaviors
  const eventsCode = behaviors.length > 0 
    ? generateEventsCode(name, behaviors)
    : null;

  // Montar arquivos
  const files: GeneratedFile[] = [
    {
      path: `src/modules/${module}/domain/entities/${name}.ts`,
      content: entityCode,
    },
  ];

  if (eventsCode) {
    files.push({
      path: `src/modules/${module}/domain/events/${name}Events.ts`,
      content: eventsCode,
    });
  }

  // Instruções adicionais
  const instructions: string[] = [
    `1. Revise as validações em create() e ajuste conforme regras de negócio`,
    `2. Implemente a lógica dos behaviors: ${behaviors.join(', ')}`,
    `3. Crie o Repository interface em domain/ports/output/I${name}Repository.ts`,
    `4. Crie o Mapper em infrastructure/persistence/mappers/${name}Mapper.ts`,
    `5. Crie o Schema em infrastructure/persistence/schemas/${name.toLowerCase()}.schema.ts`,
  ];

  if (hasMultiTenancy) {
    instructions.push(
      `6. Lembre-se: TODA query deve filtrar por organizationId + branchId`
    );
  }

  return {
    success: true,
    files,
    instructions,
  };
}

// ============================================================================
// VALIDAÇÃO
// ============================================================================

function validateInput(input: GenerateEntityInput): void {
  if (!input.name || typeof input.name !== 'string') {
    throw new Error('name é obrigatório e deve ser string');
  }

  if (!input.name.match(/^[A-Z][a-zA-Z0-9]*$/)) {
    throw new Error('name deve ser PascalCase (ex: FreightContract)');
  }

  if (!input.module || typeof input.module !== 'string') {
    throw new Error('module é obrigatório e deve ser string');
  }

  if (!input.module.match(/^[a-z][a-z0-9-]*$/)) {
    throw new Error('module deve ser lowercase (ex: tms, fiscal, wms)');
  }

  if (!Array.isArray(input.properties)) {
    throw new Error('properties é obrigatório e deve ser array');
  }

  for (const prop of input.properties) {
    if (!prop.name || typeof prop.name !== 'string') {
      throw new Error('Cada property deve ter name (string)');
    }
    if (!prop.type || typeof prop.type !== 'string') {
      throw new Error('Cada property deve ter type (string)');
    }
    if (typeof prop.required !== 'boolean') {
      throw new Error('Cada property deve ter required (boolean)');
    }
  }

  if (!Array.isArray(input.behaviors)) {
    throw new Error('behaviors é obrigatório e deve ser array');
  }

  if (typeof input.isAggregateRoot !== 'boolean') {
    throw new Error('isAggregateRoot é obrigatório e deve ser boolean');
  }

  if (typeof input.hasMultiTenancy !== 'boolean') {
    throw new Error('hasMultiTenancy é obrigatório e deve ser boolean');
  }
}

// ============================================================================
// GERAÇÃO DE CÓDIGO
// ============================================================================

interface GenerateEntityCodeParams {
  name: string;
  module: string;
  properties: PropertyDefinition[];
  behaviors: string[];
  isAggregateRoot: boolean;
  hasMultiTenancy: boolean;
}

function generateEntityCode(params: GenerateEntityCodeParams): string {
  const { name, properties, behaviors, isAggregateRoot, hasMultiTenancy } = params;

  // Coletar imports necessários
  const imports = collectImports(properties, isAggregateRoot, behaviors.length > 0);

  // Gerar Props interface
  const propsInterface = generatePropsInterface(name, properties, hasMultiTenancy);

  // Gerar Entity class
  const entityClass = generateEntityClass(
    name,
    properties,
    behaviors,
    isAggregateRoot,
    hasMultiTenancy
  );

  return `${imports}

${propsInterface}

${entityClass}
`;
}

function collectImports(
  properties: PropertyDefinition[],
  isAggregateRoot: boolean,
  hasEvents: boolean
): string {
  const sharedDomainImports: string[] = ['Result'];
  
  if (isAggregateRoot) {
    sharedDomainImports.push('AggregateRoot');
    if (hasEvents) {
      sharedDomainImports.push('BaseDomainEvent');
    }
  } else {
    sharedDomainImports.push('Entity');
  }

  // Coletar imports de tipos de propriedades
  for (const prop of properties) {
    const baseType = prop.type.replace('[]', '').replace('?', '');
    if (TYPE_IMPORTS[baseType] === '@/shared/domain' && !sharedDomainImports.includes(baseType)) {
      sharedDomainImports.push(baseType);
    }
  }

  return `import { ${sharedDomainImports.join(', ')} } from '@/shared/domain';`;
}

function generatePropsInterface(
  name: string,
  properties: PropertyDefinition[],
  hasMultiTenancy: boolean
): string {
  const lines: string[] = [
    `/**`,
    ` * Props do ${name}`,
    ` */`,
    `export interface ${name}Props {`,
  ];

  // ID sempre primeiro
  lines.push(`  id: string;`);

  // Multi-tenancy
  if (hasMultiTenancy) {
    lines.push(`  organizationId: number;`);
    lines.push(`  branchId: number;`);
  }

  // Propriedades do usuário
  for (const prop of properties) {
    const optional = prop.required ? '' : '?';
    const comment = prop.description ? `  /** ${prop.description} */\n` : '';
    lines.push(`${comment}  ${prop.name}${optional}: ${prop.type};`);
  }

  // Timestamps
  lines.push(`  createdAt: Date;`);
  lines.push(`  updatedAt: Date;`);

  lines.push(`}`);

  return lines.join('\n');
}

function generateEntityClass(
  name: string,
  properties: PropertyDefinition[],
  behaviors: string[],
  isAggregateRoot: boolean,
  hasMultiTenancy: boolean
): string {
  const baseClass = isAggregateRoot ? 'AggregateRoot<string>' : 'Entity<string>';
  
  const lines: string[] = [
    `/**`,
    ` * ${isAggregateRoot ? 'Aggregate Root' : 'Entity'}: ${name}`,
    ` * `,
    ` * @see ENTITY-001: Extends ${baseClass}`,
    ` * @see ENTITY-002: Factory method create() com validações`,
    ` * @see ENTITY-003: Método reconstitute() sem validações`,
    ` */`,
    `export class ${name} extends ${baseClass} {`,
    `  private readonly props: ${name}Props;`,
    ``,
    `  private constructor(props: ${name}Props) {`,
    `    super(props.id, props.createdAt);`,
    `    this.props = props;`,
    `    this._updatedAt = props.updatedAt;`,
    `  }`,
    ``,
  ];

  // Getters
  lines.push(`  // ============ GETTERS ============`);
  lines.push(``);

  // ID já herdado de AggregateRoot/Entity
  
  if (hasMultiTenancy) {
    lines.push(`  get organizationId(): number { return this.props.organizationId; }`);
    lines.push(`  get branchId(): number { return this.props.branchId; }`);
  }

  for (const prop of properties) {
    const returnType = prop.required ? prop.type : `${prop.type} | undefined`;
    lines.push(`  get ${prop.name}(): ${returnType} { return this.props.${prop.name}; }`);
  }

  lines.push(``);

  // Behaviors
  if (behaviors.length > 0) {
    lines.push(`  // ============ BEHAVIORS ============`);
    lines.push(``);

    for (const behavior of behaviors) {
      lines.push(generateBehaviorMethod(behavior, name, isAggregateRoot));
      lines.push(``);
    }
  }

  // Factory: create()
  lines.push(`  // ============ FACTORY ============`);
  lines.push(``);
  lines.push(generateCreateMethod(name, properties, hasMultiTenancy));
  lines.push(``);

  // Factory: reconstitute()
  lines.push(generateReconstituteMethod(name));
  lines.push(``);

  lines.push(`}`);

  return lines.join('\n');
}

function generateBehaviorMethod(
  behavior: string,
  entityName: string,
  isAggregateRoot: boolean
): string {
  const methodName = behavior;
  const eventName = `${entityName}${capitalize(behavior)}dEvent`;
  
  const lines: string[] = [
    `  /**`,
    `   * ${capitalize(behavior)} this ${entityName}`,
    `   * `,
    `   * TODO: Implementar lógica de negócio`,
    `   */`,
    `  ${methodName}(): Result<void, string> {`,
    `    // TODO: Adicionar validações de negócio`,
    `    // Exemplo:`,
    `    // if (!this.canBe${capitalize(behavior)}d) {`,
    `    //   return Result.fail('Cannot ${behavior}: invalid state');`,
    `    // }`,
    ``,
    `    // Atualizar estado interno se necessário`,
    `    // this.props.status = 'NEW_STATUS';`,
    ``,
    `    this.touch();`,
  ];

  if (isAggregateRoot) {
    lines.push(`    this.addDomainEvent(new ${eventName}(this.id, { /* payload */ }));`);
  }

  lines.push(`    return Result.ok(undefined);`);
  lines.push(`  }`);

  return lines.join('\n');
}

function generateCreateMethod(
  name: string,
  properties: PropertyDefinition[],
  hasMultiTenancy: boolean
): string {
  const createPropsInterface = generateCreatePropsInterface(properties, hasMultiTenancy);
  
  const lines: string[] = [
    `  /**`,
    `   * Cria novo ${name} COM validações`,
    `   * `,
    `   * @see ENTITY-002: Factory method create()`,
    `   * @see ENTITY-004: Retorna Result<${name}, string>`,
    `   */`,
    `  static create(props: {`,
    createPropsInterface,
    `  }): Result<${name}, string> {`,
    `    // ===== VALIDAÇÕES (ENTITY-008) =====`,
    ``,
  ];

  // Validações de multi-tenancy
  if (hasMultiTenancy) {
    lines.push(`    if (!props.organizationId || props.organizationId <= 0) {`);
    lines.push(`      return Result.fail('organizationId é obrigatório e deve ser positivo');`);
    lines.push(`    }`);
    lines.push(``);
    lines.push(`    if (!props.branchId || props.branchId <= 0) {`);
    lines.push(`      return Result.fail('branchId é obrigatório e deve ser positivo');`);
    lines.push(`    }`);
    lines.push(``);
  }

  // Validações de propriedades required
  for (const prop of properties) {
    if (prop.required) {
      lines.push(generateValidation(prop));
      lines.push(``);
    }
  }

  // Gerar ID e timestamps
  lines.push(`    const id = globalThis.crypto.randomUUID();`);
  lines.push(`    const now = new Date();`);
  lines.push(``);

  // Criar instância
  lines.push(`    return Result.ok(new ${name}({`);
  lines.push(`      id,`);
  
  if (hasMultiTenancy) {
    lines.push(`      organizationId: props.organizationId,`);
    lines.push(`      branchId: props.branchId,`);
  }

  for (const prop of properties) {
    if (prop.required) {
      lines.push(`      ${prop.name}: props.${prop.name},`);
    } else {
      lines.push(`      ${prop.name}: props.${prop.name},`);
    }
  }

  lines.push(`      createdAt: now,`);
  lines.push(`      updatedAt: now,`);
  lines.push(`    }));`);
  lines.push(`  }`);

  return lines.join('\n');
}

function generateCreatePropsInterface(
  properties: PropertyDefinition[],
  hasMultiTenancy: boolean
): string {
  const lines: string[] = [];

  if (hasMultiTenancy) {
    lines.push(`    organizationId: number;`);
    lines.push(`    branchId: number;`);
  }

  for (const prop of properties) {
    const optional = prop.required ? '' : '?';
    lines.push(`    ${prop.name}${optional}: ${prop.type};`);
  }

  return lines.join('\n');
}

function generateValidation(prop: PropertyDefinition): string {
  const { name, type } = prop;
  
  if (type === 'string') {
    return [
      `    if (!props.${name} || props.${name}.trim() === '') {`,
      `      return Result.fail('${name} é obrigatório');`,
      `    }`,
    ].join('\n');
  }

  if (type === 'number') {
    return [
      `    if (props.${name} === undefined || props.${name} === null) {`,
      `      return Result.fail('${name} é obrigatório');`,
      `    }`,
    ].join('\n');
  }

  if (type === 'Date') {
    return [
      `    if (!props.${name}) {`,
      `      return Result.fail('${name} é obrigatório');`,
      `    }`,
    ].join('\n');
  }

  if (type === 'Money') {
    return [
      `    if (!props.${name}) {`,
      `      return Result.fail('${name} é obrigatório');`,
      `    }`,
    ].join('\n');
  }

  // Tipo genérico
  return [
    `    if (props.${name} === undefined || props.${name} === null) {`,
    `      return Result.fail('${name} é obrigatório');`,
    `    }`,
  ].join('\n');
}

function generateReconstituteMethod(name: string): string {
  return [
    `  /**`,
    `   * Reconstitui ${name} do banco SEM validações`,
    `   * `,
    `   * @see ENTITY-003: Método reconstitute() para Mapper`,
    `   * @see MAPPER-004: toDomain usa reconstitute(), NUNCA create()`,
    `   */`,
    `  static reconstitute(props: ${name}Props): ${name} {`,
    `    return new ${name}(props);`,
    `  }`,
  ].join('\n');
}

// ============================================================================
// GERAÇÃO DE DOMAIN EVENTS
// ============================================================================

function generateEventsCode(entityName: string, behaviors: string[]): string {
  const lines: string[] = [
    `import { BaseDomainEvent } from '@/shared/domain';`,
    ``,
  ];

  for (const behavior of behaviors) {
    const eventName = `${entityName}${capitalize(behavior)}dEvent`;
    
    lines.push(`/**`);
    lines.push(` * Event: ${entityName} was ${behavior}d`);
    lines.push(` */`);
    lines.push(`export class ${eventName} extends BaseDomainEvent {`);
    lines.push(`  constructor(`);
    lines.push(`    aggregateId: string,`);
    lines.push(`    public readonly payload: Record<string, unknown>`);
    lines.push(`  ) {`);
    lines.push(`    super(aggregateId, '${eventName}');`);
    lines.push(`  }`);
    lines.push(`}`);
    lines.push(``);
  }

  return lines.join('\n');
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
