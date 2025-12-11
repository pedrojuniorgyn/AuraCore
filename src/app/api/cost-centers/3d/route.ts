import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * POST /api/cost-centers/3d
 * Cria Centro de Custo Tridimensional
 * 
 * D1: Filial (branch_id)
 * D2: Tipo de Serviço (service_type: FTL, LTL, ARMAZ)
 * D3: Objeto de Custo (linked_object: CTe, Viagem, Veículo)
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      code,
      name,
      branchId,
      serviceType,
      linkedObjectType,
      linkedObjectId,
      assetType,
      isAnalytical = true,
    } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: "code e name são obrigatórios" },
        { status: 400 }
      );
    }

    // Criar CC 3D
    const result = await db.execute(sql`
      INSERT INTO financial_cost_centers (
        organization_id,
        code,
        name,
        type,
        branch_id,
        service_type,
        linked_object_type,
        linked_object_id,
        asset_type,
        is_analytical,
        level,
        status,
        created_by,
        updated_by
      )
      OUTPUT INSERTED.id
      VALUES (
        ${session.user.organizationId},
        ${code},
        ${name},
        ${isAnalytical ? 'ANALYTIC' : 'SYNTHETIC'},
        ${branchId || 1},
        ${serviceType || null},
        ${linkedObjectType || null},
        ${linkedObjectId || null},
        ${assetType || null},
        ${isAnalytical ? 1 : 0},
        ${linkedObjectId ? 3 : (serviceType ? 2 : 1)},
        'ACTIVE',
        ${session.user.email},
        ${session.user.email}
      )
    `);

    const newId = result[0]?.id;

    return NextResponse.json({
      success: true,
      message: "Centro de Custo 3D criado com sucesso!",
      data: { id: newId },
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar CC 3D:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cost-centers/3d?serviceType=FTL&linkedObjectType=CTE
 * Busca CCs 3D com filtros
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const serviceType = searchParams.get("serviceType");
    const linkedObjectType = searchParams.get("linkedObjectType");
    const assetType = searchParams.get("assetType");

    let query = sql`
      SELECT 
        cc.*,
        b.name as branch_name
      FROM financial_cost_centers cc
      LEFT JOIN branches b ON b.id = cc.branch_id
      WHERE cc.organization_id = ${session.user.organizationId}
        AND cc.deleted_at IS NULL
    `;

    if (serviceType) {
      query = sql`${query} AND cc.service_type = ${serviceType}`;
    }

    if (linkedObjectType) {
      query = sql`${query} AND cc.linked_object_type = ${linkedObjectType}`;
    }

    if (assetType) {
      query = sql`${query} AND cc.asset_type = ${assetType}`;
    }

    query = sql`${query} ORDER BY cc.code`;

    const result = await db.execute(query);

    return NextResponse.json({
      success: true,
      data: result.recordset || [],
    });
  } catch (error: any) {
    console.error("❌ Erro ao buscar CCs 3D:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}







