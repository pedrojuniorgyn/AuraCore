import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
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
  } catch (error: any) {
    console.error("Error fetching cost centers:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}



