import { NextRequest, NextResponse } from "next/server";
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';
import { z } from "zod";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { accounts, branches, roles, userBranches, userRoles, users } from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { CacheService } from "@/services/cache.service";

import { logger } from '@/shared/infrastructure/logging';
const putSchema = z.object({
  roleIds: z.array(z.number().int().positive()).min(1),
  branchIds: z.array(z.number().int().positive()).default([]),
});

/**
 * GET /api/admin/users/:id/access
 * 🔐 Requer permissão: admin.users.manage
 */
export const GET = withDI(async (request: NextRequest, context: RouteContext) => {
  return withPermission(request, "admin.users.manage", async (_user, ctx) => {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const { id } = await context.params;

    const target = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, id), eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt)));
    if (target.length === 0) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const roleRows = await db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(and(eq(userRoles.userId, id), eq(userRoles.organizationId, ctx.organizationId)));

    const branchRows = await db
      .select({ branchId: userBranches.branchId })
      .from(userBranches)
      .where(eq(userBranches.userId, id));

    const google = await db
      .select({ userId: accounts.userId })
      .from(accounts)
      .where(and(eq(accounts.provider, "google"), eq(accounts.userId, id)));

    return NextResponse.json({
      success: true,
      data: {
        roleIds: roleRows.map((r) => r.roleId),
        branchIds: branchRows.map((b) => b.branchId),
        googleLinked: google.length > 0,
      },
    });
  });
});

/**
 * PUT /api/admin/users/:id/access
 * Atualiza roles e filiais do usuário (idempotente).
 * 🔐 Requer permissão: admin.users.manage
 */
export const PUT = withDI(async (request: NextRequest, context: RouteContext) => {
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

      const roleIds = Array.from(new Set(parsed.data.roleIds));
      const branchIds = Array.from(new Set(parsed.data.branchIds));

      // 1) Validar usuário no mesmo tenant
      const target = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, id), eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt)));
      if (target.length === 0) {
        return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
      }

      // 2) Validar roles existem
      const validRoles = await db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(inArray(roles.id, roleIds));
      if (validRoles.length !== roleIds.length) {
        return NextResponse.json({ error: "Uma ou mais roles são inválidas" }, { status: 400 });
      }

      // 3) Validar filiais pertencem à organização
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
        if (validBranches.length !== branchIds.length) {
          return NextResponse.json({ error: "Uma ou mais filiais são inválidas" }, { status: 400 });
        }
      }

      // 4) Atualizar user_roles: remove todos da organização e insere os novos
      await db
        .delete(userRoles)
        .where(and(eq(userRoles.userId, id), eq(userRoles.organizationId, ctx.organizationId)));

      await db.insert(userRoles).values(
        roleIds.map((roleId) => ({
          userId: id,
          roleId,
          organizationId: ctx.organizationId,
          branchId: null,
          createdAt: new Date(),
        }))
      );

      // 5) Atualizar user_branches: remove tudo e insere os novos
      await db.delete(userBranches).where(eq(userBranches.userId, id));
      if (branchIds.length > 0) {
        await db.insert(userBranches).values(
          branchIds.map((branchId) => ({
            userId: id,
            branchId,
            createdAt: new Date(),
          }))
        );
      }

      // 6) Atualizar campos utilitários em users (role primária + defaultBranchId)
      const isAdmin = validRoles.some((r) => r.name.toUpperCase() === "ADMIN");
      await db
        .update(users)
        .set({
          role: isAdmin ? "ADMIN" : "USER",
          defaultBranchId: branchIds.length > 0 ? branchIds[0] : null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));

      // Invalidar caches de users e permissions após atualização de acesso
      await Promise.all([
        CacheService.invalidatePattern('*', 'users:'),
        CacheService.invalidatePattern('*', 'permissions:'),
      ]);

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("❌ Error updating user access:", error);
      return NextResponse.json(
        { error: "Falha ao atualizar acessos", details: errorMessage },
        { status: 500 }
      );
    }
  });
});
