import * as fs from 'fs/promises';
import * as path from 'path';
import { validateCode } from './validate-code.js';

interface ComplianceReport {
  file: string;
  language: 'typescript' | 'javascript' | 'sql';
  contractsChecked: string[];
  violations: Array<{
    contractId: string;
    rule: string;
    severity: 'error' | 'warning';
    message: string;
    suggestion?: string;
  }>;
  patternsChecked?: string[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    compliant: boolean;
  };
}

/**
 * Determina linguagem do arquivo baseado na extensao
 */
function getLanguageFromPath(filePath: string): 'typescript' | 'javascript' | 'sql' | null {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.ts' || ext === '.tsx') {
    return 'typescript';
  }
  
  if (ext === '.js' || ext === '.jsx') {
    return 'javascript';
  }
  
  if (ext === '.sql') {
    return 'sql';
  }
  
  return null;
}

/**
 * Determina contratos relevantes para o arquivo baseado em path e conteudo
 */
async function getRelevantContracts(filePath: string, content: string): Promise<string[]> {
  const contracts: string[] = [];
  const lowerPath = filePath.toLowerCase();
  const lowerContent = content.toLowerCase();
  
  // Contratos sempre aplicaveis
  contracts.push('type-safety');
  
  // API routes
  if (lowerPath.includes('/api/') || lowerPath.includes('/route.ts')) {
    contracts.push('api-contract');
  }
  
  // Multi-tenancy (qualquer arquivo que mencione organizationId ou branchId)
  if (lowerContent.includes('organizationid') || lowerContent.includes('branchid')) {
    contracts.push('multi-tenancy');
  }
  
  // Database operations (menciona transacao, db, prisma)
  if (lowerContent.includes('transaction') || lowerContent.includes('prisma') || lowerContent.includes('withmsssqltransaction')) {
    contracts.push('database-transactions');
  }
  
  // Input validation (menciona zod, validation, schema)
  if (lowerContent.includes('zod') || lowerContent.includes('schema') || lowerContent.includes('validation')) {
    contracts.push('input-validation');
  }
  
  return contracts;
}

/**
 * Verifica compliance de um arquivo contra contratos e padroes
 */
export async function checkCompliance(filePath: string): Promise<ComplianceReport> {
  // Validacao input
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('file_path must be a non-empty string');
  }
  
  if (filePath.trim() === '') {
    throw new Error('file_path must be a non-empty string');
  }
  
  // Verificar extensao suportada
  const language = getLanguageFromPath(filePath);
  if (!language) {
    throw new Error(`Unsupported file type: ${path.extname(filePath)}. Supported: .ts, .tsx, .js, .jsx, .sql`);
  }
  
  // Ler arquivo
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      const fsError = error as { code: string };
      if (fsError.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
    }
    throw error;
  }
  
  // Determinar contratos relevantes
  const contractIds = await getRelevantContracts(filePath, content);
  
  // Validar codigo contra contratos
  const validationResult = await validateCode(content, contractIds, language);
  
  // Calcular summary
  const errors = validationResult.violations.filter(v => v.severity === 'error').length;
  const warnings = validationResult.violations.filter(v => v.severity === 'warning').length;
  
  // Montar relatorio
  const report: ComplianceReport = {
    file: filePath,
    language,
    contractsChecked: contractIds,
    violations: validationResult.violations,
    summary: {
      total: validationResult.violations.length,
      errors,
      warnings,
      compliant: errors === 0, // Compliant se nao tem erros (warnings sao permitidos)
    },
  };
  
  return report;
}

