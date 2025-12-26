import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * GET /api/management/chart-accounts
 * Lista contas gerenciais (PCG)
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const allocationRule = searchParams.get("allocationRule");

    let query = sql`
      SELECT 
        mca.*,
        ca.code as legal_account_code,
        ca.name as legal_account_name
      FROM management_chart_of_accounts mca
      LEFT JOIN chart_of_accounts ca ON ca.id = mca.legal_account_id
      WHERE mca.organization_id = ${session.user.organizationId}
        AND mca.deleted_at IS NULL
    `;

    if (type) {
      query = sql`${query} AND mca.type = ${type}`;
    }

    if (allocationRule) {
      query = sql`${query} AND mca.allocation_rule = ${allocationRule}`;
    }

    query = sql`${query} ORDER BY mca.code`;

    const result = await db.execute(query);

    return NextResponse.json({
      success: true,
      data: result.recordset || [],
    });
  } catch (error: any) {
    console.error("❌ Erro ao listar contas gerenciais:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/management/chart-accounts
 * Cria nova conta gerencial
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
      description,
      type,
      category,
      parentId,
      level,
      isAnalytical,
      legalAccountId,
      allocationRule,
      allocationBase,
      status = 'ACTIVE',
    } = body;

    if (!code || !name || !type) {
      return NextResponse.json(
        { error: "code, name e type são obrigatórios" },
        { status: 400 }
      );
    }

    const result = await db.execute(sql`
      INSERT INTO management_chart_of_accounts (
        organization_id,
        code,
        name,
        description,
        type,
        category,
        parent_id,
        level,
        is_analytical,
        legal_account_id,
        allocation_rule,
        allocation_base,
        status,
        created_by,
        updated_by
      )
      OUTPUT INSERTED.id
      VALUES (
        ${session.user.organizationId},
        ${code},
        ${name},
        ${description || null},
        ${type},
        ${category || null},
        ${parentId || null},
        ${level || 0},
        ${isAnalytical ? 1 : 0},
        ${legalAccountId || null},
        ${allocationRule || null},
        ${allocationBase || null},
        ${status},
        ${session.user.email},
        ${session.user.email}
      )
    `);

    return NextResponse.json({
      success: true,
      message: "Conta gerencial criada com sucesso!",
      data: { id: result[0]?.id },
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar conta gerencial:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


















