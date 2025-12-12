import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { users, userRoles, roles, accounts } from "@/lib/db/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";

/**
 * GET /api/admin/users
 * 🔐 Requer permissão: admin.users.manage
 */
export async function GET(request: NextRequest) {
  return withPermission(request, "admin.users.manage", async (user, ctx) => {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    // 🔐 Buscar todos os usuários da organização (Multi-tenant)
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
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

    const usersWithRoles = allUsers.map((u) => ({
      ...u,
      roles: rolesByUserId.get(u.id) ?? [],
      googleLinked: googleLinkedSet.has(u.id),
    }));

    return NextResponse.json({
      success: true,
      users: usersWithRoles,
      total: allUsers.length,
    });
  });
}














