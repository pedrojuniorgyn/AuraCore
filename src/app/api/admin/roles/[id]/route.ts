import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { roles, rolePermissions, userRoles } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";

/** Roles padrão que não podem ser renomeadas */
const DEFAULT_ROLES = ["ADMIN", "MANAGER", "OPERATOR", "AUDITOR"] as const;

/**
 * PUT /api/admin/roles/[id]
 * 🔐 Requer permissão: admin.roles.manage
 *
 * Edita nome e description de uma role.
 * Roles padrão (ADMIN, MANAGER, OPERATOR, AUDITOR) não podem ser renomeadas.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withPermission(request, "admin.roles.manage", async (_user, _ctx) => {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const { id } = await context.params;
    const roleId = Number(id);

    if (Number.isNaN(roleId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    // Buscar role existente
    const [role] = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
      })
      .from(roles)
      .where(eq(roles.id, roleId));

    if (!role) {
      return NextResponse.json(
        { success: false, error: "Role not found" },
        { status: 404 }
      );
    }

    // Validar se não está tentando renomear role padrão
    const isDefaultRole = DEFAULT_ROLES.includes(
      role.name as (typeof DEFAULT_ROLES)[number]
    );
    if (isDefaultRole && name && name !== role.name) {
      return NextResponse.json(
        { success: false, error: "Cannot rename default role" },
        { status: 403 }
      );
    }

    // Validar nome se fornecido
    const newName = name?.trim();
    if (newName !== undefined && newName.length < 2) {
      return NextResponse.json(
        { success: false, error: "Nome inválido (mínimo 2 caracteres)" },
        { status: 400 }
      );
    }

    // Verificar duplicado se mudando nome
    if (newName && newName !== role.name) {
      const [exists] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.name, newName), ne(roles.id, roleId)));

      if (exists) {
        return NextResponse.json(
          { success: false, error: "Role já existe com este nome" },
          { status: 409 }
        );
      }
    }

    // Atualizar role
    await db
      .update(roles)
      .set({
        name: newName || role.name,
        description: description !== undefined ? description?.trim() || null : role.description,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, roleId));

    // Buscar role atualizada (SQL Server não suporta .returning())
    const [updated] = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
      })
      .from(roles)
      .where(eq(roles.id, roleId));

    return NextResponse.json({ success: true, data: updated });
  });
}

/**
 * DELETE /api/admin/roles/[id]
 * 🔐 Requer permissão: admin.roles.manage
 *
 * Exclui uma role customizada.
 * Roles padrão (ADMIN, MANAGER, OPERATOR, AUDITOR) não podem ser excluídas.
 * Roles em uso (vinculadas a usuários) não podem ser excluídas.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withPermission(request, "admin.roles.manage", async (_user, _ctx) => {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const { id } = await context.params;
    const roleId = Number(id);

    if (Number.isNaN(roleId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    // Buscar role existente
    const [role] = await db
      .select({
        id: roles.id,
        name: roles.name,
      })
      .from(roles)
      .where(eq(roles.id, roleId));

    if (!role) {
      return NextResponse.json(
        { success: false, error: "Role not found" },
        { status: 404 }
      );
    }

    // Validar se não é role padrão
    const isDefaultRole = DEFAULT_ROLES.includes(
      role.name as (typeof DEFAULT_ROLES)[number]
    );
    if (isDefaultRole) {
      return NextResponse.json(
        { success: false, error: "Cannot delete default role" },
        { status: 403 }
      );
    }

    // Verificar se role está em uso por algum usuário
    const usersWithRole = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.roleId, roleId));

    if (usersWithRole.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Role is assigned to ${usersWithRole.length} user(s). Remove assignments first.`,
        },
        { status: 409 }
      );
    }

    // Cascade delete: remover role_permissions
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    // Excluir role
    await db.delete(roles).where(eq(roles.id, roleId));

    return NextResponse.json({ success: true, message: "Role deleted" });
  });
}
