import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouseMovements, stockLocations } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext();
    const body = await request.json();

    const {
      movementType,
      productId,
      quantity,
      fromLocationId,
      toLocationId,
      referenceType,
      referenceId,
    } = body;

    // Registrar movimento
    const [movement] = await db
      .insert(warehouseMovements)
      .values({
        organizationId: ctx.organizationId,
        movementType,
        productId,
        quantity,
        fromLocationId,
        toLocationId,
        referenceType,
        referenceId,
        createdBy: ctx.user.id,
      })
      .returning();

    // Atualizar stock_locations
    if (fromLocationId) {
      // Diminuir origem
      await db.execute(
        `UPDATE stock_locations 
         SET quantity = quantity - ${quantity}
         WHERE location_id = ${fromLocationId} AND product_id = ${productId}`
      );
    }

    if (toLocationId) {
      // Aumentar destino (ou criar)
      const existing = await db
        .select()
        .from(stockLocations)
        .where(
          and(
            eq(stockLocations.locationId, toLocationId),
            eq(stockLocations.productId, productId)
          )
        );

      if (existing.length > 0) {
        await db.execute(
          `UPDATE stock_locations 
           SET quantity = quantity + ${quantity}
           WHERE location_id = ${toLocationId} AND product_id = ${productId}`
        );
      } else {
        await db.insert(stockLocations).values({
          locationId: toLocationId,
          productId,
          quantity,
          receivedAt: new Date(),
        });
      }
    }

    return NextResponse.json({ success: true, data: movement });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}








