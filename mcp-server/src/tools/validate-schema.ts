/**
 * MCP Tool: validate_schema
 * 
 * Valida se um schema Drizzle está correto e segue os padrões do AuraCore.
 * 
 * Regras validadas (SCHEMA-001 a SCHEMA-010):
 * - SCHEMA-001: Um arquivo por tabela
 * - SCHEMA-002: Nome: {entity}.schema.ts
 * - SCHEMA-003: Índice composto (organizationId, branchId)
 * - SCHEMA-004: Índices para filtros frequentes
 * - SCHEMA-005: Campos createdAt, updatedAt obrigatórios
 * - SCHEMA-006: Soft delete: deletedAt nullable
 * - SCHEMA-007: Money = 2 colunas (amount + currency)
 * - SCHEMA-008: Export const tableName = mssqlTable(...)
 * - SCHEMA-009: Tipos inferidos: $inferSelect, $inferInsert
 * - SCHEMA-010: Índice único para chaves naturais
 * 
 * @see regrasmcp.mdc
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TIPOS
// ============================================================================

export interface ValidateSchemaInput {
  schemaPath: string;
  entityPath?: string;
}

export interface SchemaCheck {
  rule: string;
  passed: boolean;
  details: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidateSchemaOutput {
  isValid: boolean;
  score: number;
  checks: SchemaCheck[];
  suggestions: string[];
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

export async function validateSchema(
  input: ValidateSchemaInput
): Promise<ValidateSchemaOutput> {
  // Validar input
  validateInput(input);

  const { schemaPath, entityPath } = input;
  const fullPath = path.join(process.cwd(), schemaPath);

  // Verificar se arquivo existe
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Schema não encontrado: ${schemaPath}`);
  }

  // Ler conteúdo do schema
  const schemaContent = fs.readFileSync(fullPath, 'utf-8');
  
  // Ler conteúdo da entity se fornecido
  let entityContent: string | undefined;
  if (entityPath) {
    const entityFullPath = path.join(process.cwd(), entityPath);
    if (fs.existsSync(entityFullPath)) {
      entityContent = fs.readFileSync(entityFullPath, 'utf-8');
    }
  }

  // Executar todas as validações
  const checks: SchemaCheck[] = [];

  checks.push(checkSchema001(schemaPath));
  checks.push(checkSchema002(schemaPath));
  checks.push(checkSchema003(schemaContent));
  checks.push(checkSchema004(schemaContent));
  checks.push(checkSchema005(schemaContent));
  checks.push(checkSchema006(schemaContent));
  checks.push(checkSchema007(schemaContent, entityContent));
  checks.push(checkSchema008(schemaContent));
  checks.push(checkSchema009(schemaContent));
  checks.push(checkSchema010(schemaContent));

  // Calcular score
  const score = calculateScore(checks);
  
  // Determinar se é válido (sem erros)
  const isValid = !checks.some(c => c.severity === 'error' && !c.passed);

  // Gerar sugestões
  const suggestions = generateSuggestions(checks, schemaPath);

  return {
    isValid,
    score,
    checks,
    suggestions,
  };
}

// ============================================================================
// VALIDAÇÃO DE INPUT
// ============================================================================

function validateInput(input: ValidateSchemaInput): void {
  if (!input.schemaPath || typeof input.schemaPath !== 'string') {
    throw new Error('schemaPath é obrigatório e deve ser string');
  }

  if (!input.schemaPath.endsWith('.ts')) {
    throw new Error('schemaPath deve ser um arquivo .ts');
  }
}

// ============================================================================
// CHECAGENS INDIVIDUAIS
// ============================================================================

/**
 * SCHEMA-001: Um arquivo por tabela
 */
function checkSchema001(schemaPath: string): SchemaCheck {
  const fileName = path.basename(schemaPath);
  
  // Contar quantas definições de tabela existem
  // Simplificação: verificar pelo nome do arquivo
  const isCorrectPattern = fileName.endsWith('.schema.ts') || fileName.includes('Schema');
  
  return {
    rule: 'SCHEMA-001',
    passed: isCorrectPattern,
    details: isCorrectPattern 
      ? 'Arquivo segue padrão de um schema por tabela'
      : 'Nome do arquivo deve seguir padrão {entity}.schema.ts ou {Entity}Schema.ts',
    severity: 'error',
  };
}

/**
 * SCHEMA-002: Nome: {entity}.schema.ts
 */
function checkSchema002(schemaPath: string): SchemaCheck {
  const fileName = path.basename(schemaPath);
  
  // Aceitar kebab-case.schema.ts ou PascalCaseSchema.ts
  const isKebabCase = /^[a-z][a-z0-9-]*\.schema\.ts$/.test(fileName);
  const isPascalCase = /^[A-Z][a-zA-Z0-9]*Schema\.ts$/.test(fileName);
  
  const passed = isKebabCase || isPascalCase;
  
  return {
    rule: 'SCHEMA-002',
    passed,
    details: passed
      ? `Nome do arquivo correto: ${fileName}`
      : `Nome deve ser {entity}.schema.ts (kebab-case) ou {Entity}Schema.ts (PascalCase). Atual: ${fileName}`,
    severity: 'warning',
  };
}

/**
 * SCHEMA-003: Índice composto (organizationId, branchId)
 */
function checkSchema003(content: string): SchemaCheck {
  const hasOrganizationId = content.includes('organizationId') || content.includes('organization_id');
  const hasBranchId = content.includes('branchId') || content.includes('branch_id');
  
  // Verificar comentário sobre índice ou se há definição de índice
  const hasIndexComment = content.includes('idx_') || content.includes('INDEX') || content.includes('index');
  
  const passed = hasOrganizationId && hasBranchId;
  
  let details: string;
  if (!hasOrganizationId && !hasBranchId) {
    details = 'CRÍTICO: Faltam campos organizationId e branchId para multi-tenancy';
  } else if (!hasOrganizationId) {
    details = 'CRÍTICO: Falta campo organizationId';
  } else if (!hasBranchId) {
    details = 'CRÍTICO: Falta campo branchId (NUNCA opcional - ENFORCE-004)';
  } else if (!hasIndexComment) {
    details = 'Campos multi-tenancy presentes. AVISO: Verificar se índice composto foi criado no banco';
  } else {
    details = 'Campos multi-tenancy e referência a índice presentes';
  }
  
  return {
    rule: 'SCHEMA-003',
    passed,
    details,
    severity: 'error',
  };
}

/**
 * SCHEMA-004: Índices para filtros frequentes
 */
function checkSchema004(content: string): SchemaCheck {
  // Verificar se há campos que tipicamente precisam de índice
  const hasStatus = content.includes('status');
  const hasCreatedAt = content.includes('createdAt') || content.includes('created_at');
  const hasCode = content.includes('code');
  
  // Não é obrigatório, apenas informativo
  const passed = true;
  
  const indexableFields: string[] = [];
  if (hasStatus) indexableFields.push('status');
  if (hasCreatedAt) indexableFields.push('createdAt');
  if (hasCode) indexableFields.push('code');
  
  return {
    rule: 'SCHEMA-004',
    passed,
    details: indexableFields.length > 0
      ? `Campos que podem precisar de índice: ${indexableFields.join(', ')}`
      : 'Nenhum campo comum de filtro identificado',
    severity: 'warning',
  };
}

/**
 * SCHEMA-005: Campos createdAt, updatedAt obrigatórios
 */
function checkSchema005(content: string): SchemaCheck {
  const hasCreatedAt = content.includes('createdAt') || content.includes('created_at');
  const hasUpdatedAt = content.includes('updatedAt') || content.includes('updated_at');
  
  const passed = hasCreatedAt && hasUpdatedAt;
  
  let details: string;
  if (!hasCreatedAt && !hasUpdatedAt) {
    details = 'CRÍTICO: Faltam campos createdAt e updatedAt';
  } else if (!hasCreatedAt) {
    details = 'CRÍTICO: Falta campo createdAt';
  } else if (!hasUpdatedAt) {
    details = 'CRÍTICO: Falta campo updatedAt';
  } else {
    details = 'Campos de timestamp presentes (createdAt, updatedAt)';
  }
  
  return {
    rule: 'SCHEMA-005',
    passed,
    details,
    severity: 'error',
  };
}

/**
 * SCHEMA-006: Soft delete: deletedAt nullable
 */
function checkSchema006(content: string): SchemaCheck {
  const hasDeletedAt = content.includes('deletedAt') || content.includes('deleted_at');
  
  // Se tem deletedAt, verificar se é nullable (não tem .notNull())
  let isNullable = true;
  if (hasDeletedAt) {
    // Encontrar a linha com deletedAt
    const lines = content.split('\n');
    for (const line of lines) {
      if ((line.includes('deletedAt') || line.includes('deleted_at')) && line.includes('.notNull()')) {
        isNullable = false;
        break;
      }
    }
  }
  
  const passed = !hasDeletedAt || (hasDeletedAt && isNullable);
  
  return {
    rule: 'SCHEMA-006',
    passed,
    details: !hasDeletedAt
      ? 'Campo deletedAt não encontrado. Considerar adicionar para soft delete'
      : isNullable
        ? 'Campo deletedAt presente e nullable (correto para soft delete)'
        : 'ERRO: deletedAt não deve ter .notNull() - deve ser nullable para soft delete',
    severity: hasDeletedAt && !isNullable ? 'error' : 'warning',
  };
}

/**
 * SCHEMA-007: Money = 2 colunas (amount + currency)
 */
function checkSchema007(content: string, entityContent?: string): SchemaCheck {
  // Verificar se há campos de valor monetário
  const moneyPatterns = ['amount', 'value', 'price', 'cost', 'total', 'balance'];
  const foundMoneyFields: string[] = [];
  
  for (const pattern of moneyPatterns) {
    if (content.toLowerCase().includes(pattern)) {
      foundMoneyFields.push(pattern);
    }
  }
  
  // Se encontrou campos monetários, verificar se há campo currency correspondente
  const hasCurrency = content.includes('currency') || content.includes('Currency');
  
  // Se a entity tem Money type, deve ter 2 colunas
  let entityHasMoney = false;
  if (entityContent) {
    entityHasMoney = entityContent.includes(': Money') || entityContent.includes(':Money');
  }
  
  let passed = true;
  let details: string;
  
  if (entityHasMoney && !hasCurrency) {
    passed = false;
    details = 'ERRO: Entity tem campo Money mas schema não tem coluna currency correspondente';
  } else if (foundMoneyFields.length > 0 && !hasCurrency) {
    passed = true; // warning, não erro
    details = `Campos monetários encontrados: ${foundMoneyFields.join(', ')}. Considerar adicionar coluna currency se for Money`;
  } else if (hasCurrency) {
    details = 'Padrão Money com 2 colunas (amount + currency) detectado';
  } else {
    details = 'Nenhum campo monetário identificado';
  }
  
  return {
    rule: 'SCHEMA-007',
    passed,
    details,
    severity: entityHasMoney && !hasCurrency ? 'error' : 'info',
  };
}

/**
 * SCHEMA-008: Export const tableName = mssqlTable(...)
 */
function checkSchema008(content: string): SchemaCheck {
  const hasMssqlTable = content.includes('mssqlTable');
  const hasExportConst = content.includes('export const') && content.includes('mssqlTable');
  
  const passed = hasMssqlTable && hasExportConst;
  
  return {
    rule: 'SCHEMA-008',
    passed,
    details: passed
      ? 'Padrão export const ... = mssqlTable(...) encontrado'
      : 'Deve usar: export const tableName = mssqlTable(...)',
    severity: 'error',
  };
}

/**
 * SCHEMA-009: Tipos inferidos: $inferSelect, $inferInsert
 */
function checkSchema009(content: string): SchemaCheck {
  const hasInferSelect = content.includes('$inferSelect');
  const hasInferInsert = content.includes('$inferInsert');
  
  const passed = hasInferSelect && hasInferInsert;
  
  let details: string;
  if (!hasInferSelect && !hasInferInsert) {
    details = 'Faltam tipos inferidos. Adicionar: export type XxxPersistence = typeof xxx.$inferSelect; export type XxxInsert = typeof xxx.$inferInsert;';
  } else if (!hasInferSelect) {
    details = 'Falta tipo $inferSelect';
  } else if (!hasInferInsert) {
    details = 'Falta tipo $inferInsert';
  } else {
    details = 'Tipos inferidos presentes ($inferSelect, $inferInsert)';
  }
  
  return {
    rule: 'SCHEMA-009',
    passed,
    details,
    severity: 'warning',
  };
}

/**
 * SCHEMA-010: Índice único para chaves naturais
 */
function checkSchema010(content: string): SchemaCheck {
  // Verificar se há campos marcados como .unique()
  const hasUniqueConstraint = content.includes('.unique()');
  
  // Campos que tipicamente são chaves naturais
  const naturalKeyPatterns = ['code', 'number', 'cnpj', 'cpf', 'email', 'accessKey', 'access_key'];
  const foundNaturalKeys: string[] = [];
  
  for (const pattern of naturalKeyPatterns) {
    if (content.toLowerCase().includes(pattern.toLowerCase())) {
      foundNaturalKeys.push(pattern);
    }
  }
  
  const passed = true; // Informativo
  
  return {
    rule: 'SCHEMA-010',
    passed,
    details: hasUniqueConstraint
      ? `Constraint unique encontrado. Chaves naturais potenciais: ${foundNaturalKeys.join(', ') || 'nenhuma identificada'}`
      : foundNaturalKeys.length > 0
        ? `Chaves naturais potenciais sem .unique(): ${foundNaturalKeys.join(', ')}`
        : 'Nenhuma chave natural identificada',
    severity: 'info',
  };
}

// ============================================================================
// CÁLCULO DE SCORE
// ============================================================================

function calculateScore(checks: SchemaCheck[]): number {
  const weights: Record<string, number> = {
    'SCHEMA-001': 10,
    'SCHEMA-002': 5,
    'SCHEMA-003': 20, // Multi-tenancy é crítico
    'SCHEMA-004': 5,
    'SCHEMA-005': 15, // Timestamps são importantes
    'SCHEMA-006': 10,
    'SCHEMA-007': 10,
    'SCHEMA-008': 10,
    'SCHEMA-009': 10,
    'SCHEMA-010': 5,
  };

  let totalWeight = 0;
  let earnedPoints = 0;

  for (const check of checks) {
    const weight = weights[check.rule] || 10;
    totalWeight += weight;
    
    if (check.passed) {
      earnedPoints += weight;
    } else if (check.severity === 'warning') {
      earnedPoints += weight * 0.5; // Warnings ganham meio ponto
    } else if (check.severity === 'info') {
      earnedPoints += weight * 0.8; // Info ganha quase tudo
    }
  }

  return Math.round((earnedPoints / totalWeight) * 100);
}

// ============================================================================
// GERAÇÃO DE SUGESTÕES
// ============================================================================

function generateSuggestions(checks: SchemaCheck[], schemaPath: string): string[] {
  const suggestions: string[] = [];
  const failedChecks = checks.filter(c => !c.passed);

  for (const check of failedChecks) {
    switch (check.rule) {
      case 'SCHEMA-001':
        suggestions.push(`Renomear arquivo para ${path.basename(schemaPath).replace('.ts', '.schema.ts')}`);
        break;
      case 'SCHEMA-003':
        suggestions.push('Adicionar campos: organizationId: int("organization_id").notNull(), branchId: int("branch_id").notNull()');
        suggestions.push('Criar índice no banco: CREATE INDEX idx_xxx_tenant ON xxx (organization_id, branch_id) WHERE deleted_at IS NULL');
        break;
      case 'SCHEMA-005':
        suggestions.push('Adicionar: createdAt: datetime("created_at", { mode: "date" }).notNull().default(sql`GETDATE()`)');
        suggestions.push('Adicionar: updatedAt: datetime("updated_at", { mode: "date" }).notNull().default(sql`GETDATE()`)');
        break;
      case 'SCHEMA-006':
        suggestions.push('Adicionar: deletedAt: datetime("deleted_at", { mode: "date" }) // Sem .notNull()');
        break;
      case 'SCHEMA-007':
        suggestions.push('Para campos Money, adicionar coluna currency: amountCurrency: varchar("amount_currency", { length: 3 }).notNull().default("BRL")');
        break;
      case 'SCHEMA-008':
        suggestions.push('Usar padrão: export const tableName = mssqlTable("table_name", { ... });');
        break;
      case 'SCHEMA-009':
        suggestions.push('Adicionar: export type XxxPersistence = typeof tableName.$inferSelect;');
        suggestions.push('Adicionar: export type XxxInsert = typeof tableName.$inferInsert;');
        break;
    }
  }

  // Sugestões gerais
  if (suggestions.length === 0) {
    suggestions.push('Schema está em conformidade com os padrões do AuraCore!');
  }

  return suggestions;
}
