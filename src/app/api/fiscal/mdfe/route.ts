import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mdfeHeader, mdfeDocuments, trips } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";

/**
 * GET /api/fiscal/mdfe
 */
export async function GET(req: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;

    const mdfes = await db
      .select()
      .from(mdfeHeader)
      .where(
        and(
          eq(mdfeHeader.organizationId, organizationId),
          isNull(mdfeHeader.deletedAt)
        )
      )
      .orderBy(desc(mdfeHeader.createdAt));

    return NextResponse.json({
      success: true,
      data: mdfes,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao buscar MDFes:", error);
    return NextResponse.json(
      { error: "Erro ao buscar MDFes", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fiscal/mdfe
 * Cria MDFe para uma Viagem
 */
export async function POST(req: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const organizationId = ctx.organizationId;
    const createdBy = ctx.userId;

    const body = await req.json();
    const { tripId, cteIds = [] } = body;

    if (!tripId) {
      return NextResponse.json(
        { error: "Viagem é obrigatória" },
        { status: 400 }
      );
    }

    // Buscar viagem
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.organizationId, organizationId), isNull(trips.deletedAt)));

    if (!trip) {
      return NextResponse.json(
        { error: "Viagem não encontrada" },
        { status: 404 }
      );
    }

    // Validar CIOT para terceiros
    if (trip.requiresCiot === "true" && !trip.ciotNumber) {
      return NextResponse.json(
        { error: "CIOT obrigatório! Configure na viagem antes de gerar MDFe." },
        { status: 400 }
      );
    }

    // Gerar número
    const lastMdfes = await db
      .select()
      .from(mdfeHeader)
      .where(eq(mdfeHeader.organizationId, organizationId))
      .orderBy(desc(mdfeHeader.id));

    const mdfeNumber = lastMdfes.length + 1;

    // Criar MDFe
    const [createdId] = await db
      .insert(mdfeHeader)
      .values({
        organizationId,
        branchId: trip.branchId,
        mdfeNumber,
        serie: "1",
        tripId: trip.id,
        vehicleId: trip.vehicleId,
        driverId: trip.driverId,
        originUf: "SP", // TODO: Buscar da primeira parada
        destinationUf: "RJ", // TODO: Buscar da última parada
        ciotNumber: trip.ciotNumber,
        status: "DRAFT",
        issueDate: new Date(),
        createdBy,
      })
      .$returningId();

    const mdfeId = (createdId as any)?.id;
    if (mdfeId === null || mdfeId === undefined || !Number.isFinite(Number(mdfeId))) {
      return NextResponse.json(
        { error: "Falha ao criar MDFe (ID não retornado)" },
        { status: 500 }
      );
    }
    const [newMdfe] = mdfeId
      ? await db
          .select()
          .from(mdfeHeader)
          .where(and(eq(mdfeHeader.id, Number(mdfeId)), eq(mdfeHeader.organizationId, organizationId), isNull(mdfeHeader.deletedAt)))
          .limit(1)
      : [];

    // Vincular CTes
    if (cteIds.length > 0) {
      await db.insert(mdfeDocuments).values(
        cteIds.map((cteId: number) => ({
          mdfeHeaderId: Number(mdfeId),
          cteHeaderId: cteId,
        }))
      );
    }

    return NextResponse.json({
      success: true,
      message: "MDFe criado! (XML será gerado em produção)",
      data: newMdfe,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao criar MDFe:", error);
    return NextResponse.json(
      { error: "Erro ao criar MDFe", details: error.message },
      { status: 500 }
    );
  }
}

















