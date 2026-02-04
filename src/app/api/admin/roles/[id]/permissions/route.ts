import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { roles, permissions, rolePermissions } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

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
