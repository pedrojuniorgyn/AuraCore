import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * 💰 COST CENTER ALLOCATION SERVICE
 * 
 * Gerencia rateio de custos entre múltiplos centros de custo
 */

export interface AllocationInput {
  costCenterId: number;
  percentage: number; // 0-100
}

export interface CreateAllocationInput {
  journalEntryLineId: number;
  allocations: AllocationInput[];
  createdBy: string;
}

/**
 * Cria rateio multi-CC para uma linha de lançamento
 */
export async function createCostCenterAllocations(
  data: CreateAllocationInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // ✅ Validação 1: Soma de percentuais = 100%
    const totalPercentage = data.allocations.reduce((sum, a) => sum + a.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return {
        success: false,
        error: `Soma dos percentuais deve ser 100%. Atual: ${totalPercentage.toFixed(2)}%`,
      };
    }

    // ✅ Validação 2: Buscar valor total da linha
    const lineResult = await db.execute(sql`
      SELECT 
        COALESCE(debit_amount, 0) + COALESCE(credit_amount, 0) as line_amount
      FROM journal_entry_lines
      WHERE id = ${data.journalEntryLineId}
    `);

    if (!lineResult[0]) {
      return {
        success: false,
        error: "Linha de lançamento não encontrada",
      };
    }

    const lineAmount = parseFloat(lineResult[0].line_amount);

    // ✅ Validação 3: Todos CCs devem ser analíticos
    for (const allocation of data.allocations) {
      const ccResult = await db.execute(sql`
        SELECT is_analytical 
        FROM financial_cost_centers 
        WHERE id = ${allocation.costCenterId}
          AND deleted_at IS NULL
      `);

      if (!ccResult[0]) {
        return {
          success: false,
          error: `Centro de Custo ${allocation.costCenterId} não encontrado`,
        };
      }

      if (!ccResult[0].is_analytical) {
        return {
          success: false,
          error: `Centro de Custo ${allocation.costCenterId} não é analítico`,
        };
      }
    }

    // ✅ Limpar rateios anteriores (se existirem)
    await db.execute(sql`
      DELETE FROM cost_center_allocations
      WHERE journal_entry_line_id = ${data.journalEntryLineId}
    `);

    // ✅ Criar novos rateios
    for (const allocation of data.allocations) {
      const amount = (lineAmount * allocation.percentage) / 100;

      await db.execute(sql`
        INSERT INTO cost_center_allocations (
          journal_entry_line_id,
          cost_center_id,
          percentage,
          amount,
          created_by
        ) VALUES (
          ${data.journalEntryLineId},
          ${allocation.costCenterId},
          ${allocation.percentage},
          ${amount},
          ${data.createdBy}
        )
      `);
    }

    return { success: true };
  } catch (error: any) {
    console.error("❌ Erro ao criar rateio de CC:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Busca rateios de uma linha
 */
export async function getAllocations(journalEntryLineId: number): Promise<any[]> {
  try {
    const result = await db.execute(sql`
      SELECT 
        cca.*,
        cc.code as cost_center_code,
        cc.name as cost_center_name
      FROM cost_center_allocations cca
      INNER JOIN financial_cost_centers cc ON cc.id = cca.cost_center_id
      WHERE cca.journal_entry_line_id = ${journalEntryLineId}
      ORDER BY cca.percentage DESC
    `);

    return result.recordset || [];
  } catch (error) {
    console.error("❌ Erro ao buscar rateios:", error);
    return [];
  }
}

/**
 * Remove rateios de uma linha
 */
export async function deleteAllocations(journalEntryLineId: number): Promise<void> {
  try {
    await db.execute(sql`
      DELETE FROM cost_center_allocations
      WHERE journal_entry_line_id = ${journalEntryLineId}
    `);
  } catch (error) {
    console.error("❌ Erro ao remover rateios:", error);
  }
}

/**
 * Calcula totalizadores por CC (para relatórios)
 */
export async function getCostCenterTotals(
  organizationId: number,
  startDate?: Date,
  endDate?: Date
): Promise<any[]> {
  try {
    const result = await db.execute(sql`
      SELECT 
        cc.id,
        cc.code,
        cc.name,
        cc.class,
        SUM(cca.amount) as total_amount,
        COUNT(DISTINCT cca.journal_entry_line_id) as allocation_count
      FROM cost_center_allocations cca
      INNER JOIN financial_cost_centers cc ON cc.id = cca.cost_center_id
      INNER JOIN journal_entry_lines jel ON jel.id = cca.journal_entry_line_id
      INNER JOIN journal_entries je ON je.id = jel.journal_entry_id
      WHERE cc.organization_id = ${organizationId}
        ${startDate ? sql`AND je.entry_date >= ${startDate}` : sql``}
        ${endDate ? sql`AND je.entry_date <= ${endDate}` : sql``}
        AND cc.deleted_at IS NULL
      GROUP BY cc.id, cc.code, cc.name, cc.class
      ORDER BY total_amount DESC
    `);

    return result.recordset || [];
  } catch (error) {
    console.error("❌ Erro ao calcular totais por CC:", error);
    return [];
  }
}












