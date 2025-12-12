import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicleDocuments, driverDocuments } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, lte } from "drizzle-orm";

// GET - Lista documentos vencendo
export async function GET(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get("type"); // vehicle ou driver
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (type === "vehicle") {
      const docs = await db.select().from(vehicleDocuments)
        .where(and(
          eq(vehicleDocuments.organizationId, ctx.organizationId),
          lte(vehicleDocuments.expiryDate, in30Days),
          isNull(vehicleDocuments.deletedAt)
        ));
      return NextResponse.json({ data: docs });
    }

    if (type === "driver") {
      const docs = await db.select().from(driverDocuments)
        .where(and(
          eq(driverDocuments.organizationId, ctx.organizationId),
          lte(driverDocuments.expiryDate, in30Days),
          isNull(driverDocuments.deletedAt)
        ));
      return NextResponse.json({ data: docs });
    }

    return NextResponse.json({ data: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar documento
export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();

    if (body.type === "vehicle") {
      const [doc] = await db.insert(vehicleDocuments).values({
        organizationId: ctx.organizationId,
        branchId: ctx.branchId,
        ...body,
        createdBy: ctx.userId,
        version: 1,
      }).returning();
      return NextResponse.json({ success: true, data: doc });
    }

    if (body.type === "driver") {
      const [doc] = await db.insert(driverDocuments).values({
        organizationId: ctx.organizationId,
        branchId: ctx.branchId,
        ...body,
        createdBy: ctx.userId,
        version: 1,
      }).returning();
      return NextResponse.json({ success: true, data: doc });
    }

    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}











