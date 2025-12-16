import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tripOccurrences } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const occurrences = await db
      .select()
      .from(tripOccurrences)
      .where(and(
        eq(tripOccurrences.organizationId, ctx.organizationId),
        isNull(tripOccurrences.deletedAt)
      ))
      .orderBy(desc(tripOccurrences.createdAt));

    return NextResponse.json({ data: occurrences });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
      .insert(tripOccurrences)
      .values({
        ...safeBody,
        organizationId: ctx.organizationId,
        branchId: ctx.defaultBranchId ?? 1,
        createdBy: ctx.userId,
        version: 1,
      })
      .$returningId();

    const occurrenceId = (createdId as any)?.id;
    const [occurrence] = occurrenceId
      ? await db
          .select()
          .from(tripOccurrences)
          .where(and(eq(tripOccurrences.id, Number(occurrenceId)), eq(tripOccurrences.organizationId, ctx.organizationId)))
          .limit(1)
      : [];

    return NextResponse.json({ success: true, data: occurrence });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}















