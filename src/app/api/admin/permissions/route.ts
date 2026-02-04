import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { permissions } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

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

/**
 * POST /api/admin/permissions
 * 🔐 Requer permissão: admin.roles.manage
 *
 * Cria nova permissão no sistema.
 * Slug deve seguir formato: lowercase, números, dots, underscores.
 */
export async function POST(request: NextRequest) {
  return withPermission(request, "admin.roles.manage", async (_user, _ctx) => {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const body = await request.json();
    const { slug, description } = body;

    // Validação slug (lowercase, números, dots, underscores)
    if (!slug || typeof slug !== "string" || !slug.match(/^[a-z0-9._]+$/)) {
      return NextResponse.json(
        {
          success: false,
          error: "Slug inválido (use lowercase, números, dots, underscores)",
        },
        { status: 400 }
      );
    }

    const trimmedSlug = slug.trim();

    // Verificar duplicado
    const [exists] = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.slug, trimmedSlug));

    if (exists) {
      return NextResponse.json(
        { success: false, error: "Permission já existe com este slug" },
        { status: 409 }
      );
    }

    // Criar permissão
    await db.insert(permissions).values({
      slug: trimmedSlug,
      description: description?.trim() || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Buscar permissão criada (SQL Server não suporta .returning())
    const [created] = await db
      .select({
        id: permissions.id,
        slug: permissions.slug,
        description: permissions.description,
      })
      .from(permissions)
      .where(eq(permissions.slug, trimmedSlug));

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  });
}
