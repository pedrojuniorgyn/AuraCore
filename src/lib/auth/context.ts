import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { SQL, inArray, type Column } from "drizzle-orm";

/**
 * 🔐 TENANT CONTEXT (Multi-Tenant SaaS Security)
 * 
 * Helper reutilizável para garantir segurança em TODAS as rotas de API.
 * 
 * Uso:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const ctx = await getTenantContext();
 *   // ctx.organizationId, ctx.userId, ctx.role, ctx.branchIds
 * }
 * ```
 * 
 * Garante:
 * - ✅ Usuário autenticado (401 se não tiver sessão)
 * - ✅ Organization ID disponível (isolamento SaaS)
 * - ✅ User ID para auditoria (created_by/updated_by)
 * - ✅ Role para permissões
 * - ✅ Allowed Branches para Data Scoping
 */

export interface TenantContext {
  userId: string;
  organizationId: number;
  role: string;
  defaultBranchId: number | null;
  allowedBranches: number[];
  isAdmin: boolean;
}

/**
 * Obtém o contexto do tenant (organização) do usuário autenticado.
 * 
 * @throws {NextResponse} 401 se usuário não estiver autenticado
 * @returns {Promise<TenantContext>} Contexto com dados vitais para segurança
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await auth();

  if (!session || !session.user) {
    throw NextResponse.json(
      { error: "Não autenticado", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id, organizationId, role, defaultBranchId, allowedBranches } = session.user;

  if (!organizationId) {
    throw NextResponse.json(
      { 
        error: "Usuário sem organização vinculada", 
        code: "NO_ORGANIZATION",
        details: "Entre em contato com o suporte."
      },
      { status: 500 }
    );
  }

  return {
    userId: id,
    organizationId,
    role: role || "USER",
    defaultBranchId: defaultBranchId || null,
    allowedBranches: allowedBranches || [],
    isAdmin: role === "ADMIN",
  };
}

/**
 * Valida se o usuário tem permissão para acessar uma filial específica.
 * 
 * @param ctx - Contexto do tenant
 * @param branchId - ID da filial a ser acessada
 * @returns {boolean} True se tem acesso, False caso contrário
 */
export function hasAccessToBranch(ctx: TenantContext, branchId: number): boolean {
  // Admin tem acesso a todas as filiais da organização
  if (ctx.isAdmin) {
    return true;
  }

  // Se não tem filiais permitidas, bloqueia
  if (!ctx.allowedBranches || ctx.allowedBranches.length === 0) {
    return false;
  }

  // Verifica se a filial está na lista de permitidas
  return ctx.allowedBranches.includes(branchId);
}

/**
 * Cria um filtro SQL para aplicar Data Scoping (filiais permitidas).
 * 
 * Uso:
 * ```typescript
 * const branches = await db
 *   .select()
 *   .from(branches)
 *   .where(and(
 *     eq(branches.organizationId, ctx.organizationId),
 *     ...getBranchScopeFilter(ctx, branches.id)
 *   ));
 * ```
 * 
 * @param ctx - Contexto do tenant
 * @param branchIdColumn - Coluna de branch_id da tabela
 * @returns {any[]} Array de condições SQL (vazio se Admin)
 */
export function getBranchScopeFilter<TColumn extends Column>(
  ctx: TenantContext,
  branchIdColumn: TColumn
): SQL<unknown>[] {
  // Admin vê todas as filiais da organização
  if (ctx.isAdmin) {
    return [];
  }

  // Se não tem filiais permitidas, retorna array vazio
  // IMPORTANTE: Query deve filtrar por organizationId separadamente
  // Este filtro é ADICIONAL para restringir branches
  if (!ctx.allowedBranches || ctx.allowedBranches.length === 0) {
    return [];
  }

  // Filtra apenas filiais permitidas
  return [inArray(branchIdColumn, ctx.allowedBranches)];
}








































