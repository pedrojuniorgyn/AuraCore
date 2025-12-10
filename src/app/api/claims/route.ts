import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || "1";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = (page - 1) * limit;

    const claims = await db.execute(sql`
      SELECT 
        id, claim_number as number, claim_date as date, claim_type as type,
        vehicle_id, estimated_damage, insurance_coverage as coverage,
        franchise_amount as franchise, claim_status as status
      FROM claims_management
      WHERE organization_id = ${organizationId}
      ORDER BY claim_date DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM claims_management WHERE organization_id = ${organizationId}
    `);
    const total = countResult.recordset?.[0]?.total || countResult[0]?.total || 0;

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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId = 1, claimType, vehicleId, estimatedDamage, description } = body;

    const claimNumber = `SIN-${Date.now().toString().slice(-6)}`;

    await db.execute(sql`
      INSERT INTO claims_management 
        (organization_id, claim_number, claim_date, claim_type, vehicle_id, estimated_damage, claim_status, notes)
      VALUES 
        (${organizationId}, ${claimNumber}, GETDATE(), ${claimType}, ${vehicleId}, ${estimatedDamage}, 'OPENED', ${description})
    `);

    return NextResponse.json({ 
      success: true, 
      message: "Sinistro registrado",
      claimNumber 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

