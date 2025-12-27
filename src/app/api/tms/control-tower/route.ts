import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tripCheckpoints, trips } from "@/lib/db/schema";
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

    const tripIds = activeTrips.map((t) => t.id);
    const checkpoints = tripIds.length
      ? await db
          .select()
          .from(tripCheckpoints)
          .where(inArray(tripCheckpoints.tripId, tripIds))
      : [];

    const checkpointsByTrip = new Map<number, typeof checkpoints>();
    for (const cp of checkpoints) {
      const arr = checkpointsByTrip.get(cp.tripId) ?? [];
      arr.push(cp);
      checkpointsByTrip.set(cp.tripId, arr);
    }

    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    const enriched = activeTrips.map((trip) => {
      const cps = (checkpointsByTrip.get(trip.id) ?? []).sort((a, b) => {
        const ta = new Date(String(a.recordedAt)).getTime();
        const tb = new Date(String(b.recordedAt)).getTime();
        return tb - ta;
      });

      const scheduledEndMs = trip.scheduledEnd ? new Date(String(trip.scheduledEnd)).getTime() : null;
      const slaStatus =
        scheduledEndMs === null
          ? "ON_TIME"
          : now > scheduledEndMs
            ? "DELAYED"
            : scheduledEndMs - now <= twoHoursMs
              ? "AT_RISK"
              : "ON_TIME";

      return {
        ...trip,
        slaStatus,
        checkpoints: cps.slice(0, 10), // últimos 10 eventos
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

















