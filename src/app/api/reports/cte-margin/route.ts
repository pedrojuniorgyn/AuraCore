import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/reports/cte-margin?cteId=123
 * KPI: Margem de Contribuição por CTe
 * 
 * Fórmula:
 * Receita Líquida = Receita Bruta - Impostos
 * Custos Variáveis = Soma de custos vinculados ao CTe (por CC)
 * Margem de Contribuição = Receita Líquida - Custos Variáveis
 * % Margem = (Margem / Receita Líquida) * 100
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cteId = searchParams.get("cteId");

    if (!cteId) {
      return NextResponse.json(
        { error: "cteId é obrigatório" },
        { status: 400 }
      );
    }

    // 1. Buscar dados do CTe (fiscal_documents)
    const cteResult = await db.execute(sql`
      SELECT 
        document_number,
        gross_amount,
        tax_amount,
        net_amount,
        partner_name,
        issue_date
      FROM fiscal_documents
      WHERE id = ${cteId}
        AND organization_id = ${session.user.organizationId}
        AND deleted_at IS NULL
    `);

    const cteData = (cteResult.recordset || cteResult) as Array<Record<string, unknown>>;
    if (!cteData[0]) {
      return NextResponse.json(
        { error: "CTe não encontrado" },
        { status: 404 }
      );
    }

    const cte = cteData[0];

    // 2. Buscar custos variáveis vinculados ao CTe
    // Lógica: Soma de journal_entry_lines onde cost_center_id vincula ao CTe
    const costsResult = await db.execute(sql`
      SELECT 
        SUM(jel.debit_amount) as total_variable_costs
      FROM journal_entry_lines jel
      INNER JOIN financial_cost_centers cc ON cc.id = jel.cost_center_id
      WHERE cc.linked_object_type = 'CTE'
        AND cc.linked_object_id = ${cteId}
        AND cc.organization_id = ${session.user.organizationId}
        AND jel.deleted_at IS NULL
    `);

    const costsData = (costsResult.recordset || costsResult) as Array<Record<string, unknown>>;
    const totalVariableCosts = parseFloat((costsData[0]?.total_variable_costs as string) || "0");

    // 3. Calcular Margem de Contribuição
    const grossRevenue = parseFloat(cte.gross_amount || "0");
    const taxes = parseFloat(cte.tax_amount || "0");
    const netRevenue = parseFloat(cte.net_amount || "0");
    const variableCosts = totalVariableCosts;
    const contributionMargin = netRevenue - variableCosts;
    const marginPercent = netRevenue > 0 ? (contributionMargin / netRevenue) * 100 : 0;

    // 4. Detalhamento dos custos por conta
    const costDetailResult = await db.execute(sql`
      SELECT 
        ca.code,
        ca.name as account_name,
        SUM(jel.debit_amount) as amount
      FROM journal_entry_lines jel
      INNER JOIN financial_cost_centers cc ON cc.id = jel.cost_center_id
      INNER JOIN chart_of_accounts ca ON ca.id = jel.chart_account_id
      WHERE cc.linked_object_type = 'CTE'
        AND cc.linked_object_id = ${cteId}
        AND cc.organization_id = ${session.user.organizationId}
        AND jel.deleted_at IS NULL
      GROUP BY ca.code, ca.name
      ORDER BY amount DESC
    `);

    const costBreakdown = (costDetailResult.recordset || []).map((row: Record<string, unknown>) => ({
      accountCode: row.code,
      accountName: row.account_name,
      amount: parseFloat(row.amount || "0"),
    }));

    return NextResponse.json({
      success: true,
      data: {
        cteNumber: cte.document_number,
        partnerName: cte.partner_name,
        issueDate: cte.issue_date,
        financials: {
          grossRevenue,
          taxes,
          netRevenue,
          variableCosts,
          contributionMargin,
          marginPercent: parseFloat(marginPercent.toFixed(2)),
        },
        costBreakdown,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao calcular margem do CTe:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}





















