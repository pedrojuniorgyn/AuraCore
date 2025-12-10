import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { driverJourney } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar jornada de motorista específica
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const journeyId = parseInt(params.id);
    if (isNaN(journeyId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const journey = await db
      .select()
      .from(driverJourney)
      .where(
        and(
          eq(driverJourney.id, journeyId),
          eq(driverJourney.organizationId, session.user.organizationId),
          isNull(driverJourney.deletedAt)
        )
      )
      .limit(1);

    if (journey.length === 0) {
      return NextResponse.json(
        { error: "Jornada não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: journey[0] });
  } catch (error) {
    console.error("Erro ao buscar jornada:", error);
    return NextResponse.json(
      { error: "Erro ao buscar jornada" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar jornada de motorista
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const journeyId = parseInt(params.id);
    if (isNaN(journeyId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.driverId || !body.eventType) {
      return NextResponse.json(
        { error: "Motorista e tipo de evento são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se jornada existe
    const existing = await db
      .select()
      .from(driverJourney)
      .where(
        and(
          eq(driverJourney.id, journeyId),
          eq(driverJourney.organizationId, session.user.organizationId),
          isNull(driverJourney.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Jornada não encontrada" },
        { status: 404 }
      );
    }

    // Atualizar
    const updated = await db
      .update(driverJourney)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(driverJourney.id, journeyId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Jornada atualizada com sucesso",
      data: updated[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar jornada:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar jornada" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete da jornada
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const journeyId = parseInt(params.id);
    if (isNaN(journeyId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se jornada existe
    const existing = await db
      .select()
      .from(driverJourney)
      .where(
        and(
          eq(driverJourney.id, journeyId),
          eq(driverJourney.organizationId, session.user.organizationId),
          isNull(driverJourney.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Jornada não encontrada" },
        { status: 404 }
      );
    }

    // Validar: jornadas são registros legais (Lei 13.103/2015)
    // Em produção, considere não permitir exclusão, apenas correção
    const daysSinceCreated = Math.floor(
      (new Date().getTime() - existing[0].createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreated > 7) {
      return NextResponse.json(
        { error: "Não é possível excluir registros de jornada com mais de 7 dias (requisito legal)" },
        { status: 400 }
      );
    }

    // Soft delete
    await db
      .update(driverJourney)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(driverJourney.id, journeyId));

    return NextResponse.json({
      success: true,
      message: "Registro de jornada excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir jornada:", error);
    return NextResponse.json(
      { error: "Erro ao excluir jornada" },
      { status: 500 }
    );
  }
}
