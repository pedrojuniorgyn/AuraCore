import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { tripOccurrences } from "@/lib/db/schema";
import { getTenantContext, hasAccessToBranch } from "@/lib/auth/context";
import { eq, and, isNull, desc } from "drizzle-orm";
import { insertReturning, queryFirst } from "@/lib/db/query-helpers";
import { withDI } from '@/shared/infrastructure/di/with-di';

// ✅ S1.1 Batch 3 Phase 2: Schema inline para occurrences
const createOccurrenceSchema = z.object({
  tripId: z.number().int().positive('ID da viagem inválido'),
  occurrenceType: z.string().min(1, 'Tipo de ocorrência obrigatório'),
  description: z.string().min(1, 'Descrição obrigatória'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  occurredAt: z.string().datetime().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  resolvedAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

const queryOccurrencesSchema = z.object({
  tripId: z.coerce.number().int().positive().optional(),
  occurrenceType: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  resolved: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
});

export const GET = withDI(async (request: NextRequest) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    // ✅ S1.1 Batch 3 Phase 2: Validar query params
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = queryOccurrencesSchema.safeParse(queryParams);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Parâmetros inválidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    
    const { tripId, occurrenceType, severity, resolved } = validation.data;

    // ✅ Construir condições dinamicamente
    const conditions = [
      eq(tripOccurrences.organizationId, ctx.organizationId),
      isNull(tripOccurrences.deletedAt),
    ];
    
    if (tripId) conditions.push(eq(tripOccurrences.tripId, tripId));
    if (occurrenceType) conditions.push(eq(tripOccurrences.occurrenceType, occurrenceType));
    if (severity) conditions.push(eq(tripOccurrences.severity, severity));
    if (resolved !== undefined) {
      if (resolved) {
        conditions.push(isNull(tripOccurrences.resolvedAt));
      }
    }

    const occurrences = await db
      .select()
      .from(tripOccurrences)
      .where(and(...conditions))
      .orderBy(desc(tripOccurrences.createdAt));

    return NextResponse.json({ data: occurrences });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});

export const POST = withDI(async (request: NextRequest) => {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();

    // ✅ S1.1 Batch 3 Phase 2: Validar body com Zod
    const validation = createOccurrenceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    const bodyData = body as Record<string, unknown>;
    const branchIdCandidate = bodyData.branchId ?? ctx.defaultBranchId;
    if (branchIdCandidate === null || branchIdCandidate === undefined) {
      return NextResponse.json(
        {
          error: "branchId é obrigatório",
          code: "BRANCH_REQUIRED",
          details:
            "Informe branchId no payload ou defina uma filial padrão para o usuário.",
        },
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

    // Evitar override de campos sensíveis via spread
    const {
      organizationId: _orgId,
      branchId: _branchId,
      createdBy: _createdBy,
      updatedBy: _updatedBy,
      deletedAt: _deletedAt,
      deletedBy: _deletedBy,
      version: _version,
      ...safeBody
    } = (body ?? {}) as Record<string, unknown>;

    const occurrenceData = {
      ...safeBody,
      organizationId: ctx.organizationId,
      branchId,
      createdBy: ctx.userId,
      version: 1,
    } as unknown as typeof tripOccurrences.$inferInsert;

    const insertQuery = db
      .insert(tripOccurrences)
      .values(occurrenceData);

    const createdId = await insertReturning(insertQuery, { id: tripOccurrences.id }) as Array<Record<string, unknown>>;
    const occurrenceId = createdId[0]?.id;

    const occurrence = occurrenceId
      ? await queryFirst<typeof tripOccurrences.$inferSelect>(
          db
            .select()
            .from(tripOccurrences)
            .where(and(eq(tripOccurrences.id, Number(occurrenceId)), eq(tripOccurrences.organizationId, ctx.organizationId)))
        )
      : null;

    return NextResponse.json({ success: true, data: occurrence });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});















