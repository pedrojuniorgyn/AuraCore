import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { branches, roles, userBranches, userRoles, users } from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  roleId: z.number().int().positive(),
  branchIds: z.array(z.number().int().positive()).default([]),
});

/**
 * POST /api/admin/users/invite
 * 🔐 Requer permissão: admin.users.manage
 *
 * Modelo A (Enterprise):
 * - Cria o usuário (pré-cadastro) na organização do admin logado
 * - Vincula role (user_roles) e filiais (user_branches)
 * - Usuário então pode fazer o 1º login via Google Workspace (OAuth)
 */
export async function POST(request: NextRequest) {
  return withPermission(request, "admin.users.manage", async (_user, ctx) => {
    try {
      const { ensureConnection } = await import("@/lib/db");
      await ensureConnection();

      const body = await request.json();
      const parsed = inviteSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const email = parsed.data.email.trim().toLowerCase();
      const name = parsed.data.name?.trim() || null;
      const roleId = parsed.data.roleId;
      const branchIds = Array.from(new Set(parsed.data.branchIds));

      // 1) Validar role
      const roleRows = await db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(eq(roles.id, roleId));
      if (roleRows.length === 0) {
        return NextResponse.json({ error: "Role inválida" }, { status: 400 });
      }
      const roleName = roleRows[0].name;

      // 2) Validar filiais (todas devem ser da organização e não deletadas)
      if (branchIds.length > 0) {
        const validBranches = await db
          .select({ id: branches.id })
          .from(branches)
          .where(
            and(
              eq(branches.organizationId, ctx.organizationId),
              isNull(branches.deletedAt),
              inArray(branches.id, branchIds)
            )
          );
        const validIds = new Set(validBranches.map((b) => b.id));
        const invalid = branchIds.filter((id) => !validIds.has(id));
        if (invalid.length > 0) {
          return NextResponse.json(
            { error: "Uma ou mais filiais são inválidas para esta organização", invalidBranchIds: invalid },
            { status: 400 }
          );
        }
      }

      // 3) Upsert do usuário (por email+org)
      const existingUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          organizationId: users.organizationId,
          defaultBranchId: users.defaultBranchId,
          role: users.role,
        })
        .from(users)
        .where(and(eq(users.organizationId, ctx.organizationId), eq(users.email, email), isNull(users.deletedAt)));

      let userId: string;
      if (existingUsers.length > 0) {
        userId = existingUsers[0].id;

        // Se veio nome e o usuário não tem nome, preenche (não sobrescreve)
        if (name && !existingUsers[0].name) {
          await db.update(users).set({ name }).where(eq(users.id, userId));
        }
      } else {
        userId = crypto.randomUUID();

        const defaultBranchId = branchIds.length > 0 ? branchIds[0] : null;
        const primaryRole = roleName?.toUpperCase?.() === "ADMIN" ? "ADMIN" : "USER";

        await db.insert(users).values({
          id: userId,
          organizationId: ctx.organizationId,
          email,
          name,
          role: primaryRole,
          defaultBranchId,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        } as any);
      }

      // 4) Garantir vínculo user_roles (idempotente)
      const existingUserRole = await db
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));

      if (existingUserRole.length === 0) {
        await db.insert(userRoles).values({
          userId,
          roleId,
          organizationId: ctx.organizationId,
          branchId: null,
          createdAt: new Date(),
        });
      }

      // 5) Garantir vínculo user_branches (idempotente)
      if (branchIds.length > 0) {
        const existing = await db
          .select({ branchId: userBranches.branchId })
          .from(userBranches)
          .where(and(eq(userBranches.userId, userId), inArray(userBranches.branchId, branchIds)));
        const existingSet = new Set(existing.map((e) => e.branchId));
        const missing = branchIds.filter((bid) => !existingSet.has(bid));

        if (missing.length > 0) {
          await db.insert(userBranches).values(
            missing.map((branchId) => ({
              userId,
              branchId,
              createdAt: new Date(),
            }))
          );
        }
      }

      // 6) Enviar email de convite (opcional – depende de SMTP no .env)
      const origin = process.env.APP_URL || new URL(request.url).origin;
      const loginUrl = `${origin}/login?callbackUrl=%2Fdashboard`;
      const domainsHint =
        process.env.AUTH_GOOGLE_ALLOWED_DOMAINS || process.env.AUTH_ALLOWED_EMAIL_DOMAINS || "";

      try {
        const { sendInviteEmail } = await import("@/lib/email/send-invite");
        const result = await sendInviteEmail({
          to: email,
          inviteeName: name || undefined,
          loginUrl,
          allowedDomainsHint: domainsHint || undefined,
        });
        if (!result.sent) {
          console.warn("⚠️ Invite email not sent:", result.reason);
        }
      } catch (e) {
        console.warn("⚠️ Invite email failed (non-fatal):", e);
      }

      return NextResponse.json({
        success: true,
        message: "Usuário convidado com sucesso. Ele já pode logar via Google Workspace.",
        data: { userId, email, roleId, branchIds, loginUrl },
      });
    } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Error inviting user:", error);
      return NextResponse.json(
        { error: "Falha ao convidar usuário", details: errorMessage },
        { status: 500 }
      );
    }
  });
}


