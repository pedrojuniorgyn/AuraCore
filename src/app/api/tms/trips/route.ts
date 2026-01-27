import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getTenantContext, hasAccessToBranch, getBranchScopeFilter } from "@/lib/auth/context";
import { insertReturning, queryFirst } from "@/lib/db/query-helpers";
import { queryTripsSchema } from "@/lib/validation/tms-schemas";

/**
 * Verifica se motorista requer CIOT (terceiros/agregados)
 * 
 * TODO (E9): Migrar para Domain Service src/modules/tms/domain/services/CiotValidator.ts
 */
function shouldRequireCiot(driverType: string): boolean {
  return ["THIRD_PARTY", "AGGREGATE"].includes(driverType);
}

// ✅ S1.1 Batch 3: Schema de validação para criar viagem
// Adaptado à estrutura existente (pickupOrderIds, ciotNumber, scheduledStart)
const numericIdSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.coerce.number().int().positive()
);

const createTripSchema = z
  .object({
    branchId: z.coerce.number().int().positive().optional(),
    vehicleId: numericIdSchema,
    driverId: numericIdSchema,
    driverType: z.enum(["OWN", "THIRD_PARTY", "AGGREGATE"]).default("OWN"),
    pickupOrderIds: z.array(z.string().trim()).optional(),
    scheduledStart: z
      .string()
      .trim()
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "Invalid scheduledStart",
      })
      .transform((value) => new Date(value))
      .optional(),
    ciotNumber: z.string().trim().optional(),
    ciotValue: z.number().nonnegative().optional(),
  })
  .refine(
    (data) => {
      if (["THIRD_PARTY", "AGGREGATE"].includes(data.driverType) && !data.ciotNumber) {
        return false;
      }
      return true;
    },
    { message: "CIOT is required for third-party drivers", path: ["ciotNumber"] }
  );

const safeJson = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
};

const unauthorizedResponse = NextResponse.json(
  { error: "Unauthorized" },
  { status: 401 }
);

/**
 * GET /api/tms/trips
 * 
 * Multi-tenancy: ✅ organizationId + branchId
 * Validação: ✅ Zod query params
 */
export async function GET(req: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    if (!ctx) {
      return unauthorizedResponse;
    }
    const organizationId = ctx.organizationId;

    // ✅ S1.1 Batch 3: Validar query params com Zod
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validation = queryTripsSchema.safeParse(queryParams);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    
    const { page, pageSize, status, vehicleId, driverId, originUf, destinationUf, startDate, endDate } = validation.data;

    // ✅ Construir condições dinamicamente (aplicar filtros!)
    const conditions = [
      eq(trips.organizationId, organizationId),
      isNull(trips.deletedAt),
      ...getBranchScopeFilter(ctx, trips.branchId)
    ];
    
    if (status) conditions.push(eq(trips.status, status));
    if (vehicleId) conditions.push(eq(trips.vehicleId, vehicleId));
    if (driverId) conditions.push(eq(trips.driverId, driverId));
    // TODO: Aplicar originUf, destinationUf, startDate, endDate se campos existirem no schema

    const allTrips = await db
      .select()
      .from(trips)
      .where(and(...conditions))
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
    console.error("❌ Error fetching trips:", error);
    return NextResponse.json(
      { error: "Failed to fetch trips", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tms/trips
 * 
 * Multi-tenancy: ✅ organizationId + branchId
 * Validação: ✅ Zod schema
 */
export async function POST(req: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    if (!ctx) {
      return unauthorizedResponse;
    }
    const organizationId = ctx.organizationId;
    const createdBy = ctx.userId;

    const body = await safeJson<unknown>(req);
    
    // ✅ S1.1 Batch 3: Validar body com Zod
    const validation = createTripSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    
    const {
      branchId: branchIdRaw,
      vehicleId,
      driverId,
      driverType,
      pickupOrderIds,
      scheduledStart,
      ciotNumber,
      ciotValue,
    } = validation.data;

    // Resolver branchId (validação de acesso)
    const branchIdCandidate = branchIdRaw ?? ctx.defaultBranchId;
    if (branchIdCandidate === null || branchIdCandidate === undefined) {
      return NextResponse.json(
        { error: "branchId is required", code: "BRANCH_REQUIRED" },
        { status: 400 }
      );
    }
    const branchId = Number(branchIdCandidate);
    if (!hasAccessToBranch(ctx, branchId)) {
      return NextResponse.json(
        { error: "Branch access forbidden", code: "BRANCH_FORBIDDEN" },
        { status: 403 }
      );
    }

    const requiresCiot = shouldRequireCiot(driverType);

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
        scheduledStart: scheduledStart ?? null,
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
    console.error("❌ Error creating trip:", error);
    return NextResponse.json(
      { error: "Failed to create trip", details: errorMessage },
      { status: 500 }
    );
  }
}














