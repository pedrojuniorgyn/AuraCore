import { getContractTool } from './get-contract-tool.js';

interface ValidationResult {
  valid: boolean;
  violations: Violation[];
  contractsChecked: string[];
  summary: string;
}

interface Violation {
  contractId: string;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
}

export async function validateCode(
  code: string,
  contractIds: string[],
  language: 'typescript' | 'javascript' | 'sql' = 'typescript'
): Promise<ValidationResult> {
  // Validacao de entrada
  if (!code || typeof code !== 'string' || code.trim() === '') {
    throw new Error('code must be a non-empty string');
  }
  
  if (!Array.isArray(contractIds) || contractIds.length === 0) {
    throw new Error('contract_ids must be a non-empty array');
  }
  
  // Validar cada contract_id e string
  const validContractIds = contractIds.filter(id => typeof id === 'string' && id.trim() !== '');
  
  if (validContractIds.length === 0) {
    throw new Error('contract_ids must contain at least one valid string');
  }
  
  const violations: Violation[] = [];
  const contractsChecked: string[] = [];
  
  // Carregar contratos
  for (const contractId of validContractIds) {
    try {
      const contract = await getContractTool(contractId);
      contractsChecked.push(contract.id);
      
      // Validar regras do contrato
      if (Array.isArray(contract.rules)) {
        for (const rule of contract.rules) {
          if (typeof rule !== 'string') continue;
          
          const violation = checkRule(code, rule, contract.id, language);
          if (violation) {
            violations.push(violation);
          }
        }
      }
      
    } catch (error: unknown) {
      // Se contrato nao existe, adicionar como warning
      violations.push({
        contractId,
        rule: 'Contract Validation',
        severity: 'warning',
        message: `Contract ${contractId} not found or invalid`
      });
    }
  }
  
  const valid = violations.filter(v => v.severity === 'error').length === 0;
  
  const summary = valid
    ? `Code validated successfully against ${contractsChecked.length} contract(s). ${violations.length} warning(s).`
    : `Code validation failed with ${violations.filter(v => v.severity === 'error').length} error(s) and ${violations.filter(v => v.severity === 'warning').length} warning(s).`;
  
  return {
    valid,
    violations,
    contractsChecked,
    summary
  };
}

/**
 * Verifica uma regra especifica contra o codigo
 * Implementacao simplificada com pattern matching
 */
function checkRule(
  code: string,
  rule: string,
  contractId: string,
  language: string
): Violation | null {
  const lowerRule = rule.toLowerCase();
  const lowerCode = code.toLowerCase();
  
  // REGRA: API REST - deve usar verbos HTTP corretos
  if (lowerRule.includes('get') && lowerRule.includes('post') && lowerRule.includes('put') && lowerRule.includes('delete')) {
    // Verificar se ha definicao de rotas
    const hasRouteDefinition = /\.(get|post|put|delete|patch)\s*\(/i.test(code);
    const hasHttpMethods = /method:\s*['"]?(GET|POST|PUT|DELETE|PATCH)['"]?/i.test(code);
    
    if (!hasRouteDefinition && !hasHttpMethods && language === 'typescript') {
      return {
        contractId,
        rule,
        severity: 'warning',
        message: 'No HTTP method definitions found. Ensure API routes use correct verbs (GET, POST, PUT, DELETE).',
        suggestion: 'Add route definitions: app.get(), app.post(), etc.'
      };
    }
  }
  
  // REGRA: Error handling - deve usar try-catch
  if (lowerRule.includes('erro') || lowerRule.includes('exception')) {
    const hasTryCatch = /try\s*\{[\s\S]*\}\s*catch/i.test(code);
    
    if (!hasTryCatch && code.length > 100) {
      return {
        contractId,
        rule,
        severity: 'warning',
        message: 'No try-catch blocks found. Consider adding error handling.',
        suggestion: 'Wrap risky operations in try-catch blocks'
      };
    }
  }
  
  // REGRA: Async operations - deve usar await
  if (lowerRule.includes('async') || lowerRule.includes('await')) {
    const hasAsync = /async\s+function|async\s*\(/i.test(code);
    const hasAwait = /await\s+/i.test(code);
    const hasPromise = /\.then\s*\(|new\s+Promise/i.test(code);
    
    if (hasPromise && !hasAwait && language === 'typescript') {
      return {
        contractId,
        rule,
        severity: 'warning',
        message: 'Promise usage detected without await. Consider using async/await.',
        suggestion: 'Use async/await instead of .then() chains'
      };
    }
  }
  
  // REGRA: SQL - deve usar parametros (prevenir SQL injection)
  if (lowerRule.includes('sql') && lowerRule.includes('injection')) {
    const hasStringConcat = /['"].*\+.*['"]|`.*\$\{.*\}`/.test(code);
    const hasSqlKeywords = /select|insert|update|delete|where/i.test(code);
    
    if (hasStringConcat && hasSqlKeywords && language !== 'sql') {
      return {
        contractId,
        rule,
        severity: 'error',
        message: 'Potential SQL injection vulnerability: String concatenation in SQL query detected.',
        suggestion: 'Use parameterized queries or ORM methods (Prisma)'
      };
    }
  }
  
  // REGRA: Authentication/Authorization
  if (lowerRule.includes('autenticacao') || lowerRule.includes('authorization') || lowerRule.includes('permiss')) {
    const hasAuthCheck = /checkAuth|requireAuth|isAuthenticated|hasPermission/i.test(code);
    const hasMiddleware = /middleware|protect|guard/i.test(code);
    const hasRouteHandler = /\.(get|post|put|delete)\s*\([^)]*function|=>\s*\{/i.test(code);
    
    if (hasRouteHandler && !hasAuthCheck && !hasMiddleware && code.length > 200) {
      return {
        contractId,
        rule,
        severity: 'warning',
        message: 'Route handler without apparent authentication/authorization check.',
        suggestion: 'Add authentication middleware or permission checks'
      };
    }
  }
  
  // REGRA: Transactions
  if (lowerRule.includes('transaction') && language === 'typescript') {
    const hasMultipleWrites = (code.match(/\.(create|update|delete)\s*\(/gi) || []).length > 1;
    const hasTransaction = /\$transaction|prisma\.transaction/i.test(code);
    
    if (hasMultipleWrites && !hasTransaction) {
      return {
        contractId,
        rule,
        severity: 'error',
        message: 'Multiple database writes without transaction detected.',
        suggestion: 'Wrap multiple operations in prisma.$transaction()'
      };
    }
  }
  
  // Se nenhuma violacao detectada
  return null;
}

