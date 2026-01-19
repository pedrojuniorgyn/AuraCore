/**
 * MCP Tool: check_migration_status
 * 
 * Verifica o status geral da migração DDD do projeto AuraCore.
 * Calcula score de aderência DDD e gera recomendações.
 * 
 * @see regrasmcp.mdc - Arquitetura DDD/Hexagonal
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TIPOS
// ============================================================================

export interface CheckMigrationStatusInput {
  verbose: boolean;
  includeMetrics: boolean;
}

export interface ModuleStatus {
  name: string;
  path: string;
  status: 'migrated' | 'partial' | 'legacy' | 'new';
  components: {
    entities: { count: number; files: string[] };
    valueObjects: { count: number; files: string[] };
    useCases: { count: number; files: string[] };
    repositories: { count: number; files: string[] };
    domainServices: { count: number; files: string[] };
    ports: { input: number; output: number };
  };
  issues: {
    type: string;
    description: string;
    file: string;
  }[];
  score: number;
}

export interface LegacyServiceInfo {
  path: string;
  name: string;
  linesOfCode: number;
  usedBy: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  priorityReason: string;
  suggestedModule: string;
  estimatedMigrationTime: string;
}

export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'migrate' | 'refactor' | 'delete' | 'document';
  target: string;
  description: string;
  benefit: string;
}

export interface CheckMigrationStatusOutput {
  summary: {
    totalModules: number;
    fullyMigrated: number;
    partiallyMigrated: number;
    notMigrated: number;
    migrationProgress: number;
    estimatedRemainingEffort: string;
  };
  modules: ModuleStatus[];
  legacyServices: LegacyServiceInfo[];
  metrics: {
    totalFiles: number;
    dddFiles: number;
    legacyFiles: number;
    testCoverage: {
      ddd: number;
      legacy: number;
    };
  };
  recommendations: Recommendation[];
  timeline: {
    phase: string;
    description: string;
    estimatedWeeks: number;
    dependencies: string[];
  }[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DDD_MODULES_PATH = 'src/modules';
const LEGACY_SERVICES_PATH = 'src/services';

/**
 * Mapeamento de serviços legados para módulos sugeridos
 */
const SERVICE_TO_MODULE_MAP: Record<string, string> = {
  'fiscal': 'fiscal',
  'sped': 'fiscal',
  'nfe': 'fiscal',
  'cte': 'fiscal',
  'accounting': 'accounting',
  'financial': 'financial',
  'boleto': 'financial',
  'billing': 'financial',
  'tms': 'tms',
  'wms': 'wms',
  'fleet': 'fleet',
  'claims': 'claims',
  'intercompany': 'accounting',
  'management': 'accounting',
  'tax': 'fiscal',
};

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

export async function checkMigrationStatus(
  input: CheckMigrationStatusInput
): Promise<CheckMigrationStatusOutput> {
  const { verbose, includeMetrics } = input;

  // Analisar módulos DDD
  const modules = await analyzeModules(verbose);

  // Analisar serviços legados
  const legacyServices = await analyzeLegacyServices();

  // Calcular métricas
  const metrics = calculateMetrics(modules, legacyServices, includeMetrics);

  // Calcular summary
  const summary = calculateSummary(modules, legacyServices);

  // Gerar recomendações
  const recommendations = generateRecommendations(modules, legacyServices);

  // Gerar timeline
  const timeline = generateTimeline(legacyServices, modules);

  return {
    summary,
    modules,
    legacyServices,
    metrics,
    recommendations,
    timeline,
  };
}

// ============================================================================
// ANÁLISE DE MÓDULOS DDD
// ============================================================================

async function analyzeModules(_verbose: boolean): Promise<ModuleStatus[]> {
  const modulesPath = path.join(process.cwd(), DDD_MODULES_PATH);
  const modules: ModuleStatus[] = [];

  if (!fs.existsSync(modulesPath)) {
    return modules;
  }

  const moduleNames = fs.readdirSync(modulesPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const moduleName of moduleNames) {
    const modulePath = path.join(modulesPath, moduleName);
    const status = analyzeModule(moduleName, modulePath, verbose);
    modules.push(status);
  }

  return modules;
}

function analyzeModule(name: string, modulePath: string, verbose: boolean): ModuleStatus {
  const components = {
    entities: { count: 0, files: [] as string[] },
    valueObjects: { count: 0, files: [] as string[] },
    useCases: { count: 0, files: [] as string[] },
    repositories: { count: 0, files: [] as string[] },
    domainServices: { count: 0, files: [] as string[] },
    ports: { input: 0, output: 0 },
  };

  const issues: ModuleStatus['issues'] = [];

  // Verificar estrutura de pastas
  const hasDomain = fs.existsSync(path.join(modulePath, 'domain'));
  const hasApplication = fs.existsSync(path.join(modulePath, 'application'));
  const hasInfrastructure = fs.existsSync(path.join(modulePath, 'infrastructure'));

  // Contar entities
  const entitiesPath = path.join(modulePath, 'domain', 'entities');
  if (fs.existsSync(entitiesPath)) {
    const entityFiles = getTypeScriptFiles(entitiesPath);
    components.entities.count = entityFiles.length;
    components.entities.files = entityFiles.map(f => path.relative(process.cwd(), f));
  }

  // Contar value objects
  const voPath = path.join(modulePath, 'domain', 'value-objects');
  if (fs.existsSync(voPath)) {
    const voFiles = getTypeScriptFiles(voPath);
    components.valueObjects.count = voFiles.length;
    components.valueObjects.files = voFiles.map(f => path.relative(process.cwd(), f));
  }

  // Contar domain services
  const domainServicesPath = path.join(modulePath, 'domain', 'services');
  if (fs.existsSync(domainServicesPath)) {
    const dsFiles = getTypeScriptFiles(domainServicesPath);
    components.domainServices.count = dsFiles.length;
    components.domainServices.files = dsFiles.map(f => path.relative(process.cwd(), f));
  }

  // Contar use cases (commands + queries + use-cases)
  const commandsPath = path.join(modulePath, 'application', 'commands');
  const queriesPath = path.join(modulePath, 'application', 'queries');
  const useCasesPath = path.join(modulePath, 'application', 'use-cases');

  const useCaseFiles: string[] = [];
  if (fs.existsSync(commandsPath)) {
    useCaseFiles.push(...getTypeScriptFiles(commandsPath));
  }
  if (fs.existsSync(queriesPath)) {
    useCaseFiles.push(...getTypeScriptFiles(queriesPath));
  }
  if (fs.existsSync(useCasesPath)) {
    useCaseFiles.push(...getTypeScriptFiles(useCasesPath));
  }
  components.useCases.count = useCaseFiles.length;
  components.useCases.files = useCaseFiles.map(f => path.relative(process.cwd(), f));

  // Contar repositories
  const reposPath = path.join(modulePath, 'infrastructure', 'persistence', 'repositories');
  if (fs.existsSync(reposPath)) {
    const repoFiles = getTypeScriptFiles(reposPath);
    components.repositories.count = repoFiles.length;
    components.repositories.files = repoFiles.map(f => path.relative(process.cwd(), f));
  }

  // Contar ports
  const inputPortsPath = path.join(modulePath, 'domain', 'ports', 'input');
  const outputPortsPath = path.join(modulePath, 'domain', 'ports', 'output');
  
  if (fs.existsSync(inputPortsPath)) {
    components.ports.input = getTypeScriptFiles(inputPortsPath).length;
  }
  if (fs.existsSync(outputPortsPath)) {
    components.ports.output = getTypeScriptFiles(outputPortsPath).length;
  }

  // Verificar issues
  if (!hasDomain) {
    issues.push({
      type: 'missing-structure',
      description: 'Pasta domain/ não encontrada',
      file: modulePath,
    });
  }

  if (!hasApplication) {
    issues.push({
      type: 'missing-structure',
      description: 'Pasta application/ não encontrada',
      file: modulePath,
    });
  }

  if (!hasInfrastructure) {
    issues.push({
      type: 'missing-structure',
      description: 'Pasta infrastructure/ não encontrada',
      file: modulePath,
    });
  }

  if (components.entities.count === 0 && hasDomain) {
    issues.push({
      type: 'missing-entities',
      description: 'Nenhuma Entity encontrada no domain',
      file: path.join(modulePath, 'domain', 'entities'),
    });
  }

  if (components.ports.output === 0 && components.repositories.count > 0) {
    issues.push({
      type: 'missing-ports',
      description: 'Repositories sem Output Ports (interfaces)',
      file: path.join(modulePath, 'domain', 'ports', 'output'),
    });
  }

  // Calcular score DDD
  const score = calculateDDDScore({
    hasDomain,
    hasApplication,
    hasInfrastructure,
    hasEntities: components.entities.count > 0,
    hasUseCases: components.useCases.count > 0,
    hasInputPorts: components.ports.input > 0,
    hasOutputPorts: components.ports.output > 0,
    issueCount: issues.length,
  });

  // Determinar status
  let status: ModuleStatus['status'];
  if (score >= 80) {
    status = 'migrated';
  } else if (score >= 40) {
    status = 'partial';
  } else if (hasDomain || hasApplication) {
    status = 'new';
  } else {
    status = 'legacy';
  }

  return {
    name,
    path: path.relative(process.cwd(), modulePath),
    status,
    components,
    issues,
    score,
  };
}

function calculateDDDScore(analysis: {
  hasDomain: boolean;
  hasApplication: boolean;
  hasInfrastructure: boolean;
  hasEntities: boolean;
  hasUseCases: boolean;
  hasInputPorts: boolean;
  hasOutputPorts: boolean;
  issueCount: number;
}): number {
  let score = 0;

  // Estrutura de pastas (30 pontos)
  if (analysis.hasDomain) score += 10;
  if (analysis.hasApplication) score += 10;
  if (analysis.hasInfrastructure) score += 10;

  // Entidades (20 pontos)
  if (analysis.hasEntities) score += 20;

  // Ports (20 pontos)
  if (analysis.hasInputPorts) score += 10;
  if (analysis.hasOutputPorts) score += 10;

  // Use Cases (20 pontos)
  if (analysis.hasUseCases) score += 20;

  // Penalidades (10 pontos)
  score -= Math.min(analysis.issueCount * 5, 10);

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// ANÁLISE DE SERVIÇOS LEGADOS
// ============================================================================

async function analyzeLegacyServices(): Promise<LegacyServiceInfo[]> {
  const servicesPath = path.join(process.cwd(), LEGACY_SERVICES_PATH);
  const services: LegacyServiceInfo[] = [];

  if (!fs.existsSync(servicesPath)) {
    return services;
  }

  const serviceFiles = getTypeScriptFilesRecursive(servicesPath);

  for (const filePath of serviceFiles) {
    const info = analyzeServiceFile(filePath);
    services.push(info);
  }

  // Ordenar por prioridade
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  services.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return services;
}

function analyzeServiceFile(filePath: string): LegacyServiceInfo {
  const relativePath = path.relative(process.cwd(), filePath);
  const name = path.basename(filePath, '.ts');
  
  // Contar linhas
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const linesOfCode = lines.filter(l => l.trim() && !l.trim().startsWith('//')).length;

  // Inferir módulo sugerido do path
  const pathParts = relativePath.split('/');
  let suggestedModule = 'shared';
  
  for (const part of pathParts) {
    const mapped = SERVICE_TO_MODULE_MAP[part.toLowerCase()];
    if (mapped) {
      suggestedModule = mapped;
      break;
    }
  }

  // Também verificar no nome do arquivo
  for (const [key, value] of Object.entries(SERVICE_TO_MODULE_MAP)) {
    if (name.toLowerCase().includes(key)) {
      suggestedModule = value;
      break;
    }
  }

  // Calcular prioridade (simplificado - em produção, usar grep para contar usedBy)
  const priority = calculatePriority(linesOfCode, name);
  const priorityReason = getPriorityReason(priority, linesOfCode);

  // Estimar tempo de migração
  const estimatedMigrationTime = estimateMigrationTime(linesOfCode);

  return {
    path: relativePath,
    name,
    linesOfCode,
    usedBy: [], // Simplificado - em produção, usar grep
    priority,
    priorityReason,
    suggestedModule,
    estimatedMigrationTime,
  };
}

function calculatePriority(linesOfCode: number, name: string): LegacyServiceInfo['priority'] {
  // Prioridade baseada em tamanho e nome
  const criticalPatterns = ['sped', 'sefaz', 'fiscal', 'accounting', 'tax'];
  const highPatterns = ['financial', 'billing', 'payment'];

  const nameLower = name.toLowerCase();

  if (criticalPatterns.some(p => nameLower.includes(p))) {
    return 'critical';
  }

  if (highPatterns.some(p => nameLower.includes(p)) || linesOfCode > 300) {
    return 'high';
  }

  if (linesOfCode > 100) {
    return 'medium';
  }

  return 'low';
}

function getPriorityReason(
  priority: LegacyServiceInfo['priority'],
  linesOfCode: number
): string {
  switch (priority) {
    case 'critical':
      return 'Serviço fiscal/contábil - risco de multas e compliance';
    case 'high':
      return `Serviço financeiro ou grande (${linesOfCode} linhas)`;
    case 'medium':
      return `Tamanho médio (${linesOfCode} linhas)`;
    case 'low':
      return 'Serviço pequeno ou isolado';
  }
}

function estimateMigrationTime(linesOfCode: number): string {
  if (linesOfCode > 500) return '2-3 days';
  if (linesOfCode > 300) return '1-2 days';
  if (linesOfCode > 150) return '4-8 hours';
  if (linesOfCode > 50) return '2-4 hours';
  return '1-2 hours';
}

// ============================================================================
// MÉTRICAS
// ============================================================================

function calculateMetrics(
  modules: ModuleStatus[],
  legacyServices: LegacyServiceInfo[],
  includeMetrics: boolean
): CheckMigrationStatusOutput['metrics'] {
  // Contar arquivos
  let dddFiles = 0;
  for (const mod of modules) {
    dddFiles += mod.components.entities.count;
    dddFiles += mod.components.valueObjects.count;
    dddFiles += mod.components.useCases.count;
    dddFiles += mod.components.repositories.count;
    dddFiles += mod.components.domainServices.count;
  }

  const legacyFiles = legacyServices.length;
  const totalFiles = dddFiles + legacyFiles;

  return {
    totalFiles,
    dddFiles,
    legacyFiles,
    testCoverage: {
      ddd: includeMetrics ? estimateTestCoverage(modules) : 0,
      legacy: 0, // Serviços legados geralmente têm baixa cobertura
    },
  };
}

function estimateTestCoverage(modules: ModuleStatus[]): number {
  // Simplificado - em produção, analisar arquivos de teste
  const modulesWithTests = modules.filter(m => m.score >= 60).length;
  const totalModules = modules.length || 1;
  return Math.round((modulesWithTests / totalModules) * 100);
}

// ============================================================================
// SUMMARY
// ============================================================================

function calculateSummary(
  modules: ModuleStatus[],
  legacyServices: LegacyServiceInfo[]
): CheckMigrationStatusOutput['summary'] {
  const totalModules = modules.length;
  const fullyMigrated = modules.filter(m => m.status === 'migrated').length;
  const partiallyMigrated = modules.filter(m => m.status === 'partial').length;
  const notMigrated = modules.filter(m => m.status === 'legacy').length;

  // Calcular progresso
  const totalScore = modules.reduce((sum, m) => sum + m.score, 0);
  const maxScore = totalModules * 100;
  const migrationProgress = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // Estimar esforço restante
  const remainingHours = legacyServices.reduce((sum, s) => {
    const time = s.estimatedMigrationTime;
    if (time.includes('days')) {
      const days = parseInt(time) || 2;
      return sum + days * 8;
    }
    const hours = parseInt(time) || 4;
    return sum + hours;
  }, 0);

  let estimatedRemainingEffort: string;
  if (remainingHours > 160) {
    estimatedRemainingEffort = `${Math.ceil(remainingHours / 40)} weeks`;
  } else if (remainingHours > 40) {
    estimatedRemainingEffort = `${Math.ceil(remainingHours / 8)} days`;
  } else {
    estimatedRemainingEffort = `${remainingHours} hours`;
  }

  return {
    totalModules,
    fullyMigrated,
    partiallyMigrated,
    notMigrated,
    migrationProgress,
    estimatedRemainingEffort,
  };
}

// ============================================================================
// RECOMENDAÇÕES
// ============================================================================

function generateRecommendations(
  modules: ModuleStatus[],
  legacyServices: LegacyServiceInfo[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Recomendar migração de serviços críticos
  for (const service of legacyServices.filter(s => s.priority === 'critical')) {
    recommendations.push({
      priority: 'critical',
      type: 'migrate',
      target: service.path,
      description: `Migrar ${service.name} para módulo ${service.suggestedModule}`,
      benefit: 'Reduz risco fiscal e melhora manutenibilidade',
    });
  }

  // Recomendar correção de issues em módulos
  for (const mod of modules.filter(m => m.issues.length > 0)) {
    for (const issue of mod.issues) {
      recommendations.push({
        priority: issue.type.includes('missing') ? 'high' : 'medium',
        type: 'refactor',
        target: mod.path,
        description: issue.description,
        benefit: 'Melhora aderência DDD e facilita manutenção',
      });
    }
  }

  // Recomendar migração de serviços de alta prioridade
  for (const service of legacyServices.filter(s => s.priority === 'high')) {
    recommendations.push({
      priority: 'high',
      type: 'migrate',
      target: service.path,
      description: `Migrar ${service.name} para módulo ${service.suggestedModule}`,
      benefit: 'Melhora organização e testabilidade',
    });
  }

  // Ordenar por prioridade
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations.slice(0, 10); // Top 10
}

// ============================================================================
// TIMELINE
// ============================================================================

function generateTimeline(
  legacyServices: LegacyServiceInfo[],
  modules: ModuleStatus[]
): CheckMigrationStatusOutput['timeline'] {
  const timeline: CheckMigrationStatusOutput['timeline'] = [];

  // Fase 1: Serviços críticos
  const criticalServices = legacyServices.filter(s => s.priority === 'critical');
  if (criticalServices.length > 0) {
    timeline.push({
      phase: 'Fase 1: Serviços Críticos',
      description: `Migrar ${criticalServices.length} serviços críticos (fiscal, contábil)`,
      estimatedWeeks: Math.ceil(criticalServices.length * 0.5),
      dependencies: [],
    });
  }

  // Fase 2: Serviços de alta prioridade
  const highServices = legacyServices.filter(s => s.priority === 'high');
  if (highServices.length > 0) {
    timeline.push({
      phase: 'Fase 2: Serviços Importantes',
      description: `Migrar ${highServices.length} serviços de alta prioridade`,
      estimatedWeeks: Math.ceil(highServices.length * 0.3),
      dependencies: ['Fase 1: Serviços Críticos'],
    });
  }

  // Fase 3: Correção de issues em módulos
  const modulesWithIssues = modules.filter(m => m.issues.length > 0);
  if (modulesWithIssues.length > 0) {
    timeline.push({
      phase: 'Fase 3: Refatoração de Módulos',
      description: `Corrigir ${modulesWithIssues.reduce((s, m) => s + m.issues.length, 0)} issues em ${modulesWithIssues.length} módulos`,
      estimatedWeeks: 2,
      dependencies: ['Fase 2: Serviços Importantes'],
    });
  }

  // Fase 4: Serviços restantes
  const remainingServices = legacyServices.filter(s => s.priority === 'medium' || s.priority === 'low');
  if (remainingServices.length > 0) {
    timeline.push({
      phase: 'Fase 4: Limpeza Final',
      description: `Migrar ${remainingServices.length} serviços restantes`,
      estimatedWeeks: Math.ceil(remainingServices.length * 0.2),
      dependencies: ['Fase 3: Refatoração de Módulos'],
    });
  }

  return timeline;
}

// ============================================================================
// HELPERS
// ============================================================================

function getTypeScriptFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'index.ts')
    .map(f => path.join(dir, f));
}

function getTypeScriptFilesRecursive(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getTypeScriptFilesRecursive(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.test.ts')
    ) {
      files.push(fullPath);
    }
  }

  return files;
}
