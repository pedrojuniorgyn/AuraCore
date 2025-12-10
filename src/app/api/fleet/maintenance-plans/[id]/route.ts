import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { maintenancePlans } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar plano de manutenção específico
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const planId = parseInt(params.id);
    if (isNaN(planId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const plan = await db
      .select()
      .from(maintenancePlans)
      .where(
        and(
          eq(maintenancePlans.id, planId),
          eq(maintenancePlans.organizationId, session.user.organizationId),
          isNull(maintenancePlans.deletedAt)
        )
      )
      .limit(1);

    if (plan.length === 0) {
      return NextResponse.json(
        { error: "Plano de manutenção não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: plan[0] });
  } catch (error) {
    console.error("Erro ao buscar plano de manutenção:", error);
    return NextResponse.json(
      { error: "Erro ao buscar plano de manutenção" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar plano de manutenção
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const planId = parseInt(params.id);
    if (isNaN(planId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.name || !body.maintenanceType || !body.frequency) {
      return NextResponse.json(
        { error: "Nome, tipo e frequência são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se plano existe
    const existing = await db
      .select()
      .from(maintenancePlans)
      .where(
        and(
          eq(maintenancePlans.id, planId),
          eq(maintenancePlans.organizationId, session.user.organizationId),
          isNull(maintenancePlans.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Plano de manutenção não encontrado" },
        { status: 404 }
      );
    }

    // Atualizar
    const updated = await db
      .update(maintenancePlans)
      .set({
        ...body,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(maintenancePlans.id, planId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Plano de manutenção atualizado com sucesso",
      data: updated[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar plano de manutenção:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar plano de manutenção" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete do plano de manutenção
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const planId = parseInt(params.id);
    if (isNaN(planId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se plano existe
    const existing = await db
      .select()
      .from(maintenancePlans)
      .where(
        and(
          eq(maintenancePlans.id, planId),
          eq(maintenancePlans.organizationId, session.user.organizationId),
          isNull(maintenancePlans.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Plano de manutenção não encontrado" },
        { status: 404 }
      );
    }

    // TODO: Validar se existem ordens de serviço vinculadas a este plano
    // const linkedWorkOrders = await checkLinkedWorkOrders(planId);
    // if (linkedWorkOrders) {
    //   return NextResponse.json(
    //     { error: "Existem ordens de serviço vinculadas a este plano" },
    //     { status: 400 }
    //   );
    // }

    // Soft delete
    await db
      .update(maintenancePlans)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
      })
      .where(eq(maintenancePlans.id, planId));

    return NextResponse.json({
      success: true,
      message: "Plano de manutenção excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir plano de manutenção:", error);
    return NextResponse.json(
      { error: "Erro ao excluir plano de manutenção" },
      { status: 500 }
    );
  }
}
