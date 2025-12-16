import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fuelTransactions } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const transactions = await db
      .select()
      .from(fuelTransactions)
      .where(eq(fuelTransactions.organizationId, ctx.organizationId))
      .orderBy(fuelTransactions.transactionDate);

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();

    // Evitar override de campos sensíveis via spread
    const {
      organizationId: _orgId,
      branchId: _branchId,
      createdBy: _createdBy,
      updatedBy: _updatedBy,
      deletedAt: _deletedAt,
      deletedBy: _deletedBy,
      version: _version,
      ...safeBody
    } = (body ?? {}) as Record<string, unknown>;

    const [createdId] = await db
      .insert(fuelTransactions)
      .values({
        ...safeBody,
        organizationId: ctx.organizationId,
        transactionDate: (safeBody as any)?.transactionDate
          ? new Date((safeBody as any).transactionDate as any)
          : new Date(),
      })
      .$returningId();

    const txId = (createdId as any)?.id;
    const [transaction] = txId
      ? await db
          .select()
          .from(fuelTransactions)
          .where(
            and(
              eq(fuelTransactions.id, Number(txId)),
              eq(fuelTransactions.organizationId, ctx.organizationId)
            )
          )
          .limit(1)
      : [];

    return NextResponse.json({ success: true, data: transaction });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
















