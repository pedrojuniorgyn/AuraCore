import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tires } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { queryFirst } from "@/lib/db/query-helpers";

// GET - Buscar pneu específico
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const tireId = parseInt(resolvedParams.id);
    if (isNaN(tireId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const tire = await queryFirst<typeof tires.$inferSelect>(db
      .select()
      .from(tires)
      .where(
        and(
          eq(tires.id, tireId),
          eq(tires.organizationId, ctx.organizationId),
          isNull(tires.deletedAt)
        )
      )
      );

    if (!tire) {
      return NextResponse.json({ error: "Pneu não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tire });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao buscar pneu:", error);
    return NextResponse.json(
      { error: "Erro ao buscar pneu" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar pneu
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const tireId = parseInt(resolvedParams.id);
    if (isNaN(tireId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.serialNumber || !body.brand) {
      return NextResponse.json(
        { error: "Número de série e marca são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se pneu existe
    const existing = await queryFirst<typeof tires.$inferSelect>(
      db
        .select()
        .from(tires)
        .where(
          and(
            eq(tires.id, tireId),
            eq(tires.organizationId, ctx.organizationId),
            isNull(tires.deletedAt)
          )
        )
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Pneu não encontrado" },
        { status: 404 }
      );
    }

    // Verificar número de série duplicado
    if (body.serialNumber !== existing.serialNumber) {
      const duplicateSerial = await queryFirst<typeof tires.$inferSelect>(
        db
          .select()
          .from(tires)
          .where(
            and(
              eq(tires.serialNumber, body.serialNumber),
              eq(tires.organizationId, ctx.organizationId),
              isNull(tires.deletedAt)
            )
          )
      );

      if (duplicateSerial && duplicateSerial.id !== tireId) {
        return NextResponse.json(
          { error: "Já existe um pneu com este número de série" },
          { status: 400 }
        );
      }
    }

    // Atualizar
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

    const updateResult = await db
      .update(tires)
      .set({
        ...safeBody,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(tires.id, tireId), eq(tires.organizationId, ctx.organizationId)));

    const rowsAffectedRaw = (updateResult as any)?.rowsAffected;
    const rowsAffected = Array.isArray(rowsAffectedRaw)
      ? Number(rowsAffectedRaw[0] ?? 0)
      : Number(rowsAffectedRaw ?? 0);
    if (!rowsAffected) {
      return NextResponse.json({ error: "Pneu não encontrado" }, { status: 404 });
    }

    const updated = await queryFirst<typeof tires.$inferSelect>(
      db
        .select()
        .from(tires)
        .where(and(eq(tires.id, tireId), eq(tires.organizationId, ctx.organizationId), isNull(tires.deletedAt)))
    );

    return NextResponse.json({
      success: true,
      message: "Pneu atualizado com sucesso",
      data: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao atualizar pneu:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar pneu" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete do pneu
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const tireId = parseInt(resolvedParams.id);
    if (isNaN(tireId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se pneu existe
    const existing = await queryFirst<typeof tires.$inferSelect>(
      db
        .select()
        .from(tires)
        .where(
          and(
            eq(tires.id, tireId),
            eq(tires.organizationId, ctx.organizationId),
            isNull(tires.deletedAt)
          )
        )
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Pneu não encontrado" },
        { status: 404 }
      );
    }

    // Validar se pneu está instalado em veículo
    if (existing[0].status === "INSTALLED" && existing[0].currentVehicleId) {
      return NextResponse.json(
        { error: "Pneu está instalado em um veículo. Remova-o antes de excluir." },
        { status: 400 }
      );
    }

    // Soft delete
    await db
      .update(tires)
      .set({
        deletedAt: new Date(),
        deletedBy: ctx.userId,
      })
      .where(and(eq(tires.id, tireId), eq(tires.organizationId, ctx.organizationId)));

    return NextResponse.json({
      success: true,
      message: "Pneu excluído com sucesso",
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao excluir pneu:", error);
    return NextResponse.json(
      { error: "Erro ao excluir pneu" },
      { status: 500 }
    );
  }
}










