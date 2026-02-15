import { NextRequest, NextResponse } from "next/server";
import { withDI } from '@/shared/infrastructure/di/with-di';
import { db } from "@/lib/db";
import { mdfeHeader, mdfeDocuments } from "@/modules/fiscal/infrastructure/persistence/schemas";
import { trips } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { CreateMdfeSchema, ListMdfeQuerySchema } from "@/modules/fiscal/presentation/validators";

import { logger } from '@/shared/infrastructure/logging';
/**
 * GET /api/fiscal/mdfe
 * Lista MDFes da organização
 * 
 * Multi-tenancy: ✅ organizationId
 * Validação: ✅ Zod query params
 */
export const GET = withDI(async (req: NextRequest) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;

    // Validar query params com Zod
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validation = ListMdfeQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetros inválidos",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { page, limit, status, tripId } = validation.data;

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao buscar MDFes:", error);
    return NextResponse.json(
      { error: "Erro ao buscar MDFes", details: errorMessage },
      { status: 500 }
    );
  }
});

/**
 * POST /api/fiscal/mdfe
 * Cria MDFe para uma Viagem
 * 
 * Multi-tenancy: ✅ organizationId
 * Validação: ✅ Zod schema
 */
export const POST = withDI(async (req: NextRequest) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const organizationId = ctx.organizationId;
    const createdBy = ctx.userId;

    const body = await req.json();

    // Validar body com Zod
    const validation = CreateMdfeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados inválidos",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { tripId, cteIds, modal, tipoEmitente, tipoTransportador, ufInicio, ufFim, notes } = validation.data;

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
    await db.insert(mdfeHeader).values({
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
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });

    // Evita bugs do $returningId() no MSSQL e garante mdfeId sempre definido.
    const [newMdfe] = await db
      .select()
      .from(mdfeHeader)
      .where(
        and(
          eq(mdfeHeader.organizationId, organizationId),
          eq(mdfeHeader.tripId, trip.id),
          eq(mdfeHeader.mdfeNumber, mdfeNumber),
          isNull(mdfeHeader.deletedAt)
        )
      )
      .orderBy(desc(mdfeHeader.id));

    const mdfeId = newMdfe?.id;
    if (!Number.isFinite(Number(mdfeId))) {
      return NextResponse.json(
        { error: "Falha ao criar MDFe (registro não encontrado após insert)" },
        { status: 500 }
      );
    }

    // Vincular CTes
    const cteIdsSafe = Array.isArray(cteIds)
      ? cteIds
          .map((x: unknown) => Number(x))
          .filter((n: number) => Number.isFinite(n))
      : [];

    if (cteIdsSafe.length > 0) {
      await db.insert(mdfeDocuments).values(
        cteIdsSafe.map((cteId: number) => ({
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
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    logger.error("❌ Erro ao criar MDFe:", error);
    return NextResponse.json(
      { error: "Erro ao criar MDFe", details: errorMessage },
      { status: 500 }
    );
  }
});

















