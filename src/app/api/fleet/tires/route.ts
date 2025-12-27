import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tires, tireMovements } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull } from "drizzle-orm";

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
      .insert(tires)
      .values({
        ...safeBody,
        organizationId: ctx.organizationId,
        purchaseDate: (safeBody as any)?.purchaseDate
          ? new Date((safeBody as any).purchaseDate as any)
          : null,
        status: "STOCK",
      })
      .$returningId();

    const tireId = (createdId as any)?.id;
    const [tire] = tireId
      ? await db
          .select()
          .from(tires)
          .where(and(eq(tires.id, Number(tireId)), eq(tires.organizationId, ctx.organizationId), isNull(tires.deletedAt)))
          .limit(1)
      : [];

    return NextResponse.json({ success: true, data: tire });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
















