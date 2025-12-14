import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar viagem específica
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

    const tripId = parseInt(resolvedParams.id);
    if (isNaN(tripId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const trip = await db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.id, tripId),
          eq(trips.organizationId, session.user.organizationId),
          isNull(trips.deletedAt)
        )
      )
      .limit(1);

    if (trip.length === 0) {
      return NextResponse.json(
        { error: "Viagem não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: trip[0] });
  } catch (error) {
    console.error("Erro ao buscar viagem:", error);
    return NextResponse.json(
      { error: "Erro ao buscar viagem" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar viagem
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

    const tripId = parseInt(resolvedParams.id);
    if (isNaN(tripId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.vehicleId || !body.driverId) {
      return NextResponse.json(
        { error: "Veículo e motorista são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se viagem existe
    const existing = await db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.id, tripId),
          eq(trips.organizationId, session.user.organizationId),
          isNull(trips.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Viagem não encontrada" },
        { status: 404 }
      );
    }

    // Validar mudança de status
    if (body.status === "COMPLETED" && existing[0].status !== "IN_TRANSIT") {
      return NextResponse.json(
        { error: "Apenas viagens em trânsito podem ser concluídas" },
        { status: 400 }
      );
    }

    if (body.status === "CANCELED" && existing[0].status === "COMPLETED") {
      return NextResponse.json(
        { error: "Não é possível cancelar viagem já concluída" },
        { status: 400 }
      );
    }

    // Atualizar
    const updated = await db
      .update(trips)
      .set({
        ...body,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(trips.id, tripId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Viagem atualizada com sucesso",
      data: updated[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar viagem:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar viagem" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete da viagem
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

    const tripId = parseInt(resolvedParams.id);
    if (isNaN(tripId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se viagem existe
    const existing = await db
      .select()
      .from(trips)
      .where(
        and(
          eq(trips.id, tripId),
          eq(trips.organizationId, session.user.organizationId),
          isNull(trips.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Viagem não encontrada" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing[0].status === "IN_TRANSIT") {
      return NextResponse.json(
        { error: "Não é possível excluir viagem em trânsito" },
        { status: 400 }
      );
    }

    if (existing[0].status === "COMPLETED") {
      return NextResponse.json(
        { error: "Não é possível excluir viagem já concluída" },
        { status: 400 }
      );
    }

    // TODO: Validar se existem CTes vinculados
    // const linkedCtes = await checkLinkedCtes(tripId);
    // if (linkedCtes) {
    //   return NextResponse.json(
    //     { error: "Existem CTes vinculados a esta viagem" },
    //     { status: 400 }
    //   );
    // }

    // Soft delete
    await db
      .update(trips)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
      })
      .where(eq(trips.id, tripId));

    return NextResponse.json({
      success: true,
      message: "Viagem excluída com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir viagem:", error);
    return NextResponse.json(
      { error: "Erro ao excluir viagem" },
      { status: 500 }
    );
  }
}









