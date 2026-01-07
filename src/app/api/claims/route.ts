import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ctx = await getTenantContext();
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = (page - 1) * limit;

    const claims = await db.execute(sql`
      SELECT 
        id, claim_number as number, claim_date as date, claim_type as type,
        vehicle_id, estimated_damage, insurance_coverage as coverage,
        franchise_amount as franchise, claim_status as status
      FROM claims_management
      WHERE organization_id = ${ctx.organizationId}
      ORDER BY claim_date DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM claims_management WHERE organization_id = ${ctx.organizationId}
    `);
    const total = (countResult.recordset?.[0]?.total || 
      (Array.isArray(countResult) ? countResult[0]?.total : undefined) || 0) as number;

    return NextResponse.json({
      success: true,
      data: claims.recordset || claims,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    const body = await request.json();
    const { claimType, vehicleId, estimatedDamage, description } = body;

    const claimNumber = `SIN-${Date.now().toString().slice(-6)}`;

    await db.execute(sql`
      INSERT INTO claims_management 
        (organization_id, claim_number, claim_date, claim_type, vehicle_id, estimated_damage, claim_status, notes)
      VALUES 
        (${ctx.organizationId}, ${claimNumber}, GETDATE(), ${claimType}, ${vehicleId}, ${estimatedDamage}, 'OPENED', ${description})
    `);

    return NextResponse.json({ 
      success: true, 
      message: "Sinistro registrado",
      claimNumber 
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

