import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar usuário específico
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

    const userId = resolvedParams.id;

    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        organizationId: users.organizationId,
        branchId: users.branchId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, session.user.organizationId),
          isNull(users.deletedAt)
        )
      )
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user[0] });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao buscar usuário" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar usuário
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

    // Apenas ADMIN pode editar usuários
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem editar usuários" },
        { status: 403 }
      );
    }

    const userId = resolvedParams.id;
    const body = await req.json();

    // Validações básicas
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: "Nome e email são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se usuário existe
    const existing = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, session.user.organizationId),
          isNull(users.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Verificar email duplicado
    if (body.email !== existing[0].email) {
      const duplicateEmail = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.email, body.email),
            eq(users.organizationId, session.user.organizationId),
            isNull(users.deletedAt)
          )
        )
        .limit(1);

      if (duplicateEmail.length > 0 && duplicateEmail[0].id !== userId) {
        return NextResponse.json(
          { error: "Já existe um usuário com este email" },
          { status: 400 }
        );
      }
    }

    // Não permitir que usuário mude seu próprio role para ADMIN
    if (session.user.id === userId && body.role === "ADMIN" && existing[0].role !== "ADMIN") {
      return NextResponse.json(
        { error: "Você não pode promover a si mesmo para administrador" },
        { status: 400 }
      );
    }

    // Atualizar (sem password)
    const { password, ...dataToUpdate } = body;
    
    const updated = await db
      .update(users)
      .set({
        ...dataToUpdate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      });

    return NextResponse.json({
      success: true,
      message: "Usuário atualizado com sucesso",
      data: updated[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar usuário" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete do usuário
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

    // Apenas ADMIN pode excluir usuários
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem excluir usuários" },
        { status: 403 }
      );
    }

    const userId = resolvedParams.id;

    // Não permitir que usuário exclua a si mesmo
    if (session.user.id === userId) {
      return NextResponse.json(
        { error: "Você não pode excluir sua própria conta" },
        { status: 400 }
      );
    }

    // Verificar se usuário existe
    const existing = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, session.user.organizationId),
          isNull(users.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Soft delete
    await db
      .update(users)
      .set({
        deletedAt: new Date(),
        status: "INACTIVE",
      })
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      message: "Usuário excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return NextResponse.json(
      { error: "Erro ao excluir usuário" },
      { status: 500 }
    );
  }
}


