/**
 * Retention Policy Types
 * 
 * Tipos e interfaces para o sistema de políticas de retenção de dados.
 * 
 * @see docs/architecture/runbooks/RUNBOOK_INCIDENTS.md
 */

/**
 * Política de retenção de dados
 * 
 * ⚠️ S1.2: Agora inclui organizationId e branchId para multi-tenancy
 */
export interface RetentionPolicy {
  id: string;
  /** ID da organização (OBRIGATÓRIO - S1.2 multi-tenancy) */
  organizationId: number;
  /** ID da filial (OBRIGATÓRIO - S1.2 multi-tenancy) */
  branchId: number;
  /** Nome identificador da política */
  policyName: string;
  /** Nome da tabela alvo */
  tableName: string;
  /** Dias de retenção (dados mais antigos serão removidos) */
  retentionDays: number;
  /** Coluna de data usada para filtrar */
  dateColumn: string;
  /** Condições adicionais em SQL (opcional) */
  additionalConditions: string | null;
  /** Status da política (1 = ativo, 0 = inativo) */
  isActive: number;
  /** Última execução */
  lastRunAt: Date | null;
  /** Registros deletados na última execução */
  lastRunRecordsDeleted: number | null;
  /** Data de criação */
  createdAt: Date;
  /** Data de atualização */
  updatedAt: Date;
}

/**
 * Resultado de uma execução de cleanup
 */
export interface CleanupResult {
  /** Nome da política */
  policy: string;
  /** Tabela afetada */
  table: string;
  /** Registros deletados (-1 se erro) */
  deleted: number;
  /** Mensagem de erro (se houver) */
  error?: string;
  /** Duração em ms */
  durationMs: number;
}

/**
 * Resultado geral do cleanup
 */
export interface CleanupSummary {
  /** Total de políticas executadas */
  policiesExecuted: number;
  /** Total de registros deletados */
  totalDeleted: number;
  /** Políticas que falharam */
  failures: number;
  /** Resultados por política */
  results: CleanupResult[];
  /** Duração total em ms */
  totalDurationMs: number;
  /** Timestamp da execução */
  executedAt: string;
}

/**
 * Políticas de retenção padrão do sistema
 */
export const DEFAULT_RETENTION_POLICIES: Array<{
  policyName: string;
  tableName: string;
  retentionDays: number;
  dateColumn: string;
  additionalConditions?: string;
}> = [
  {
    policyName: 'slow_logs',
    tableName: 'request_logs',
    retentionDays: 30,
    dateColumn: 'created_at',
    additionalConditions: "duration_ms >= 1500", // Apenas logs lentos
  },
  {
    policyName: 'idempotency_tokens',
    tableName: 'idempotency_keys',
    retentionDays: 7,
    dateColumn: 'created_at',
  },
  {
    policyName: 'expired_sessions',
    tableName: 'sessions',
    retentionDays: 1, // 24h
    dateColumn: 'expires_at',
    additionalConditions: "expires_at < GETDATE()", // Apenas expirados
  },
  {
    policyName: 'completed_jobs',
    tableName: 'document_jobs',
    retentionDays: 90,
    dateColumn: 'updated_at',
    additionalConditions: "status IN ('SUCCEEDED', 'FAILED')",
  },
];

/**
 * IMPORTANTE: Tabelas de auditoria NÃO devem ter cleanup automático
 * Retention mínima: 5 anos (compliance fiscal - Lei 8.218/91)
 */
export const AUDIT_RETENTION_YEARS = 5;
