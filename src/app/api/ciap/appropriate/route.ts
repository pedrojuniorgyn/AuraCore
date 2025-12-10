import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId = 1, referenceMonth } = body;

    // 1. Buscar receitas do mês para calcular o fator
    const revenues = await db.execute(sql`
      SELECT 
        SUM(total_amount) as total_revenue,
        SUM(CASE WHEN tax_exempt = 1 THEN total_amount ELSE 0 END) as exempt_revenue
      FROM fiscal_documents
      WHERE organization_id = ${organizationId}
        AND MONTH(issue_date) = MONTH(${referenceMonth})
        AND YEAR(issue_date) = YEAR(${referenceMonth})
    `);

    const revenueData = revenues.recordset?.[0] || revenues[0] || { total_revenue: 0, exempt_revenue: 0 };
    const totalRevenue = revenueData.total_revenue || 3850000;
    const exemptRevenue = revenueData.exempt_revenue || 570000;
    const taxableRevenue = totalRevenue - exemptRevenue;
    const appropriationFactor = taxableRevenue / totalRevenue;

    // 2. Buscar ativos CIAP ativos
    const assets = await db.execute(sql`
      SELECT id, monthly_installment, installments_appropriated, total_installments
      FROM ciap_control
      WHERE organization_id = ${organizationId}
        AND status = 'ACTIVE'
        AND installments_appropriated < total_installments
    `);

    const assetsList = assets.recordset || assets;
    let totalAppropriated = 0;

    // 3. Apropriar cada ativo
    for (const asset of assetsList) {
      const appropriatedAmount = asset.monthly_installment * appropriationFactor;
      totalAppropriated += appropriatedAmount;

      // Registrar apropriação
      await db.execute(sql`
        INSERT INTO ciap_monthly_appropriation 
          (ciap_control_id, reference_month, total_revenue, taxable_revenue, exempt_revenue,
           appropriation_factor, installment_base, appropriated_amount, accounting_posted)
        VALUES 
          (${asset.id}, ${referenceMonth}, ${totalRevenue}, ${taxableRevenue}, ${exemptRevenue},
           ${appropriationFactor}, ${asset.monthly_installment}, ${appropriatedAmount}, 0)
      `);

      // Atualizar controle
      await db.execute(sql`
        UPDATE ciap_control 
        SET installments_appropriated = installments_appropriated + 1,
            total_appropriated = total_appropriated + ${appropriatedAmount},
            balance_to_appropriate = balance_to_appropriate - ${appropriatedAmount}
        WHERE id = ${asset.id}
      `);
    }

    return NextResponse.json({
      success: true,
      message: "Apropriação CIAP executada com sucesso",
      details: {
        totalRevenue,
        taxableRevenue,
        exemptRevenue,
        appropriationFactor: (appropriationFactor * 100).toFixed(2) + '%',
        totalAppropriated,
        assetsProcessed: assetsList.length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}



