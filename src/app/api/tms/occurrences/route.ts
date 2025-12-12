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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();

    const [occurrence] = await db.insert(tripOccurrences).values({
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      ...body,
      createdBy: ctx.userId,
      version: 1,
    }).returning();

    return NextResponse.json({ success: true, data: occurrence });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}











