import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { inventoryCounts } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar contagem de inventário específica
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const countId = parseInt(params.id);
    if (isNaN(countId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const count = await db
      .select()
      .from(inventoryCounts)
      .where(
        and(
          eq(inventoryCounts.id, countId),
          eq(inventoryCounts.organizationId, session.user.organizationId),
          isNull(inventoryCounts.deletedAt)
        )
      )
      .limit(1);

    if (count.length === 0) {
      return NextResponse.json(
        { error: "Contagem de inventário não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: count[0] });
  } catch (error) {
    console.error("Erro ao buscar contagem:", error);
    return NextResponse.json(
      { error: "Erro ao buscar contagem" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar contagem de inventário
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const countId = parseInt(params.id);
    if (isNaN(countId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.warehouseId || !body.countType) {
      return NextResponse.json(
        { error: "Armazém e tipo de contagem são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se contagem existe
    const existing = await db
      .select()
      .from(inventoryCounts)
      .where(
        and(
          eq(inventoryCounts.id, countId),
          eq(inventoryCounts.organizationId, session.user.organizationId),
          isNull(inventoryCounts.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Contagem não encontrada" },
        { status: 404 }
      );
    }

    // Validar se já foi finalizada
    if (existing[0].status === "COMPLETED") {
      return NextResponse.json(
        { error: "Não é possível editar contagem já finalizada" },
        { status: 400 }
      );
    }

    // Atualizar
    const updated = await db
      .update(inventoryCounts)
      .set({
        ...body,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(inventoryCounts.id, countId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Contagem atualizada com sucesso",
      data: updated[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar contagem:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar contagem" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete da contagem
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const countId = parseInt(params.id);
    if (isNaN(countId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se contagem existe
    const existing = await db
      .select()
      .from(inventoryCounts)
      .where(
        and(
          eq(inventoryCounts.id, countId),
          eq(inventoryCounts.organizationId, session.user.organizationId),
          isNull(inventoryCounts.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Contagem não encontrada" },
        { status: 404 }
      );
    }

    // Validar se já foi finalizada
    if (existing[0].status === "COMPLETED") {
      return NextResponse.json(
        { error: "Não é possível excluir contagem já finalizada. Os ajustes de estoque já foram aplicados." },
        { status: 400 }
      );
    }

    // Soft delete
    await db
      .update(inventoryCounts)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
      })
      .where(eq(inventoryCounts.id, countId));

    return NextResponse.json({
      success: true,
      message: "Contagem excluída com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir contagem:", error);
    return NextResponse.json(
      { error: "Erro ao excluir contagem" },
      { status: 500 }
    );
  }
}
