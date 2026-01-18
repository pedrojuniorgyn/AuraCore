/**
 * MCP Tool: generate_use_case
 * 
 * Gera Use Case (Command ou Query) seguindo os padrões do AuraCore:
 * - Input Port interface em domain/ports/input/
 * - Use Case em application/commands/ ou application/queries/
 * - @injectable() decorator para DI
 * - ExecutionContext com multi-tenancy
 * - Result pattern para retorno
 * 
 * @see USE-CASE-001 a USE-CASE-015 no regrasmcp.mdc
 * @see Vernon, V. (2013). Implementing Domain-Driven Design
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface FieldDefinition {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface OutputFieldDefinition {
  name: string;
  type: string;
  description?: string;
}

export interface GenerateUseCaseInput {
  name: string;
  type: 'command' | 'query';
  module: string;
  description: string;
  inputFields: FieldDefinition[];
  outputFields: OutputFieldDefinition[];
  repositories: string[];
  domainServices?: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerateUseCaseOutput {
  success: boolean;
  files: GeneratedFile[];
  instructions: string[];
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

export async function generateUseCase(
  input: GenerateUseCaseInput
): Promise<GenerateUseCaseOutput> {
  // Validar input
  validateInput(input);

  const {
    name,
    type,
    module,
    description,
    inputFields,
    outputFields,
    repositories,
    domainServices,
  } = input;

  // Determinar pasta baseada no tipo
  const folder = type === 'command' ? 'commands' : 'queries';
  
  // Gerar Input Port
  const inputPortCode = generateInputPortCode({
    name,
    description,
    inputFields,
    outputFields,
  });

  // Gerar Use Case
  const useCaseCode = generateUseCaseCode({
    name,
    type,
    module,
    description,
    inputFields,
    outputFields,
    repositories,
    domainServices: domainServices ?? [],
  });

  // Montar arquivos
  const files: GeneratedFile[] = [
    {
      path: `src/modules/${module}/domain/ports/input/I${name}.ts`,
      content: inputPortCode,
    },
    {
      path: `src/modules/${module}/application/${folder}/${name}UseCase.ts`,
      content: useCaseCode,
    },
  ];

  // Instruções adicionais
  const instructions: string[] = [
    `1. Adicione I${name} ao export do index.ts em domain/ports/input/`,
    `2. Adicione ${name}UseCase ao export do index.ts em application/${folder}/`,
    `3. Registre o Use Case no módulo DI (infrastructure/di/)`,
    `4. Adicione o token TOKENS.${name}UseCase em shared/infrastructure/di/tokens.ts`,
  ];

  if (repositories.length > 0) {
    instructions.push(
      `5. Certifique-se que os repositories estão registrados: ${repositories.join(', ')}`
    );
  }

  if (domainServices && domainServices.length > 0) {
    instructions.push(
      `6. Certifique-se que os domain services existem: ${domainServices.join(', ')}`
    );
  }

  if (type === 'command') {
    instructions.push(
      `7. Este é um COMMAND - pode modificar estado. Considere usar transação se múltiplas operações.`
    );
  } else {
    instructions.push(
      `7. Este é uma QUERY - NUNCA deve modificar estado. Apenas leitura.`
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

function validateInput(input: GenerateUseCaseInput): void {
  if (!input.name || typeof input.name !== 'string') {
    throw new Error('name é obrigatório e deve ser string');
  }

  if (!input.name.match(/^[A-Z][a-zA-Z0-9]*$/)) {
    throw new Error('name deve ser PascalCase (ex: ApproveFreightContract)');
  }

  if (!input.type || !['command', 'query'].includes(input.type)) {
    throw new Error('type é obrigatório e deve ser "command" ou "query"');
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

  if (!Array.isArray(input.inputFields)) {
    throw new Error('inputFields é obrigatório e deve ser array');
  }

  for (const field of input.inputFields) {
    if (!field.name || typeof field.name !== 'string') {
      throw new Error('Cada inputField deve ter name (string)');
    }
    if (!field.type || typeof field.type !== 'string') {
      throw new Error('Cada inputField deve ter type (string)');
    }
    if (typeof field.required !== 'boolean') {
      throw new Error('Cada inputField deve ter required (boolean)');
    }
  }

  if (!Array.isArray(input.outputFields)) {
    throw new Error('outputFields é obrigatório e deve ser array');
  }

  for (const field of input.outputFields) {
    if (!field.name || typeof field.name !== 'string') {
      throw new Error('Cada outputField deve ter name (string)');
    }
    if (!field.type || typeof field.type !== 'string') {
      throw new Error('Cada outputField deve ter type (string)');
    }
  }

  if (!Array.isArray(input.repositories)) {
    throw new Error('repositories é obrigatório e deve ser array');
  }

  if (input.domainServices !== undefined && !Array.isArray(input.domainServices)) {
    throw new Error('domainServices deve ser array quando fornecido');
  }
}

// ============================================================================
// GERAÇÃO DE INPUT PORT
// ============================================================================

interface GenerateInputPortParams {
  name: string;
  description: string;
  inputFields: FieldDefinition[];
  outputFields: OutputFieldDefinition[];
}

function generateInputPortCode(params: GenerateInputPortParams): string {
  const { name, description, inputFields, outputFields } = params;

  const lines: string[] = [
    `/**`,
    ` * Input Port: ${name}`,
    ` * `,
    ` * ${description}`,
    ` * `,
    ` * @see ARCH-010: Use Cases implementam interface de domain/ports/input/`,
    ` */`,
    ``,
    `import { Result } from '@/shared/domain';`,
    ``,
    `/**`,
    ` * Contexto de execução multi-tenant`,
    ` */`,
    `export interface ExecutionContext {`,
    `  userId: string;`,
    `  organizationId: number;`,
    `  branchId: number;`,
    `}`,
    ``,
  ];

  // Input interface
  lines.push(`/**`);
  lines.push(` * Input para ${name}`);
  lines.push(` */`);
  lines.push(`export interface ${name}Input {`);
  
  for (const field of inputFields) {
    const optional = field.required ? '' : '?';
    if (field.description) {
      lines.push(`  /** ${field.description} */`);
    }
    lines.push(`  ${field.name}${optional}: ${field.type};`);
  }
  
  lines.push(`}`);
  lines.push(``);

  // Output interface
  lines.push(`/**`);
  lines.push(` * Output de ${name}`);
  lines.push(` */`);
  lines.push(`export interface ${name}Output {`);
  
  for (const field of outputFields) {
    if (field.description) {
      lines.push(`  /** ${field.description} */`);
    }
    lines.push(`  ${field.name}: ${field.type};`);
  }
  
  lines.push(`}`);
  lines.push(``);

  // Interface principal
  lines.push(`/**`);
  lines.push(` * Interface do Use Case`);
  lines.push(` */`);
  lines.push(`export interface I${name} {`);
  lines.push(`  execute(`);
  lines.push(`    input: ${name}Input,`);
  lines.push(`    context: ExecutionContext`);
  lines.push(`  ): Promise<Result<${name}Output, string>>;`);
  lines.push(`}`);

  return lines.join('\n');
}

// ============================================================================
// GERAÇÃO DE USE CASE
// ============================================================================

interface GenerateUseCaseCodeParams {
  name: string;
  type: 'command' | 'query';
  module: string;
  description: string;
  inputFields: FieldDefinition[];
  outputFields: OutputFieldDefinition[];
  repositories: string[];
  domainServices: string[];
}

function generateUseCaseCode(params: GenerateUseCaseCodeParams): string {
  const {
    name,
    type,
    module,
    description,
    inputFields,
    outputFields,
    repositories,
    domainServices,
  } = params;

  // Construir imports
  const imports = generateUseCaseImports(name, module, repositories, domainServices);

  // Construir constructor params
  const constructorParams = generateConstructorParams(repositories, domainServices);

  // Construir validação de input
  const inputValidation = generateInputValidation(inputFields);

  // Construir lógica do execute
  const executeLogic = generateExecuteLogic(type, outputFields);

  const lines: string[] = [
    imports,
    ``,
    `/**`,
    ` * Use Case: ${name}`,
    ` * `,
    ` * ${description}`,
    ` * `,
    ` * @see USE-CASE-00${type === 'command' ? '1' : '2'}: ${type === 'command' ? 'Commands em application/commands/' : 'Queries em application/queries/'}`,
    ` * @see USE-CASE-003: Implementa interface de domain/ports/input/`,
    ` * @see USE-CASE-006: Retorna Promise<Result<Output, string>>`,
    ` */`,
    `@injectable()`,
    `export class ${name}UseCase implements I${name} {`,
    `  constructor(`,
    constructorParams,
    `  ) {}`,
    ``,
    `  async execute(`,
    `    input: ${name}Input,`,
    `    context: ExecutionContext`,
    `  ): Promise<Result<${name}Output, string>> {`,
    `    try {`,
    `      // ===== VALIDAÇÃO DE INPUT (USE-CASE-007) =====`,
    inputValidation,
    ``,
    `      // ===== VERIFICAR MULTI-TENANCY (USE-CASE-008) =====`,
    `      if (!context.organizationId || context.organizationId <= 0) {`,
    `        return Result.fail('organizationId inválido no contexto');`,
    `      }`,
    `      if (!context.branchId || context.branchId <= 0) {`,
    `        return Result.fail('branchId inválido no contexto');`,
    `      }`,
    ``,
    `      // ===== LÓGICA DO USE CASE =====`,
    executeLogic,
    `    } catch (error: unknown) {`,
    `      const errorMessage = error instanceof Error ? error.message : String(error);`,
    `      return Result.fail(\`Failed to execute ${name}: \${errorMessage}\`);`,
    `    }`,
    `  }`,
    `}`,
  ];

  return lines.join('\n');
}

function generateUseCaseImports(
  name: string,
  module: string,
  repositories: string[],
  domainServices: string[]
): string {
  const lines: string[] = [
    `import { inject, injectable } from 'tsyringe';`,
    `import { Result } from '@/shared/domain';`,
    `import { TOKENS } from '@/shared/infrastructure/di/tokens';`,
    `import {`,
    `  I${name},`,
    `  ${name}Input,`,
    `  ${name}Output,`,
    `  ExecutionContext,`,
    `} from '../../domain/ports/input/I${name}';`,
  ];

  // Imports de repositories
  for (const repo of repositories) {
    lines.push(`import type { ${repo} } from '../../domain/ports/output/${repo}';`);
  }

  // Imports de domain services
  for (const service of domainServices) {
    lines.push(`import { ${service} } from '../../domain/services/${service}';`);
  }

  return lines.join('\n');
}

function generateConstructorParams(
  repositories: string[],
  domainServices: string[]
): string {
  const params: string[] = [];

  for (const repo of repositories) {
    // Extrair nome do token do nome do repository
    // IFreightContractRepository -> FreightContractRepository
    const tokenName = repo.startsWith('I') ? repo.slice(1) : repo;
    const paramName = repo.charAt(0).toLowerCase() + repo.slice(1);
    
    params.push(`    @inject(TOKENS.${tokenName}) private readonly ${paramName}: ${repo},`);
  }

  for (const service of domainServices) {
    const paramName = service.charAt(0).toLowerCase() + service.slice(1);
    params.push(`    @inject(TOKENS.${service}) private readonly ${paramName}: ${service},`);
  }

  // Remover vírgula do último item
  if (params.length > 0) {
    const lastIndex = params.length - 1;
    params[lastIndex] = params[lastIndex].slice(0, -1); // Remove trailing comma
  }

  return params.join('\n');
}

function generateInputValidation(inputFields: FieldDefinition[]): string {
  const lines: string[] = [];

  for (const field of inputFields) {
    if (field.required) {
      if (field.type === 'string') {
        lines.push(`      if (!input.${field.name} || input.${field.name}.trim() === '') {`);
        lines.push(`        return Result.fail('${field.name} é obrigatório');`);
        lines.push(`      }`);
      } else if (field.type === 'number') {
        lines.push(`      if (input.${field.name} === undefined || input.${field.name} === null) {`);
        lines.push(`        return Result.fail('${field.name} é obrigatório');`);
        lines.push(`      }`);
      } else {
        lines.push(`      if (!input.${field.name}) {`);
        lines.push(`        return Result.fail('${field.name} é obrigatório');`);
        lines.push(`      }`);
      }
    }
  }

  return lines.join('\n');
}

function generateExecuteLogic(
  type: 'command' | 'query',
  outputFields: OutputFieldDefinition[]
): string {
  const lines: string[] = [];

  if (type === 'command') {
    lines.push(`      // TODO: Implementar lógica do command`);
    lines.push(`      // `);
    lines.push(`      // Exemplo:`);
    lines.push(`      // 1. Buscar entidade`);
    lines.push(`      // const entity = await this.repository.findById(input.id, context.organizationId, context.branchId);`);
    lines.push(`      // if (!entity) {`);
    lines.push(`      //   return Result.fail('Entity not found');`);
    lines.push(`      // }`);
    lines.push(`      // `);
    lines.push(`      // 2. Executar behavior`);
    lines.push(`      // const result = entity.approve();`);
    lines.push(`      // if (Result.isFail(result)) {`);
    lines.push(`      //   return Result.fail(result.error);`);
    lines.push(`      // }`);
    lines.push(`      // `);
    lines.push(`      // 3. Persistir`);
    lines.push(`      // await this.repository.save(entity);`);
  } else {
    lines.push(`      // TODO: Implementar lógica da query`);
    lines.push(`      // `);
    lines.push(`      // Exemplo:`);
    lines.push(`      // const items = await this.repository.findMany({`);
    lines.push(`      //   organizationId: context.organizationId,`);
    lines.push(`      //   branchId: context.branchId,`);
    lines.push(`      //   ...input,`);
    lines.push(`      // });`);
    lines.push(`      // `);
    lines.push(`      // IMPORTANTE: Queries NUNCA modificam estado (USE-CASE-013)`);
  }

  lines.push(``);
  lines.push(`      // Retornar output`);
  lines.push(`      return Result.ok({`);
  
  for (const field of outputFields) {
    const defaultValue = getDefaultValue(field.type);
    lines.push(`        ${field.name}: ${defaultValue}, // TODO: Preencher com valor real`);
  }
  
  lines.push(`      });`);

  return lines.join('\n');
}

function getDefaultValue(type: string): string {
  switch (type) {
    case 'string':
      return "''";
    case 'number':
      return '0';
    case 'boolean':
      return 'false';
    case 'Date':
      return 'new Date()';
    default:
      if (type.endsWith('[]')) {
        return '[]';
      }
      return 'undefined as unknown'; // Força o desenvolvedor a preencher
  }
}
