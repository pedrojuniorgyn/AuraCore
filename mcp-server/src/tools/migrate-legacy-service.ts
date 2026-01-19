/**
 * MCP Tool: migrate_legacy_service
 * 
 * Analisa serviço legado em src/services/ e gera plano de migração
 * para arquitetura DDD/Hexagonal.
 * 
 * Classificação:
 * - Funções stateless puras → Domain Service
 * - Funções que orquestram → Application Use Case
 * - Funções com I/O externo → Infrastructure Adapter
 * 
 * @see regrasmcp.mdc - Arquitetura DDD/Hexagonal
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

// ============================================================================
// TIPOS
// ============================================================================

export interface MigrateLegacyServiceInput {
  servicePath: string;
  targetModule: string;
  options: {
    generateCode: boolean;
    preserveInterface: boolean;
    dryRun: boolean;
  };
}

export interface FunctionAnalysis {
  name: string;
  lineStart: number;
  lineEnd: number;
  isExported: boolean;
  isAsync: boolean;
  isStateless: boolean;
  hasSideEffects: boolean;
  parameters: { name: string; type: string }[];
  returnType: string;
  suggestedLocation: 'domain-service' | 'application-use-case' | 'infrastructure-adapter';
  suggestedName: string;
  reasoning: string;
}

export interface MigrationStep {
  order: number;
  action: 'create' | 'move' | 'refactor' | 'delete' | 'update-imports';
  description: string;
  sourceFile?: string;
  targetFile?: string;
  details: string;
}

export interface Risk {
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string;
}

export interface BreakingChange {
  type: 'removed-export' | 'changed-signature' | 'moved-location';
  description: string;
  affectedFiles: string[];
  migrationGuide: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface MigrateLegacyServiceOutput {
  analysis: {
    currentLocation: string;
    linesOfCode: number;
    complexity: 'low' | 'medium' | 'high';
    functions: FunctionAnalysis[];
    dependencies: {
      internal: string[];
      external: string[];
      circular: string[];
    };
  };
  migrationPlan: {
    steps: MigrationStep[];
    estimatedEffort: string;
    risks: Risk[];
    breakingChanges: BreakingChange[];
  };
  generatedFiles?: GeneratedFile[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Padrões que indicam side effects (I/O externo)
 */
const SIDE_EFFECT_PATTERNS = [
  'db.', 'database', 'sql', 'query', 'insert', 'update', 'delete',
  'fetch', 'axios', 'http', 'request', 'response',
  'fs.', 'readFile', 'writeFile', 'path.',
  'console.', 'logger.',
  'cache.', 'redis.',
  'emit', 'publish', 'subscribe',
  'sefaz', 'sped', 'nfe', 'cte',
];

/**
 * Imports que indicam dependência de infraestrutura
 * Usado para classificar funções que acessam recursos externos
 */
const _INFRA_IMPORTS = [
  'drizzle', 'pg', 'mssql', 'mysql',
  'axios', 'fetch', 'got',
  'fs', 'path', 'crypto',
  'redis', 'ioredis',
  '@/lib/db', '@/shared/infrastructure',
];

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

export async function migrateLegacyService(
  input: MigrateLegacyServiceInput
): Promise<MigrateLegacyServiceOutput> {
  // Validar input
  validateInput(input);

  const { servicePath, targetModule, options } = input;
  const fullPath = path.join(process.cwd(), servicePath);

  // Verificar se arquivo existe
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Arquivo não encontrado: ${servicePath}`);
  }

  // Ler e parsear arquivo
  const content = fs.readFileSync(fullPath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    servicePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  // Analisar arquivo
  const analysis = analyzeSourceFile(sourceFile, content, servicePath);
  
  // Gerar plano de migração
  const migrationPlan = generateMigrationPlan(analysis, targetModule, servicePath);

  // Encontrar arquivos afetados (que importam este serviço)
  const affectedFiles = findAffectedFiles(servicePath);
  
  // Adicionar breaking changes
  migrationPlan.breakingChanges = generateBreakingChanges(analysis, servicePath, affectedFiles);

  // Gerar código se solicitado
  let generatedFiles: GeneratedFile[] | undefined;
  if (options.generateCode && !options.dryRun) {
    generatedFiles = generateMigrationCode(analysis, targetModule, options);
  }

  return {
    analysis,
    migrationPlan,
    generatedFiles,
  };
}

// ============================================================================
// VALIDAÇÃO
// ============================================================================

function validateInput(input: MigrateLegacyServiceInput): void {
  if (!input.servicePath || typeof input.servicePath !== 'string') {
    throw new Error('servicePath é obrigatório e deve ser string');
  }

  if (!input.servicePath.startsWith('src/services/')) {
    throw new Error('servicePath deve começar com src/services/');
  }

  if (!input.servicePath.endsWith('.ts')) {
    throw new Error('servicePath deve ser um arquivo .ts');
  }

  if (!input.targetModule || typeof input.targetModule !== 'string') {
    throw new Error('targetModule é obrigatório e deve ser string');
  }

  if (!input.targetModule.match(/^[a-z][a-z0-9-]*$/)) {
    throw new Error('targetModule deve ser lowercase (ex: fiscal, tms, wms)');
  }

  if (!input.options || typeof input.options !== 'object') {
    throw new Error('options é obrigatório e deve ser objeto');
  }
}

// ============================================================================
// ANÁLISE AST
// ============================================================================

interface AnalysisResult {
  currentLocation: string;
  linesOfCode: number;
  complexity: 'low' | 'medium' | 'high';
  functions: FunctionAnalysis[];
  dependencies: {
    internal: string[];
    external: string[];
    circular: string[];
  };
}

function analyzeSourceFile(
  sourceFile: ts.SourceFile,
  content: string,
  filePath: string
): AnalysisResult {
  const lines = content.split('\n');
  const linesOfCode = lines.filter(l => l.trim() && !l.trim().startsWith('//')).length;

  const functions: FunctionAnalysis[] = [];
  const imports = extractImports(sourceFile);

  // Analisar cada função/método
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      functions.push(analyzeFunctionNode(node, sourceFile, content));
    } else if (ts.isVariableStatement(node)) {
      // Arrow functions exportadas
      node.declarationList.declarations.forEach((decl) => {
        if (ts.isVariableDeclaration(decl) && decl.initializer) {
          if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
            const name = decl.name.getText(sourceFile);
            const analysis = analyzeArrowFunction(decl, sourceFile, content);
            if (analysis) {
              functions.push(analysis);
            }
          }
        }
      });
    } else if (ts.isClassDeclaration(node) && node.name) {
      // Métodos de classe
      node.members.forEach((member) => {
        if (ts.isMethodDeclaration(member) && member.name) {
          const methodAnalysis = analyzeMethodNode(member, node.name?.getText(sourceFile) ?? '', sourceFile, content);
          functions.push(methodAnalysis);
        }
      });
    }
  });

  // Classificar dependências
  const dependencies = classifyDependencies(imports, filePath);

  // Calcular complexidade
  const complexity = calculateComplexity(linesOfCode, functions.length, dependencies);

  return {
    currentLocation: filePath,
    linesOfCode,
    complexity,
    functions,
    dependencies,
  };
}

function analyzeFunctionNode(
  node: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile,
  _content: string
): FunctionAnalysis {
  const name = node.name?.getText(sourceFile) ?? 'anonymous';
  const { line: lineStart } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const { line: lineEnd } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  
  const isExported = hasExportModifier(node);
  const isAsync = hasAsyncModifier(node);
  
  // Extrair parâmetros
  const parameters = node.parameters.map((param) => ({
    name: param.name.getText(sourceFile),
    type: param.type?.getText(sourceFile) ?? 'unknown',
  }));

  // Extrair tipo de retorno
  const returnType = node.type?.getText(sourceFile) ?? 'void';

  // Analisar corpo da função
  const bodyText = node.body?.getText(sourceFile) ?? '';
  const { isStateless, hasSideEffects } = analyzeBody(bodyText);

  // Determinar localização sugerida
  const { location, reasoning } = determineSuggestedLocation(
    name, isStateless, hasSideEffects, isAsync, bodyText
  );

  // Gerar nome sugerido
  const suggestedName = generateSuggestedName(name, location);

  return {
    name,
    lineStart: lineStart + 1,
    lineEnd: lineEnd + 1,
    isExported,
    isAsync,
    isStateless,
    hasSideEffects,
    parameters,
    returnType,
    suggestedLocation: location,
    suggestedName,
    reasoning,
  };
}

function analyzeArrowFunction(
  decl: ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
  _content: string
): FunctionAnalysis | null {
  const funcName = decl.name.getText(sourceFile);
  const init = decl.initializer;
  
  if (!init || (!ts.isArrowFunction(init) && !ts.isFunctionExpression(init))) {
    return null;
  }

  const { line: lineStart } = sourceFile.getLineAndCharacterOfPosition(decl.getStart(sourceFile));
  const { line: lineEnd } = sourceFile.getLineAndCharacterOfPosition(decl.getEnd());

  // Verificar export
  const parent = decl.parent.parent;
  const isExported = ts.isVariableStatement(parent) && hasExportModifier(parent);
  
  const isAsync = init.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;

  const parameters = init.parameters.map((param) => ({
    name: param.name.getText(sourceFile),
    type: param.type?.getText(sourceFile) ?? 'unknown',
  }));

  const returnType = init.type?.getText(sourceFile) ?? 'unknown';
  const bodyText = init.body?.getText(sourceFile) ?? '';
  const { isStateless, hasSideEffects } = analyzeBody(bodyText);

  const { location, reasoning } = determineSuggestedLocation(
    funcName, isStateless, hasSideEffects, isAsync, bodyText
  );

  const suggestedName = generateSuggestedName(funcName, location);

  return {
    name: funcName,
    lineStart: lineStart + 1,
    lineEnd: lineEnd + 1,
    isExported,
    isAsync,
    isStateless,
    hasSideEffects,
    parameters,
    returnType,
    suggestedLocation: location,
    suggestedName,
    reasoning,
  };
}

function analyzeMethodNode(
  node: ts.MethodDeclaration,
  className: string,
  sourceFile: ts.SourceFile,
  _content: string
): FunctionAnalysis {
  const methodName = node.name.getText(sourceFile);
  const name = `${className}.${methodName}`;
  
  const { line: lineStart } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const { line: lineEnd } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

  const isExported = true; // Métodos de classe exportada são considerados exportados
  const isAsync = hasAsyncModifier(node);

  const parameters = node.parameters.map((param) => ({
    name: param.name.getText(sourceFile),
    type: param.type?.getText(sourceFile) ?? 'unknown',
  }));

  const returnType = node.type?.getText(sourceFile) ?? 'void';
  const bodyText = node.body?.getText(sourceFile) ?? '';
  
  // Métodos usam this → não são stateless
  const usesThis = bodyText.includes('this.');
  const { isStateless: bodyStateless, hasSideEffects } = analyzeBody(bodyText);
  const isStateless = bodyStateless && !usesThis;

  const { location, reasoning } = determineSuggestedLocation(
    name, isStateless, hasSideEffects, isAsync, bodyText
  );

  const suggestedName = generateSuggestedName(methodName, location);

  return {
    name,
    lineStart: lineStart + 1,
    lineEnd: lineEnd + 1,
    isExported,
    isAsync,
    isStateless,
    hasSideEffects,
    parameters,
    returnType,
    suggestedLocation: location,
    suggestedName,
    reasoning,
  };
}

// ============================================================================
// HELPERS DE ANÁLISE
// ============================================================================

function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function hasAsyncModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
}

function analyzeBody(bodyText: string): { isStateless: boolean; hasSideEffects: boolean } {
  const lowerBody = bodyText.toLowerCase();
  
  // Verificar side effects
  const hasSideEffects = SIDE_EFFECT_PATTERNS.some(pattern => 
    lowerBody.includes(pattern.toLowerCase())
  );

  // Verificar se modifica estado externo
  const modifiesState = lowerBody.includes('this.') || 
                        lowerBody.includes('global') ||
                        lowerBody.includes('window.');

  const isStateless = !modifiesState && !hasSideEffects;

  return { isStateless, hasSideEffects };
}

function determineSuggestedLocation(
  name: string,
  isStateless: boolean,
  hasSideEffects: boolean,
  isAsync: boolean,
  bodyText: string
): { location: FunctionAnalysis['suggestedLocation']; reasoning: string } {
  // Funções que acessam recursos externos → Infrastructure
  if (hasSideEffects && (bodyText.includes('db.') || bodyText.includes('fetch') || 
      bodyText.includes('axios') || bodyText.includes('sefaz'))) {
    return {
      location: 'infrastructure-adapter',
      reasoning: 'Acessa recursos externos (banco de dados, API, SEFAZ). Deve ser abstraída em Infrastructure.',
    };
  }

  // Funções stateless e puras → Domain Service
  if (isStateless && !hasSideEffects) {
    return {
      location: 'domain-service',
      reasoning: 'Função pura sem side effects. Lógica de negócio que pertence ao Domain.',
    };
  }

  // Funções que orquestram (async com múltiplas operações) → Use Case
  if (isAsync || bodyText.includes('await')) {
    return {
      location: 'application-use-case',
      reasoning: 'Função assíncrona que orquestra operações. Deve ser Use Case na Application layer.',
    };
  }

  // Default: Use Case (orquestração)
  return {
    location: 'application-use-case',
    reasoning: 'Coordena múltiplas operações. Pertence à Application layer.',
  };
}

function generateSuggestedName(
  originalName: string,
  location: FunctionAnalysis['suggestedLocation']
): string {
  // Remover prefixos comuns
  let name = originalName
    .replace(/^(get|set|do|handle|process|execute|run)/, '')
    .replace(/^_/, '');

  if (!name) name = originalName;

  // PascalCase
  name = name.charAt(0).toUpperCase() + name.slice(1);

  switch (location) {
    case 'domain-service':
      // Ex: calculateTax → TaxCalculator
      if (name.toLowerCase().startsWith('calculate')) {
        return name.replace(/^Calculate/, '') + 'Calculator';
      }
      if (name.toLowerCase().startsWith('validate')) {
        return name.replace(/^Validate/, '') + 'Validator';
      }
      return name + 'Service';

    case 'application-use-case':
      // Ex: processInvoice → ProcessInvoiceUseCase
      return name + 'UseCase';

    case 'infrastructure-adapter':
      // Ex: fetchSefazData → SefazAdapter
      if (name.toLowerCase().includes('sefaz')) {
        return 'Sefaz' + name.replace(/sefaz/i, '') + 'Adapter';
      }
      return name + 'Adapter';
  }
}

function extractImports(sourceFile: ts.SourceFile): string[] {
  const imports: string[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        imports.push(moduleSpecifier.text);
      }
    }
  });

  return imports;
}

function classifyDependencies(
  imports: string[],
  filePath: string
): { internal: string[]; external: string[]; circular: string[] } {
  const internal: string[] = [];
  const external: string[] = [];
  const circular: string[] = [];

  for (const imp of imports) {
    if (imp.startsWith('.') || imp.startsWith('@/')) {
      internal.push(imp);
      
      // Verificar circularidade simples (importa de volta)
      // Nota: análise completa requer grafo de dependências
      if (imp.includes('services/') && filePath.includes('services/')) {
        // Potencial dependência circular entre serviços
        const impPath = imp.replace('@/', 'src/').replace(/^\.\.?\//, '');
        if (impPath !== filePath && imports.some(i => i.includes(path.basename(filePath, '.ts')))) {
          circular.push(imp);
        }
      }
    } else {
      external.push(imp);
    }
  }

  return { internal, external, circular };
}

function calculateComplexity(
  linesOfCode: number,
  functionCount: number,
  dependencies: { internal: string[]; external: string[]; circular: string[] }
): 'low' | 'medium' | 'high' {
  let score = 0;

  // Linhas de código
  if (linesOfCode > 500) score += 3;
  else if (linesOfCode > 200) score += 2;
  else if (linesOfCode > 100) score += 1;

  // Número de funções
  if (functionCount > 10) score += 2;
  else if (functionCount > 5) score += 1;

  // Dependências
  if (dependencies.circular.length > 0) score += 3;
  if (dependencies.internal.length > 10) score += 1;
  if (dependencies.external.length > 5) score += 1;

  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

// ============================================================================
// GERAÇÃO DE PLANO
// ============================================================================

function generateMigrationPlan(
  analysis: AnalysisResult,
  targetModule: string,
  servicePath: string
): {
  steps: MigrationStep[];
  estimatedEffort: string;
  risks: Risk[];
  breakingChanges: BreakingChange[];
} {
  const steps: MigrationStep[] = [];
  let stepOrder = 1;

  // Agrupar funções por localização sugerida
  const domainServices = analysis.functions.filter(f => f.suggestedLocation === 'domain-service');
  const useCases = analysis.functions.filter(f => f.suggestedLocation === 'application-use-case');
  const adapters = analysis.functions.filter(f => f.suggestedLocation === 'infrastructure-adapter');

  // Step 1: Criar estrutura de pastas (se necessário)
  steps.push({
    order: stepOrder++,
    action: 'create',
    description: `Verificar/criar estrutura DDD em src/modules/${targetModule}/`,
    targetFile: `src/modules/${targetModule}/`,
    details: 'Criar pastas domain/services/, application/commands/, infrastructure/adapters/ se não existirem.',
  });

  // Steps para Domain Services
  for (const fn of domainServices) {
    steps.push({
      order: stepOrder++,
      action: 'create',
      description: `Criar Domain Service: ${fn.suggestedName}`,
      sourceFile: servicePath,
      targetFile: `src/modules/${targetModule}/domain/services/${fn.suggestedName}.ts`,
      details: `Mover função ${fn.name} (linhas ${fn.lineStart}-${fn.lineEnd}). ${fn.reasoning}`,
    });
  }

  // Steps para Use Cases
  for (const fn of useCases) {
    const folder = fn.name.toLowerCase().includes('get') || fn.name.toLowerCase().includes('list') 
      ? 'queries' 
      : 'commands';
    steps.push({
      order: stepOrder++,
      action: 'create',
      description: `Criar Use Case: ${fn.suggestedName}`,
      sourceFile: servicePath,
      targetFile: `src/modules/${targetModule}/application/${folder}/${fn.suggestedName}.ts`,
      details: `Mover função ${fn.name}. ${fn.reasoning}`,
    });
  }

  // Steps para Adapters
  for (const fn of adapters) {
    steps.push({
      order: stepOrder++,
      action: 'create',
      description: `Criar Adapter: ${fn.suggestedName}`,
      sourceFile: servicePath,
      targetFile: `src/modules/${targetModule}/infrastructure/adapters/${fn.suggestedName}.ts`,
      details: `Mover função ${fn.name}. ${fn.reasoning}`,
    });
  }

  // Step: Atualizar imports em arquivos dependentes
  steps.push({
    order: stepOrder++,
    action: 'update-imports',
    description: 'Atualizar imports em arquivos que usam este serviço',
    sourceFile: servicePath,
    details: 'Executar busca e substituição de imports. Considerar criar barrel exports.',
  });

  // Step: Deprecar/Remover serviço legado
  steps.push({
    order: stepOrder++,
    action: 'delete',
    description: 'Marcar serviço legado como deprecated ou remover',
    sourceFile: servicePath,
    details: 'Após validação, remover arquivo legado ou adicionar @deprecated.',
  });

  // Calcular esforço estimado
  const estimatedEffort = calculateEstimatedEffort(analysis);

  // Identificar riscos
  const risks = identifyRisks(analysis);

  return {
    steps,
    estimatedEffort,
    risks,
    breakingChanges: [], // Será preenchido depois
  };
}

function calculateEstimatedEffort(analysis: AnalysisResult): string {
  const baseHours = analysis.functions.length * 0.5; // 30 min por função
  
  let multiplier = 1;
  if (analysis.complexity === 'medium') multiplier = 1.5;
  if (analysis.complexity === 'high') multiplier = 2;

  if (analysis.dependencies.circular.length > 0) multiplier += 0.5;

  const totalHours = Math.ceil(baseHours * multiplier);

  if (totalHours <= 2) return '1-2 hours';
  if (totalHours <= 4) return '2-4 hours';
  if (totalHours <= 8) return '4-8 hours';
  if (totalHours <= 16) return '1-2 days';
  return '2+ days';
}

function identifyRisks(analysis: AnalysisResult): Risk[] {
  const risks: Risk[] = [];

  // Dependências circulares
  if (analysis.dependencies.circular.length > 0) {
    risks.push({
      severity: 'high',
      description: `Dependências circulares detectadas: ${analysis.dependencies.circular.join(', ')}`,
      mitigation: 'Resolver dependências circulares antes da migração. Considerar criar interfaces.',
    });
  }

  // Alta complexidade
  if (analysis.complexity === 'high') {
    risks.push({
      severity: 'medium',
      description: 'Arquivo com alta complexidade (muitas funções/linhas)',
      mitigation: 'Dividir migração em etapas menores. Migrar uma função de cada vez.',
    });
  }

  // Muitas funções exportadas
  const exportedCount = analysis.functions.filter(f => f.isExported).length;
  if (exportedCount > 5) {
    risks.push({
      severity: 'medium',
      description: `${exportedCount} funções exportadas - alto impacto em breaking changes`,
      mitigation: 'Criar re-exports temporários para manter compatibilidade.',
    });
  }

  // Funções com side effects complexos
  const sideEffectFns = analysis.functions.filter(f => f.hasSideEffects);
  if (sideEffectFns.length > 0) {
    risks.push({
      severity: 'low',
      description: `${sideEffectFns.length} funções com side effects precisam de refatoração`,
      mitigation: 'Criar interfaces/ports para abstrair dependências externas.',
    });
  }

  return risks;
}

function findAffectedFiles(_servicePath: string): string[] {
  // Simplificação: em produção, usar grep ou similar
  // Aqui retornamos array vazio pois a busca real é custosa
  return [];
}

function generateBreakingChanges(
  analysis: AnalysisResult,
  servicePath: string,
  affectedFiles: string[]
): BreakingChange[] {
  const breakingChanges: BreakingChange[] = [];

  for (const fn of analysis.functions.filter(f => f.isExported)) {
    breakingChanges.push({
      type: 'moved-location',
      description: `Função ${fn.name} será movida para ${fn.suggestedLocation}`,
      affectedFiles,
      migrationGuide: `Atualizar import de '${servicePath}' para o novo caminho. Função renomeada para ${fn.suggestedName}.`,
    });
  }

  return breakingChanges;
}

// ============================================================================
// GERAÇÃO DE CÓDIGO
// ============================================================================

function generateMigrationCode(
  analysis: AnalysisResult,
  targetModule: string,
  options: { preserveInterface: boolean }
): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // Agrupar funções por localização
  const domainServices = analysis.functions.filter(f => f.suggestedLocation === 'domain-service');
  const useCases = analysis.functions.filter(f => f.suggestedLocation === 'application-use-case');
  const adapters = analysis.functions.filter(f => f.suggestedLocation === 'infrastructure-adapter');

  // Gerar Domain Services
  for (const fn of domainServices) {
    files.push(generateDomainServiceCode(fn, targetModule));
  }

  // Gerar Use Cases
  for (const fn of useCases) {
    files.push(generateUseCaseCode(fn, targetModule));
  }

  // Gerar Adapters
  for (const fn of adapters) {
    files.push(generateAdapterCode(fn, targetModule));
  }

  // Gerar barrel export para compatibilidade
  if (options.preserveInterface) {
    files.push(generateCompatibilityExport(analysis, targetModule));
  }

  return files;
}

function generateDomainServiceCode(fn: FunctionAnalysis, module: string): GeneratedFile {
  const className = fn.suggestedName;
  const params = fn.parameters.map(p => `${p.name}: ${p.type}`).join(', ');

  const content = `/**
 * Domain Service: ${className}
 * 
 * Migrado de função legada: ${fn.name}
 * ${fn.reasoning}
 * 
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010 no regrasmcp.mdc
 */

import { Result } from '@/shared/domain';

/**
 * ${className}
 * 
 * Serviço de domínio stateless para ${fn.name.toLowerCase()}.
 */
export class ${className} {
  private constructor() {
    // Impede instanciação - usar métodos estáticos
  }

  /**
   * ${fn.name}
   * 
   * TODO: Implementar lógica migrada
   */
  static execute(${params}): Result<${fn.returnType}, string> {
    // TODO: Migrar lógica de ${fn.name}
    throw new Error('Not implemented - migrar lógica de ${fn.name}');
  }
}
`;

  return {
    path: `src/modules/${module}/domain/services/${className}.ts`,
    content,
  };
}

function generateUseCaseCode(fn: FunctionAnalysis, module: string): GeneratedFile {
  const className = fn.suggestedName;
  const folder = fn.name.toLowerCase().includes('get') || fn.name.toLowerCase().includes('list')
    ? 'queries'
    : 'commands';

  const content = `/**
 * Use Case: ${className}
 * 
 * Migrado de função legada: ${fn.name}
 * ${fn.reasoning}
 * 
 * @see USE-CASE-001 a USE-CASE-015 no regrasmcp.mdc
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';

interface ${className}Input {
  // TODO: Definir input baseado nos parâmetros originais
${fn.parameters.map(p => `  ${p.name}: ${p.type};`).join('\n')}
}

interface ${className}Output {
  // TODO: Definir output baseado no retorno original
  success: boolean;
}

interface ExecutionContext {
  userId: string;
  organizationId: number;
  branchId: number;
  isAdmin: boolean;
}

@injectable()
export class ${className} {
  constructor(
    // TODO: Injetar dependências necessárias
  ) {}

  async execute(
    input: ${className}Input,
    ctx: ExecutionContext
  ): Promise<Result<${className}Output, string>> {
    // TODO: Migrar lógica de ${fn.name}
    
    // 1. Validar input
    
    // 2. Verificar multi-tenancy
    
    // 3. Executar lógica de negócio
    
    // 4. Retornar resultado
    
    return Result.fail('Not implemented - migrar lógica de ${fn.name}');
  }
}
`;

  return {
    path: `src/modules/${module}/application/${folder}/${className}.ts`,
    content,
  };
}

function generateAdapterCode(fn: FunctionAnalysis, module: string): GeneratedFile {
  const className = fn.suggestedName;

  const content = `/**
 * Infrastructure Adapter: ${className}
 * 
 * Migrado de função legada: ${fn.name}
 * ${fn.reasoning}
 * 
 * @see Hexagonal Architecture - Adapters
 */

import { injectable } from 'tsyringe';

/**
 * Interface para ${className}
 * Definir em domain/ports/output/ para inversão de dependência
 */
export interface I${className} {
  // TODO: Definir contrato
}

@injectable()
export class ${className} implements I${className} {
  constructor(
    // TODO: Injetar dependências (clients, configs)
  ) {}

  // TODO: Migrar lógica de ${fn.name}
}
`;

  return {
    path: `src/modules/${module}/infrastructure/adapters/${className}.ts`,
    content,
  };
}

function generateCompatibilityExport(analysis: AnalysisResult, module: string): GeneratedFile {
  const exports = analysis.functions
    .filter(f => f.isExported)
    .map(f => {
      const folder = f.suggestedLocation === 'domain-service' 
        ? 'domain/services'
        : f.suggestedLocation === 'application-use-case'
          ? `application/${f.name.toLowerCase().includes('get') ? 'queries' : 'commands'}`
          : 'infrastructure/adapters';
      
      return `// @deprecated Use import from '@/modules/${module}/${folder}/${f.suggestedName}'
export { ${f.suggestedName} } from './${folder}/${f.suggestedName}';`;
    });

  const content = `/**
 * Compatibility Exports
 * 
 * Re-exports para manter compatibilidade durante migração.
 * 
 * @deprecated Migrar para imports diretos dos módulos DDD
 */

${exports.join('\n\n')}
`;

  return {
    path: `src/modules/${module}/index.ts`,
    content,
  };
}
