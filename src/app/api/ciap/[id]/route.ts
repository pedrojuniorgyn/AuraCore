import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { ciapAssets } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar ativo CIAP específico
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ciapId = parseInt(params.id);
    if (isNaN(ciapId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const ciap = await db
      .select()
      .from(ciapAssets)
      .where(
        and(
          eq(ciapAssets.id, ciapId),
          eq(ciapAssets.organizationId, session.user.organizationId),
          isNull(ciapAssets.deletedAt)
        )
      )
      .limit(1);

    if (ciap.length === 0) {
      return NextResponse.json(
        { error: "Ativo CIAP não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: ciap[0] });
  } catch (error) {
    console.error("Erro ao buscar ativo CIAP:", error);
    return NextResponse.json(
      { error: "Erro ao buscar ativo CIAP" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar ativo CIAP
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ciapId = parseInt(params.id);
    if (isNaN(ciapId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.description || !body.acquisitionDate) {
      return NextResponse.json(
        { error: "Descrição e data de aquisição são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se ativo existe
    const existing = await db
      .select()
      .from(ciapAssets)
      .where(
        and(
          eq(ciapAssets.id, ciapId),
          eq(ciapAssets.organizationId, session.user.organizationId),
          isNull(ciapAssets.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Ativo CIAP não encontrado" },
        { status: 404 }
      );
    }

    // Validar se já foi finalizado o período de crédito
    if (existing[0].remainingMonths === 0 && existing[0].status === "COMPLETED") {
      return NextResponse.json(
        { error: "Não é possível editar ativo com crédito já finalizado" },
        { status: 400 }
      );
    }

    // Atualizar
    const updated = await db
      .update(ciapAssets)
      .set({
        ...body,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(ciapAssets.id, ciapId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Ativo CIAP atualizado com sucesso",
      data: updated[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar ativo CIAP:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar ativo CIAP" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete do ativo CIAP
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ciapId = parseInt(params.id);
    if (isNaN(ciapId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se ativo existe
    const existing = await db
      .select()
      .from(ciapAssets)
      .where(
        and(
          eq(ciapAssets.id, ciapId),
          eq(ciapAssets.organizationId, session.user.organizationId),
          isNull(ciapAssets.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Ativo CIAP não encontrado" },
        { status: 404 }
      );
    }

    // Validar se já houve apropriação de crédito
    if (existing[0].appropriatedMonths > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir ativo com créditos já apropriados" },
        { status: 400 }
      );
    }

    // Soft delete
    await db
      .update(ciapAssets)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
      })
      .where(eq(ciapAssets.id, ciapId));

    return NextResponse.json({
      success: true,
      message: "Ativo CIAP excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir ativo CIAP:", error);
    return NextResponse.json(
      { error: "Erro ao excluir ativo CIAP" },
      { status: 500 }
    );
  }
}
