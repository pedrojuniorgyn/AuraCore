import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { queryFirst } from "@/lib/db/query-helpers";

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
// GET - Buscar veículo específico
export const GET = withDI(async (
  req: NextRequest,
  context: RouteContext
) => {
  try {
    const resolvedParams = await context.params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const vehicleId = parseInt(resolvedParams.id);
    if (isNaN(vehicleId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const vehicle = await queryFirst<typeof vehicles.$inferSelect>(
      db
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.id, vehicleId),
            eq(vehicles.organizationId, ctx.organizationId),
            isNull(vehicles.deletedAt)
          )
        )
        .orderBy(asc(vehicles.id))
    );

    if (!vehicle) {
      return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: vehicle });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao buscar veículo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar veículo" },
      { status: 500 }
    );
  }
});

// PUT - Atualizar veículo
export const PUT = withDI(async (
  req: NextRequest,
  context: RouteContext
) => {
  try {
    const resolvedParams = await context.params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const vehicleId = parseInt(resolvedParams.id);
    if (isNaN(vehicleId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.plate || !body.type) {
      return NextResponse.json(
        { error: "Placa e tipo são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se veículo existe
    const existing = await queryFirst<typeof vehicles.$inferSelect>(
      db
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.id, vehicleId),
            eq(vehicles.organizationId, ctx.organizationId),
            isNull(vehicles.deletedAt)
          )
        )
        .orderBy(asc(vehicles.id))
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Veículo não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se placa já existe em outro veículo
    if (body.plate !== existing.plate) {
      const duplicatePlate = await queryFirst<typeof vehicles.$inferSelect>(
        db
          .select()
          .from(vehicles)
          .where(
            and(
              eq(vehicles.plate, body.plate),
              eq(vehicles.organizationId, ctx.organizationId),
              isNull(vehicles.deletedAt)
            )
          )
          .orderBy(asc(vehicles.id))
      );

      if (duplicatePlate && duplicatePlate.id !== vehicleId) {
        return NextResponse.json(
          { error: "Já existe um veículo com esta placa" },
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
      .update(vehicles)
      .set({
        ...safeBody,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.organizationId, ctx.organizationId)));

    const rowsAffectedRaw = (updateResult as unknown as Record<string, unknown>).rowsAffected;
    const rowsAffected = Array.isArray(rowsAffectedRaw)
      ? Number(rowsAffectedRaw[0] ?? 0)
      : Number(rowsAffectedRaw ?? 0);
    if (!rowsAffected) {
      return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
    }

    const updated = await queryFirst<typeof vehicles.$inferSelect>(
      db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.id, vehicleId), eq(vehicles.organizationId, ctx.organizationId), isNull(vehicles.deletedAt)))
        .orderBy(asc(vehicles.id))
    );

    return NextResponse.json({
      success: true,
      message: "Veículo atualizado com sucesso",
      data: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao atualizar veículo:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar veículo" },
      { status: 500 }
    );
  }
});

// DELETE - Soft delete do veículo
export const DELETE = withDI(async (
  req: NextRequest,
  context: RouteContext
) => {
  try {
    const resolvedParams = await context.params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const vehicleId = parseInt(resolvedParams.id);
    if (isNaN(vehicleId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se veículo existe
    const existing = await queryFirst<typeof vehicles.$inferSelect>(
      db
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.id, vehicleId),
            eq(vehicles.organizationId, ctx.organizationId),
            isNull(vehicles.deletedAt)
          )
        )
        .orderBy(asc(vehicles.id))
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Veículo não encontrado" },
        { status: 404 }
      );
    }

    // TODO: Adicionar validação se veículo está em viagem ativa
    // const activeTrips = await checkActiveTrips(vehicleId);
    // if (activeTrips) {
    //   return NextResponse.json(
    //     { error: "Veículo está em viagem ativa e não pode ser excluído" },
    //     { status: 400 }
    //   );
    // }

    // Soft delete
    await db
      .update(vehicles)
      .set({
        deletedAt: new Date(),
      })
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.organizationId, ctx.organizationId)));

    return NextResponse.json({
      success: true,
      message: "Veículo excluído com sucesso",
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao excluir veículo:", error);
    return NextResponse.json(
      { error: "Erro ao excluir veículo" },
      { status: 500 }
    );
  }
});










