import { db } from "@/lib/db";
import { userRoles, rolePermissions, permissions, roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Verificar se um usuário tem uma permissão específica
 * 
 * Query SQL equivalente:
 * SELECT DISTINCT p.slug
 * FROM user_roles ur
 * INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
 * INNER JOIN permissions p ON p.id = rp.permission_id
 * WHERE ur.user_id = @userId
 */
export async function hasPermission(userId: string, permissionCode: string): Promise<boolean> {
  try {
    if (!userId || !permissionCode) {
      console.warn("⚠️ [hasPermission] userId ou permissionCode vazio:", { userId, permissionCode });
      return false;
    }

    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    console.log("🔍 [hasPermission] Verificando permissão:", { userId, permissionCode });

    // ✅ Query corrigida: começar de userRoles para garantir ordem correta dos JOINs
    const result = await db
      .select({ slug: permissions.slug })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(userRoles.userId, userId));

    console.log("🔍 [hasPermission] Permissões encontradas:", result.length, result.map(p => p.slug));

    // ✅ Super-permissão: se o usuário tem admin.full, ele pode tudo
    if (result.some((p) => p.slug === "admin.full")) {
      console.log("✅ [hasPermission] Usuário tem admin.full - acesso concedido");
      return true;
    }

    const hasAccess = result.some((p) => p.slug === permissionCode);
    console.log("🔍 [hasPermission] Acesso:", hasAccess ? "CONCEDIDO" : "NEGADO");
    
    return hasAccess;
  } catch (error) {
    console.error("❌ Erro ao verificar permissão:", error);
    return false;
  }
}

/**
 * Obter todas as permissões de um usuário
 * 
 * Query SQL equivalente:
 * SELECT DISTINCT p.slug
 * FROM user_roles ur
 * INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
 * INNER JOIN permissions p ON p.id = rp.permission_id
 * WHERE ur.user_id = @userId
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    if (!userId) {
      console.warn("⚠️ [getUserPermissions] userId vazio!");
      return [];
    }

    // ✅ Garantir conexão antes de usar db
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    console.log("🔍 [getUserPermissions] Buscando permissões para userId:", userId);

    // 1. Primeiro, verificar se o usuário tem roles atribuídas (debug)
    const userRolesResult = await db
      .select({
        roleId: userRoles.roleId,
        organizationId: userRoles.organizationId,
        branchId: userRoles.branchId,
      })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    console.log("🔍 [getUserPermissions] Roles do usuário:", JSON.stringify(userRolesResult));

    if (userRolesResult.length === 0) {
      console.warn("⚠️ [getUserPermissions] Usuário não tem nenhuma role atribuída!");
      return [];
    }

    // 2. Buscar permissões via JOINs (ordem corrigida: userRoles -> rolePermissions -> permissions)
    const result = await db
      .select({ slug: permissions.slug })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(userRoles.userId, userId));

    console.log("🔍 [getUserPermissions] Permissões encontradas:", JSON.stringify(result));

    const permissionSlugs = result.map((p) => p.slug);
    
    // Se tem admin.full, adicionar wildcard para compatibilidade com frontend
    if (permissionSlugs.includes("admin.full")) {
      console.log("✅ [getUserPermissions] Usuário tem admin.full - acesso total");
      return ["*", ...permissionSlugs];
    }

    return permissionSlugs;
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
    
    // ✅ Wildcard "*" significa acesso total (admin.full)
    if (userPerms.includes("*") || userPerms.includes("admin.full")) {
      return true;
    }
    
    return permissionCodes.some((code) => userPerms.includes(code));
  } catch (error) {
    console.error("❌ Erro em hasAnyPermission:", error);
    return false;
  }
}

/**
 * Verificar múltiplas permissões (AND logic - todas)
 */
export async function hasAllPermissions(userId: string, permissionCodes: string[]): Promise<boolean> {
  try {
    const userPerms = await getUserPermissions(userId);
    
    // ✅ Wildcard "*" significa acesso total (admin.full)
    if (userPerms.includes("*") || userPerms.includes("admin.full")) {
      return true;
    }
    
    return permissionCodes.every((code) => userPerms.includes(code));
  } catch (error) {
    console.error("❌ Erro em hasAllPermissions:", error);
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
        roleName: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
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


