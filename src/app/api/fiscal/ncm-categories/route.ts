import { NextRequest, NextResponse } from "next/server";
import { withDI } from '@/shared/infrastructure/di/with-di';
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

import { logger } from '@/shared/infrastructure/logging';
/**
 * 📊 GET /api/fiscal/ncm-categories
 * 
 * Lista todas as categorizações de NCM
 */
export const GET = withDI(async (request: NextRequest) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const result = await db.execute(sql`
      SELECT 
        ncm.id,
        ncm.ncm_code AS ncmCode,
        ncm.financial_category_id AS financialCategoryId,
        fc.name AS financialCategoryName,
        ncm.chart_account_id AS chartAccountId,
        coa.code AS chartAccountCode,
        coa.name AS chartAccountName
      FROM ncm_financial_categories ncm
      LEFT JOIN financial_categories fc ON fc.id = ncm.financial_category_id
      LEFT JOIN chart_of_accounts coa ON coa.id = ncm.chart_account_id
      WHERE ncm.organization_id = ${session.user.organizationId}
        AND ncm.deleted_at IS NULL
      ORDER BY ncm.ncm_code ASC
    `);

    return NextResponse.json(result.recordset || []);
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao buscar NCM categories:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});

/**
 * 📝 POST /api/fiscal/ncm-categories
 * 
 * Cria nova categorização de NCM
 */
export const POST = withDI(async (request: NextRequest) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { ncmCode, financialCategoryId, chartAccountId } = body;

    await db.execute(sql`
      INSERT INTO ncm_financial_categories (
        organization_id,
        ncm_code,
        financial_category_id,
        chart_account_id,
        created_by,
        created_at
      ) VALUES (
        ${session.user.organizationId},
        ${ncmCode},
        ${financialCategoryId},
        ${chartAccountId},
        ${session.user.id},
        GETDATE()
      )
    `);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao criar NCM category:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});

