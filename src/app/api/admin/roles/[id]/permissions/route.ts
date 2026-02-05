import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { roles, permissions, rolePermissions } from "@/lib/db/schema";
import { asc, eq, inArray } from "drizzle-orm";

/**
 * GET /api/admin/roles/[id]/permissions
 * 🔐 Requer permissão: admin.roles.manage
 *
 * Lista todas as permissões atribuídas a uma role.
 * Usado no modal de gerenciamento de permissões.
 */
export async function GET(
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

    // Verificar se role existe
    const [role] = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, roleId));

    if (!role) {
      return NextResponse.json(
        { success: false, error: "Role not found" },
        { status: 404 }
      );
    }

    // Buscar permissões do role via join
    const rolePerms = await db
      .select({
        id: permissions.id,
        slug: permissions.slug,
        description: permissions.description,
        module: permissions.module,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId))
      .orderBy(asc(permissions.slug));

    return NextResponse.json({
      success: true,
      data: {
        role: { id: role.id, name: role.name },
        permissions: rolePerms,
      },
    });
  });
}

/**
 * PUT /api/admin/roles/[id]/permissions
 * 🔐 Requer permissão: admin.roles.manage
 *
 * Atualiza as permissões de uma role.
 * Substitui todas as permissões atuais pelas novas.
 * Enviar array vazio remove todas as permissões.
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
    const { permissionIds } = body as { permissionIds: number[] };

    // Validar permissionIds é array
    if (!Array.isArray(permissionIds)) {
      return NextResponse.json(
        { success: false, error: "permissionIds deve ser um array de números" },
        { status: 400 }
      );
    }

    // Verificar se role existe
    const [role] = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, roleId));

    if (!role) {
      return NextResponse.json(
        { success: false, error: "Role not found" },
        { status: 404 }
      );
    }

    // Validar se todos os permissionIds existem ANTES de modificar dados
    if (permissionIds.length > 0) {
      const validPerms = await db
        .select({ id: permissions.id })
        .from(permissions)
        .where(inArray(permissions.id, permissionIds));

      if (validPerms.length !== permissionIds.length) {
        const validIds = new Set(validPerms.map((p) => p.id));
        const invalidIds = permissionIds.filter((id) => !validIds.has(id));
        
        return NextResponse.json(
          {
            success: false,
            error: "Alguns IDs de permissões não existem",
            invalidIds,
          },
          { status: 400 }
        );
      }
    }

    // Remover todas permissões atuais do role
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    // Inserir novas permissões (batch insert)
    if (permissionIds.length > 0) {
      const values = permissionIds.map((permId) => ({
        roleId: roleId,
        permissionId: permId,
      }));
      await db.insert(rolePermissions).values(values);
    }

    // Buscar permissões atualizadas para retornar
    const updatedPerms = await db
      .select({
        id: permissions.id,
        slug: permissions.slug,
        description: permissions.description,
        module: permissions.module,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId))
      .orderBy(asc(permissions.slug));

    return NextResponse.json({
      success: true,
      message: "Permissions updated",
      data: {
        role: { id: role.id, name: role.name },
        permissions: updatedPerms,
      },
    });
  });
}
