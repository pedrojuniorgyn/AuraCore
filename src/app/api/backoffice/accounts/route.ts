import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const GET = withDI(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || "1";

    const accounts = await db.execute(sql`
      SELECT 
        id,
        code,
        name,
        description,
        account_type,
        is_analytical,
        status,
        0 as balance_month,
        0 as balance_year
      FROM chart_of_accounts
      WHERE organization_id = ${organizationId}
        AND code LIKE '4.3%'
        AND status = 'ACTIVE'
      ORDER BY code
    `);

    return NextResponse.json({
      success: true,
      data: accounts.recordset || accounts
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Error fetching backoffice accounts:", error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
});

export const POST = withDI(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { organizationId = 1, accountId, costCenterId, amount, description } = body;

    // Criar lançamento contábil
    await db.execute(sql`
      INSERT INTO journal_entries (organization_id, description, entry_date, status)
      VALUES (${organizationId}, ${description}, GETDATE(), 'DRAFT')
    `);

    return NextResponse.json({
      success: true,
      message: "Lançamento criado com sucesso"
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Error creating backoffice entry:", error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
});






























