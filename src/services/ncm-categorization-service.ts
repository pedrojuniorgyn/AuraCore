import { db, getFirstRow, getDbRows, type DbExecuteResult } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * 🏷️ NCM CATEGORIZATION SERVICE
 * 
 * Serviço para categorizar automaticamente itens de NFe baseado em NCM
 */

export interface NCMCategorization {
  categoryId: number | null;
  categoryName: string | null;
  chartAccountId: number | null;
  chartAccountCode: string | null;
  chartAccountName: string | null;
  description: string | null;
}

interface NcmRow {
  categoryId: number;
  categoryName: string;
  chartAccountId: number | null;
  chartAccountCode: string | null;
  chartAccountName: string | null;
  description: string | null;
}

interface FallbackCategoryRow {
  categoryId: number;
  categoryName: string;
}

/**
 * Busca categorização para um NCM específico
 * 
 * @param ncmCode - Código NCM (8 dígitos)
 * @param organizationId - ID da organização
 * @returns Categorização encontrada ou null
 */
export async function getNCMCategorization(
  ncmCode: string,
  organizationId: number
): Promise<NCMCategorization | null> {
  try {
    // Buscar categorização exata do NCM
    const result = await db.execute(sql`
      SELECT 
        ncm.id,
        ncm.financial_category_id AS categoryId,
        fc.name AS categoryName,
        ncm.chart_account_id AS chartAccountId,
        coa.code AS chartAccountCode,
        coa.name AS chartAccountName,
        ncm.description
      FROM ncm_financial_categories ncm
      LEFT JOIN financial_categories fc ON fc.id = ncm.financial_category_id
      LEFT JOIN chart_of_accounts coa ON coa.id = ncm.chart_account_id
      WHERE ncm.organization_id = ${organizationId}
        AND ncm.ncm_code = ${ncmCode}
        AND ncm.is_active = 1
        AND ncm.deleted_at IS NULL
    `);

    const rows = getDbRows<NcmRow>(result as unknown as DbExecuteResult<NcmRow>);
    if (rows.length === 0) {
      // Não encontrou categorização para este NCM
      return null;
    }

    const row = rows[0];

    return {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      chartAccountId: row.chartAccountId,
      chartAccountCode: row.chartAccountCode,
      chartAccountName: row.chartAccountName,
      description: row.description,
    };
  } catch (error: unknown) {
    console.error(`❌ Erro ao buscar categorização NCM ${ncmCode}:`, error);
    return null;
  }
}

/**
 * Categoriza múltiplos NCMs de uma vez (batch)
 * 
 * @param ncmCodes - Array de códigos NCM
 * @param organizationId - ID da organização
 * @returns Map de NCM -> Categorização
 */
export async function batchGetNCMCategorization(
  ncmCodes: string[],
  organizationId: number
): Promise<Map<string, NCMCategorization>> {
  const result = new Map<string, NCMCategorization>();

  if (ncmCodes.length === 0) {
    return result;
  }

  try {
    // Buscar todas categorizações de uma vez
    const ncmList = ncmCodes.map((ncm) => `'${ncm}'`).join(",");

    const queryResult = await db.execute(sql`
      SELECT 
        ncm.ncm_code AS ncmCode,
        ncm.financial_category_id AS categoryId,
        fc.name AS categoryName,
        ncm.chart_account_id AS chartAccountId,
        coa.code AS chartAccountCode,
        coa.name AS chartAccountName,
        ncm.description
      FROM ncm_financial_categories ncm
      LEFT JOIN financial_categories fc ON fc.id = ncm.financial_category_id
      LEFT JOIN chart_of_accounts coa ON coa.id = ncm.chart_account_id
      WHERE ncm.organization_id = ${organizationId}
        AND ncm.ncm_code IN (${sql.raw(ncmList)})
        AND ncm.is_active = 1
        AND ncm.deleted_at IS NULL
    `);

    const rows = getDbRows<NcmRow & { ncmCode: string }>(queryResult as unknown as DbExecuteResult<NcmRow & { ncmCode: string }>);
    for (const row of rows) {
      result.set(row.ncmCode, {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        chartAccountId: row.chartAccountId,
        chartAccountCode: row.chartAccountCode,
        chartAccountName: row.chartAccountName,
        description: row.description,
      });
    }

    return result;
  } catch (error: unknown) {
    console.error("❌ Erro ao buscar categorizações em batch:", error);
    return result;
  }
}

/**
 * Busca categorização com fallback para categoria genérica
 * 
 * @param ncmCode - Código NCM
 * @param organizationId - ID da organização
 * @returns Categorização encontrada ou categoria "Outros"
 */
export async function getNCMCategorizationWithFallback(
  ncmCode: string,
  organizationId: number
): Promise<NCMCategorization> {
  // Tenta buscar categorização específica
  const categorization = await getNCMCategorization(ncmCode, organizationId);

  if (categorization) {
    return categorization;
  }

  // Fallback: busca categoria "Outros"
  try {
    const fallbackResult = await db.execute(sql`
      SELECT 
        fc.id AS categoryId,
        fc.name AS categoryName
      FROM financial_categories fc
      WHERE fc.organization_id = ${organizationId}
        AND (fc.name LIKE '%Outros%' OR fc.name LIKE '%Diversos%')
        AND fc.deleted_at IS NULL
      ORDER BY fc.id ASC
    `);

    const fallbackRows = getDbRows<FallbackCategoryRow>(fallbackResult as unknown as DbExecuteResult<FallbackCategoryRow>);
    if (fallbackRows.length > 0) {
      const row = fallbackRows[0];
      return {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        chartAccountId: null,
        chartAccountCode: null,
        chartAccountName: null,
        description: `NCM ${ncmCode} (sem categorização específica)`,
      };
    }
  } catch (error: unknown) {
    console.error("❌ Erro ao buscar categoria fallback:", error);
  }

  // Fallback final: retorna nulo
  return {
    categoryId: null,
    categoryName: null,
    chartAccountId: null,
    chartAccountCode: null,
    chartAccountName: null,
    description: `NCM ${ncmCode} (não categorizado)`,
  };
}














