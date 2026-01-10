import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { shouldRequireCiot } from "@/services/validators/ciot-validator";
import { getTenantContext, hasAccessToBranch, getBranchScopeFilter } from "@/lib/auth/context";
import { insertReturning, queryFirst } from "@/lib/db/query-helpers";

/**
 * GET /api/tms/trips
 */
export async function GET(req: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;

    const allTrips = await db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.organizationId, organizationId),
          isNull(trips.deletedAt),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(getBranchScopeFilter(ctx, trips.branchId) as any[])
        )
      )
      .orderBy(desc(trips.createdAt));

    return NextResponse.json({
      success: true,
      data: allTrips,
    });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao buscar viagens:", error);
    return NextResponse.json(
      { error: "Erro ao buscar viagens", details: errorMessage },
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
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;
    const createdBy = ctx.userId;

    const body = await req.json();
    const {
      branchId: branchIdRaw,
      vehicleId,
      driverId,
      driverType,
      pickupOrderIds,
      scheduledStart,
      ciotNumber,
      ciotValue,
    } = body;

    const branchIdCandidate = branchIdRaw ?? ctx.defaultBranchId;
    if (branchIdCandidate === null || branchIdCandidate === undefined) {
      return NextResponse.json(
        { error: "branchId é obrigatório", code: "BRANCH_REQUIRED" },
        { status: 400 }
      );
    }
    const branchId = Number(branchIdCandidate);
    if (!Number.isFinite(branchId)) {
      return NextResponse.json(
        { error: "branchId inválido", code: "BRANCH_INVALID" },
        { status: 400 }
      );
    }
    if (!hasAccessToBranch(ctx, branchId)) {
      return NextResponse.json(
        { error: "Sem permissão para a filial", code: "BRANCH_FORBIDDEN" },
        { status: 403 }
      );
    }

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

    const insertQuery = db
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
      });

    const createdId = await insertReturning(insertQuery, { id: trips.id }) as Array<Record<string, unknown>>;
    const tripId = createdId[0]?.id;

    const newTrip = tripId
      ? await queryFirst<typeof trips.$inferSelect>(
          db
            .select()
            .from(trips)
            .where(and(eq(trips.id, Number(tripId)), eq(trips.organizationId, organizationId), isNull(trips.deletedAt)))
        )
      : null;

    return NextResponse.json({
      success: true,
      message: "Viagem criada!",
      data: newTrip,
    });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao criar viagem:", error);
    return NextResponse.json(
      { error: "Erro ao criar viagem", details: errorMessage },
      { status: 500 }
    );
  }
}
















