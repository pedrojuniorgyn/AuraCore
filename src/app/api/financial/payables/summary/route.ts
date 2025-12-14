import { NextRequest, NextResponse } from "next/server";
import { db, ensureConnection } from "@/lib/db";
import { accountsPayable } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, sql } from "drizzle-orm";

/**
 * GET /api/financial/payables/summary
 * 
 * Retorna resumo financeiro (KPIs) das contas a pagar
 */
export async function GET(request: NextRequest) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();

    // Total em aberto
    const [totalOpen] = await db
      .select({
        total: sql<number>`CAST(SUM(CAST(${accountsPayable.amount} AS DECIMAL(18,2)) - CAST(${accountsPayable.amountPaid} AS DECIMAL(18,2))) AS DECIMAL(18,2))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.organizationId, ctx.organizationId),
          eq(accountsPayable.status, "OPEN"),
          isNull(accountsPayable.deletedAt)
        )
      );

    // Total vencido (overdue)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOverdue] = await db
      .select({
        total: sql<number>`CAST(SUM(CAST(${accountsPayable.amount} AS DECIMAL(18,2)) - CAST(${accountsPayable.amountPaid} AS DECIMAL(18,2))) AS DECIMAL(18,2))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.organizationId, ctx.organizationId),
          eq(accountsPayable.status, "OPEN"),
          sql`${accountsPayable.dueDate} < ${today}`,
          isNull(accountsPayable.deletedAt)
        )
      );

    // Total pago (este mês)
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [totalPaid] = await db
      .select({
        total: sql<number>`CAST(SUM(CAST(${accountsPayable.amountPaid} AS DECIMAL(18,2))) AS DECIMAL(18,2))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.organizationId, ctx.organizationId),
          eq(accountsPayable.status, "PAID"),
          sql`${accountsPayable.payDate} >= ${firstDayOfMonth}`,
          sql`${accountsPayable.payDate} <= ${lastDayOfMonth}`,
          isNull(accountsPayable.deletedAt)
        )
      );

    return NextResponse.json({
      totalOpen: totalOpen?.total || 0,
      countOpen: totalOpen?.count || 0,
      totalOverdue: totalOverdue?.total || 0,
      countOverdue: totalOverdue?.count || 0,
      totalPaidThisMonth: totalPaid?.total || 0,
      countPaidThisMonth: totalPaid?.count || 0,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao buscar resumo:", error);
    return NextResponse.json(
      { error: "Falha ao buscar resumo", details: error.message },
      { status: 500 }
    );
  }
}

















