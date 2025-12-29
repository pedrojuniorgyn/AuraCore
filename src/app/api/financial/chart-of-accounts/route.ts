import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chartOfAccounts } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/financial/chart-of-accounts
 * Lista plano de contas
 */
export async function GET(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // REVENUE, EXPENSE, ASSET, LIABILITY, EQUITY
    const analytical = searchParams.get("analytical"); // true/false

    let conditions = [eq(chartOfAccounts.organizationId, ctx.organizationId)];

    if (type) {
      conditions.push(eq(chartOfAccounts.type, type));
    }

    if (analytical === "true") {
      conditions.push(eq(chartOfAccounts.isAnalytical, "true"));
    }

    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(and(...conditions))
      .orderBy(chartOfAccounts.code);

    return NextResponse.json(accounts);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Erro ao buscar plano de contas:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

























