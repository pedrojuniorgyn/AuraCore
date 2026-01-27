import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { tripCheckpoints, trips } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { and, eq, isNull, asc } from "drizzle-orm";
import { queryFirst } from "@/lib/db/query-helpers";

export const runtime = "nodejs";

const idSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.coerce.number().int().positive({ message: "Invalid trip id" })
);

const BodySchema = z.object({
  checkpointType: z.string().trim().min(2).max(50),
  description: z.string().trim().max(500).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationAddress: z.string().trim().max(500).optional(),
  recordedAt: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Invalid recordedAt" })
    .transform((value) => new Date(value))
    .optional(), // ISO string
});

const safeJson = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
};

const createUnauthorizedResponse = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return createUnauthorizedResponse();
    }

    const resolved = await params;
    const tripIdValidation = idSchema.safeParse(resolved.id);
    if (!tripIdValidation.success) {
      return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
    }
    const tripId = tripIdValidation.data;

    const json = await safeJson<unknown>(req);
    const parsed = BodySchema.safeParse(json ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
    }

    // Garantir isolamento por organização via tabela trips (trip_checkpoints não tem organization_id)
    const trip = await queryFirst<{ id: number }>(
      db
        .select({ id: trips.id })
        .from(trips)
        .where(and(eq(trips.id, tripId), eq(trips.organizationId, ctx.organizationId), isNull(trips.deletedAt)))
        .orderBy(asc(trips.id))
    );

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const recordedAt = parsed.data.recordedAt ?? new Date();
    if (Number.isNaN(recordedAt.getTime())) {
      return NextResponse.json({ error: "Invalid recordedAt" }, { status: 400 });
    }

    const checkpointData: typeof tripCheckpoints.$inferInsert = {
      tripId,
      checkpointType: parsed.data.checkpointType,
      description: parsed.data.description ?? null,
      latitude: parsed.data.latitude !== null && parsed.data.latitude !== undefined ? String(parsed.data.latitude) : null,
      longitude: parsed.data.longitude !== null && parsed.data.longitude !== undefined ? String(parsed.data.longitude) : null,
      locationAddress: parsed.data.locationAddress ?? null,
      recordedAt,
      recordedBy: ctx.userId ?? null,
      createdAt: new Date(),
    };

    await db.insert(tripCheckpoints).values(checkpointData);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    // getTenantContext() lança Response (401/403) quando auth falha.
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "Error registering checkpoint";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
