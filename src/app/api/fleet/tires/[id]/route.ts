import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tires } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar pneu específico
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

    const tireId = parseInt(resolvedParams.id);
    if (isNaN(tireId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const tire = await db
      .select()
      .from(tires)
      .where(
        and(
          eq(tires.id, tireId),
          eq(tires.organizationId, session.user.organizationId),
          isNull(tires.deletedAt)
        )
      )
      .limit(1);

    if (tire.length === 0) {
      return NextResponse.json({ error: "Pneu não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tire[0] });
  } catch (error) {
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
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

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
    const existing = await db
      .select()
      .from(tires)
      .where(
        and(
          eq(tires.id, tireId),
          eq(tires.organizationId, session.user.organizationId),
          isNull(tires.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Pneu não encontrado" },
        { status: 404 }
      );
    }

    // Verificar número de série duplicado
    if (body.serialNumber !== existing[0].serialNumber) {
      const duplicateSerial = await db
        .select()
        .from(tires)
        .where(
          and(
            eq(tires.serialNumber, body.serialNumber),
            eq(tires.organizationId, session.user.organizationId),
            isNull(tires.deletedAt)
          )
        )
        .limit(1);

      if (duplicateSerial.length > 0 && duplicateSerial[0].id !== tireId) {
        return NextResponse.json(
          { error: "Já existe um pneu com este número de série" },
          { status: 400 }
        );
      }
    }

    // Atualizar
    const updated = await db
      .update(tires)
      .set({
        ...body,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(tires.id, tireId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Pneu atualizado com sucesso",
      data: updated[0],
    });
  } catch (error) {
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
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const tireId = parseInt(resolvedParams.id);
    if (isNaN(tireId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se pneu existe
    const existing = await db
      .select()
      .from(tires)
      .where(
        and(
          eq(tires.id, tireId),
          eq(tires.organizationId, session.user.organizationId),
          isNull(tires.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
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
        deletedBy: session.user.id,
      })
      .where(eq(tires.id, tireId));

    return NextResponse.json({
      success: true,
      message: "Pneu excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir pneu:", error);
    return NextResponse.json(
      { error: "Erro ao excluir pneu" },
      { status: 500 }
    );
  }
}



