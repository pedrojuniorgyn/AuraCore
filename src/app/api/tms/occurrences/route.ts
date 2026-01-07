import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tripOccurrences } from "@/lib/db/schema";
import { getTenantContext, hasAccessToBranch } from "@/lib/auth/context";
import { eq, and, isNull, desc } from "drizzle-orm";
import { insertReturning, queryFirst } from "@/lib/db/query-helpers";

export async function GET(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const occurrences = await db
      .select()
      .from(tripOccurrences)
      .where(and(
        eq(tripOccurrences.organizationId, ctx.organizationId),
        isNull(tripOccurrences.deletedAt)
      ))
      .orderBy(desc(tripOccurrences.createdAt));

    return NextResponse.json({ data: occurrences });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();

    const branchIdCandidate = (body as unknown)?.branchId ?? ctx.defaultBranchId;
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

    const createdId = await insertReturning(insertQuery, { id: tripOccurrences.id });
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
}















