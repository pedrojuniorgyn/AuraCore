import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";

/**
 * GET /api/financial/chart-accounts/suggest-code?parentId=123
 * Sugere próximo código significativo baseado no pai
 */
export async function GET(req: Request) {
  try {
    const ctx = await getTenantContext();

    const { searchParams } = new URL(req.url);
    const parentIdParam = searchParams.get("parentId");
    const parentId = parentIdParam ? parseInt(parentIdParam) : null;

    let suggestedCode = "";

    if (parentId === null) {
      // Nível 0: buscar maior código sem ponto
      const result = await db.execute(sql`
        SELECT MAX(CAST(code AS INT)) as max_code
        FROM chart_of_accounts
        WHERE parent_id IS NULL
          AND deleted_at IS NULL
          AND organization_id = ${ctx.organizationId}
          AND code NOT LIKE '%.%'
          AND ISNUMERIC(code) = 1
      `);

      const maxCode = result[0]?.max_code || 0;
      suggestedCode = String(maxCode + 1);
    } else {
      // Com pai: buscar código do pai e último filho
      const parentResult = await db.execute(sql`
        SELECT code
        FROM chart_of_accounts
        WHERE id = ${parentId}
          AND organization_id = ${ctx.organizationId}
          AND deleted_at IS NULL
      `);

      if (!parentResult[0]) {
        return NextResponse.json(
          { error: "Conta pai não encontrada" },
          { status: 404 }
        );
      }

      const parentCode = parentResult[0].code;

      // Buscar último código filho
      const childrenResult = await db.execute(sql`
        SELECT MAX(code) as max_code
        FROM chart_of_accounts
        WHERE parent_id = ${parentId}
          AND deleted_at IS NULL
          AND organization_id = ${ctx.organizationId}
      `);

      const maxChildCode = childrenResult[0]?.max_code;

      if (!maxChildCode) {
        // Primeiro filho
        suggestedCode = `${parentCode}.01`;
      } else {
        // Extrair última parte e incrementar
        const parts = maxChildCode.split(".");
        const lastPart = parts[parts.length - 1];
        const lastNum = parseInt(lastPart) + 1;
        const paddedNum = String(lastNum).padStart(2, "0");
        suggestedCode = `${parentCode}.${paddedNum}`;
      }
    }

    return NextResponse.json({
      success: true,
      suggestedCode,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao sugerir código:", error);
    return NextResponse.json(
      { error: "Erro ao sugerir código" },
      { status: 500 }
    );
  }
}













