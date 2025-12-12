import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * 📝 AUDIT LOGGER SERVICE
 * 
 * Registra automaticamente alterações em entidades críticas para auditoria
 */

export interface AuditLogEntry {
  entityType: "CHART_ACCOUNT" | "FINANCIAL_CATEGORY" | "COST_CENTER";
  entityId: number;
  operation: "INSERT" | "UPDATE" | "DELETE";
  oldData?: any;
  newData?: any;
  changedBy: string;
  reason?: string;
  ipAddress?: string;
}

/**
 * Registra auditoria de Plano de Contas
 */
export async function logChartAccountChange(data: AuditLogEntry): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO chart_accounts_audit (
        chart_account_id,
        operation,
        old_code,
        old_name,
        old_type,
        old_status,
        old_category,
        new_code,
        new_name,
        new_type,
        new_status,
        new_category,
        changed_by,
        reason,
        ip_address
      ) VALUES (
        ${data.entityId},
        ${data.operation},
        ${data.oldData?.code || null},
        ${data.oldData?.name || null},
        ${data.oldData?.type || null},
        ${data.oldData?.status || null},
        ${data.oldData?.category || null},
        ${data.newData?.code || null},
        ${data.newData?.name || null},
        ${data.newData?.type || null},
        ${data.newData?.status || null},
        ${data.newData?.category || null},
        ${data.changedBy},
        ${data.reason || null},
        ${data.ipAddress || null}
      )
    `);
  } catch (error) {
    console.error("❌ Erro ao registrar auditoria de Chart Account:", error);
    // Não interrompe a operação principal
  }
}

/**
 * Registra auditoria de Categorias Financeiras
 */
export async function logFinancialCategoryChange(data: AuditLogEntry): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO financial_categories_audit (
        category_id,
        operation,
        old_name,
        old_code,
        old_type,
        old_status,
        new_name,
        new_code,
        new_type,
        new_status,
        changed_by,
        reason
      ) VALUES (
        ${data.entityId},
        ${data.operation},
        ${data.oldData?.name || null},
        ${data.oldData?.code || null},
        ${data.oldData?.type || null},
        ${data.oldData?.status || null},
        ${data.newData?.name || null},
        ${data.newData?.code || null},
        ${data.newData?.type || null},
        ${data.newData?.status || null},
        ${data.changedBy},
        ${data.reason || null}
      )
    `);
  } catch (error) {
    console.error("❌ Erro ao registrar auditoria de Financial Category:", error);
  }
}

/**
 * Registra auditoria de Centros de Custo
 */
export async function logCostCenterChange(data: AuditLogEntry): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO cost_centers_audit (
        cost_center_id,
        operation,
        old_code,
        old_name,
        old_type,
        old_status,
        new_code,
        new_name,
        new_type,
        new_status,
        changed_by,
        reason
      ) VALUES (
        ${data.entityId},
        ${data.operation},
        ${data.oldData?.code || null},
        ${data.oldData?.name || null},
        ${data.oldData?.type || null},
        ${data.oldData?.status || null},
        ${data.newData?.code || null},
        ${data.newData?.name || null},
        ${data.newData?.type || null},
        ${data.newData?.status || null},
        ${data.changedBy},
        ${data.reason || null}
      )
    `);
  } catch (error) {
    console.error("❌ Erro ao registrar auditoria de Cost Center:", error);
  }
}

/**
 * Busca histórico de auditoria de uma entidade
 */
export async function getAuditHistory(
  entityType: AuditLogEntry["entityType"],
  entityId: number,
  limit: number = 50
): Promise<any[]> {
  try {
    let tableName = "";
    let idColumn = "";

    switch (entityType) {
      case "CHART_ACCOUNT":
        tableName = "chart_accounts_audit";
        idColumn = "chart_account_id";
        break;
      case "FINANCIAL_CATEGORY":
        tableName = "financial_categories_audit";
        idColumn = "category_id";
        break;
      case "COST_CENTER":
        tableName = "cost_centers_audit";
        idColumn = "cost_center_id";
        break;
    }

    const result = await db.execute(sql`
      SELECT TOP ${limit} *
      FROM ${sql.identifier(tableName)}
      WHERE ${sql.identifier(idColumn)} = ${entityId}
      ORDER BY changed_at DESC
    `);

    return result.recordset || [];
  } catch (error) {
    console.error("❌ Erro ao buscar histórico de auditoria:", error);
    return [];
  }
}









