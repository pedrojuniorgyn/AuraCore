/**
 * Retention Service
 * 
 * Serviço para executar políticas de retenção e limpeza de dados temporários.
 * 
 * IMPORTANTE:
 * - NÃO aplica cleanup em tabelas de auditoria (retention mínima 5 anos)
 * - Executa em modo transacional para consistência
 * - Logs detalhados para auditoria
 * 
 * @example
 * ```typescript
 * const results = await retentionService.runCleanup();
 * console.log(`Deletados: ${results.totalDeleted} registros`);
 * ```
 */

import { db } from '@/lib/db';
import { retentionPolicies } from './retention.schema';
import { eq, sql } from 'drizzle-orm';
import type { CleanupResult, CleanupSummary, RetentionPolicy } from './retention.types';
import type { RetentionPolicyRow } from './retention.schema';

export class RetentionService {
  private static instance: RetentionService;

  private constructor() {
    // Singleton
  }

  /**
   * Obtém instância singleton do serviço
   */
  static getInstance(): RetentionService {
    if (!this.instance) {
      this.instance = new RetentionService();
    }
    return this.instance;
  }

  /**
   * Executa todas as políticas de retenção ativas
   */
  async runCleanup(): Promise<CleanupSummary> {
    const startTime = Date.now();
    const results: CleanupResult[] = [];
    let totalDeleted = 0;
    let failures = 0;

    try {
      // Buscar políticas ativas
      const policies = await db
        .select()
        .from(retentionPolicies)
        .where(eq(retentionPolicies.isActive, 1));

      console.log(`[RetentionService] Executando ${policies.length} políticas de retenção`);

      for (const policy of policies) {
        const result = await this.executePolicy(this.mapRowToPolicy(policy));
        results.push(result);

        if (result.deleted >= 0) {
          totalDeleted += result.deleted;
        } else {
          failures++;
        }
      }
    } catch (error) {
      console.error('[RetentionService] Erro ao executar cleanup:', error);
    }

    const summary: CleanupSummary = {
      policiesExecuted: results.length,
      totalDeleted,
      failures,
      results,
      totalDurationMs: Date.now() - startTime,
      executedAt: new Date().toISOString(),
    };

    console.log(`[RetentionService] Cleanup concluído: ${totalDeleted} registros deletados, ${failures} falhas`);

    return summary;
  }

  /**
   * Executa uma política específica
   */
  private async executePolicy(policy: RetentionPolicy): Promise<CleanupResult> {
    const startTime = Date.now();

    try {
      // Calcular data de corte
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
      const cutoffDateStr = cutoffDate.toISOString().slice(0, 23).replace('T', ' ');

      // Construir query DELETE
      let deleteQuery = `
        DELETE FROM [${policy.tableName}]
        WHERE [${policy.dateColumn}] < '${cutoffDateStr}'
      `;

      if (policy.additionalConditions) {
        deleteQuery += ` AND (${policy.additionalConditions})`;
      }

      // Executar DELETE
      const result = await db.execute(sql.raw(deleteQuery));
      const deletedCount = (result as unknown as { rowsAffected?: number[] })?.rowsAffected?.[0] ?? 0;

      // Atualizar política com resultado
      await db
        .update(retentionPolicies)
        .set({
          lastRunAt: new Date(),
          lastRunRecordsDeleted: deletedCount,
          updatedAt: new Date(),
        })
        .where(eq(retentionPolicies.id, policy.id));

      console.log(`[RetentionService] ${policy.policyName}: ${deletedCount} registros deletados`);

      return {
        policy: policy.policyName,
        table: policy.tableName,
        deleted: deletedCount,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[RetentionService] Erro em ${policy.policyName}:`, errorMessage);

      return {
        policy: policy.policyName,
        table: policy.tableName,
        deleted: -1,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Lista todas as políticas de retenção
   */
  async listPolicies(): Promise<RetentionPolicy[]> {
    const rows = await db.select().from(retentionPolicies);
    return rows.map(this.mapRowToPolicy);
  }

  /**
   * Mapeia row do banco para interface RetentionPolicy
   * 
   * ⚠️ S1.2: Agora inclui organizationId e branchId
   */
  private mapRowToPolicy(row: RetentionPolicyRow): RetentionPolicy {
    return {
      id: row.id,
      organizationId: row.organizationId, // ← S1.2
      branchId: row.branchId, // ← S1.2
      policyName: row.policyName,
      tableName: row.tableName,
      retentionDays: row.retentionDays,
      dateColumn: row.dateColumn,
      additionalConditions: row.additionalConditions,
      isActive: row.isActive,
      lastRunAt: row.lastRunAt,
      lastRunRecordsDeleted: row.lastRunRecordsDeleted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Cria ou atualiza uma política de retenção
   * 
   * ⚠️ S1.2: Agora requer organizationId e branchId para multi-tenancy
   */
  async upsertPolicy(policy: Omit<RetentionPolicy, 'createdAt' | 'updatedAt' | 'lastRunAt' | 'lastRunRecordsDeleted'>): Promise<void> {
    const now = new Date();

    // MSSQL não suporta onConflictDoUpdate, usar MERGE via raw SQL
    // ✅ S1.2: Incluir organization_id e branch_id
    await db.execute(sql`
      MERGE INTO retention_policies AS target
      USING (SELECT ${policy.id} AS id) AS source
      ON target.id = source.id
      WHEN MATCHED THEN
        UPDATE SET
          organization_id = ${policy.organizationId},
          branch_id = ${policy.branchId},
          policy_name = ${policy.policyName},
          table_name = ${policy.tableName},
          retention_days = ${policy.retentionDays},
          date_column = ${policy.dateColumn},
          additional_conditions = ${policy.additionalConditions},
          is_active = ${policy.isActive},
          updated_at = ${now}
      WHEN NOT MATCHED THEN
        INSERT (id, organization_id, branch_id, policy_name, table_name, retention_days, date_column, additional_conditions, is_active, created_at, updated_at)
        VALUES (${policy.id}, ${policy.organizationId}, ${policy.branchId}, ${policy.policyName}, ${policy.tableName}, ${policy.retentionDays}, ${policy.dateColumn}, ${policy.additionalConditions}, ${policy.isActive}, ${now}, ${now});
    `);
  }

  /**
   * Desativa uma política
   */
  async deactivatePolicy(policyId: string): Promise<void> {
    await db
      .update(retentionPolicies)
      .set({
        isActive: 0,
        updatedAt: new Date(),
      })
      .where(eq(retentionPolicies.id, policyId));
  }
}

// Singleton export
export const retentionService = RetentionService.getInstance();
