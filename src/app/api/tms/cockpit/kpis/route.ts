import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trips, tripOccurrences } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, sql } from "drizzle-orm";

export async function GET() {
  try {
    const ctx = await getTenantContext();

    // Viagens em andamento
    const inProgress = await db
      .select({ count: sql<number>`count(*)` })
      .from(trips)
      .where(
        and(
          eq(trips.organizationId, ctx.organizationId),
          eq(trips.status, "IN_TRANSIT"),
          isNull(trips.deletedAt)
        )
      );

    // TODO: Calcular OTD real
    const onTimeDelivery = 95; // Mock

    // TODO: Calcular atrasos reais
    const delayedDeliveries = 3; // Mock

    // Ocorrências abertas
    const openOcc = await db
      .select({ count: sql<number>`count(*)` })
      .from(tripOccurrences)
      .where(
        and(
          eq(tripOccurrences.organizationId, ctx.organizationId),
          eq(tripOccurrences.status, "OPEN"),
          isNull(tripOccurrences.deletedAt)
        )
      );

    return NextResponse.json({
      success: true,
      data: {
        tripsInProgress: inProgress[0]?.count || 0,
        onTimeDelivery,
        delayedDeliveries,
        openOccurrences: openOcc[0]?.count || 0,
        avgDeliveryTime: 0,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}



























