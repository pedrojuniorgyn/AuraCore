import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';

export interface CursorIssue {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
  source: string;
}

export interface IssueCheckResult {
  timestamp: string;
  context: string;
  scope: string;
  totalIssues: number;
  critical: CursorIssue[];
  high: CursorIssue[];
  medium: CursorIssue[];
  low: CursorIssue[];
  recommendation: string;
}

export async function checkCursorIssues(
  context: string,
  scope: string = '.'
): Promise<IssueCheckResult> {
  const issues = await collectIssues(scope);
  const categorized = categorizeIssues(issues);
  const recommendation = generateRecommendation(categorized);

  return {
    timestamp: new Date().toISOString(),
    context,
    scope,
    totalIssues: issues.length,
    ...categorized,
    recommendation,
  };
}

async function collectIssues(scope: string): Promise<CursorIssue[]> {
  const issues: CursorIssue[] = [];

  try {
    const tsErrors = await getTypeScriptErrors(scope);
    issues.push(...tsErrors);
  } catch (error) {
    console.error('Failed to get TypeScript errors:', error);
  }

  return issues;
}

async function getTypeScriptErrors(scope: string): Promise<CursorIssue[]> {
  try {
    // Executar tsc - se sucesso (exit 0), nao ha erros
    execSync('npx tsc --noEmit --pretty false', {
      cwd: scope,
      encoding: 'utf-8',
      // CORRECAO: usar stdio simples para captura automatica
      stdio: 'pipe'
    });
    
    return [];
    
  } catch (error: any) {
    // CORRECAO: Com stdio pipe, stderr e stdout sao capturados automaticamente
    // Tentar stderr primeiro (onde tsc envia erros), depois stdout (fallback)
    let errorOutput = '';
    
    if (error.stderr && typeof error.stderr === 'string') {
      errorOutput = error.stderr;
    } else if (error.stdout && typeof error.stdout === 'string') {
      errorOutput = error.stdout;
    }
    
    if (errorOutput) {
      return parseTypeScriptOutput(errorOutput);
    }
    
    console.error('Failed to capture TypeScript output:', error.message);
    return [];
  }
}

function parseTypeScriptOutput(output: string): CursorIssue[] {
  const issues: CursorIssue[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const match = line.match(/^(.+?)\((\d+),(\d+)\): (error|warning) (TS\d+): (.+)$/);
    
    if (match) {
      issues.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        severity: match[4] as 'error' | 'warning',
        code: match[5],
        message: match[6],
        source: 'typescript',
      });
    }
  }

  return issues;
}

function categorizeIssues(issues: CursorIssue[]) {
  const critical: CursorIssue[] = [];
  const high: CursorIssue[] = [];
  const medium: CursorIssue[] = [];
  const low: CursorIssue[] = [];

  for (const issue of issues) {
    if (issue.severity === 'error') {
      if (isCriticalTypeScriptError(issue)) {
        critical.push(issue);
      } else {
        high.push(issue);
      }
    } else if (issue.severity === 'warning') {
      if (isImportantWarning(issue)) {
        medium.push(issue);
      } else {
        low.push(issue);
      }
    } else {
      low.push(issue);
    }
  }

  return { critical, high, medium, low };
}

function isCriticalTypeScriptError(issue: CursorIssue): boolean {
  const criticalCodes = [
    'TS2304',
    'TS2339',
    'TS2345',
    'TS2741',
  ];
  return criticalCodes.includes(issue.code || '');
}

function isImportantWarning(issue: CursorIssue): boolean {
  const importantPatterns = [
    /security/i,
    /vulnerability/i,
    /deprecated/i,
  ];
  return importantPatterns.some(pattern => pattern.test(issue.message));
}

function generateRecommendation(categorized: {
  critical: CursorIssue[];
  high: CursorIssue[];
  medium: CursorIssue[];
  low: CursorIssue[];
}): string {
  const { critical, high, medium, low } = categorized;

  if (critical.length > 0) {
    return `ACAO OBRIGATORIA: ${critical.length} erro(s) CRITICO(s). NAO COMMITAR ate corrigir.`;
  }

  if (high.length > 0) {
    return `ACAO RECOMENDADA: ${high.length} erro(s) ALTA severidade. Recomendado corrigir antes de commit.`;
  }

  if (medium.length > 0) {
    return `REVISAR: ${medium.length} warning(s) MEDIA severidade. Considere corrigir.`;
  }

  if (low.length > 0) {
    return `OK PARA COMMIT: Apenas ${low.length} issue(s) BAIXA severidade.`;
  }

  return 'EXCELENTE: Nenhum issue encontrado. OK para commit.';
}

