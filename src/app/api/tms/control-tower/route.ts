import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const ctx = await getTenantContext();

    const activeTrips = await db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.organizationId, ctx.organizationId),
          inArray(trips.status, ["IN_TRANSIT", "ALLOCATED"]),
          isNull(trips.deletedAt)
        )
      );

    // TODO: Enriquecer com checkpoints, calcular SLA
    const enriched = activeTrips.map((trip) => ({
      ...trip,
      slaStatus: "ON_TIME", // TODO: Calcular real
      checkpoints: [], // TODO: Buscar checkpoints
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}






