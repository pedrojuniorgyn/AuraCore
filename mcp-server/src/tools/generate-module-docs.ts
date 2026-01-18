/**
 * MCP Tool: generate_module_docs
 * 
 * Gera documentação automática de um módulo DDD.
 * Inclui README, diagramas Mermaid, e referência de API.
 * 
 * @see regrasmcp.mdc - Estrutura de Módulos
 * @see Evans, E. (2003). Domain-Driven Design
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TIPOS
// ============================================================================

export interface GenerateModuleDocsInput {
  module: string;
  format: 'markdown' | 'html';
  include_diagrams: boolean;
  include_api: boolean;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerateModuleDocsOutput {
  success: boolean;
  files: GeneratedFile[];
  summary: {
    entities: number;
    use_cases: number;
    repositories: number;
    api_routes: number;
  };
}

interface EntityInfo {
  name: string;
  file: string;
  properties: string[];
  behaviors: string[];
  isAggregateRoot: boolean;
}

interface UseCaseInfo {
  name: string;
  file: string;
  type: 'command' | 'query';
  description: string;
}

interface RepositoryInfo {
  name: string;
  file: string;
  entity: string;
}

interface ApiRouteInfo {
  path: string;
  method: string;
  file: string;
  description: string;
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

export async function generateModuleDocs(
  input: GenerateModuleDocsInput
): Promise<GenerateModuleDocsOutput> {
  // Validar input
  validateInput(input);

  const { module, format, include_diagrams, include_api } = input;
  const modulePath = path.join(process.cwd(), 'src', 'modules', module);

  // Verificar se módulo existe
  if (!fs.existsSync(modulePath)) {
    throw new Error(`Módulo '${module}' não encontrado em src/modules/`);
  }

  // Extrair informações do módulo
  const entities = extractEntities(modulePath);
  const useCases = extractUseCases(modulePath);
  const repositories = extractRepositories(modulePath);
  const apiRoutes = include_api ? extractApiRoutes(module) : [];

  // Gerar arquivos de documentação
  const files: GeneratedFile[] = [];

  // README.md principal
  const readme = generateReadme(module, entities, useCases, repositories);
  files.push({
    path: `docs/modules/${module}/README.md`,
    content: format === 'markdown' ? readme : convertToHtml(readme),
  });

  // Diagramas
  if (include_diagrams) {
    const classDiagram = generateClassDiagram(module, entities);
    files.push({
      path: `docs/modules/${module}/CLASS_DIAGRAM.md`,
      content: format === 'markdown' ? classDiagram : convertToHtml(classDiagram),
    });

    const flowDiagram = generateFlowDiagram(module, useCases);
    files.push({
      path: `docs/modules/${module}/FLOW_DIAGRAM.md`,
      content: format === 'markdown' ? flowDiagram : convertToHtml(flowDiagram),
    });
  }

  // API Reference
  if (include_api && apiRoutes.length > 0) {
    const apiDocs = generateApiDocs(module, apiRoutes);
    files.push({
      path: `docs/modules/${module}/API_REFERENCE.md`,
      content: format === 'markdown' ? apiDocs : convertToHtml(apiDocs),
    });
  }

  return {
    success: true,
    files,
    summary: {
      entities: entities.length,
      use_cases: useCases.length,
      repositories: repositories.length,
      api_routes: apiRoutes.length,
    },
  };
}

// ============================================================================
// VALIDAÇÃO
// ============================================================================

function validateInput(input: GenerateModuleDocsInput): void {
  if (!input.module || typeof input.module !== 'string') {
    throw new Error('module é obrigatório e deve ser string');
  }

  if (!input.module.match(/^[a-z][a-z0-9-]*$/)) {
    throw new Error('module deve ser lowercase (ex: fiscal, tms, wms)');
  }

  if (!input.format || !['markdown', 'html'].includes(input.format)) {
    throw new Error('format é obrigatório e deve ser "markdown" ou "html"');
  }

  if (typeof input.include_diagrams !== 'boolean') {
    throw new Error('include_diagrams é obrigatório e deve ser boolean');
  }

  if (typeof input.include_api !== 'boolean') {
    throw new Error('include_api é obrigatório e deve ser boolean');
  }
}

// ============================================================================
// EXTRAÇÃO DE INFORMAÇÕES
// ============================================================================

function extractEntities(modulePath: string): EntityInfo[] {
  const entitiesPath = path.join(modulePath, 'domain', 'entities');
  const aggregatesPath = path.join(modulePath, 'domain', 'aggregates');
  const entities: EntityInfo[] = [];

  // Extrair de entities/
  if (fs.existsSync(entitiesPath)) {
    entities.push(...extractEntitiesFromDir(entitiesPath, false));
  }

  // Extrair de aggregates/
  if (fs.existsSync(aggregatesPath)) {
    entities.push(...extractEntitiesFromDir(aggregatesPath, true));
  }

  return entities;
}

function extractEntitiesFromDir(dir: string, isAggregateRoot: boolean): EntityInfo[] {
  const entities: EntityInfo[] = [];
  const files = getTypeScriptFiles(dir);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Extrair nome da classe
    const classMatch = content.match(/export\s+class\s+(\w+)\s+extends\s+(AggregateRoot|Entity)/);
    if (!classMatch) continue;

    const name = classMatch[1];
    const extendsAggregate = classMatch[2] === 'AggregateRoot';

    // Extrair propriedades (getters)
    const properties: string[] = [];
    const getterRegex = /get\s+(\w+)\(\):/g;
    let getterMatch;
    while ((getterMatch = getterRegex.exec(content)) !== null) {
      if (!['id', 'createdAt', 'updatedAt'].includes(getterMatch[1])) {
        properties.push(getterMatch[1]);
      }
    }

    // Extrair behaviors (métodos que retornam Result<void)
    const behaviors: string[] = [];
    const methodRegex = /(\w+)\([^)]*\):\s*Result<void/g;
    let methodMatch;
    while ((methodMatch = methodRegex.exec(content)) !== null) {
      if (!['create', 'reconstitute'].includes(methodMatch[1])) {
        behaviors.push(methodMatch[1]);
      }
    }

    entities.push({
      name,
      file: path.relative(process.cwd(), file),
      properties,
      behaviors,
      isAggregateRoot: isAggregateRoot || extendsAggregate,
    });
  }

  return entities;
}

function extractUseCases(modulePath: string): UseCaseInfo[] {
  const useCases: UseCaseInfo[] = [];

  // Commands
  const commandsPath = path.join(modulePath, 'application', 'commands');
  if (fs.existsSync(commandsPath)) {
    useCases.push(...extractUseCasesFromDir(commandsPath, 'command'));
  }

  // Queries
  const queriesPath = path.join(modulePath, 'application', 'queries');
  if (fs.existsSync(queriesPath)) {
    useCases.push(...extractUseCasesFromDir(queriesPath, 'query'));
  }

  // Use-cases (legacy)
  const useCasesPath = path.join(modulePath, 'application', 'use-cases');
  if (fs.existsSync(useCasesPath)) {
    useCases.push(...extractUseCasesFromDir(useCasesPath, 'command'));
  }

  return useCases;
}

function extractUseCasesFromDir(dir: string, type: 'command' | 'query'): UseCaseInfo[] {
  const useCases: UseCaseInfo[] = [];
  const files = getTypeScriptFiles(dir);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Extrair nome da classe
    const classMatch = content.match(/export\s+class\s+(\w+UseCase)/);
    if (!classMatch) continue;

    const name = classMatch[1].replace('UseCase', '');

    // Extrair descrição do JSDoc
    const jsdocMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^\n*]+)/);
    const description = jsdocMatch ? jsdocMatch[1].trim() : `${name} use case`;

    useCases.push({
      name,
      file: path.relative(process.cwd(), file),
      type,
      description,
    });
  }

  return useCases;
}

function extractRepositories(modulePath: string): RepositoryInfo[] {
  const repositories: RepositoryInfo[] = [];
  const portsPath = path.join(modulePath, 'domain', 'ports', 'output');

  if (!fs.existsSync(portsPath)) {
    return repositories;
  }

  const files = getTypeScriptFiles(portsPath);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Extrair nome da interface
    const interfaceMatch = content.match(/export\s+interface\s+(I\w+Repository)/);
    if (!interfaceMatch) continue;

    const name = interfaceMatch[1];
    // Inferir nome da entidade do nome do repository
    const entity = name.replace('I', '').replace('Repository', '');

    repositories.push({
      name,
      file: path.relative(process.cwd(), file),
      entity,
    });
  }

  return repositories;
}

function extractApiRoutes(module: string): ApiRouteInfo[] {
  const routes: ApiRouteInfo[] = [];
  const apiPath = path.join(process.cwd(), 'src', 'app', 'api', module);

  if (!fs.existsSync(apiPath)) {
    return routes;
  }

  // Recursivamente buscar route.ts
  const routeFiles = findRouteFiles(apiPath);

  for (const file of routeFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(path.join(process.cwd(), 'src', 'app'), file);
    
    // Converter caminho do arquivo para rota API
    const apiRoute = '/' + relativePath
      .replace(/\/route\.ts$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1');

    // Extrair métodos HTTP
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    for (const method of methods) {
      const methodRegex = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`);
      if (methodRegex.test(content)) {
        // Extrair descrição do JSDoc
        const jsdocRegex = new RegExp(`/\\*\\*[^*]*\\*[^*]*${method}[^*]*\\*/`, 's');
        const jsdocMatch = content.match(jsdocRegex);
        const description = jsdocMatch 
          ? jsdocMatch[0].replace(/\/\*\*|\*\/|\*/g, '').trim().split('\n')[0] 
          : `${method} ${apiRoute}`;

        routes.push({
          path: apiRoute,
          method,
          file: path.relative(process.cwd(), file),
          description: description.trim(),
        });
      }
    }
  }

  return routes;
}

// ============================================================================
// GERAÇÃO DE DOCUMENTAÇÃO
// ============================================================================

function generateReadme(
  module: string,
  entities: EntityInfo[],
  useCases: UseCaseInfo[],
  repositories: RepositoryInfo[]
): string {
  const moduleName = capitalize(module);
  const lines: string[] = [];

  lines.push(`# Módulo ${moduleName}`);
  lines.push('');
  lines.push(`Documentação do módulo ${moduleName} seguindo arquitetura DDD/Hexagonal.`);
  lines.push('');

  // Estrutura
  lines.push('## Estrutura');
  lines.push('');
  lines.push('```');
  lines.push(`src/modules/${module}/`);
  lines.push('├── domain/');
  lines.push('│   ├── entities/');
  lines.push('│   ├── value-objects/');
  lines.push('│   ├── services/');
  lines.push('│   ├── events/');
  lines.push('│   └── ports/');
  lines.push('│       ├── input/');
  lines.push('│       └── output/');
  lines.push('├── application/');
  lines.push('│   ├── commands/');
  lines.push('│   ├── queries/');
  lines.push('│   └── dtos/');
  lines.push('└── infrastructure/');
  lines.push('    ├── persistence/');
  lines.push('    │   ├── repositories/');
  lines.push('    │   ├── mappers/');
  lines.push('    │   └── schemas/');
  lines.push('    └── di/');
  lines.push('```');
  lines.push('');

  // Entities
  if (entities.length > 0) {
    lines.push('## Entidades');
    lines.push('');
    lines.push('| Nome | Tipo | Propriedades | Behaviors |');
    lines.push('|------|------|--------------|-----------|');
    
    for (const entity of entities) {
      const tipo = entity.isAggregateRoot ? 'Aggregate Root' : 'Entity';
      const props = entity.properties.slice(0, 3).join(', ') + (entity.properties.length > 3 ? '...' : '');
      const behaviors = entity.behaviors.slice(0, 3).join(', ') + (entity.behaviors.length > 3 ? '...' : '');
      lines.push(`| ${entity.name} | ${tipo} | ${props || '-'} | ${behaviors || '-'} |`);
    }
    lines.push('');
  }

  // Use Cases
  if (useCases.length > 0) {
    lines.push('## Use Cases');
    lines.push('');
    
    const commands = useCases.filter((uc) => uc.type === 'command');
    const queries = useCases.filter((uc) => uc.type === 'query');

    if (commands.length > 0) {
      lines.push('### Commands');
      lines.push('');
      lines.push('| Nome | Descrição |');
      lines.push('|------|-----------|');
      for (const cmd of commands) {
        lines.push(`| ${cmd.name} | ${cmd.description} |`);
      }
      lines.push('');
    }

    if (queries.length > 0) {
      lines.push('### Queries');
      lines.push('');
      lines.push('| Nome | Descrição |');
      lines.push('|------|-----------|');
      for (const qry of queries) {
        lines.push(`| ${qry.name} | ${qry.description} |`);
      }
      lines.push('');
    }
  }

  // Repositories
  if (repositories.length > 0) {
    lines.push('## Repositories');
    lines.push('');
    lines.push('| Interface | Entity |');
    lines.push('|-----------|--------|');
    for (const repo of repositories) {
      lines.push(`| ${repo.name} | ${repo.entity} |`);
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*Documentação gerada automaticamente pelo MCP Tool `generate_module_docs`*');

  return lines.join('\n');
}

function generateClassDiagram(module: string, entities: EntityInfo[]): string {
  const lines: string[] = [];

  lines.push(`# Diagrama de Classes - ${capitalize(module)}`);
  lines.push('');
  lines.push('```mermaid');
  lines.push('classDiagram');
  lines.push('');

  for (const entity of entities) {
    // Classe
    lines.push(`    class ${entity.name} {`);
    
    // Propriedades
    for (const prop of entity.properties) {
      lines.push(`        +${prop}`);
    }
    
    // Behaviors
    for (const behavior of entity.behaviors) {
      lines.push(`        +${behavior}()`);
    }
    
    lines.push('    }');
    lines.push('');
  }

  // Relações (simplificado)
  const aggregates = entities.filter((e) => e.isAggregateRoot);
  const nonAggregates = entities.filter((e) => !e.isAggregateRoot);

  for (const agg of aggregates) {
    for (const entity of nonAggregates) {
      // Inferir relação pelo nome
      if (entity.name.toLowerCase().includes(agg.name.toLowerCase().replace(/s$/, ''))) {
        lines.push(`    ${agg.name} "1" --> "*" ${entity.name}`);
      }
    }
  }

  lines.push('```');

  return lines.join('\n');
}

function generateFlowDiagram(module: string, useCases: UseCaseInfo[]): string {
  const lines: string[] = [];

  lines.push(`# Diagrama de Fluxo - ${capitalize(module)}`);
  lines.push('');
  lines.push('```mermaid');
  lines.push('flowchart TD');
  lines.push('');
  
  lines.push('    subgraph Application');

  const commands = useCases.filter((uc) => uc.type === 'command');
  const queries = useCases.filter((uc) => uc.type === 'query');

  if (commands.length > 0) {
    lines.push('        subgraph Commands');
    for (const cmd of commands) {
      const id = cmd.name.replace(/[^a-zA-Z0-9]/g, '');
      lines.push(`            ${id}[${cmd.name}]`);
    }
    lines.push('        end');
  }

  if (queries.length > 0) {
    lines.push('        subgraph Queries');
    for (const qry of queries) {
      const id = qry.name.replace(/[^a-zA-Z0-9]/g, '');
      lines.push(`            ${id}[${qry.name}]`);
    }
    lines.push('        end');
  }

  lines.push('    end');
  lines.push('');

  // Fluxo básico
  lines.push('    Client[Client] --> Application');
  lines.push('    Application --> Domain[Domain Layer]');
  lines.push('    Application --> Infrastructure[Infrastructure]');
  
  lines.push('```');

  return lines.join('\n');
}

function generateApiDocs(module: string, routes: ApiRouteInfo[]): string {
  const lines: string[] = [];

  lines.push(`# API Reference - ${capitalize(module)}`);
  lines.push('');
  lines.push('## Endpoints');
  lines.push('');

  // Agrupar por path base
  const groupedRoutes = new Map<string, ApiRouteInfo[]>();
  for (const route of routes) {
    const basePath = route.path.split('/').slice(0, 4).join('/');
    const existing = groupedRoutes.get(basePath) || [];
    existing.push(route);
    groupedRoutes.set(basePath, existing);
  }

  for (const [basePath, routeGroup] of groupedRoutes) {
    lines.push(`### ${basePath}`);
    lines.push('');

    for (const route of routeGroup) {
      lines.push(`#### \`${route.method} ${route.path}\``);
      lines.push('');
      lines.push(`${route.description}`);
      lines.push('');
      lines.push(`**Arquivo:** \`${route.file}\``);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ============================================================================
// HELPERS
// ============================================================================

function getTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getTypeScriptFiles(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.spec.ts') &&
      entry.name !== 'index.ts'
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function findRouteFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findRouteFiles(fullPath));
    } else if (entry.isFile() && entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function convertToHtml(markdown: string): string {
  // Conversão simples de Markdown para HTML
  let html = markdown;

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Code blocks
  html = html.replace(/```mermaid\n([\s\S]*?)```/g, '<div class="mermaid">$1</div>');
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Tables (simplificado)
  html = html.replace(/\|([^|\n]+)\|/g, '<td>$1</td>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');

  // Wrap in HTML structure
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Module Documentation</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #333; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
    code { background: #f6f8fa; padding: 2px 4px; border-radius: 3px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f6f8fa; }
  </style>
</head>
<body>
${html}
<script>mermaid.initialize({startOnLoad:true});</script>
</body>
</html>`;
}
