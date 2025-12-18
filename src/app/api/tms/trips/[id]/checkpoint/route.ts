import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { tripCheckpoints, trips } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { and, eq, isNull } from "drizzle-orm";

export const runtime = "nodejs";

const BodySchema = z.object({
  checkpointType: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationAddress: z.string().max(500).optional(),
  recordedAt: z.string().datetime().optional(), // ISO string
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext();
    const resolved = await params;
    const tripId = Number(resolved.id);
    if (!Number.isFinite(tripId) || tripId <= 0) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload inválido", issues: parsed.error.issues }, { status: 400 });
    }

    // Garantir isolamento por organização via tabela trips (trip_checkpoints não tem organization_id)
    const [trip] = await db
      .select({ id: trips.id })
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.organizationId, ctx.organizationId), isNull(trips.deletedAt)))
      .limit(1);

    if (!trip) {
      return NextResponse.json({ error: "Viagem não encontrada" }, { status: 404 });
    }

    const recordedAt = parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : new Date();
    if (isNaN(recordedAt.getTime())) {
      return NextResponse.json({ error: "recordedAt inválido" }, { status: 400 });
    }

    await db.insert(tripCheckpoints).values({
      tripId,
      checkpointType: parsed.data.checkpointType,
      description: parsed.data.description ?? null,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      locationAddress: parsed.data.locationAddress ?? null,
      recordedAt,
      recordedBy: ctx.userId ?? null,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Erro ao registrar checkpoint" }, { status: 500 });
  }
}

