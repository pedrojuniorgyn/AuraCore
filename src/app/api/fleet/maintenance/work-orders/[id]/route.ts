import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { maintenanceWorkOrders } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar ordem de serviço específica
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const workOrderId = parseInt(resolvedParams.id);
    if (isNaN(workOrderId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const workOrder = await db
      .select()
      .from(maintenanceWorkOrders)
      .where(
        and(
          eq(maintenanceWorkOrders.id, workOrderId),
          eq(maintenanceWorkOrders.organizationId, session.user.organizationId),
          isNull(maintenanceWorkOrders.deletedAt)
        )
      )
      .limit(1);

    if (workOrder.length === 0) {
      return NextResponse.json(
        { error: "Ordem de serviço não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: workOrder[0] });
  } catch (error) {
    console.error("Erro ao buscar ordem de serviço:", error);
    return NextResponse.json(
      { error: "Erro ao buscar ordem de serviço" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar ordem de serviço
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

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
    const existing = await db
      .select()
      .from(maintenanceWorkOrders)
      .where(
        and(
          eq(maintenanceWorkOrders.id, workOrderId),
          eq(maintenanceWorkOrders.organizationId, session.user.organizationId),
          isNull(maintenanceWorkOrders.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Ordem de serviço não encontrada" },
        { status: 404 }
      );
    }

    // Validar mudança de status
    if (body.status && existing[0].status === "COMPLETED" && body.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Não é possível reabrir uma ordem de serviço concluída" },
        { status: 400 }
      );
    }

    // Atualizar
    const updated = await db
      .update(maintenanceWorkOrders)
      .set({
        ...body,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(maintenanceWorkOrders.id, workOrderId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Ordem de serviço atualizada com sucesso",
      data: updated[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar ordem de serviço:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar ordem de serviço" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete da ordem de serviço
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const workOrderId = parseInt(resolvedParams.id);
    if (isNaN(workOrderId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se ordem existe
    const existing = await db
      .select()
      .from(maintenanceWorkOrders)
      .where(
        and(
          eq(maintenanceWorkOrders.id, workOrderId),
          eq(maintenanceWorkOrders.organizationId, session.user.organizationId),
          isNull(maintenanceWorkOrders.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Ordem de serviço não encontrada" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing[0].status === "IN_PROGRESS") {
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
        deletedBy: session.user.id,
      })
      .where(eq(maintenanceWorkOrders.id, workOrderId));

    return NextResponse.json({
      success: true,
      message: "Ordem de serviço excluída com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir ordem de serviço:", error);
    return NextResponse.json(
      { error: "Erro ao excluir ordem de serviço" },
      { status: 500 }
    );
  }
}
