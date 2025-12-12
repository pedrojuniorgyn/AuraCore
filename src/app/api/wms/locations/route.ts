import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouseLocations, warehouseZones } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId");

    let locations;
    if (warehouseId) {
      locations = await db
        .select({
          location: warehouseLocations,
          zone: warehouseZones,
        })
        .from(warehouseLocations)
        .leftJoin(warehouseZones, eq(warehouseLocations.zoneId, warehouseZones.id))
        .where(eq(warehouseZones.warehouseId, parseInt(warehouseId)));
    } else {
      locations = await db.select().from(warehouseLocations);
    }

    return NextResponse.json({ success: true, data: locations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const [location] = await db
      .insert(warehouseLocations)
      .values({
        zoneId: body.zoneId,
        code: body.code,
        locationType: body.locationType,
        maxWeightKg: body.maxWeightKg,
        status: "AVAILABLE",
      })
      .returning();

    return NextResponse.json({ success: true, data: location });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}














