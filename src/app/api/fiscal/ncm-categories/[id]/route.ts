import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { ncmCategories } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar categoria NCM específica
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const category = await db
      .select()
      .from(ncmCategories)
      .where(
        and(
          eq(ncmCategories.id, categoryId),
          eq(ncmCategories.organizationId, session.user.organizationId),
          isNull(ncmCategories.deletedAt)
        )
      )
      .limit(1);

    if (category.length === 0) {
      return NextResponse.json(
        { error: "Categoria NCM não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: category[0] });
  } catch (error) {
    console.error("Erro ao buscar categoria NCM:", error);
    return NextResponse.json(
      { error: "Erro ao buscar categoria NCM" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar categoria NCM
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.name || !body.ncmCode) {
      return NextResponse.json(
        { error: "Nome e código NCM são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se categoria existe
    const existing = await db
      .select()
      .from(ncmCategories)
      .where(
        and(
          eq(ncmCategories.id, categoryId),
          eq(ncmCategories.organizationId, session.user.organizationId),
          isNull(ncmCategories.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Categoria NCM não encontrada" },
        { status: 404 }
      );
    }

    // Atualizar
    const updated = await db
      .update(ncmCategories)
      .set({
        ...body,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(ncmCategories.id, categoryId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Categoria NCM atualizada com sucesso",
      data: updated[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar categoria NCM:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar categoria NCM" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete da categoria NCM
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const categoryId = parseInt(params.id);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se categoria existe
    const existing = await db
      .select()
      .from(ncmCategories)
      .where(
        and(
          eq(ncmCategories.id, categoryId),
          eq(ncmCategories.organizationId, session.user.organizationId),
          isNull(ncmCategories.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Categoria NCM não encontrada" },
        { status: 404 }
      );
    }

    // TODO: Validar se existem produtos usando esta categoria
    // const linkedProducts = await checkLinkedProducts(categoryId);
    // if (linkedProducts) {
    //   return NextResponse.json(
    //     { error: "Existem produtos vinculados a esta categoria" },
    //     { status: 400 }
    //   );
    // }

    // Soft delete
    await db
      .update(ncmCategories)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
      })
      .where(eq(ncmCategories.id, categoryId));

    return NextResponse.json({
      success: true,
      message: "Categoria NCM excluída com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir categoria NCM:", error);
    return NextResponse.json(
      { error: "Erro ao excluir categoria NCM" },
      { status: 500 }
    );
  }
}
