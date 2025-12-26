import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/management/chart-accounts/[id]
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const result = await db.execute(sql`
      SELECT 
        mca.*,
        ca.code as legal_account_code,
        ca.name as legal_account_name
      FROM management_chart_of_accounts mca
      LEFT JOIN chart_of_accounts ca ON ca.id = mca.legal_account_id
      WHERE mca.id = ${id}
        AND mca.organization_id = ${session.user.organizationId}
        AND mca.deleted_at IS NULL
    `);

    if (!result[0]) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    console.error("❌ Erro ao buscar conta gerencial:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/management/chart-accounts/[id]
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
    const body = await req.json();

    await db.execute(sql`
      UPDATE management_chart_of_accounts
      SET 
        name = ${body.name},
        description = ${body.description || null},
        type = ${body.type},
        category = ${body.category || null},
        legal_account_id = ${body.legalAccountId || null},
        allocation_rule = ${body.allocationRule || null},
        allocation_base = ${body.allocationBase || null},
        status = ${body.status},
        updated_by = ${session.user.email},
        updated_at = GETDATE(),
        version = version + 1
      WHERE id = ${id}
        AND organization_id = ${session.user.organizationId}
    `);

    return NextResponse.json({
      success: true,
      message: "Conta atualizada com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Erro ao atualizar conta gerencial:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/management/chart-accounts/[id]
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Soft delete
    await db.execute(sql`
      UPDATE management_chart_of_accounts
      SET deleted_at = GETDATE()
      WHERE id = ${id}
        AND organization_id = ${session.user.organizationId}
    `);

    return NextResponse.json({
      success: true,
      message: "Conta excluída com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Erro ao excluir conta gerencial:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


















