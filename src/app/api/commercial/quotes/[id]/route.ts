import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { queryFirst } from "@/lib/db/query-helpers";
import { freightQuotes } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";

/**
 * GET /api/commercial/quotes/:id
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;
    const id = parseInt(resolvedParams.id);

    const [quote] = await db
      .select()
      .from(freightQuotes)
      .where(
        and(
          eq(freightQuotes.id, id),
          eq(freightQuotes.organizationId, organizationId),
          isNull(freightQuotes.deletedAt)
        )
      );

    if (!quote) {
      return NextResponse.json(
        { error: "Cotação não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: quote });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao buscar cotação:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cotação", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/commercial/quotes/:id
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const organizationId = ctx.organizationId;
    const updatedBy = ctx.userId;
    const id = parseInt(resolvedParams.id);

    const body = await req.json();

    // Verificar se existe
    const [existing] = await db
      .select()
      .from(freightQuotes)
      .where(
        and(
          eq(freightQuotes.id, id),
          eq(freightQuotes.organizationId, organizationId),
          isNull(freightQuotes.deletedAt)
        )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Cotação não encontrada" },
        { status: 404 }
      );
    }

    // Evitar override de campos sensíveis via spread
    const {
      id: _id,
      organizationId: _orgId,
      branchId: _branchId,
      createdBy: _createdBy,
      createdAt: _createdAt,
      deletedAt: _deletedAt,
      deletedBy: _deletedBy,
      version: _version,
      updatedAt: _updatedAt,
      updatedBy: _updatedBy,
      ...safeBody
    } = (body ?? {}) as Record<string, unknown>;

    // Atualizar
    const updateResult = await db
      .update(freightQuotes)
      .set({
        ...safeBody,
        updatedBy,
        updatedAt: new Date(),
        version: existing.version + 1,
      })
      .where(and(eq(freightQuotes.id, id), eq(freightQuotes.organizationId, organizationId)));

    const rowsAffectedRaw = (updateResult as unknown as Record<string, unknown>).rowsAffected;
    const rowsAffected = Array.isArray(rowsAffectedRaw)
      ? Number(rowsAffectedRaw[0] ?? 0)
      : Number(rowsAffectedRaw ?? 0);
    if (!rowsAffected) {
      return NextResponse.json(
        { error: "Cotação não encontrada", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const updated = await queryFirst<typeof freightQuotes.$inferSelect>(db
      .select()
      .from(freightQuotes)
      .where(and(eq(freightQuotes.id, id), eq(freightQuotes.organizationId, organizationId), isNull(freightQuotes.deletedAt)))
    );

    if (!updated) {
      return NextResponse.json({ error: "Cotação não encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Cotação atualizada!",
      data: updated,
    });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao atualizar cotação:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar cotação", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/commercial/quotes/:id
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const organizationId = ctx.organizationId;
    const updatedBy = ctx.userId;
    const id = parseInt(resolvedParams.id);

    // Soft delete
    await db
      .update(freightQuotes)
      .set({
        deletedAt: new Date(),
        updatedBy,
      })
      .where(
        and(
          eq(freightQuotes.id, id),
          eq(freightQuotes.organizationId, organizationId)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Cotação excluída!",
    });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao excluir cotação:", error);
    return NextResponse.json(
      { error: "Erro ao excluir cotação", details: errorMessage },
      { status: 500 }
    );
  }
}

















