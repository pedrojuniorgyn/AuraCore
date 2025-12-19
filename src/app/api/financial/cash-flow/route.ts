import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountsReceivable, accountsPayable } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";

export async function GET() {
  try {
    const ctx = await getTenantContext();
    const today = new Date();
    const days90 = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

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
          lte(accountsReceivable.dueDate, days90)
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
          lte(accountsPayable.dueDate, days90)
        )
      )
      .groupBy(accountsPayable.dueDate);

    return NextResponse.json({
      success: true,
      data: { income, expenses },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



















