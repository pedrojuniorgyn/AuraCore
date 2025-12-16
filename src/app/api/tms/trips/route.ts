import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { shouldRequireCiot } from "@/services/validators/ciot-validator";

/**
 * GET /api/tms/trips
 */
export async function GET(req: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    const allTrips = await db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.organizationId, organizationId),
          isNull(trips.deletedAt)
        )
      )
      .orderBy(desc(trips.createdAt));

    return NextResponse.json({
      success: true,
      data: allTrips,
    });
  } catch (error: any) {
    console.error("❌ Erro ao buscar viagens:", error);
    return NextResponse.json(
      { error: "Erro ao buscar viagens", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tms/trips
 */
export async function POST(req: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const createdBy = session.user.email || "system";

    const body = await req.json();
    const {
      branchId = 1,
      vehicleId,
      driverId,
      driverType,
      pickupOrderIds,
      scheduledStart,
      ciotNumber,
      ciotValue,
    } = body;

    // Validações
    if (!vehicleId || !driverId) {
      return NextResponse.json(
        { error: "Veículo e Motorista são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar CIOT
    const requiresCiot = shouldRequireCiot(driverType || "OWN");
    if (requiresCiot && !ciotNumber) {
      return NextResponse.json(
        { error: "CIOT obrigatório para motoristas terceiros/agregados!" },
        { status: 400 }
      );
    }

    // Gerar número
    const year = new Date().getFullYear();
    const lastTrips = await db
      .select()
      .from(trips)
      .where(eq(trips.organizationId, organizationId))
      .orderBy(desc(trips.id));

    const tripNumber = `VIA-${year}-${String(lastTrips.length + 1).padStart(4, "0")}`;

    const [createdId] = await db
      .insert(trips)
      .values({
        organizationId,
        branchId,
        tripNumber,
        vehicleId,
        driverId,
        driverType: driverType || "OWN",
        pickupOrderIds: pickupOrderIds ? JSON.stringify(pickupOrderIds) : null,
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        requiresCiot: requiresCiot ? "true" : "false",
        ciotNumber,
        ciotValue: ciotValue?.toString(),
        status: "DRAFT",
        createdBy,
      })
      .$returningId();

    const tripId = (createdId as any)?.id;
    const [newTrip] = tripId
      ? await db
          .select()
          .from(trips)
          .where(and(eq(trips.id, Number(tripId)), eq(trips.organizationId, organizationId), isNull(trips.deletedAt)))
          .limit(1)
      : [];

    return NextResponse.json({
      success: true,
      message: "Viagem criada!",
      data: newTrip,
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar viagem:", error);
    return NextResponse.json(
      { error: "Erro ao criar viagem", details: error.message },
      { status: 500 }
    );
  }
}
















