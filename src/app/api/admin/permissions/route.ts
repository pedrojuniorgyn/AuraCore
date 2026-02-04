import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { permissions } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

/**
 * GET /api/admin/permissions
 * 🔐 Requer permissão: admin.roles.manage
 *
 * Retorna lista completa de permissões do sistema.
 * Usado na UI de configuração de roles.
 */
export async function GET(request: NextRequest) {
  return withPermission(request, "admin.roles.manage", async (_user, _ctx) => {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const data = await db
      .select({
        id: permissions.id,
        slug: permissions.slug,
        description: permissions.description,
      })
      .from(permissions)
      .orderBy(asc(permissions.slug));

    return NextResponse.json({ success: true, data });
  });
}
