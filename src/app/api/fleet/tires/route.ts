import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tires, tireMovements } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull } from "drizzle-orm";

export async function GET() {
  try {
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext();
    const body = await request.json();

    const [tire] = await db
      .insert(tires)
      .values({
        organizationId: ctx.organizationId,
        serialNumber: body.serialNumber,
        brandId: body.brandId,
        model: body.model,
        size: body.size,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        purchasePrice: body.purchasePrice,
        status: "STOCK",
      })
      .returning();

    return NextResponse.json({ success: true, data: tire });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}










