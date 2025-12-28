import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tripOccurrences } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { queryFirst } from "@/lib/db/query-helpers";

// GET - Buscar ocorrência específica
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const occurrenceId = parseInt(resolvedParams.id);
    if (isNaN(occurrenceId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const occurrence = await queryFirst<typeof tripOccurrences.$inferSelect>(db
      .select()
      .from(tripOccurrences)
      .where(
        and(
          eq(tripOccurrences.id, occurrenceId),
          eq(tripOccurrences.organizationId, session.user.organizationId),
          isNull(tripOccurrences.deletedAt)
        )
      )
      );

    if (!occurrence) {
      return NextResponse.json(
        { error: "Ocorrência não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: occurrence });
  } catch (error) {
    console.error("Erro ao buscar ocorrência:", error);
    return NextResponse.json(
      { error: "Erro ao buscar ocorrência" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar ocorrência
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const occurrenceId = parseInt(resolvedParams.id);
    if (isNaN(occurrenceId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
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

    // Validações básicas
    if (!body.tripId || !body.occurrenceType || !body.title) {
      return NextResponse.json(
        { error: "Viagem, tipo e título são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se ocorrência existe
    const existing = await queryFirst<typeof tripOccurrences.$inferSelect>(db
      .select()
      .from(tripOccurrences)
      .where(
        and(
          eq(tripOccurrences.id, occurrenceId),
          eq(tripOccurrences.organizationId, session.user.organizationId),
          isNull(tripOccurrences.deletedAt)
        )
      )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Ocorrência não encontrada" },
        { status: 404 }
      );
    }

    // Validar mudança de status
    if (body.status === "CLOSED" && existing.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Apenas ocorrências em andamento podem ser fechadas" },
        { status: 400 }
      );
    }

    // Atualizar
    await db
      .update(tripOccurrences)
      .set({
        ...safeBody,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tripOccurrences.id, occurrenceId),
          eq(tripOccurrences.organizationId, session.user.organizationId),
          isNull(tripOccurrences.deletedAt)
        )
      );

    const updated = await queryFirst<typeof tripOccurrences.$inferSelect>(db
      .select()
      .from(tripOccurrences)
      .where(
        and(
          eq(tripOccurrences.id, occurrenceId),
          eq(tripOccurrences.organizationId, session.user.organizationId),
          isNull(tripOccurrences.deletedAt)
        )
      )
      );

    return NextResponse.json({
      success: true,
      message: "Ocorrência atualizada com sucesso",
      data: updated,
    });
  } catch (error) {
    console.error("Erro ao atualizar ocorrência:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar ocorrência" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete da ocorrência
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const occurrenceId = parseInt(resolvedParams.id);
    if (isNaN(occurrenceId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se ocorrência existe
    const existing = await queryFirst<typeof tripOccurrences.$inferSelect>(db
      .select()
      .from(tripOccurrences)
      .where(
        and(
          eq(tripOccurrences.id, occurrenceId),
          eq(tripOccurrences.organizationId, session.user.organizationId),
          isNull(tripOccurrences.deletedAt)
        )
      )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Ocorrência não encontrada" },
        { status: 404 }
      );
    }

    // Validar se ocorrência está vinculada a sinistro
    if (existing.insuranceClaim === "S") {
      return NextResponse.json(
        { error: "Não é possível excluir ocorrência com sinistro registrado" },
        { status: 400 }
      );
    }

    // Soft delete
    await db
      .update(tripOccurrences)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
      })
      .where(
        and(
          eq(tripOccurrences.id, occurrenceId),
          eq(tripOccurrences.organizationId, session.user.organizationId),
          isNull(tripOccurrences.deletedAt)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Ocorrência excluída com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir ocorrência:", error);
    return NextResponse.json(
      { error: "Erro ao excluir ocorrência" },
      { status: 500 }
    );
  }
}









