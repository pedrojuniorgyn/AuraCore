/**
 * MCP Tool: generate_api_route
 * 
 * Gera API Route Next.js 15 completa com:
 * - Validação Zod
 * - Autenticação via getTenantContext
 * - Result pattern correto
 * - OpenAPI spec opcional
 * 
 * @see Next.js 15 App Router documentation
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

export interface EndpointDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  action: string;
  useCaseName: string;
  description: string;
  requestBody?: {
    properties: PropertyDefinition[];
  };
  responseType: 'single' | 'array' | 'paginated' | 'void';
}

export interface GenerateApiRouteInput {
  name: string;
  module: string;
  basePath: string;
  entity: {
    name: string;
    properties: PropertyDefinition[];
  };
  endpoints: EndpointDefinition[];
  options: {
    includeOpenAPI: boolean;
    includeRateLimit: boolean;
    includeCache: boolean;
  };
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerateApiRouteOutput {
  success: boolean;
  files: {
    route: GeneratedFile;
    dynamicRoute?: GeneratedFile;
    actionRoutes?: GeneratedFile[];
    schemas: GeneratedFile;
    openapi?: GeneratedFile;
  };
  instructions: string[];
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

export async function generateApiRoute(
  input: GenerateApiRouteInput
): Promise<GenerateApiRouteOutput> {
  // Validar input
  validateInput(input);

  const { name, module, basePath, entity, endpoints, options } = input;

  // Separar endpoints por tipo de rota
  const baseEndpoints = endpoints.filter(e => e.path === '/' || e.path === '');
  const idEndpoints = endpoints.filter(e => e.path === '/:id' || e.path === '/[id]');
  const actionEndpoints = endpoints.filter(e => 
    e.path !== '/' && e.path !== '' && e.path !== '/:id' && e.path !== '/[id]'
  );

  // Gerar arquivos
  const schemasFile = generateSchemas(name, entity, endpoints);
  const routeFile = generateBaseRoute(name, module, basePath, entity, baseEndpoints, options);
  
  let dynamicRoute: GeneratedFile | undefined;
  if (idEndpoints.length > 0) {
    dynamicRoute = generateDynamicRoute(name, module, basePath, entity, idEndpoints, options);
  }

  const actionRoutes: GeneratedFile[] = [];
  for (const endpoint of actionEndpoints) {
    const actionRoute = generateActionRoute(name, module, basePath, entity, endpoint, options);
    actionRoutes.push(actionRoute);
  }

  let openapi: GeneratedFile | undefined;
  if (options.includeOpenAPI) {
    openapi = generateOpenAPISpec(name, module, basePath, entity, endpoints);
  }

  const instructions = generateInstructions(name, module, basePath);

  return {
    success: true,
    files: {
      route: routeFile,
      dynamicRoute,
      actionRoutes: actionRoutes.length > 0 ? actionRoutes : undefined,
      schemas: schemasFile,
      openapi,
    },
    instructions,
  };
}

// ============================================================================
// VALIDAÇÃO
// ============================================================================

function validateInput(input: GenerateApiRouteInput): void {
  if (!input.name || typeof input.name !== 'string') {
    throw new Error('name é obrigatório e deve ser string');
  }

  if (!input.name.match(/^[a-z][a-z0-9-]*$/)) {
    throw new Error('name deve ser kebab-case (ex: freight-contracts)');
  }

  if (!input.module || typeof input.module !== 'string') {
    throw new Error('module é obrigatório e deve ser string');
  }

  if (!input.basePath || typeof input.basePath !== 'string') {
    throw new Error('basePath é obrigatório e deve ser string');
  }

  if (!input.basePath.startsWith('/api/')) {
    throw new Error('basePath deve começar com /api/');
  }

  if (!Array.isArray(input.endpoints) || input.endpoints.length === 0) {
    throw new Error('endpoints é obrigatório e deve ter pelo menos um item');
  }

  for (const endpoint of input.endpoints) {
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method)) {
      throw new Error(`Método inválido: ${endpoint.method}`);
    }
    if (!endpoint.useCaseName) {
      throw new Error('Cada endpoint deve ter useCaseName');
    }
  }
}

// ============================================================================
// GERAÇÃO DE SCHEMAS ZOD
// ============================================================================

function generateSchemas(
  name: string,
  entity: GenerateApiRouteInput['entity'],
  endpoints: EndpointDefinition[]
): GeneratedFile {
  const pascalName = toPascalCase(name);
  
  const lines: string[] = [
    `/**`,
    ` * Zod Schemas: ${pascalName}`,
    ` * `,
    ` * Schemas de validação para API routes.`,
    ` */`,
    ``,
    `import { z } from 'zod';`,
    ``,
  ];

  // Schema de Query (para GET com paginação)
  lines.push(`// Query params para listagem`);
  lines.push(`export const ${pascalName}QuerySchema = z.object({`);
  lines.push(`  page: z.coerce.number().min(1).default(1),`);
  lines.push(`  pageSize: z.coerce.number().min(1).max(100).default(20),`);
  lines.push(`  search: z.string().optional(),`);
  lines.push(`});`);
  lines.push(``);
  lines.push(`export type ${pascalName}Query = z.infer<typeof ${pascalName}QuerySchema>;`);
  lines.push(``);

  // Schema de Create
  const postEndpoint = endpoints.find(e => e.method === 'POST' && (e.path === '/' || e.path === ''));
  if (postEndpoint?.requestBody) {
    lines.push(`// Body para criação`);
    lines.push(`export const Create${pascalName}Schema = z.object({`);
    for (const prop of postEndpoint.requestBody.properties) {
      const zodType = mapTypeToZod(prop.type, prop.required);
      lines.push(`  ${prop.name}: ${zodType},${prop.description ? ` // ${prop.description}` : ''}`);
    }
    lines.push(`});`);
    lines.push(``);
    lines.push(`export type Create${pascalName}Input = z.infer<typeof Create${pascalName}Schema>;`);
    lines.push(``);
  }

  // Schema de Update
  const putEndpoint = endpoints.find(e => e.method === 'PUT' || e.method === 'PATCH');
  if (putEndpoint?.requestBody) {
    lines.push(`// Body para atualização`);
    lines.push(`export const Update${pascalName}Schema = z.object({`);
    for (const prop of putEndpoint.requestBody.properties) {
      const zodType = mapTypeToZod(prop.type, false); // Update sempre opcional
      lines.push(`  ${prop.name}: ${zodType}.optional(),`);
    }
    lines.push(`});`);
    lines.push(``);
    lines.push(`export type Update${pascalName}Input = z.infer<typeof Update${pascalName}Schema>;`);
    lines.push(``);
  }

  // Schema para ID param
  lines.push(`// Validação de ID`);
  lines.push(`export const IdParamSchema = z.object({`);
  lines.push(`  id: z.string().uuid(),`);
  lines.push(`});`);
  lines.push(``);

  // Response schemas
  lines.push(`// Response types`);
  lines.push(`export const ${pascalName}ResponseSchema = z.object({`);
  lines.push(`  id: z.string().uuid(),`);
  for (const prop of entity.properties) {
    const zodType = mapTypeToZod(prop.type, prop.required);
    lines.push(`  ${prop.name}: ${zodType},`);
  }
  lines.push(`  createdAt: z.string().datetime(),`);
  lines.push(`  updatedAt: z.string().datetime(),`);
  lines.push(`});`);
  lines.push(``);
  lines.push(`export type ${pascalName}Response = z.infer<typeof ${pascalName}ResponseSchema>;`);

  const content = lines.join('\n');
  const path = `src/app/api/${module}/${name}/schemas.ts`;

  return { path, content };
}

// ============================================================================
// GERAÇÃO DE ROUTE BASE (/)
// ============================================================================

function generateBaseRoute(
  name: string,
  module: string,
  _basePath: string,
  _entity: GenerateApiRouteInput['entity'],
  endpoints: EndpointDefinition[],
  options: GenerateApiRouteInput['options']
): GeneratedFile {
  const pascalName = toPascalCase(name);
  const moduleUpper = module.toUpperCase();
  
  const lines: string[] = [
    `/**`,
    ` * API Route: ${name}`,
    ` * `,
    ` * Next.js 15 App Router API`,
    ` */`,
    ``,
    `import { NextRequest, NextResponse } from 'next/server';`,
    `import { getTenantContext } from '@/lib/auth/context';`,
    `import { resolveBranchIdOrThrow } from '@/lib/auth/branch';`,
    `import { container } from '@/shared/infrastructure/di/container';`,
    `import { Result } from '@/shared/domain';`,
    `import { ${moduleUpper}_TOKENS } from '@/modules/${module}/infrastructure/di/tokens';`,
  ];

  // Imports de schemas
  const hasGet = endpoints.some(e => e.method === 'GET');
  const hasPost = endpoints.some(e => e.method === 'POST');
  
  const schemaImports: string[] = [];
  if (hasGet) schemaImports.push(`${pascalName}QuerySchema`);
  if (hasPost) schemaImports.push(`Create${pascalName}Schema`);
  
  if (schemaImports.length > 0) {
    lines.push(`import { ${schemaImports.join(', ')} } from './schemas';`);
  }

  // Rate limit
  if (options.includeRateLimit) {
    lines.push(`import { rateLimit } from '@/lib/rate-limit';`);
  }

  lines.push(``);

  // GET handler
  const getEndpoint = endpoints.find(e => e.method === 'GET');
  if (getEndpoint) {
    lines.push(`/**`);
    lines.push(` * GET - ${getEndpoint.description}`);
    lines.push(` */`);
    lines.push(`export async function GET(request: NextRequest) {`);
    lines.push(`  try {`);
    lines.push(`    const ctx = await getTenantContext();`);
    lines.push(`    const branchId = resolveBranchIdOrThrow(request.headers, ctx);`);
    lines.push(``);
    lines.push(`    // Validar query params`);
    lines.push(`    const { searchParams } = new URL(request.url);`);
    lines.push(`    const query = ${pascalName}QuerySchema.safeParse(`);
    lines.push(`      Object.fromEntries(searchParams)`);
    lines.push(`    );`);
    lines.push(``);
    lines.push(`    if (!query.success) {`);
    lines.push(`      return NextResponse.json(`);
    lines.push(`        { error: 'Validation failed', details: query.error.issues },`);
    lines.push(`        { status: 400 }`);
    lines.push(`      );`);
    lines.push(`    }`);
    lines.push(``);
    lines.push(`    // Resolver use case`);
    lines.push(`    const useCase = container.resolve(${moduleUpper}_TOKENS.${getEndpoint.useCaseName});`);
    lines.push(``);
    lines.push(`    const result = await useCase.execute({`);
    lines.push(`      ...query.data,`);
    lines.push(`      organizationId: ctx.organizationId,`);
    lines.push(`      branchId,`);
    lines.push(`    }, ctx);`);
    lines.push(``);
    lines.push(`    if (Result.isFail(result)) {`);
    lines.push(`      return NextResponse.json(`);
    lines.push(`        { error: result.error },`);
    lines.push(`        { status: 400 }`);
    lines.push(`      );`);
    lines.push(`    }`);
    lines.push(``);
    
    if (options.includeCache) {
      lines.push(`    // Cache headers`);
      lines.push(`    const headers = new Headers();`);
      lines.push(`    headers.set('Cache-Control', 'private, max-age=60');`);
      lines.push(``);
      lines.push(`    return NextResponse.json(result.value, { headers });`);
    } else {
      lines.push(`    return NextResponse.json(result.value);`);
    }
    
    lines.push(`  } catch (error: unknown) {`);
    lines.push(`    const message = error instanceof Error ? error.message : 'Internal server error';`);
    lines.push(`    return NextResponse.json({ error: message }, { status: 500 });`);
    lines.push(`  }`);
    lines.push(`}`);
    lines.push(``);
  }

  // POST handler
  const postEndpoint = endpoints.find(e => e.method === 'POST');
  if (postEndpoint) {
    lines.push(`/**`);
    lines.push(` * POST - ${postEndpoint.description}`);
    lines.push(` */`);
    lines.push(`export async function POST(request: NextRequest) {`);
    lines.push(`  try {`);
    lines.push(`    const ctx = await getTenantContext();`);
    lines.push(`    const branchId = resolveBranchIdOrThrow(request.headers, ctx);`);
    lines.push(``);
    lines.push(`    // Validar body`);
    lines.push(`    const body = await request.json();`);
    lines.push(`    const parsed = Create${pascalName}Schema.safeParse(body);`);
    lines.push(``);
    lines.push(`    if (!parsed.success) {`);
    lines.push(`      return NextResponse.json(`);
    lines.push(`        { error: 'Validation failed', details: parsed.error.issues },`);
    lines.push(`        { status: 400 }`);
    lines.push(`      );`);
    lines.push(`    }`);
    lines.push(``);
    lines.push(`    // Resolver use case`);
    lines.push(`    const useCase = container.resolve(${moduleUpper}_TOKENS.${postEndpoint.useCaseName});`);
    lines.push(``);
    lines.push(`    const result = await useCase.execute({`);
    lines.push(`      ...parsed.data,`);
    lines.push(`      userId: ctx.userId,`);
    lines.push(`      organizationId: ctx.organizationId,`);
    lines.push(`      branchId,`);
    lines.push(`    }, ctx);`);
    lines.push(``);
    lines.push(`    if (Result.isFail(result)) {`);
    lines.push(`      return NextResponse.json(`);
    lines.push(`        { error: result.error },`);
    lines.push(`        { status: 400 }`);
    lines.push(`      );`);
    lines.push(`    }`);
    lines.push(``);
    lines.push(`    return NextResponse.json(result.value, { status: 201 });`);
    lines.push(`  } catch (error: unknown) {`);
    lines.push(`    const message = error instanceof Error ? error.message : 'Internal server error';`);
    lines.push(`    return NextResponse.json({ error: message }, { status: 500 });`);
    lines.push(`  }`);
    lines.push(`}`);
  }

  const content = lines.join('\n');
  const path = `src/app/api/${module}/${name}/route.ts`;

  return { path, content };
}

// ============================================================================
// GERAÇÃO DE ROUTE DINÂMICA (/[id])
// ============================================================================

function generateDynamicRoute(
  name: string,
  module: string,
  _basePath: string,
  _entity: GenerateApiRouteInput['entity'],
  endpoints: EndpointDefinition[],
  _options: GenerateApiRouteInput['options']
): GeneratedFile {
  const pascalName = toPascalCase(name);
  const moduleUpper = module.toUpperCase();
  
  const lines: string[] = [
    `/**`,
    ` * API Route: ${name}/[id]`,
    ` * `,
    ` * Next.js 15 App Router - Dynamic Route`,
    ` */`,
    ``,
    `import { NextRequest, NextResponse } from 'next/server';`,
    `import { getTenantContext } from '@/lib/auth/context';`,
    `import { resolveBranchIdOrThrow } from '@/lib/auth/branch';`,
    `import { container } from '@/shared/infrastructure/di/container';`,
    `import { Result } from '@/shared/domain';`,
    `import { ${moduleUpper}_TOKENS } from '@/modules/${module}/infrastructure/di/tokens';`,
  ];

  // Imports de schemas
  const hasUpdate = endpoints.some(e => e.method === 'PUT' || e.method === 'PATCH');
  if (hasUpdate) {
    lines.push(`import { Update${pascalName}Schema, IdParamSchema } from '../schemas';`);
  } else {
    lines.push(`import { IdParamSchema } from '../schemas';`);
  }

  lines.push(``);
  lines.push(`interface RouteParams {`);
  lines.push(`  params: Promise<{ id: string }>;`);
  lines.push(`}`);
  lines.push(``);

  // GET by ID
  const getEndpoint = endpoints.find(e => e.method === 'GET');
  if (getEndpoint) {
    lines.push(`/**`);
    lines.push(` * GET - ${getEndpoint.description}`);
    lines.push(` */`);
    lines.push(`export async function GET(`);
    lines.push(`  request: NextRequest,`);
    lines.push(`  { params }: RouteParams`);
    lines.push(`) {`);
    lines.push(`  try {`);
    lines.push(`    const ctx = await getTenantContext();`);
    lines.push(`    const branchId = resolveBranchIdOrThrow(request.headers, ctx);`);
    lines.push(`    const { id } = await params;`);
    lines.push(``);
    lines.push(`    // Validar ID`);
    lines.push(`    const idValidation = IdParamSchema.safeParse({ id });`);
    lines.push(`    if (!idValidation.success) {`);
    lines.push(`      return NextResponse.json(`);
    lines.push(`        { error: 'Invalid ID format' },`);
    lines.push(`        { status: 400 }`);
    lines.push(`      );`);
    lines.push(`    }`);
    lines.push(``);
    lines.push(`    const useCase = container.resolve(${moduleUpper}_TOKENS.${getEndpoint.useCaseName});`);
    lines.push(``);
    lines.push(`    const result = await useCase.execute({`);
    lines.push(`      id,`);
    lines.push(`      organizationId: ctx.organizationId,`);
    lines.push(`      branchId,`);
    lines.push(`    }, ctx);`);
    lines.push(``);
    lines.push(`    if (Result.isFail(result)) {`);
    lines.push(`      return NextResponse.json(`);
    lines.push(`        { error: result.error },`);
    lines.push(`        { status: 404 }`);
    lines.push(`      );`);
    lines.push(`    }`);
    lines.push(``);
    lines.push(`    return NextResponse.json(result.value);`);
    lines.push(`  } catch (error: unknown) {`);
    lines.push(`    const message = error instanceof Error ? error.message : 'Internal server error';`);
    lines.push(`    return NextResponse.json({ error: message }, { status: 500 });`);
    lines.push(`  }`);
    lines.push(`}`);
    lines.push(``);
  }

  // PUT/PATCH
  const updateEndpoint = endpoints.find(e => e.method === 'PUT' || e.method === 'PATCH');
  if (updateEndpoint) {
    lines.push(`/**`);
    lines.push(` * ${updateEndpoint.method} - ${updateEndpoint.description}`);
    lines.push(` */`);
    lines.push(`export async function ${updateEndpoint.method}(`);
    lines.push(`  request: NextRequest,`);
    lines.push(`  { params }: RouteParams`);
    lines.push(`) {`);
    lines.push(`  try {`);
    lines.push(`    const ctx = await getTenantContext();`);
    lines.push(`    const branchId = resolveBranchIdOrThrow(request.headers, ctx);`);
    lines.push(`    const { id } = await params;`);
    lines.push(``);
    lines.push(`    const body = await request.json();`);
    lines.push(`    const parsed = Update${pascalName}Schema.safeParse(body);`);
    lines.push(``);
    lines.push(`    if (!parsed.success) {`);
    lines.push(`      return NextResponse.json(`);
    lines.push(`        { error: 'Validation failed', details: parsed.error.issues },`);
    lines.push(`        { status: 400 }`);
    lines.push(`      );`);
    lines.push(`    }`);
    lines.push(``);
    lines.push(`    const useCase = container.resolve(${moduleUpper}_TOKENS.${updateEndpoint.useCaseName});`);
    lines.push(``);
    lines.push(`    const result = await useCase.execute({`);
    lines.push(`      id,`);
    lines.push(`      ...parsed.data,`);
    lines.push(`      organizationId: ctx.organizationId,`);
    lines.push(`      branchId,`);
    lines.push(`    }, ctx);`);
    lines.push(``);
    lines.push(`    if (Result.isFail(result)) {`);
    lines.push(`      return NextResponse.json(`);
    lines.push(`        { error: result.error },`);
    lines.push(`        { status: 400 }`);
    lines.push(`      );`);
    lines.push(`    }`);
    lines.push(``);
    lines.push(`    return NextResponse.json(result.value);`);
    lines.push(`  } catch (error: unknown) {`);
    lines.push(`    const message = error instanceof Error ? error.message : 'Internal server error';`);
    lines.push(`    return NextResponse.json({ error: message }, { status: 500 });`);
    lines.push(`  }`);
    lines.push(`}`);
    lines.push(``);
  }

  // DELETE
  const deleteEndpoint = endpoints.find(e => e.method === 'DELETE');
  if (deleteEndpoint) {
    lines.push(`/**`);
    lines.push(` * DELETE - ${deleteEndpoint.description}`);
    lines.push(` */`);
    lines.push(`export async function DELETE(`);
    lines.push(`  request: NextRequest,`);
    lines.push(`  { params }: RouteParams`);
    lines.push(`) {`);
    lines.push(`  try {`);
    lines.push(`    const ctx = await getTenantContext();`);
    lines.push(`    const branchId = resolveBranchIdOrThrow(request.headers, ctx);`);
    lines.push(`    const { id } = await params;`);
    lines.push(``);
    lines.push(`    const useCase = container.resolve(${moduleUpper}_TOKENS.${deleteEndpoint.useCaseName});`);
    lines.push(``);
    lines.push(`    const result = await useCase.execute({`);
    lines.push(`      id,`);
    lines.push(`      organizationId: ctx.organizationId,`);
    lines.push(`      branchId,`);
    lines.push(`    }, ctx);`);
    lines.push(``);
    lines.push(`    if (Result.isFail(result)) {`);
    lines.push(`      return NextResponse.json(`);
    lines.push(`        { error: result.error },`);
    lines.push(`        { status: 400 }`);
    lines.push(`      );`);
    lines.push(`    }`);
    lines.push(``);
    lines.push(`    return new NextResponse(null, { status: 204 });`);
    lines.push(`  } catch (error: unknown) {`);
    lines.push(`    const message = error instanceof Error ? error.message : 'Internal server error';`);
    lines.push(`    return NextResponse.json({ error: message }, { status: 500 });`);
    lines.push(`  }`);
    lines.push(`}`);
  }

  const content = lines.join('\n');
  const path = `src/app/api/${module}/${name}/[id]/route.ts`;

  return { path, content };
}

// ============================================================================
// GERAÇÃO DE ACTION ROUTES (/[id]/action)
// ============================================================================

function generateActionRoute(
  name: string,
  module: string,
  _basePath: string,
  _entity: GenerateApiRouteInput['entity'],
  endpoint: EndpointDefinition,
  _options: GenerateApiRouteInput['options']
): GeneratedFile {
  const moduleUpper = module.toUpperCase();
  
  // Extrair nome da ação do path (ex: /:id/approve -> approve)
  const actionName = endpoint.path.split('/').filter(p => p && !p.startsWith(':') && p !== '[id]').pop() || endpoint.action;
  
  const lines: string[] = [
    `/**`,
    ` * API Route: ${name}/[id]/${actionName}`,
    ` * `,
    ` * ${endpoint.description}`,
    ` */`,
    ``,
    `import { NextRequest, NextResponse } from 'next/server';`,
    `import { getTenantContext } from '@/lib/auth/context';`,
    `import { resolveBranchIdOrThrow } from '@/lib/auth/branch';`,
    `import { container } from '@/shared/infrastructure/di/container';`,
    `import { Result } from '@/shared/domain';`,
    `import { ${moduleUpper}_TOKENS } from '@/modules/${module}/infrastructure/di/tokens';`,
    ``,
    `interface RouteParams {`,
    `  params: Promise<{ id: string }>;`,
    `}`,
    ``,
    `/**`,
    ` * ${endpoint.method} - ${endpoint.description}`,
    ` */`,
    `export async function ${endpoint.method}(`,
    `  request: NextRequest,`,
    `  { params }: RouteParams`,
    `) {`,
    `  try {`,
    `    const ctx = await getTenantContext();`,
    `    const branchId = resolveBranchIdOrThrow(request.headers, ctx);`,
    `    const { id } = await params;`,
    ``,
  ];

  // Parse body se necessário
  if (endpoint.requestBody && endpoint.method !== 'GET') {
    lines.push(`    const body = await request.json();`);
    lines.push(``);
  }

  lines.push(`    const useCase = container.resolve(${moduleUpper}_TOKENS.${endpoint.useCaseName});`);
  lines.push(``);
  lines.push(`    const result = await useCase.execute({`);
  lines.push(`      id,`);
  
  if (endpoint.requestBody) {
    lines.push(`      ...body,`);
  }
  
  lines.push(`      userId: ctx.userId,`);
  lines.push(`      organizationId: ctx.organizationId,`);
  lines.push(`      branchId,`);
  lines.push(`    }, ctx);`);
  lines.push(``);
  lines.push(`    if (Result.isFail(result)) {`);
  lines.push(`      return NextResponse.json(`);
  lines.push(`        { error: result.error },`);
  lines.push(`        { status: 400 }`);
  lines.push(`      );`);
  lines.push(`    }`);
  lines.push(``);
  
  if (endpoint.responseType === 'void') {
    lines.push(`    return new NextResponse(null, { status: 204 });`);
  } else {
    lines.push(`    return NextResponse.json(result.value);`);
  }
  
  lines.push(`  } catch (error: unknown) {`);
  lines.push(`    const message = error instanceof Error ? error.message : 'Internal server error';`);
  lines.push(`    return NextResponse.json({ error: message }, { status: 500 });`);
  lines.push(`  }`);
  lines.push(`}`);

  const content = lines.join('\n');
  const path = `src/app/api/${module}/${name}/[id]/${actionName}/route.ts`;

  return { path, content };
}

// ============================================================================
// GERAÇÃO DE OPENAPI SPEC
// ============================================================================

function generateOpenAPISpec(
  name: string,
  module: string,
  basePath: string,
  entity: GenerateApiRouteInput['entity'],
  endpoints: EndpointDefinition[]
): GeneratedFile {
  const pascalName = toPascalCase(name);
  
  const spec = {
    openapi: '3.0.3',
    info: {
      title: `${pascalName} API`,
      version: '1.0.0',
      description: `API para ${pascalName}`,
    },
    paths: {} as Record<string, Record<string, unknown>>,
    components: {
      schemas: {
        [pascalName]: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            ...Object.fromEntries(
              entity.properties.map(p => [p.name, { type: mapTypeToOpenAPI(p.type) }])
            ),
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  };

  // Adicionar endpoints ao paths
  for (const endpoint of endpoints) {
    const pathKey = basePath + (endpoint.path === '/' ? '' : endpoint.path.replace(':id', '{id}'));
    
    if (!spec.paths[pathKey]) {
      spec.paths[pathKey] = {};
    }

    const operation: Record<string, unknown> = {
      summary: endpoint.description,
      operationId: `${endpoint.action}${pascalName}`,
      tags: [module],
      responses: {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${pascalName}` },
            },
          },
        },
        '400': {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    };

    if (endpoint.requestBody) {
      operation['requestBody'] = {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: Object.fromEntries(
                endpoint.requestBody.properties.map(p => [
                  p.name,
                  { type: mapTypeToOpenAPI(p.type) },
                ])
              ),
            },
          },
        },
      };
    }

    spec.paths[pathKey][endpoint.method.toLowerCase()] = operation;
  }

  const content = JSON.stringify(spec, null, 2);
  const path = `src/app/api/${module}/${name}/openapi.json`;

  return { path, content };
}

// ============================================================================
// INSTRUÇÕES
// ============================================================================

function generateInstructions(name: string, module: string, basePath: string): string[] {
  return [
    `1. Criar Use Cases necessários em src/modules/${module}/application/`,
    `2. Adicionar tokens dos Use Cases em src/modules/${module}/infrastructure/di/tokens.ts`,
    `3. Registrar Use Cases no container DI do módulo`,
    `4. Testar endpoints: curl ${basePath}`,
    `5. Adicionar testes E2E para os endpoints`,
  ];
}

// ============================================================================
// HELPERS
// ============================================================================

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function mapTypeToZod(type: string, required: boolean): string {
  let zodType: string;
  
  switch (type) {
    case 'string':
      zodType = 'z.string()';
      break;
    case 'number':
      zodType = 'z.number()';
      break;
    case 'boolean':
      zodType = 'z.boolean()';
      break;
    case 'Date':
      zodType = 'z.string().datetime()';
      break;
    default:
      zodType = 'z.string()';
  }
  
  if (!required) {
    zodType += '.optional()';
  }
  
  return zodType;
}

function mapTypeToOpenAPI(type: string): string {
  switch (type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'Date':
      return 'string';
    default:
      return 'string';
  }
}
