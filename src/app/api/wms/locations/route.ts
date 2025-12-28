import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouseLocations, warehouseZones } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { insertReturning, queryFirst } from "@/lib/db/query-helpers";

export async function GET(request: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const ctx = await getTenantContext();
    // ⚠️ Tabelas warehouse_zones/warehouse_locations não possuem organization_id.
    // Por enquanto, restringimos a ADMIN para reduzir risco de vazamento.
    if (!ctx.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", message: "Apenas ADMIN pode acessar WMS locations" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId");
    if (!warehouseId) {
      return NextResponse.json(
        { error: "Informe warehouseId" },
        { status: 400 }
      );
    }

    let locations;
    locations = await db
      .select({
        location: warehouseLocations,
        zone: warehouseZones,
      })
      .from(warehouseLocations)
      .leftJoin(warehouseZones, eq(warehouseLocations.zoneId, warehouseZones.id))
      .where(eq(warehouseZones.warehouseId, parseInt(warehouseId)));

    return NextResponse.json({ success: true, data: locations });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const ctx = await getTenantContext();
    if (!ctx.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", message: "Apenas ADMIN pode criar WMS locations" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const insertQuery = db
      .insert(warehouseLocations)
      .values({
        zoneId: body.zoneId,
        code: body.code,
        locationType: body.locationType,
        maxWeightKg: body.maxWeightKg,
        status: "AVAILABLE",
      });

    const createdId = await insertReturning(insertQuery, { id: warehouseLocations.id });
    const locationId = createdId[0]?.id;

    const location = locationId
      ? await queryFirst<typeof warehouseLocations.$inferSelect>(
          db
            .select()
            .from(warehouseLocations)
            .where(eq(warehouseLocations.id, Number(locationId)))
        )
      : null;

    return NextResponse.json({ success: true, data: location });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}















