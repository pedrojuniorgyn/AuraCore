import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";

/**
 * GET /api/admin/users
 * 🔐 Requer permissão: admin.users.manage
 */
export async function GET(request: NextRequest) {
  return withPermission(request, "admin.users.manage", async (user, ctx) => {
    // Buscar todos os usuários da organização
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(isNull(users.deletedAt));

    // TODO: Incluir roles de cada usuário
    const usersWithRoles = allUsers.map((u) => ({
      ...u,
      roles: [], // Implementar join com user_roles + roles
    }));

    return NextResponse.json({
      success: true,
      users: usersWithRoles,
      total: allUsers.length,
    });
  });
}











