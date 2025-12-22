import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { accounts, sessions, userBranches, userRoles, users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

/**
 * DELETE /api/admin/users/:id
 * Soft delete de usuário (multi-tenant) + revogação de sessões.
 * 🔐 Requer permissão: admin.users.manage
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withPermission(request, "admin.users.manage", async (_user, ctx) => {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const { id } = await context.params;

    // Não permitir deletar a si mesmo
    if (id === ctx.userId) {
      return NextResponse.json({ error: "Você não pode excluir sua própria conta" }, { status: 400 });
    }

    // Validar usuário no mesmo tenant e não deletado
    const target = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, id), eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt)));

    if (target.length === 0) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // 1) Revogar sessões (impede continuar logado)
    await db.delete(sessions).where(eq(sessions.userId, id));

    // 2) Remover vínculos OAuth (ex: Google) para impedir novo login via provider
    await db.delete(accounts).where(eq(accounts.userId, id));

    // 3) Remover RBAC/escopo por filial (higiene + segurança)
    await db.delete(userRoles).where(and(eq(userRoles.userId, id), eq(userRoles.organizationId, ctx.organizationId)));
    await db.delete(userBranches).where(eq(userBranches.userId, id));

    // 4) Soft delete do usuário
    await db
      .update(users)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, id), eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt)));

    return NextResponse.json({ success: true });
  });
}

