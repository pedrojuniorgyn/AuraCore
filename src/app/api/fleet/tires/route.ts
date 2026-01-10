import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tires, tireMovements } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull } from "drizzle-orm";
import { insertReturning, queryFirst } from "@/lib/db/query-helpers";

export async function GET() {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const allTires = await db
      .select()
      .from(tires)
      .where(
        and(
          eq(tires.organizationId, ctx.organizationId),
          isNull(tires.deletedAt)
        )
      )
      .orderBy(tires.createdAt);

    return NextResponse.json({ success: true, data: allTires });
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
      organizationId: _orgId,
      branchId: _branchId,
      createdBy: _createdBy,
      updatedBy: _updatedBy,
      deletedAt: _deletedAt,
      deletedBy: _deletedBy,
      version: _version,
      ...safeBody
    } = (body ?? {}) as Record<string, unknown>;

    // Type-safe access to purchaseDate
    interface TireBody {
      purchaseDate?: string | Date;
    }
    const typedBody = safeBody as unknown as TireBody;

    const tireData = {
      ...safeBody,
      organizationId: ctx.organizationId,
      purchaseDate: typedBody.purchaseDate
        ? new Date(typedBody.purchaseDate)
        : null,
      status: "STOCK",
    } as unknown as typeof tires.$inferInsert;

    const insertQuery = db
      .insert(tires)
      .values(tireData);

    const createdId = await insertReturning(insertQuery, { id: tires.id }) as Array<Record<string, unknown>>;
    const tireId = createdId[0]?.id;

    const tire = tireId
      ? await queryFirst<typeof tires.$inferSelect>(
          db
            .select()
            .from(tires)
            .where(and(eq(tires.id, Number(tireId)), eq(tires.organizationId, ctx.organizationId), isNull(tires.deletedAt)))
        )
      : null;

    return NextResponse.json({ success: true, data: tire });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
















