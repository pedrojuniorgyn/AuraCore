import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceWorkOrders } from "@/lib/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { queryFirst } from "@/lib/db/query-helpers";

import { logger } from '@/shared/infrastructure/logging';
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
// GET - Buscar ordem de serviço específica
export const GET = withDI(async (
  req: NextRequest,
  context: RouteContext
) => {
  try {
    const resolvedParams = await context.params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const workOrderId = parseInt(resolvedParams.id);
    if (isNaN(workOrderId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const workOrder = await queryFirst<typeof maintenanceWorkOrders.$inferSelect>(db
      .select()
      .from(maintenanceWorkOrders)
      .where(
        and(
          eq(maintenanceWorkOrders.id, workOrderId),
          eq(maintenanceWorkOrders.organizationId, ctx.organizationId),
          isNull(maintenanceWorkOrders.deletedAt)
        )
      )
      .orderBy(asc(maintenanceWorkOrders.id))
      );

    if (!workOrder) {
      return NextResponse.json(
        { error: "Ordem de serviço não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: workOrder });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao buscar ordem de serviço:", error);
    return NextResponse.json(
      { error: "Erro ao buscar ordem de serviço" },
      { status: 500 }
    );
  }
});

// PUT - Atualizar ordem de serviço
export const PUT = withDI(async (
  req: NextRequest,
  context: RouteContext
) => {
  try {
    const resolvedParams = await context.params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const workOrderId = parseInt(resolvedParams.id);
    if (isNaN(workOrderId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.vehicleId || !body.type) {
      return NextResponse.json(
        { error: "Veículo e tipo são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se ordem existe
    const existing = await queryFirst<typeof maintenanceWorkOrders.$inferSelect>(db
      .select()
      .from(maintenanceWorkOrders)
      .where(
        and(
          eq(maintenanceWorkOrders.id, workOrderId),
          eq(maintenanceWorkOrders.organizationId, ctx.organizationId),
          isNull(maintenanceWorkOrders.deletedAt)
        )
      )
      .orderBy(asc(maintenanceWorkOrders.id))
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Ordem de serviço não encontrada" },
        { status: 404 }
      );
    }

    // Validar mudança de status
    if (body.status && existing.status === "COMPLETED" && body.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Não é possível reabrir uma ordem de serviço concluída" },
        { status: 400 }
      );
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
      .update(maintenanceWorkOrders)
      .set({
        ...safeBody,
        updatedAt: new Date(),
      })
      .where(and(eq(maintenanceWorkOrders.id, workOrderId), eq(maintenanceWorkOrders.organizationId, ctx.organizationId)));

    const rowsAffectedRaw = (updateResult as unknown as Record<string, unknown>).rowsAffected;
    const rowsAffected = Array.isArray(rowsAffectedRaw)
      ? Number(rowsAffectedRaw[0] ?? 0)
      : Number(rowsAffectedRaw ?? 0);
    if (!rowsAffected) {
      return NextResponse.json(
        { error: "Ordem de serviço não encontrada" },
        { status: 404 }
      );
    }

    const updated = await queryFirst<typeof maintenanceWorkOrders.$inferSelect>(db
      .select()
      .from(maintenanceWorkOrders)
      .where(and(eq(maintenanceWorkOrders.id, workOrderId), eq(maintenanceWorkOrders.organizationId, ctx.organizationId), isNull(maintenanceWorkOrders.deletedAt)))
      .orderBy(asc(maintenanceWorkOrders.id))
      );

    return NextResponse.json({
      success: true,
      message: "Ordem de serviço atualizada com sucesso",
      data: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao atualizar ordem de serviço:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar ordem de serviço" },
      { status: 500 }
    );
  }
});

// DELETE - Soft delete da ordem de serviço
export const DELETE = withDI(async (
  req: NextRequest,
  context: RouteContext
) => {
  try {
    const resolvedParams = await context.params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const workOrderId = parseInt(resolvedParams.id);
    if (isNaN(workOrderId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se ordem existe
    const existing = await queryFirst<typeof maintenanceWorkOrders.$inferSelect>(db
      .select()
      .from(maintenanceWorkOrders)
      .where(
        and(
          eq(maintenanceWorkOrders.id, workOrderId),
          eq(maintenanceWorkOrders.organizationId, ctx.organizationId),
          isNull(maintenanceWorkOrders.deletedAt)
        )
      )
      .orderBy(asc(maintenanceWorkOrders.id))
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Ordem de serviço não encontrada" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing.status === "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Não é possível excluir ordem de serviço em andamento" },
        { status: 400 }
      );
    }

    // Soft delete
    await db
      .update(maintenanceWorkOrders)
      .set({
        deletedAt: new Date(),
      })
      .where(and(eq(maintenanceWorkOrders.id, workOrderId), eq(maintenanceWorkOrders.organizationId, ctx.organizationId)));

    return NextResponse.json({
      success: true,
      message: "Ordem de serviço excluída com sucesso",
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    logger.error("Erro ao excluir ordem de serviço:", error);
    return NextResponse.json(
      { error: "Erro ao excluir ordem de serviço" },
      { status: 500 }
    );
  }
});










