import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { withDI } from '@/shared/infrastructure/di/with-di';

export const GET = withDI(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || "1";

    const assets = await db.execute(sql`
      SELECT 
        cc.id,
        v.license_plate as plate,
        CONVERT(VARCHAR, cc.purchase_date, 103) as purchase,
        cc.purchase_amount as value,
        cc.icms_total_credit as icms,
        CONCAT(cc.installments_appropriated, '/', cc.total_installments) as installments,
        cc.total_appropriated as appropriated,
        cc.balance_to_appropriate as balance,
        'Jan' as next
      FROM ciap_control cc
      LEFT JOIN vehicles v ON cc.asset_id = v.id
      WHERE cc.organization_id = ${organizationId}
        AND cc.status = 'ACTIVE'
      ORDER BY cc.purchase_date
    `);

    return NextResponse.json({
      success: true,
      data: assets.recordset || assets
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
});

export const POST = withDI(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { organizationId = 1, assetId, purchaseAmount, icmsRate } = body;

    const icmsTotal = purchaseAmount * (icmsRate / 100);
    const monthlyInstallment = icmsTotal / 48;

    await db.execute(sql`
      INSERT INTO ciap_control 
        (organization_id, asset_id, purchase_date, purchase_amount, icms_rate, icms_total_credit, 
         monthly_installment, appropriation_start_date, balance_to_appropriate, status)
      VALUES 
        (${organizationId}, ${assetId}, GETDATE(), ${purchaseAmount}, ${icmsRate}, ${icmsTotal}, 
         ${monthlyInstallment}, GETDATE(), ${icmsTotal}, 'ACTIVE')
    `);

    return NextResponse.json({ 
      success: true, 
      message: "Ativo CIAP registrado"
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
});






























