/**
 * MCP Tool: analyze_module_dependencies
 * 
 * Analisa dependências entre camadas de um módulo DDD/Hexagonal.
 * Detecta violações de arquitetura conforme regras ARCH-001 a ARCH-005.
 * 
 * Regras verificadas:
 * - ARCH-001: Domain NÃO importa de Application
 * - ARCH-002: Domain NÃO importa de Infrastructure
 * - ARCH-003: Domain NÃO importa bibliotecas externas (drizzle, axios)
 * - ARCH-004: Domain NÃO importa módulos Node.js (fs, path, crypto)
 * - ARCH-005: Application NÃO importa de Infrastructure (exceto via DI)
 * 
 * @see regrasmcp.mdc - Seção ARQUITETURA
 * @see Cockburn, A. (2005). Hexagonal Architecture
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TIPOS
// ============================================================================

export type ViolationType =
  | 'DOMAIN_IMPORTS_INFRA'
  | 'DOMAIN_IMPORTS_APPLICATION'
  | 'DOMAIN_IMPORTS_EXTERNAL'
  | 'DOMAIN_IMPORTS_NODE'
  | 'APPLICATION_IMPORTS_INFRA';

export type Severity = 'ERROR' | 'WARNING';

export interface DependencyViolation {
  file: string;
  line: number;
  import_statement: string;
  violation_type: ViolationType;
  severity: Severity;
  suggestion: string;
}

export interface LayerAnalysis {
  files: string[];
  internal_deps: string[];
  violations: DependencyViolation[];
}

export interface ApplicationLayerAnalysis extends LayerAnalysis {
  domain_deps: string[];
  infra_deps: string[];
}

export interface InfrastructureLayerAnalysis extends LayerAnalysis {
  all_deps: string[];
  external_deps: string[];
}

export interface AnalyzeModuleDependenciesInput {
  module: string;
  check_violations: boolean;
  include_external: boolean;
}

export interface AnalyzeModuleDependenciesOutput {
  module: string;
  layers: {
    domain: LayerAnalysis;
    application: ApplicationLayerAnalysis;
    infrastructure: InfrastructureLayerAnalysis;
  };
  summary: {
    total_files: number;
    total_violations: number;
    architecture_score: number;
    recommendations: string[];
  };
}

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Bibliotecas externas proibidas no Domain
 */
const FORBIDDEN_EXTERNAL_LIBS = [
  'drizzle-orm',
  'drizzle',
  'axios',
  'express',
  'fastify',
  'prisma',
  'typeorm',
  'sequelize',
  'mongoose',
  'lodash',
  'moment',
  'dayjs',
  'date-fns',
  'uuid', // Usar crypto.randomUUID
  'bcrypt',
  'jsonwebtoken',
  'zod', // OK em application, não em domain
  'class-validator',
  'class-transformer',
];

/**
 * Módulos Node.js proibidos no Domain
 */
const FORBIDDEN_NODE_MODULES = [
  'fs',
  'path',
  'crypto',
  'http',
  'https',
  'net',
  'child_process',
  'os',
  'stream',
  'buffer',
  'events',
  'util',
  'url',
];

/**
 * Padrões de import de infraestrutura
 */
const INFRA_PATTERNS = [
  '/infrastructure/',
  '/infra/',
  '/persistence/',
  '/repositories/',
  '/adapters/',
  '/external/',
  '/database/',
  '/api/',
  '/http/',
  '/grpc/',
  '/messaging/',
];

/**
 * Padrões de import de application
 */
const APPLICATION_PATTERNS = [
  '/application/',
  '/use-cases/',
  '/commands/',
  '/queries/',
  '/services/', // application services
];

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

export async function analyzeModuleDependencies(
  input: AnalyzeModuleDependenciesInput
): Promise<AnalyzeModuleDependenciesOutput> {
  // Validar input
  validateInput(input);

  const { module, check_violations, include_external } = input;
  const modulePath = path.join(process.cwd(), 'src', 'modules', module);

  // Verificar se módulo existe
  if (!fs.existsSync(modulePath)) {
    throw new Error(`Módulo '${module}' não encontrado em src/modules/`);
  }

  // Analisar cada camada
  const domainPath = path.join(modulePath, 'domain');
  const applicationPath = path.join(modulePath, 'application');
  const infrastructurePath = path.join(modulePath, 'infrastructure');

  const domainAnalysis = analyzeLayer(domainPath, 'domain', check_violations);
  const applicationAnalysis = analyzeApplicationLayer(applicationPath, check_violations);
  const infrastructureAnalysis = analyzeInfrastructureLayer(
    infrastructurePath,
    include_external
  );

  // Calcular totais
  const totalFiles =
    domainAnalysis.files.length +
    applicationAnalysis.files.length +
    infrastructureAnalysis.files.length;

  const totalViolations =
    domainAnalysis.violations.length +
    applicationAnalysis.violations.length +
    infrastructureAnalysis.violations.length;

  // Calcular score de arquitetura (0-100)
  const architectureScore = calculateArchitectureScore(totalFiles, totalViolations);

  // Gerar recomendações
  const recommendations = generateRecommendations(
    domainAnalysis,
    applicationAnalysis,
    infrastructureAnalysis
  );

  return {
    module,
    layers: {
      domain: domainAnalysis,
      application: applicationAnalysis,
      infrastructure: infrastructureAnalysis,
    },
    summary: {
      total_files: totalFiles,
      total_violations: totalViolations,
      architecture_score: architectureScore,
      recommendations,
    },
  };
}

// ============================================================================
// VALIDAÇÃO
// ============================================================================

function validateInput(input: AnalyzeModuleDependenciesInput): void {
  if (!input.module || typeof input.module !== 'string') {
    throw new Error('module é obrigatório e deve ser string');
  }

  if (!input.module.match(/^[a-z][a-z0-9-]*$/)) {
    throw new Error('module deve ser lowercase (ex: fiscal, tms, wms)');
  }

  if (typeof input.check_violations !== 'boolean') {
    throw new Error('check_violations é obrigatório e deve ser boolean');
  }

  if (typeof input.include_external !== 'boolean') {
    throw new Error('include_external é obrigatório e deve ser boolean');
  }
}

// ============================================================================
// ANÁLISE DE CAMADAS
// ============================================================================

function analyzeLayer(
  layerPath: string,
  layer: 'domain' | 'application' | 'infrastructure',
  checkViolations: boolean
): LayerAnalysis {
  if (!fs.existsSync(layerPath)) {
    return {
      files: [],
      internal_deps: [],
      violations: [],
    };
  }

  const files = getTypeScriptFiles(layerPath);
  const internalDeps: string[] = [];
  const violations: DependencyViolation[] = [];

  for (const file of files) {
    const imports = extractImports(file);

    for (const imp of imports) {
      // Verificar dependências internas
      if (imp.path.includes(`/${layer}/`)) {
        if (!internalDeps.includes(imp.path)) {
          internalDeps.push(imp.path);
        }
      }

      // Verificar violações se solicitado
      if (checkViolations && layer === 'domain') {
        const violation = checkDomainViolation(file, imp);
        if (violation) {
          violations.push(violation);
        }
      }
    }
  }

  return {
    files: files.map((f) => path.relative(process.cwd(), f)),
    internal_deps: internalDeps,
    violations,
  };
}

function analyzeApplicationLayer(
  layerPath: string,
  checkViolations: boolean
): ApplicationLayerAnalysis {
  if (!fs.existsSync(layerPath)) {
    return {
      files: [],
      internal_deps: [],
      domain_deps: [],
      infra_deps: [],
      violations: [],
    };
  }

  const files = getTypeScriptFiles(layerPath);
  const internalDeps: string[] = [];
  const domainDeps: string[] = [];
  const infraDeps: string[] = [];
  const violations: DependencyViolation[] = [];

  for (const file of files) {
    const imports = extractImports(file);

    for (const imp of imports) {
      // Classificar dependências
      if (imp.path.includes('/application/')) {
        if (!internalDeps.includes(imp.path)) {
          internalDeps.push(imp.path);
        }
      } else if (imp.path.includes('/domain/')) {
        if (!domainDeps.includes(imp.path)) {
          domainDeps.push(imp.path);
        }
      } else if (isInfrastructureImport(imp.path)) {
        if (!infraDeps.includes(imp.path)) {
          infraDeps.push(imp.path);
        }

        // Verificar violação (exceto imports de type/interface)
        if (checkViolations && !imp.isTypeOnly) {
          const violation = checkApplicationViolation(file, imp);
          if (violation) {
            violations.push(violation);
          }
        }
      }
    }
  }

  return {
    files: files.map((f) => path.relative(process.cwd(), f)),
    internal_deps: internalDeps,
    domain_deps: domainDeps,
    infra_deps: infraDeps,
    violations,
  };
}

function analyzeInfrastructureLayer(
  layerPath: string,
  includeExternal: boolean
): InfrastructureLayerAnalysis {
  if (!fs.existsSync(layerPath)) {
    return {
      files: [],
      internal_deps: [],
      all_deps: [],
      external_deps: [],
      violations: [],
    };
  }

  const files = getTypeScriptFiles(layerPath);
  const internalDeps: string[] = [];
  const allDeps: string[] = [];
  const externalDeps: string[] = [];

  for (const file of files) {
    const imports = extractImports(file);

    for (const imp of imports) {
      if (!allDeps.includes(imp.path)) {
        allDeps.push(imp.path);
      }

      if (imp.path.includes('/infrastructure/')) {
        if (!internalDeps.includes(imp.path)) {
          internalDeps.push(imp.path);
        }
      }

      // Coletar dependências externas
      if (includeExternal && isExternalPackage(imp.path)) {
        const packageName = getPackageName(imp.path);
        if (!externalDeps.includes(packageName)) {
          externalDeps.push(packageName);
        }
      }
    }
  }

  return {
    files: files.map((f) => path.relative(process.cwd(), f)),
    internal_deps: internalDeps,
    all_deps: allDeps,
    external_deps: externalDeps,
    violations: [], // Infrastructure pode importar de qualquer lugar
  };
}

// ============================================================================
// EXTRAÇÃO DE IMPORTS
// ============================================================================

interface ImportInfo {
  path: string;
  line: number;
  statement: string;
  isTypeOnly: boolean;
}

function extractImports(filePath: string): ImportInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const imports: ImportInfo[] = [];

  // Regex para imports
  const importRegex = /^(import\s+(?:type\s+)?(?:{[^}]+}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:{[^}]+}|\*\s+as\s+\w+|\w+))?\s*from\s+['"]([^'"]+)['"])/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(importRegex);

    if (match) {
      const statement = match[1];
      const importPath = match[2];
      const isTypeOnly = statement.includes('import type');

      imports.push({
        path: importPath,
        line: i + 1,
        statement,
        isTypeOnly,
      });
    }
  }

  return imports;
}

// ============================================================================
// VERIFICAÇÃO DE VIOLAÇÕES
// ============================================================================

function checkDomainViolation(
  file: string,
  imp: ImportInfo
): DependencyViolation | null {
  const relativePath = path.relative(process.cwd(), file);

  // ARCH-001: Domain não importa de Application
  if (isApplicationImport(imp.path)) {
    return {
      file: relativePath,
      line: imp.line,
      import_statement: imp.statement,
      violation_type: 'DOMAIN_IMPORTS_APPLICATION',
      severity: 'ERROR',
      suggestion:
        'Mover lógica para Domain Service ou criar interface/port no Domain',
    };
  }

  // ARCH-002: Domain não importa de Infrastructure
  if (isInfrastructureImport(imp.path)) {
    return {
      file: relativePath,
      line: imp.line,
      import_statement: imp.statement,
      violation_type: 'DOMAIN_IMPORTS_INFRA',
      severity: 'ERROR',
      suggestion:
        'Usar Dependency Injection - definir interface em domain/ports/output/',
    };
  }

  // ARCH-003: Domain não importa bibliotecas externas
  if (isForbiddenExternalLib(imp.path)) {
    return {
      file: relativePath,
      line: imp.line,
      import_statement: imp.statement,
      violation_type: 'DOMAIN_IMPORTS_EXTERNAL',
      severity: 'ERROR',
      suggestion: `Mover uso de ${imp.path} para camada de Infrastructure`,
    };
  }

  // ARCH-004: Domain não importa módulos Node.js
  if (isForbiddenNodeModule(imp.path)) {
    return {
      file: relativePath,
      line: imp.line,
      import_statement: imp.statement,
      violation_type: 'DOMAIN_IMPORTS_NODE',
      severity: 'ERROR',
      suggestion: `Abstrair uso de ${imp.path} em interface de Infrastructure`,
    };
  }

  return null;
}

function checkApplicationViolation(
  file: string,
  imp: ImportInfo
): DependencyViolation | null {
  const relativePath = path.relative(process.cwd(), file);

  // ARCH-005: Application não importa de Infrastructure (exceto via DI)
  // Imports diretos (não type-only) de infra são violações
  if (isInfrastructureImport(imp.path) && !imp.isTypeOnly) {
    return {
      file: relativePath,
      line: imp.line,
      import_statement: imp.statement,
      violation_type: 'APPLICATION_IMPORTS_INFRA',
      severity: 'WARNING',
      suggestion:
        'Usar Dependency Injection - injetar via constructor com @inject()',
    };
  }

  return null;
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
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function isApplicationImport(importPath: string): boolean {
  return APPLICATION_PATTERNS.some((pattern) => importPath.includes(pattern));
}

function isInfrastructureImport(importPath: string): boolean {
  return INFRA_PATTERNS.some((pattern) => importPath.includes(pattern));
}

function isForbiddenExternalLib(importPath: string): boolean {
  // Não é caminho relativo nem alias
  if (importPath.startsWith('.') || importPath.startsWith('@/')) {
    return false;
  }

  const packageName = getPackageName(importPath);
  return FORBIDDEN_EXTERNAL_LIBS.includes(packageName);
}

function isForbiddenNodeModule(importPath: string): boolean {
  // Módulos Node.js built-in
  if (importPath.startsWith('node:')) {
    const moduleName = importPath.replace('node:', '');
    return FORBIDDEN_NODE_MODULES.includes(moduleName);
  }

  return FORBIDDEN_NODE_MODULES.includes(importPath);
}

function isExternalPackage(importPath: string): boolean {
  // Não é caminho relativo nem alias do projeto
  return !importPath.startsWith('.') && !importPath.startsWith('@/');
}

function getPackageName(importPath: string): string {
  // @scope/package -> @scope/package
  // package/sub -> package
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath;
  }

  return importPath.split('/')[0];
}

function calculateArchitectureScore(totalFiles: number, totalViolations: number): number {
  if (totalFiles === 0) {
    return 100;
  }

  // Cada violação reduz o score
  // 0 violações = 100, 10% de violações = 70, 20%+ = 50 ou menos
  const violationRate = totalViolations / totalFiles;

  if (violationRate === 0) return 100;
  if (violationRate <= 0.05) return 90;
  if (violationRate <= 0.10) return 80;
  if (violationRate <= 0.15) return 70;
  if (violationRate <= 0.20) return 60;
  if (violationRate <= 0.30) return 50;
  return Math.max(0, Math.round(100 - violationRate * 200));
}

function generateRecommendations(
  domain: LayerAnalysis,
  application: ApplicationLayerAnalysis,
  infrastructure: InfrastructureLayerAnalysis
): string[] {
  const recommendations: string[] = [];

  // Verificar violações no domain
  if (domain.violations.length > 0) {
    const infraViolations = domain.violations.filter(
      (v) => v.violation_type === 'DOMAIN_IMPORTS_INFRA'
    ).length;
    const appViolations = domain.violations.filter(
      (v) => v.violation_type === 'DOMAIN_IMPORTS_APPLICATION'
    ).length;
    const externalViolations = domain.violations.filter(
      (v) => v.violation_type === 'DOMAIN_IMPORTS_EXTERNAL'
    ).length;

    if (infraViolations > 0) {
      recommendations.push(
        `CRÍTICO: ${infraViolations} imports de Infrastructure no Domain. Criar interfaces em domain/ports/output/.`
      );
    }

    if (appViolations > 0) {
      recommendations.push(
        `CRÍTICO: ${appViolations} imports de Application no Domain. Mover lógica para Domain Services.`
      );
    }

    if (externalViolations > 0) {
      recommendations.push(
        `CRÍTICO: ${externalViolations} imports de libs externas no Domain. Abstrair em Infrastructure.`
      );
    }
  }

  // Verificar violações no application
  if (application.violations.length > 0) {
    recommendations.push(
      `ATENÇÃO: ${application.violations.length} imports diretos de Infrastructure em Application. Usar DI.`
    );
  }

  // Verificar se há muitos arquivos no domain
  if (domain.files.length > 50) {
    recommendations.push(
      `Considerar dividir o módulo em submódulos - ${domain.files.length} arquivos no Domain.`
    );
  }

  // Verificar se infrastructure tem muitas dependências externas
  if (infrastructure.external_deps.length > 20) {
    recommendations.push(
      `Módulo com ${infrastructure.external_deps.length} dependências externas. Avaliar necessidade de cada uma.`
    );
  }

  // Se não há recomendações, módulo está bem estruturado
  if (recommendations.length === 0) {
    recommendations.push(
      'Arquitetura DDD/Hexagonal bem implementada. Manter as boas práticas!'
    );
  }

  return recommendations;
}
