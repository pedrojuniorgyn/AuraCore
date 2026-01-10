import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drivers } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { queryFirst } from "@/lib/db/query-helpers";

// GET - Buscar motorista específico
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const driverId = parseInt(resolvedParams.id);
    if (isNaN(driverId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const driver = await queryFirst<typeof drivers.$inferSelect>(
      db
        .select()
        .from(drivers)
        .where(
          and(
            eq(drivers.id, driverId),
            eq(drivers.organizationId, ctx.organizationId),
            isNull(drivers.deletedAt)
          )
        )
    );

    if (!driver) {
      return NextResponse.json(
        { error: "Motorista não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: driver });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao buscar motorista:", error);
    return NextResponse.json(
      { error: "Erro ao buscar motorista" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar motorista
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const driverId = parseInt(resolvedParams.id);
    if (isNaN(driverId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.name || !body.cpf || !body.cnhNumber) {
      return NextResponse.json(
        { error: "Nome, CPF e CNH são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se motorista existe
    const existing = await queryFirst<typeof drivers.$inferSelect>(
      db
        .select()
        .from(drivers)
        .where(
          and(
            eq(drivers.id, driverId),
            eq(drivers.organizationId, ctx.organizationId),
            isNull(drivers.deletedAt)
          )
        )
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Motorista não encontrado" },
        { status: 404 }
      );
    }

    // Verificar CPF duplicado
    if (body.cpf !== existing.cpf) {
      const duplicateCpf = await queryFirst<typeof drivers.$inferSelect>(
        db
          .select()
          .from(drivers)
          .where(
            and(
              eq(drivers.cpf, body.cpf),
              eq(drivers.organizationId, ctx.organizationId),
              isNull(drivers.deletedAt)
            )
          )
      );

      if (duplicateCpf && duplicateCpf.id !== driverId) {
        return NextResponse.json(
          { error: "Já existe um motorista com este CPF" },
          { status: 400 }
        );
      }
    }

    // Verificar CNH duplicada
    if (body.cnhNumber !== existing.cnhNumber) {
      const duplicateCnh = await queryFirst<typeof drivers.$inferSelect>(
        db
          .select()
          .from(drivers)
          .where(
            and(
              eq(drivers.cnhNumber, body.cnhNumber),
              eq(drivers.organizationId, ctx.organizationId),
              isNull(drivers.deletedAt)
            )
          )
      );

      if (duplicateCnh && duplicateCnh.id !== driverId) {
        return NextResponse.json(
          { error: "Já existe um motorista com esta CNH" },
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
      .update(drivers)
      .set({
        ...safeBody,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(drivers.id, driverId), eq(drivers.organizationId, ctx.organizationId)));

    const rowsAffectedRaw = (updateResult as unknown as Record<string, unknown>).rowsAffected;
    const rowsAffected = Array.isArray(rowsAffectedRaw)
      ? Number(rowsAffectedRaw[0] ?? 0)
      : Number(rowsAffectedRaw ?? 0);
    if (!rowsAffected) {
      return NextResponse.json({ error: "Motorista não encontrado" }, { status: 404 });
    }

    const updated = await queryFirst<typeof drivers.$inferSelect>(
      db
        .select()
        .from(drivers)
        .where(and(eq(drivers.id, driverId), eq(drivers.organizationId, ctx.organizationId), isNull(drivers.deletedAt)))
    );

    return NextResponse.json({
      success: true,
      message: "Motorista atualizado com sucesso",
      data: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao atualizar motorista:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar motorista" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete do motorista
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const driverId = parseInt(resolvedParams.id);
    if (isNaN(driverId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se motorista existe
    const existing = await queryFirst<typeof drivers.$inferSelect>(
      db
        .select()
        .from(drivers)
        .where(
          and(
            eq(drivers.id, driverId),
            eq(drivers.organizationId, ctx.organizationId),
            isNull(drivers.deletedAt)
          )
        )
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Motorista não encontrado" },
        { status: 404 }
      );
    }

    // TODO: Validar se motorista está em viagem ativa
    // const activeTrips = await checkActiveTripsForDriver(driverId);
    // if (activeTrips) {
    //   return NextResponse.json(
    //     { error: "Motorista está em viagem ativa e não pode ser excluído" },
    //     { status: 400 }
    //   );
    // }

    // Soft delete
    await db
      .update(drivers)
      .set({
        deletedAt: new Date(),
      })
      .where(and(eq(drivers.id, driverId), eq(drivers.organizationId, ctx.organizationId)));

    return NextResponse.json({
      success: true,
      message: "Motorista excluído com sucesso",
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao excluir motorista:", error);
    return NextResponse.json(
      { error: "Erro ao excluir motorista" },
      { status: 500 }
    );
  }
}










