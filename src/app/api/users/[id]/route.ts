import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { queryFirst } from "@/lib/db/query-helpers";

// GET - Buscar usuário específico
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = resolvedParams.id;

    const user = await queryFirst<{
      id: string;
      name: string;
      email: string;
      role: string;
      organizationId: number;
      defaultBranchId: number | null;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    }>(
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          organizationId: users.organizationId,
          defaultBranchId: users.defaultBranchId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          deletedAt: users.deletedAt,
        })
        .from(users)
        .where(
          and(
            eq(users.id, userId),
            eq(users.organizationId, session.user.organizationId),
            isNull(users.deletedAt)
          )
        )
    );

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
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
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
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
    const existing = await queryFirst<typeof users.$inferSelect>(
      db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, userId),
            eq(users.organizationId, session.user.organizationId),
            isNull(users.deletedAt)
          )
        )
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Verificar email duplicado
    if (body.email !== existing.email) {
      const duplicateEmail = await queryFirst<typeof users.$inferSelect>(
        db
          .select()
          .from(users)
          .where(
            and(
              eq(users.email, body.email),
              eq(users.organizationId, session.user.organizationId),
              isNull(users.deletedAt)
            )
          )
      );

      if (duplicateEmail && duplicateEmail.id !== userId) {
        return NextResponse.json(
          { error: "Já existe um usuário com este email" },
          { status: 400 }
        );
      }
    }

    // Não permitir que usuário mude seu próprio role para ADMIN
    const existingData = (existing.recordset || existing) as Array<{ role?: string }>;
    if (session.user.id === userId && body.role === "ADMIN" && existingData[0]?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Você não pode promover a si mesmo para administrador" },
        { status: 400 }
      );
    }

    // Atualizar (sem password)
    const {
      password,
      // ⚠️ Campos sensíveis (não devem ser alterados via request body)
      organizationId: _organizationId,
      branchId: _branchId,
      createdBy: _createdBy,
      updatedBy: _updatedBy,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      deletedAt: _deletedAt,
      deletedBy: _deletedBy,
      version: _version,
      ...safeBody
    } = (body ?? {}) as Record<string, unknown>;
    
    await db
      .update(users)
      .set({
        ...safeBody,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, session.user.organizationId),
          isNull(users.deletedAt)
        )
      );

    // SQL Server: buscar após update (sem returning)
    const updated = await queryFirst<{
      id: string;
      name: string;
      email: string;
      role: string;
      deletedAt: Date | null;
    }>(
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          deletedAt: users.deletedAt,
        })
        .from(users)
        .where(
          and(
            eq(users.id, userId),
            eq(users.organizationId, session.user.organizationId),
            isNull(users.deletedAt)
          )
        )
    );

    return NextResponse.json({
      success: true,
      message: "Usuário atualizado com sucesso",
      data: updated,
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
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
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
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
    const existing = await queryFirst<typeof users.$inferSelect>(
      db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, userId),
            eq(users.organizationId, session.user.organizationId),
            isNull(users.deletedAt)
          )
        )
    );

    if (!existing) {
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
      })
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, session.user.organizationId),
          isNull(users.deletedAt)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Usuário excluído com sucesso",
    });
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao excluir usuário:", error);
    return NextResponse.json(
      { error: "Erro ao excluir usuário" },
      { status: 500 }
    );
  }
}









