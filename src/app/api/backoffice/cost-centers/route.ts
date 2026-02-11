import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const GET = withDI(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || "1";

    const costCenters = await db.execute(sql`
      SELECT 
        id,
        code,
        name,
        description,
        type as department,
        '' as approver,
        0 as approval_limit,
        status
      FROM cost_centers
      WHERE organization_id = ${organizationId}
        AND code LIKE 'CC-9%'
        AND status = 'ACTIVE'
      ORDER BY code
    `);

    return NextResponse.json({
      success: true,
      data: costCenters.recordset || costCenters
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Error fetching cost centers:", error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
});






























