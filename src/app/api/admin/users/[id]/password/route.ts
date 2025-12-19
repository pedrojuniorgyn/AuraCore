import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { hash } from "bcryptjs";

const putSchema = z.object({
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

/**
 * PUT /api/admin/users/:id/password
 * Define/reset a senha (password_hash) para login via Credentials.
 * 🔐 Requer permissão: admin.users.manage
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
        } as any)
        .where(eq(users.id, id));

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error("❌ Error setting user password:", error);
      return NextResponse.json(
        { error: "Falha ao definir senha", details: error?.message || String(error) },
        { status: 500 }
      );
    }
  });
}

