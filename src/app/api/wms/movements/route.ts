import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouseMovements, stockLocations } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, sql } from "drizzle-orm";
import { queryFirst, insertReturning } from "@/lib/db/query-helpers";

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
      const movementData: typeof warehouseMovements.$inferInsert = {
        organizationId: ctx.organizationId,
        movementType,
        productId,
        quantity: String(qty),
        fromLocationId,
        toLocationId,
        referenceType,
        referenceId,
        createdBy: ctx.userId,
      };

      const insertQuery = tx
        .insert(warehouseMovements)
        .values(movementData);

      const createdId = await insertReturning(insertQuery, { id: warehouseMovements.id });
      const movementId = createdId[0]?.id;

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
        const existing = await queryFirst<typeof stockLocations.$inferSelect>(
          tx
            .select()
            .from(stockLocations)
            .where(
              and(
                eq(stockLocations.locationId, Number(toLocationId)),
                eq(stockLocations.productId, Number(productId))
              )
            )
        );

        if (existing) {
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
          const stockLocationData: typeof stockLocations.$inferInsert = {
            locationId: Number(toLocationId),
            productId: Number(productId),
            quantity: String(qty),
            receivedAt: new Date(),
          };

          await tx.insert(stockLocations).values(stockLocationData);
        }
      }

      const movement = movementId
        ? await queryFirst<typeof warehouseMovements.$inferSelect>(
            tx
              .select()
              .from(warehouseMovements)
              .where(
                and(
                  eq(warehouseMovements.id, Number(movementId)),
                  eq(warehouseMovements.organizationId, ctx.organizationId)
                )
              )
          )
        : null;

      return movement;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
















