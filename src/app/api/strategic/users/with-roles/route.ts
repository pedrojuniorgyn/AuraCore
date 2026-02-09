/**
 * API: Users with Roles
 *
 * GET /api/strategic/users/with-roles - Get all users with their roles
 * Busca usuários reais do banco com suas roles
 *
 * @module app/api/strategic/users/with-roles
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/context';
import { db } from '@/lib/db';
import { users, userRoles, roles } from '@/lib/db/schema';
import { eq, and, ilike, or, isNull, inArray, sql } from 'drizzle-orm';
import type { UserWithRoles } from '@/lib/permissions/permission-types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase();

    // Construir condições de busca
    const conditions = [
      eq(users.organizationId, ctx.organizationId),
      isNull(users.deletedAt),
    ];

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`)
        ) ?? sql`1=1` // Fallback explícito (padrão do codebase)
      );
    }

    // Buscar usuários
    const usersData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(and(...conditions));

    // Se não houver usuários, retornar lista vazia
    if (usersData.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Buscar roles de cada usuário
    const userIds = usersData.map(u => u.id);
    const userRolesData = await db
      .select({
        userId: userRoles.userId,
        roleId: userRoles.roleId,
      })
      .from(userRoles)
      .where(and(
        inArray(userRoles.userId, userIds),
        eq(userRoles.organizationId, ctx.organizationId)
      ));

    // Buscar detalhes das roles
    const roleIds = [...new Set(userRolesData.map(ur => ur.roleId))];
    const rolesData = roleIds.length > 0
      ? await db
          .select({
            id: roles.id,
            name: roles.name,
            description: roles.description,
          })
          .from(roles)
          .where(inArray(roles.id, roleIds))
      : [];

    const rolesMap = new Map(rolesData.map(r => [r.id, r]));
    const userRolesMap = new Map<string, number[]>();
    
    userRolesData.forEach(ur => {
      const existing = userRolesMap.get(ur.userId) || [];
      existing.push(ur.roleId);
      userRolesMap.set(ur.userId, existing);
    });

    // Montar resposta
    const usersWithRoles: UserWithRoles[] = usersData.map(user => {
      const roleIds = userRolesMap.get(user.id) || [];
      const userRoles = roleIds
        .map(roleId => rolesMap.get(roleId))
        .filter((role): role is NonNullable<typeof role> => role !== undefined)
        .map(role => ({
          id: String(role.id),
          name: role.name,
          description: role.description || '',
          permissions: [],
          isSystem: false,
          isDefault: false,
          priority: 0,
          userCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

      const initials = (user.name || user.email || 'U')
        .split(' ')
        .filter(n => n.length > 0) // Remove strings vazias (nomes com só espaços)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U'; // Fallback se resultado for vazio

      return {
        id: user.id,
        name: user.name || 'Sem nome',
        email: user.email || '',
        initials,
        roles: userRoles,
      };
    });

    return NextResponse.json({ users: usersWithRoles });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('GET /api/strategic/users/with-roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
