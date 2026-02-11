import { NextRequest, NextResponse } from "next/server";
import { withDI } from "@/shared/infrastructure/di/with-di";
import { db } from "@/lib/db";
import { accountsReceivable, accountsPayable } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";

export const GET = withDI(async (req: NextRequest) => {
  try {
    const ctx = await getTenantContext();
    const today = new Date();
    const url = new URL(req.url);
    const monthsAheadRaw = url.searchParams.get("monthsAhead");
    const monthsAhead = monthsAheadRaw ? Number(monthsAheadRaw) : 3;
    const monthsAheadSafe = Number.isFinite(monthsAhead) ? Math.max(1, Math.min(60, Math.trunc(monthsAhead))) : 3;

    const horizonEnd = new Date(today);
    horizonEnd.setMonth(horizonEnd.getMonth() + monthsAheadSafe);

    // Entradas
    const income = await db
      .select({
        date: accountsReceivable.dueDate,
        amount: sql<number>`CAST(SUM(CAST(${accountsReceivable.amount} AS DECIMAL(18,2))) AS DECIMAL(18,2))`,
      })
      .from(accountsReceivable)
      .where(
        and(
          eq(accountsReceivable.organizationId, ctx.organizationId),
          inArray(accountsReceivable.status, ["OPEN", "PARTIALLY_PAID"]),
          gte(accountsReceivable.dueDate, today),
          lte(accountsReceivable.dueDate, horizonEnd)
        )
      )
      .groupBy(accountsReceivable.dueDate);

    // Saídas
    const expenses = await db
      .select({
        date: accountsPayable.dueDate,
        amount: sql<number>`CAST(SUM(CAST(${accountsPayable.amount} AS DECIMAL(18,2))) AS DECIMAL(18,2))`,
      })
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.organizationId, ctx.organizationId),
          inArray(accountsPayable.status, ["OPEN", "PARTIALLY_PAID"]),
          gte(accountsPayable.dueDate, today),
          lte(accountsPayable.dueDate, horizonEnd)
        )
      )
      .groupBy(accountsPayable.dueDate);

    return NextResponse.json({
      success: true,
      data: { income, expenses, meta: { monthsAhead: monthsAheadSafe } },
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});



















