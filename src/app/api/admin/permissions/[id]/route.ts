import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { permissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * PUT /api/admin/permissions/[id]
 * 🔐 Requer permissão: admin.roles.manage
 *
 * Edita apenas description de uma permissão.
 * O slug é imutável e não pode ser alterado.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withPermission(request, "admin.roles.manage", async (_user, _ctx) => {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const { id } = await context.params;
    const permissionId = Number(id);

    if (Number.isNaN(permissionId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { description } = body;

    // Buscar permission existente
    const [perm] = await db
      .select({
        id: permissions.id,
        slug: permissions.slug,
        description: permissions.description,
      })
      .from(permissions)
      .where(eq(permissions.id, permissionId));

    if (!perm) {
      return NextResponse.json(
        { success: false, error: "Permission not found" },
        { status: 404 }
      );
    }

    // Atualizar apenas description (slug é imutável)
    await db
      .update(permissions)
      .set({
        description:
          description !== undefined ? description?.trim() || null : perm.description,
        updatedAt: new Date(),
      })
      .where(eq(permissions.id, permissionId));

    // Buscar permission atualizada (SQL Server não suporta .returning())
    const [updated] = await db
      .select({
        id: permissions.id,
        slug: permissions.slug,
        description: permissions.description,
      })
      .from(permissions)
      .where(eq(permissions.id, permissionId));

    return NextResponse.json({ success: true, data: updated });
  });
}
