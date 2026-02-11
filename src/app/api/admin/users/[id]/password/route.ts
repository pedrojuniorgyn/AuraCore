import { NextRequest, NextResponse } from "next/server";
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { z } from "zod";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { hash } from "bcryptjs";

import { logger } from '@/shared/infrastructure/logging';
const putSchema = z.object({
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

/**
 * PUT /api/admin/users/:id/password
 * Define/reset a senha (password_hash) para login via Credentials.
 * 🔐 Requer permissão: admin.users.manage
 */
export const PUT = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  return withPermission(request, "admin.users.manage", async (_user, ctx) => {
    try {
      const { ensureConnection } = await import("@/lib/db");
      await ensureConnection();

      const { id } = await context.params;
      const body = await request.json();
      const parsed = putSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      // 🔐 garantir usuário do mesmo tenant
      const target = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, id), eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt)));
      if (target.length === 0) {
        return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
      }

      const passwordHash = await hash(parsed.data.password, 10);

      await db
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, id), eq(users.organizationId, ctx.organizationId)));

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("❌ Error setting user password:", error);
      return NextResponse.json(
        { error: "Falha ao definir senha", details: errorMessage },
        { status: 500 }
      );
    }
  });
});

