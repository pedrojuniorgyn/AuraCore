import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || "1";

    const matrix = await db.execute(sql`
      SELECT 
        id,
        CONCAT(uf_origin, ' → ', uf_destination) as route,
        cargo_type as cargo,
        CASE WHEN is_icms_contributor = 1 THEN 'Sim' ELSE 'Não' END as contributor,
        cst_code as cst,
        icms_rate as icms,
        fcp_rate as fcp,
        CASE WHEN difal_applicable = 1 THEN 'Sim' ELSE 'Não' END as difal,
        legal_basis as legal
      FROM fiscal_tax_matrix
      WHERE organization_id = ${organizationId}
        AND is_active = 1
      ORDER BY uf_origin, uf_destination
    `);

    return NextResponse.json({
      success: true,
      data: matrix.recordset || matrix
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      organizationId = 1, 
      ufOrigin, 
      ufDestination, 
      cargoType = 'GERAL',
      isContributor = true,
      cstCode,
      icmsRate,
      fcpRate = 0
    } = body;

    await db.execute(sql`
      INSERT INTO fiscal_tax_matrix 
        (organization_id, uf_origin, uf_destination, cargo_type, is_icms_contributor, cst_code, icms_rate, fcp_rate, is_active)
      VALUES 
        (${organizationId}, ${ufOrigin}, ${ufDestination}, ${cargoType}, ${isContributor ? 1 : 0}, ${cstCode}, ${icmsRate}, ${fcpRate}, 1)
    `);

    return NextResponse.json({ 
      success: true, 
      message: "Regra fiscal criada"
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
