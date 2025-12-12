import { db } from "@/lib/db";
import { userRoles, rolePermissions, permissions } from "@/lib/db/schema.ts";
import { eq } from "drizzle-orm";

/**
 * Verificar se um usuário tem uma permissão específica
 */
export async function hasPermission(userId: string, permissionCode: string): Promise<boolean> {
  try {
    if (!userId || !permissionCode) {
      return false;
    }

    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const result = await db
      .select({ code: permissions.code })
      .from(permissions)
      .innerJoin(rolePermissions, eq(rolePermissions.permissionId, permissions.id))
      .innerJoin(userRoles, eq(userRoles.roleId, rolePermissions.roleId))
      .where(eq(userRoles.userId, userId));

    return result.some((p) => p.code === permissionCode);
  } catch (error) {
    console.error("❌ Erro ao verificar permissão:", error);
    return false;
  }
}

/**
 * Obter todas as permissões de um usuário
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    // ✅ Garantir conexão antes de usar db
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const result = await db
      .select({ code: permissions.code })
      .from(permissions)
      .innerJoin(rolePermissions, eq(rolePermissions.permissionId, permissions.id))
      .innerJoin(userRoles, eq(userRoles.roleId, rolePermissions.roleId))
      .where(eq(userRoles.userId, userId));

    return result.map((p) => p.code);
  } catch (error) {
    console.error("❌ Erro ao obter permissões:", error);
    return [];
  }
}

/**
 * Verificar múltiplas permissões (OR logic - pelo menos uma)
 */
export async function hasAnyPermission(userId: string, permissionCodes: string[]): Promise<boolean> {
  try {
    const userPerms = await getUserPermissions(userId);
    return permissionCodes.some((code) => userPerms.includes(code));
  } catch (error) {
    return false;
  }
}

/**
 * Verificar múltiplas permissões (AND logic - todas)
 */
export async function hasAllPermissions(userId: string, permissionCodes: string[]): Promise<boolean> {
  try {
    const userPerms = await getUserPermissions(userId);
    return permissionCodes.every((code) => userPerms.includes(code));
  } catch (error) {
    return false;
  }
}

/**
 * Obter roles de um usuário
 */
export async function getUserRoles(userId: string) {
  try {
    // ✅ Garantir conexão antes de usar db
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const result = await db
      .select({
        roleId: userRoles.roleId,
        roleName: permissions.code, // Temporário - ajustar join
      })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    return result;
  } catch (error) {
    console.error("❌ Erro ao obter roles:", error);
    return [];
  }
}

/**
 * Helper para autorização em API Routes
 */
export function requirePermission(permissionCode: string) {
  return async (userId: string) => {
    const hasAccess = await hasPermission(userId, permissionCode);
    if (!hasAccess) {
      throw new Error(`Unauthorized: Permission '${permissionCode}' required`);
    }
    return true;
  };
}


