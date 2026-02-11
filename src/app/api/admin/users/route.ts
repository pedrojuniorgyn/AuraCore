import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { users, userRoles, roles, accounts } from "@/lib/db/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";
import { CacheService, CacheTTL } from "@/services/cache.service";
import { withDI } from '@/shared/infrastructure/di/with-di';

/**
 * GET /api/admin/users
 * 🔐 Requer permissão: admin.users.manage
 * 
 * Cache:
 * - TTL: 30 minutos (CacheTTL.MEDIUM)
 * - Key: org:{organizationId}
 * - Prefix: users:
 * - Invalidação: POST/PUT/DELETE em /api/admin/users
 */
export const GET = withDI(async (request: NextRequest) => {
  return withPermission(request, "admin.users.manage", async (user, ctx) => {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const cacheKey = `org:${ctx.organizationId}`;
    
    // Tentar buscar do cache
    const cached = await CacheService.get<{
      success: boolean;
      users: unknown[];
      total: number;
    }>(cacheKey, 'users:');
    
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'X-Cache-Key': `users:${cacheKey}`,
        },
      });
    }

    // Cache MISS - buscar do banco
    // 🔐 Buscar todos os usuários da organização (Multi-tenant)
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.organizationId, ctx.organizationId), isNull(users.deletedAt)));

    const userIds = allUsers.map((u) => u.id);

    // Roles por usuário (RBAC)
    const rolesRows = await db
      .select({
        userId: userRoles.userId,
        roleId: roles.id,
        roleName: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.organizationId, ctx.organizationId));

    const rolesByUserId = new Map<string, { id: number; name: string }[]>();
    for (const r of rolesRows) {
      const list = rolesByUserId.get(r.userId) ?? [];
      list.push({ id: r.roleId, name: r.roleName });
      rolesByUserId.set(r.userId, list);
    }

    // ✅ Status "PENDENTE": ainda não vinculou conta Google (accounts.provider = 'google')
    const googleLinkedSet = new Set<string>();
    if (userIds.length > 0) {
      const linked = await db
        .select({ userId: accounts.userId })
        .from(accounts)
        .where(and(eq(accounts.provider, "google"), inArray(accounts.userId, userIds)));
      for (const row of linked) {
        googleLinkedSet.add(row.userId);
      }
    }

    const usersWithRoles = allUsers.map(({ passwordHash, ...u }) => ({
      ...u,
      roles: rolesByUserId.get(u.id) ?? [],
      googleLinked: googleLinkedSet.has(u.id),
      hasPassword: Boolean(passwordHash),
    }));

    const response = {
      success: true,
      users: usersWithRoles,
      total: allUsers.length,
    };

    // Cachear resultado
    await CacheService.set(cacheKey, response, CacheTTL.MEDIUM, 'users:');

    return NextResponse.json(response, {
      headers: {
        'X-Cache': 'MISS',
        'X-Cache-TTL': String(CacheTTL.MEDIUM),
      },
    });
  });
});















