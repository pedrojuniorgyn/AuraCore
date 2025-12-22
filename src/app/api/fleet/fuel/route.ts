import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fuelTransactions } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, desc } from "drizzle-orm";

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
      id: _id,
      organizationId: _orgId,
      organization_id: _org_id,
      branchId: _branchId,
      branch_id: _branch_id,
      createdBy: _createdBy,
      created_by: _created_by,
      updatedBy: _updatedBy,
      updated_by: _updated_by,
      createdAt: _createdAt,
      created_at: _created_at,
      updatedAt: _updatedAt,
      updated_at: _updated_at,
      deletedAt: _deletedAt,
      deleted_at: _deleted_at,
      deletedBy: _deletedBy,
      deleted_by: _deleted_by,
      version: _version,
      ...safeBody
    } = (body ?? {}) as Record<string, unknown>;

    // Drizzle MSSQL: $returningId pode não estar tipado; use cast e requery robusto.
    await (db
      .insert(fuelTransactions)
      .values({
        ...safeBody,
        organizationId: ctx.organizationId,
        transactionDate: (safeBody as any)?.transactionDate
          ? new Date((safeBody as any).transactionDate as any)
          : new Date(),
      } as any) as any).$returningId();

    const [transaction] = await db
      .select()
      .from(fuelTransactions)
      .where(eq(fuelTransactions.organizationId, ctx.organizationId))
      .orderBy(desc(fuelTransactions.id));

    return NextResponse.json({ success: true, data: transaction });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
















