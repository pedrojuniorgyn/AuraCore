import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fuelTransactions } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, desc, isNull } from "drizzle-orm";
import { insertWithReturningId } from "@/lib/db/query-helpers";

export async function GET() {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    // E9.3: REPO-005 + REPO-006 - Multi-tenancy completo + soft delete
    const transactions = await db
      .select()
      .from(fuelTransactions)
      .where(
        and(
          eq(fuelTransactions.organizationId, ctx.organizationId),
          eq(fuelTransactions.branchId, ctx.branchId), // REPO-005: branchId obrigatório
          isNull(fuelTransactions.deletedAt) // REPO-006: soft delete
        )
      )
      .orderBy(fuelTransactions.transactionDate);

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
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

    // Drizzle MSSQL: $returningId pode não estar tipado; use helper tipado.
    const transactionDateRaw = safeBody.transactionDate;
    const transactionDate = transactionDateRaw ? new Date(String(transactionDateRaw)) : new Date();
    
    // Tipo inferido para insert de fuel transactions
    type FuelTransactionInsert = typeof fuelTransactions.$inferInsert;
    
    // E9.3: REPO-005 - branchId obrigatório no insert
    const insertData: FuelTransactionInsert = {
      ...safeBody as Partial<FuelTransactionInsert>,
      organizationId: ctx.organizationId,
      branchId: ctx.branchId, // REPO-005: branchId obrigatório
      transactionDate,
      vehicleId: Number(safeBody.vehicleId),
      totalValue: String(safeBody.totalValue || '0'),
      liters: String(safeBody.liters || '0'),
    };
    
    const inserted = await insertWithReturningId(
      db.insert(fuelTransactions).values(insertData)
    );

    const insertedId = Number(inserted[0]?.id);
    if (!Number.isFinite(insertedId) || insertedId <= 0) {
      return NextResponse.json({ error: "Falha ao criar abastecimento (id não retornado)." }, { status: 500 });
    }

    const [transaction] = await db
      .select()
      .from(fuelTransactions)
      .where(and(eq(fuelTransactions.organizationId, ctx.organizationId), eq(fuelTransactions.id, insertedId)))
      .orderBy(desc(fuelTransactions.id));

    return NextResponse.json({ success: true, data: transaction });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
















