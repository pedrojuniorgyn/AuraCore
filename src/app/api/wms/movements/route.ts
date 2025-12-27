import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouseMovements, stockLocations } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
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

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "quantity inválido", code: "INVALID_QUANTITY" },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      // Registrar movimento (SQL Server: sem .returning())
      const [createdId] = await tx
        .insert(warehouseMovements)
        .values({
          organizationId: ctx.organizationId,
          movementType,
          productId,
          quantity: qty,
          fromLocationId,
          toLocationId,
          referenceType,
          referenceId,
          createdBy: ctx.userId,
        })
        .$returningId();

      const movementId = (createdId as any)?.id;

      // Atualizar stock_locations de forma segura (sem string interpolation)
      if (fromLocationId) {
        await tx
          .update(stockLocations)
          .set({ quantity: sql`${stockLocations.quantity} - ${qty}` })
          .where(
            and(
              eq(stockLocations.locationId, Number(fromLocationId)),
              eq(stockLocations.productId, Number(productId))
            )
          );
      }

      if (toLocationId) {
        const existing = await tx
          .select()
          .from(stockLocations)
          .where(
            and(
              eq(stockLocations.locationId, Number(toLocationId)),
              eq(stockLocations.productId, Number(productId))
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await tx
            .update(stockLocations)
            .set({ quantity: sql`${stockLocations.quantity} + ${qty}` })
            .where(
              and(
                eq(stockLocations.locationId, Number(toLocationId)),
                eq(stockLocations.productId, Number(productId))
              )
            );
        } else {
          await tx.insert(stockLocations).values({
            locationId: Number(toLocationId),
            productId: Number(productId),
            quantity: qty,
            receivedAt: new Date(),
          });
        }
      }

      const [movement] = movementId
        ? await tx
            .select()
            .from(warehouseMovements)
            .where(
              and(
                eq(warehouseMovements.id, Number(movementId)),
                eq(warehouseMovements.organizationId, ctx.organizationId)
              )
            )
            .limit(1)
        : [];

      return movement ?? null;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? errorMessage : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
















