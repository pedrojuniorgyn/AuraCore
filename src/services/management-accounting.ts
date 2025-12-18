/**
 * 📊 MANAGEMENT ACCOUNTING SERVICE
 * Serviço de Contabilidade Gerencial
 * 
 * Funcionalidades:
 * - Sincronização PCC → PCG
 * - Alocação de custos indiretos
 * - Cálculo DRE Gerencial
 * - Rateio por Km/Receita
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface DREGerencialData {
  accountCode: string;
  accountName: string;
  currentMonth: number;
  lastMonth: number;
  variance: number;
  ytd: number;
  trend: number[];
}

export interface AllocationRule {
  accountId: bigint;
  rule: 'KM_DRIVEN' | 'REVENUE_BASED' | 'FIXED' | 'MANUAL';
  base: 'TOTAL_KM' | 'GROSS_REVENUE' | 'HEADCOUNT';
}

/**
 * Sincroniza lançamento contábil (PCC) para gerencial (PCG)
 */
export async function syncPCCToPCG(
  legalJournalEntryId: bigint,
  organizationId: bigint
): Promise<boolean> {
  try {
    // 1. Buscar lançamento legal
    const legalEntryResult = await db.execute(sql`
      SELECT * FROM journal_entries WHERE id = ${legalJournalEntryId}
    `);

    if (!legalEntryResult[0]) {
      throw new Error("Lançamento contábil não encontrado");
    }

    const legalEntry = legalEntryResult[0];

    // 2. Buscar linhas do lançamento
    const linesResult = await db.execute(sql`
      SELECT 
        jel.*,
        ca.code as account_code,
        am.management_account_id,
        am.transformation_rule
      FROM journal_entry_lines jel
      INNER JOIN chart_of_accounts ca ON ca.id = jel.chart_account_id
      LEFT JOIN account_mapping am ON am.legal_account_id = ca.id AND am.is_active = 1
      WHERE jel.journal_entry_id = ${legalJournalEntryId}
    `);

    // 3. Criar lançamento gerencial
    const mgmtEntryResult = await db.execute(sql`
      INSERT INTO management_journal_entries (
        organization_id,
        branch_id,
        entry_number,
        entry_date,
        source_type,
        source_id,
        linked_legal_entry_id,
        description,
        total_debit,
        total_credit,
        status,
        created_by,
        updated_by
      )
      OUTPUT INSERTED.id
      VALUES (
        ${organizationId},
        ${legalEntry.branch_id},
        'MG-' + ${legalEntry.entry_number},
        ${legalEntry.entry_date},
        'SYNC',
        ${legalEntry.source_id || null},
        ${legalJournalEntryId},
        ${legalEntry.description},
        ${legalEntry.total_debit},
        ${legalEntry.total_credit},
        'POSTED',
        'system',
        'system'
      )
    `);

    const mgmtEntryId = mgmtEntryResult[0]?.id;

    if (!mgmtEntryId) {
      throw new Error("Falha ao criar lançamento gerencial");
    }

    // 4. Criar linhas gerenciais
    let lineNumber = 1;
    for (const line of (linesResult.recordset || [])) {
      if (!line.management_account_id) {
        console.warn(`⚠️ Conta ${line.account_code} não mapeada para PCG`);
        continue;
      }

      // Aplicar regra de transformação (se houver)
      let debitAmount = parseFloat(line.debit_amount || "0");
      let creditAmount = parseFloat(line.credit_amount || "0");

      if (line.transformation_rule) {
        const rule = JSON.parse(line.transformation_rule);
        if (rule.multiply) {
          debitAmount *= rule.multiply;
          creditAmount *= rule.multiply;
        }
      }

      await db.execute(sql`
        INSERT INTO management_journal_entry_lines (
          management_journal_entry_id,
          organization_id,
          line_number,
          management_account_id,
          debit_amount,
          credit_amount,
          cost_center_id,
          description
        )
        VALUES (
          ${mgmtEntryId},
          ${organizationId},
          ${lineNumber},
          ${line.management_account_id},
          ${debitAmount},
          ${creditAmount},
          ${line.cost_center_id || null},
          ${line.description}
        )
      `);

      lineNumber++;
    }

    console.log(`✅ Lançamento sincronizado: ${legalEntry.entry_number} → MG-${legalEntry.entry_number}`);
    return true;
  } catch (error) {
    console.error("❌ Erro ao sincronizar PCC→PCG:", error);
    return false;
  }
}

/**
 * Aloca custos indiretos para centros de custo
 */
export async function allocateIndirectCosts(
  period: string, // YYYY-MM
  organizationId: bigint
): Promise<{ allocated: number; totalAmount: number }> {
  try {
    const [year, month] = period.split('-');

    // 1. Buscar contas gerenciais com regra de alocação
    const accountsResult = await db.execute(sql`
      SELECT 
        id,
        code,
        name,
        allocation_rule,
        allocation_base
      FROM management_chart_of_accounts
      WHERE organization_id = ${organizationId}
        AND allocation_rule IS NOT NULL
        AND allocation_rule != 'MANUAL'
        AND deleted_at IS NULL
    `);

    let allocated = 0;
    let totalAmount = 0;

    for (const account of (accountsResult.recordset || [])) {
      // 2. Buscar saldo da conta no período
      const balanceResult = await db.execute(sql`
        SELECT 
          SUM(debit_amount) as total_debit,
          SUM(credit_amount) as total_credit
        FROM management_journal_entry_lines mjel
        INNER JOIN management_journal_entries mje ON mje.id = mjel.management_journal_entry_id
        WHERE mjel.management_account_id = ${account.id}
          AND YEAR(mje.entry_date) = ${year}
          AND MONTH(mje.entry_date) = ${month}
      `);

      const totalDebit = parseFloat(balanceResult[0]?.total_debit || "0");
      const totalCredit = parseFloat(balanceResult[0]?.total_credit || "0");
      const balance = totalDebit - totalCredit;

      if (balance <= 0) continue;

      totalAmount += balance;

      // 3. Calcular base de alocação
      let allocationBase = 0;

      if (account.allocation_rule === 'KM_DRIVEN') {
        // Base: Total de KM rodados no período
        const kmResult = await db.execute(sql`
          SELECT SUM(distance_km) as total_km
          FROM cargo_documents
          WHERE organization_id = ${organizationId}
            AND YEAR(issue_date) = ${year}
            AND MONTH(issue_date) = ${month}
            AND deleted_at IS NULL
        `);
        allocationBase = parseFloat(kmResult[0]?.total_km || "1");
      } else if (account.allocation_rule === 'REVENUE_BASED') {
        // Base: Receita bruta do período
        const revenueResult = await db.execute(sql`
          SELECT SUM(total_amount) as total_revenue
          FROM cargo_documents
          WHERE organization_id = ${organizationId}
            AND YEAR(issue_date) = ${year}
            AND MONTH(issue_date) = ${month}
            AND deleted_at IS NULL
        `);
        allocationBase = parseFloat(revenueResult[0]?.total_revenue || "1");
      }

      // 4. Buscar centros de custo ativos
      const costCentersResult = await db.execute(sql`
        SELECT id, code, name
        FROM financial_cost_centers
        WHERE organization_id = ${organizationId}
          AND is_analytical = 1
          AND status = 'ACTIVE'
          AND deleted_at IS NULL
      `);

      // 5. Alocar proporcionalmente
      for (const cc of (costCentersResult.recordset || [])) {
        // Calcular proporção do CC
        let ccProportion = 0;

        if (account.allocation_rule === 'KM_DRIVEN') {
          const ccKmResult = await db.execute(sql`
            SELECT SUM(cd.distance_km) as cc_km
            FROM cargo_documents cd
            WHERE cd.organization_id = ${organizationId}
              AND YEAR(cd.issue_date) = ${year}
              AND MONTH(cd.issue_date) = ${month}
              AND EXISTS (
                SELECT 1 FROM journal_entry_lines jel
                WHERE jel.cost_center_id = ${cc.id}
              )
          `);
          const ccKm = parseFloat(ccKmResult[0]?.cc_km || "0");
          ccProportion = allocationBase > 0 ? ccKm / allocationBase : 0;
        } else if (account.allocation_rule === 'REVENUE_BASED') {
          const ccRevenueResult = await db.execute(sql`
            SELECT SUM(cd.total_amount) as cc_revenue
            FROM cargo_documents cd
            WHERE cd.organization_id = ${organizationId}
              AND YEAR(cd.issue_date) = ${year}
              AND MONTH(cd.issue_date) = ${month}
          `);
          const ccRevenue = parseFloat(ccRevenueResult[0]?.cc_revenue || "0");
          ccProportion = allocationBase > 0 ? ccRevenue / allocationBase : 0;
        }

        const allocatedAmount = balance * ccProportion;

        if (allocatedAmount > 0) {
          // Criar lançamento de alocação
          await db.execute(sql`
            INSERT INTO management_journal_entries (
              organization_id,
              branch_id,
              entry_number,
              entry_date,
              source_type,
              description,
              total_debit,
              total_credit,
              status,
              created_by,
              updated_by
            )
            VALUES (
              ${organizationId},
              1,
              'ALLOC-' + FORMAT(GETDATE(), 'yyyyMMddHHmmss'),
              EOMONTH(DATEFROMPARTS(${year}, ${month}, 1)),
              'ALLOCATION',
              'Alocação ${account.name} → ${cc.name}',
              ${allocatedAmount},
              ${allocatedAmount},
              'POSTED',
              'system',
              'system'
            )
          `);

          allocated++;
        }
      }
    }

    return { allocated, totalAmount };
  } catch (error) {
    console.error("❌ Erro ao alocar custos indiretos:", error);
    return { allocated: 0, totalAmount: 0 };
  }
}

/**
 * Calcula DRE Gerencial
 */
export async function calculateManagementDRE(
  period: string, // YYYY-MM
  organizationId: bigint,
  branchId?: number,
  serviceType?: string
): Promise<DREGerencialData[]> {
  try {
    const [year, month] = period.split('-');
    const lastYear = month === '01' ? (parseInt(year) - 1).toString() : year;
    const lastMonth = month === '01' ? '12' : (parseInt(month) - 1).toString().padStart(2, '0');

    // Query DRE com filtros
    let whereClause = sql`
      WHERE mje.organization_id = ${organizationId}
        AND YEAR(mje.entry_date) = ${year}
        AND MONTH(mje.entry_date) = ${month}
    `;

    if (branchId) {
      whereClause = sql`${whereClause} AND mje.branch_id = ${branchId}`;
    }

    const result = await db.execute(sql`
      SELECT 
        mca.code as account_code,
        mca.name as account_name,
        SUM(CASE 
          WHEN YEAR(mje.entry_date) = ${year} AND MONTH(mje.entry_date) = ${month}
          THEN mjel.debit_amount - mjel.credit_amount
          ELSE 0
        END) as current_month,
        SUM(CASE 
          WHEN YEAR(mje.entry_date) = ${lastYear} AND MONTH(mje.entry_date) = ${lastMonth}
          THEN mjel.debit_amount - mjel.credit_amount
          ELSE 0
        END) as last_month,
        SUM(CASE 
          WHEN YEAR(mje.entry_date) = ${year}
          THEN mjel.debit_amount - mjel.credit_amount
          ELSE 0
        END) as ytd
      FROM management_chart_of_accounts mca
      LEFT JOIN management_journal_entry_lines mjel ON mjel.management_account_id = mca.id
      LEFT JOIN management_journal_entries mje ON mje.id = mjel.management_journal_entry_id
      ${whereClause}
      GROUP BY mca.code, mca.name
      ORDER BY mca.code
    `);

    return (result.recordset || []).map((row: any) => {
      const currentMonth = parseFloat(row.current_month || "0");
      const lastMonth = parseFloat(row.last_month || "0");
      const variance = lastMonth !== 0 ? ((currentMonth - lastMonth) / Math.abs(lastMonth)) * 100 : 0;

      return {
        accountCode: row.account_code,
        accountName: row.account_name,
        currentMonth,
        lastMonth,
        variance,
        ytd: parseFloat(row.ytd || "0"),
        trend: [], // Será preenchido no frontend
      };
    });
  } catch (error) {
    console.error("❌ Erro ao calcular DRE Gerencial:", error);
    return [];
  }
}















