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
  branchId: number; // E9.3: branchId sempre obrigatório para queries
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

  // E9.3: branchId é obrigatório - usa defaultBranchId ou primeiro da lista
  const branchId = defaultBranchId || (allowedBranches && allowedBranches.length > 0 ? allowedBranches[0] : null);
  
  if (!branchId) {
    throw NextResponse.json(
      { 
        error: "Usuário sem filial vinculada", 
        code: "NO_BRANCH",
        details: "Configure uma filial padrão para o usuário."
      },
      { status: 400 }
    );
  }

  return {
    userId: id,
    organizationId,
    role: role || "USER",
    branchId, // E9.3: sempre obrigatório
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

// ============================================================================
// 🔐 ABAC VALIDATION HELPERS (Attribute-Based Access Control)
// ============================================================================

/**
 * Resultado da validação ABAC
 */
export interface ABACValidationResult {
  /** Se a validação passou */
  allowed: boolean;
  /** Código do erro (se falhou) */
  code?: 'ABAC_BRANCH_DENIED' | 'ABAC_OWNER_DENIED' | 'ABAC_MISSING_BRANCH';
  /** Mensagem de erro (se falhou) */
  message?: string;
  /** BranchId efetivo a ser usado (do body ou do contexto) */
  effectiveBranchId: number;
}

/**
 * 🔐 Valida acesso ABAC para operações de escrita (POST/PUT/DELETE)
 * 
 * Esta função DEVE ser usada em TODAS as operações de escrita para garantir
 * que o usuário tem acesso à filial sendo modificada.
 * 
 * **Regras:**
 * - Se `branchId` não for passado no body, usa `ctx.branchId` (default do usuário)
 * - Se `branchId` for passado, valida se está em `ctx.allowedBranches`
 * - Admin bypassa validação de branchId (acesso a todas as filiais)
 * 
 * @param ctx - Contexto do tenant (de getTenantContext)
 * @param requestedBranchId - BranchId do body da requisição (opcional)
 * 
 * @returns ABACValidationResult com `allowed` e `effectiveBranchId`
 * 
 * @example
 * // Em um endpoint POST
 * const body = await request.json();
 * const abac = validateABACBranchAccess(ctx, body.branchId);
 * 
 * if (!abac.allowed) {
 *   return NextResponse.json({ 
 *     error: abac.message, 
 *     code: abac.code 
 *   }, { status: 403 });
 * }
 * 
 * // Usar abac.effectiveBranchId para a operação
 * await repository.save({ ...data, branchId: abac.effectiveBranchId });
 */
export function validateABACBranchAccess(
  ctx: TenantContext,
  requestedBranchId?: number | null
): ABACValidationResult {
  // 1. Se branchId não foi passado, usa o default do contexto
  if (requestedBranchId === undefined || requestedBranchId === null) {
    return {
      allowed: true,
      effectiveBranchId: ctx.branchId,
    };
  }

  // 2. Admin bypassa validação de branchId (acesso a todas as filiais)
  if (ctx.isAdmin) {
    return {
      allowed: true,
      effectiveBranchId: requestedBranchId,
    };
  }

  // 3. Verificar se branchId está em allowedBranches
  if (!ctx.allowedBranches || ctx.allowedBranches.length === 0) {
    // Usuário sem branches permitidas - só pode usar o default
    if (requestedBranchId !== ctx.branchId) {
      return {
        allowed: false,
        code: 'ABAC_BRANCH_DENIED',
        message: `Acesso negado: você não tem permissão para acessar a filial ${requestedBranchId}`,
        effectiveBranchId: ctx.branchId,
      };
    }
    return {
      allowed: true,
      effectiveBranchId: ctx.branchId,
    };
  }

  // 4. Validar se branchId está na lista de permitidos
  if (!ctx.allowedBranches.includes(requestedBranchId)) {
    return {
      allowed: false,
      code: 'ABAC_BRANCH_DENIED',
      message: `Acesso negado: você não tem permissão para acessar a filial ${requestedBranchId}`,
      effectiveBranchId: ctx.branchId,
    };
  }

  // ✅ Validação passou
  return {
    allowed: true,
    effectiveBranchId: requestedBranchId,
  };
}

/**
 * 🔐 Valida acesso ABAC para recursos existentes (PUT/DELETE)
 * 
 * Esta função valida se o usuário tem acesso à filial de um recurso
 * existente antes de permitir edição/exclusão.
 * 
 * @param ctx - Contexto do tenant
 * @param resourceBranchId - BranchId do recurso existente
 * 
 * @returns ABACValidationResult
 * 
 * @example
 * // Em um endpoint PUT/DELETE
 * const goal = await repository.findById(id, ctx.organizationId, ctx.branchId);
 * 
 * if (!goal) {
 *   return NextResponse.json({ error: 'Not found' }, { status: 404 });
 * }
 * 
 * const abac = validateABACResourceAccess(ctx, goal.ownerBranchId);
 * 
 * if (!abac.allowed) {
 *   return NextResponse.json({ 
 *     error: abac.message, 
 *     code: abac.code 
 *   }, { status: 403 });
 * }
 */
export function validateABACResourceAccess(
  ctx: TenantContext,
  resourceBranchId: number
): ABACValidationResult {
  // Admin bypassa validação
  if (ctx.isAdmin) {
    return {
      allowed: true,
      effectiveBranchId: resourceBranchId,
    };
  }

  // Verificar se usuário tem acesso à filial do recurso
  if (!hasAccessToBranch(ctx, resourceBranchId)) {
    return {
      allowed: false,
      code: 'ABAC_BRANCH_DENIED',
      message: `Acesso negado: você não tem permissão para acessar recursos da filial ${resourceBranchId}`,
      effectiveBranchId: ctx.branchId,
    };
  }

  return {
    allowed: true,
    effectiveBranchId: resourceBranchId,
  };
}

/**
 * 🔐 Valida acesso ABAC por owner (dono do recurso)
 * 
 * Valida se o usuário é dono do recurso ou é Admin.
 * 
 * @param ctx - Contexto do tenant
 * @param resourceOwnerId - ID do dono do recurso
 * 
 * @returns ABACValidationResult
 * 
 * @example
 * const abac = validateABACOwnerAccess(ctx, profile.userId);
 * if (!abac.allowed) {
 *   return NextResponse.json({ error: abac.message }, { status: 403 });
 * }
 */
export function validateABACOwnerAccess(
  ctx: TenantContext,
  resourceOwnerId: string
): Omit<ABACValidationResult, 'effectiveBranchId'> & { allowed: boolean } {
  // Admin bypassa validação
  if (ctx.isAdmin) {
    return { allowed: true };
  }

  // Verificar se usuário é dono do recurso
  if (ctx.userId !== resourceOwnerId) {
    return {
      allowed: false,
      code: 'ABAC_OWNER_DENIED',
      message: 'Acesso negado: você não é o proprietário deste recurso',
    };
  }

  return { allowed: true };
}

/**
 * 🔐 Helper para retornar resposta 403 padronizada
 * 
 * @param result - Resultado da validação ABAC
 * @param ctx - Contexto do tenant (para log)
 */
export function abacDeniedResponse(
  result: ABACValidationResult,
  ctx?: TenantContext
): NextResponse {
  // Log para observabilidade (LGPD: não logar dados sensíveis)
  console.warn(`[ABAC] Access denied`, {
    code: result.code,
    userId: ctx?.userId,
    organizationId: ctx?.organizationId,
    effectiveBranchId: result.effectiveBranchId,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      error: result.message,
      code: result.code,
    },
    { status: 403 }
  );
}








































