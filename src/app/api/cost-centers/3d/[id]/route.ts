import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/cost-centers/3d/[id]
 * Busca um Centro de Custo 3D por ID
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const ccId = parseInt(id, 10);

    if (isNaN(ccId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const result = await db.execute(sql`
      SELECT 
        cc.*,
        b.name as branch_name
      FROM financial_cost_centers cc
      LEFT JOIN branches b ON b.id = cc.branch_id
      WHERE cc.id = ${ccId}
        AND cc.organization_id = ${session.user.organizationId}
        AND cc.deleted_at IS NULL
    `);

    const data = (result.recordset || result) as Array<Record<string, unknown>>;
    const row = data[0];

    if (!row) {
      return NextResponse.json(
        { error: "Centro de custo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: row,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao buscar CC 3D:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * PUT /api/cost-centers/3d/[id]
 * Atualiza um Centro de Custo 3D
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const ccId = parseInt(id, 10);

    if (isNaN(ccId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      branchId,
      serviceType,
      linkedObjectType,
      linkedObjectId,
      assetType,
      isAnalytical,
      status,
    } = body;

    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { error: "Nome deve ter no mínimo 3 caracteres" },
        { status: 400 }
      );
    }

    // Verificar se CC existe e pertence à organização
    const existing = await db.execute(sql`
      SELECT id FROM financial_cost_centers
      WHERE id = ${ccId}
        AND organization_id = ${session.user.organizationId}
        AND deleted_at IS NULL
    `);

    const existingData = (existing.recordset || existing) as Array<Record<string, unknown>>;
    if (existingData.length === 0) {
      return NextResponse.json(
        { error: "Centro de custo não encontrado" },
        { status: 404 }
      );
    }

    // Calcular nível baseado nas dimensões preenchidas
    const level = linkedObjectId ? 3 : (serviceType ? 2 : 1);

    await db.execute(sql`
      UPDATE financial_cost_centers
      SET 
        name = ${name.trim()},
        type = ${isAnalytical ? 'ANALYTIC' : 'SYNTHETIC'},
        branch_id = ${branchId || 1},
        service_type = ${serviceType || null},
        linked_object_type = ${linkedObjectType || null},
        linked_object_id = ${linkedObjectId || null},
        asset_type = ${assetType || null},
        is_analytical = ${isAnalytical ? 1 : 0},
        level = ${level},
        status = ${status || 'ACTIVE'},
        updated_by = ${session.user.email},
        updated_at = GETDATE(),
        version = version + 1
      WHERE id = ${ccId}
        AND organization_id = ${session.user.organizationId}
    `);

    return NextResponse.json({
      success: true,
      message: "Centro de custo atualizado com sucesso!",
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao atualizar CC 3D:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * DELETE /api/cost-centers/3d/[id]
 * Soft delete de um Centro de Custo 3D
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const ccId = parseInt(id, 10);

    if (isNaN(ccId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se CC existe
    const existing = await db.execute(sql`
      SELECT id FROM financial_cost_centers
      WHERE id = ${ccId}
        AND organization_id = ${session.user.organizationId}
        AND deleted_at IS NULL
    `);

    const existingData = (existing.recordset || existing) as Array<Record<string, unknown>>;
    if (existingData.length === 0) {
      return NextResponse.json(
        { error: "Centro de custo não encontrado" },
        { status: 404 }
      );
    }

    // Soft delete
    await db.execute(sql`
      UPDATE financial_cost_centers
      SET 
        deleted_at = GETDATE(),
        status = 'INACTIVE',
        updated_by = ${session.user.email},
        updated_at = GETDATE()
      WHERE id = ${ccId}
        AND organization_id = ${session.user.organizationId}
    `);

    return NextResponse.json({
      success: true,
      message: "Centro de custo excluído com sucesso!",
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao excluir CC 3D:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
