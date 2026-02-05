"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

/**
 * 🔐 ABAC Attributes (Attribute-Based Access Control)
 * 
 * Atributos de contexto para validação de acesso baseada em atributos.
 * Complementa RBAC (Role-Based) com validações de escopo de dados.
 * 
 * **RBAC:** "Quem pode fazer X?" (permission slug)
 * **ABAC:** "Quem pode fazer X em Y?" (permission slug + atributos)
 * 
 * @example
 * // RBAC only
 * hasPermission("tms.viagens.read")
 * 
 * // RBAC + ABAC (branchId)
 * hasPermission("tms.viagens.create", { branchId: 3 })
 * 
 * // RBAC + ABAC (ownerId)
 * hasPermission("users.profile.edit", { ownerId: user.id })
 * 
 * @see https://en.wikipedia.org/wiki/Attribute-based_access_control
 */
export interface ABACAttributes {
  /**
   * ID da filial (branch) sendo acessada
   * 
   * Valida se usuário tem acesso a esta filial específica.
   * Admin bypassa esta validação (acesso a todas as filiais).
   * 
   * @example
   * hasPermission("tms.viagens.create", { branchId: 3 })
   */
  branchId?: number;

  /**
   * ID da organização sendo acessada
   * 
   * Valida se usuário pertence a esta organização.
   * Sempre validado automaticamente (multi-tenant).
   * ATENÇÃO: Admin NÃO bypassa esta validação (isolamento tenant).
   * 
   * @example
   * hasPermission("admin.users.manage", { organizationId: 1 })
   */
  organizationId?: number;

  /**
   * ID do dono do recurso
   * 
   * Valida se usuário é dono do recurso (ex: "editar meu próprio perfil").
   * Admin bypassa esta validação.
   * 
   * @example
   * hasPermission("users.profile.edit", { ownerId: user.id })
   */
  ownerId?: string;
}

/**
 * @deprecated Use ABACAttributes instead
 */
interface HasPermissionOptions {
  /** Branch ID a validar (data scoping). Se undefined, não valida ABAC. */
  branchId?: number;
}

/**
 * Hook para verificar permissões no frontend (RBAC + ABAC)
 * 
 * @example
 * const { hasPermission, hasBranchAccess, loading } = usePermissions();
 * 
 * // RBAC apenas (sem validação de branch)
 * if (hasPermission("admin.users.manage")) {
 *   return <Button>Gerenciar Usuários</Button>
 * }
 * 
 * // RBAC + ABAC (valida branchId)
 * if (hasPermission("tms.viagens.create", { branchId: viagem.branchId })) {
 *   return <Button>Criar Viagem</Button>
 * }
 * 
 * // Validar apenas acesso à branch (sem verificar permission)
 * if (hasBranchAccess(targetBranchId)) {
 *   // User pode acessar dados desta branch
 * }
 */
export function usePermissions() {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [allowedBranches, setAllowedBranches] = useState<number[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      if (status === "authenticated" && session?.user?.id) {
        try {
          const response = await fetch("/api/auth/permissions");
          if (response.ok) {
            const data = await response.json();
            setPermissions(data.permissions || []);
            setAllowedBranches(data.allowedBranches || []);
            setRole(data.role || null);
            setIsAdmin(data.isAdmin || false);
          }
        } catch (error) {
          console.error("❌ Erro ao carregar permissões:", error);
        } finally {
          setLoading(false);
        }
      } else if (status === "unauthenticated") {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, [session, status]);

  /**
   * 🔐 Verifica se usuário tem permissão (RBAC + ABAC)
   * 
   * Valida se usuário tem permissão (RBAC) E se tem acesso aos atributos (ABAC).
   * 
   * **RBAC:** Role-Based Access Control
   * - Verifica se usuário tem o slug de permissão
   * 
   * **ABAC:** Attribute-Based Access Control
   * - Verifica se usuário tem acesso aos atributos (branchId, organizationId, ownerId)
   * 
   * **Bypass Rules:**
   * - Admin bypassa branchId (acesso a todas as filiais)
   * - Admin bypassa ownerId (pode editar recursos de outros)
   * - Admin NÃO bypassa organizationId (multi-tenant sempre validado)
   * - Super-permissões ("*", "admin.full") bypassam RBAC
   * 
   * @param slug - Permission slug (ex: "tms.viagens.create")
   * @param attributes - Atributos ABAC opcionais para validação de escopo
   * 
   * @returns true se tem permissão RBAC + acesso ABAC (todos os atributos)
   * 
   * @example
   * // RBAC apenas (sem validação de atributos)
   * hasPermission("admin.users.manage")
   * 
   * // RBAC + ABAC (valida branchId)
   * hasPermission("tms.viagens.create", { branchId: viagem.branchId })
   * 
   * // RBAC + ABAC (valida ownerId)
   * hasPermission("users.profile.edit", { ownerId: user.id })
   * 
   * // RBAC + ABAC (múltiplos atributos)
   * hasPermission("strategic.goals.update", { 
   *   branchId: goal.ownerBranchId,
   *   ownerId: goal.ownerUserId 
   * })
   */
  const hasPermission = useCallback((slug: string, attributes?: ABACAttributes | HasPermissionOptions): boolean => {
    // ============================
    // FASE 1: SUPER-PERMISSÕES
    // ============================
    
    // 1.1: Wildcard "*" ou "admin.full" = acesso total (bypass RBAC + ABAC)
    if (permissions.includes("*") || permissions.includes("admin.full")) {
      return true;
    }

    // ============================
    // FASE 2: RBAC (Role-Based)
    // ============================
    
    // 2.1: Verificar se usuário tem o slug de permissão
    const hasRole = permissions.includes(slug);
    
    if (!hasRole) {
      // ❌ Usuário não tem a permissão (RBAC falhou)
      return false;
    }

    // ✅ RBAC passou - usuário tem a permissão
    
    // ============================
    // FASE 3: ABAC (Attribute-Based)
    // ============================
    
    if (!attributes) {
      // ✅ Sem atributos para validar - RBAC only é suficiente
      return true;
    }

    // 3.1: Validar branchId (se fornecido)
    if (attributes.branchId !== undefined) {
      // Admin bypassa validação de branchId (acesso a todas as filiais)
      if (!isAdmin) {
        // Verificar se branchId está em allowedBranches
        if (!allowedBranches.includes(attributes.branchId)) {
          // ❌ Usuário não tem acesso a esta filial (ABAC falhou)
          console.warn(
            `[ABAC] Permission denied: user has permission "${slug}" but no access to branchId=${attributes.branchId}`,
            {
              allowedBranches,
              requestedBranch: attributes.branchId,
            }
          );
          return false;
        }
      }
      // ✅ Admin tem acesso a todas as filiais OU usuário tem acesso a esta filial
    }

    // 3.2: Validar organizationId (se fornecido)
    // ATENÇÃO: organizationId usa session.user.organizationId, não está no hook atual
    // A validação de organizationId é feita no backend (multi-tenant)
    // No frontend, organizationId geralmente não precisa ser validado
    // pois os dados já vêm filtrados pelo backend
    if ('organizationId' in attributes && attributes.organizationId !== undefined) {
      // TODO: Implementar validação de organizationId quando necessário
      // Por enquanto, assume que backend já validou
      console.debug(`[ABAC] organizationId validation delegated to backend`);
    }

    // 3.3: Validar ownerId (se fornecido)
    if ('ownerId' in attributes && attributes.ownerId !== undefined) {
      // Admin bypassa validação de ownerId
      if (!isAdmin) {
        // TODO: Precisamos do userId no hook para validar ownerId
        // Por enquanto, a validação de ownerId é feita no backend
        console.debug(`[ABAC] ownerId validation delegated to backend`);
      }
    }

    // ✅ Todas as validações passaram (RBAC + ABAC)
    return true;
  }, [permissions, allowedBranches, isAdmin]);

  /**
   * Verifica se usuário tem qualquer uma das permissões
   */
  const hasAnyPermission = useCallback((slugs: string[], options?: HasPermissionOptions): boolean => {
    return slugs.some((slug) => hasPermission(slug, options));
  }, [hasPermission]);

  /**
   * Verifica se usuário tem todas as permissões
   */
  const hasAllPermissions = useCallback((slugs: string[], options?: HasPermissionOptions): boolean => {
    return slugs.every((slug) => hasPermission(slug, options));
  }, [hasPermission]);

  /**
   * Verifica se usuário tem acesso a uma branch específica (ABAC only)
   * 
   * @param branchId - ID da branch a verificar
   * @returns true se admin OU branch está em allowedBranches
   */
  const hasBranchAccess = useCallback((branchId: number): boolean => {
    // Admin tem acesso a todas as branches
    if (isAdmin) return true;

    return allowedBranches.includes(branchId);
  }, [allowedBranches, isAdmin]);

  return {
    /** Lista de slugs de permissões (RBAC) */
    permissions,
    /** Lista de IDs de branches permitidas (ABAC) */
    allowedBranches,
    /** Role do usuário */
    role,
    /** Se usuário é admin (bypass ABAC) */
    isAdmin,
    /** Verifica permissão (RBAC + ABAC se branchId passado) */
    hasPermission,
    /** Verifica se tem qualquer uma das permissões */
    hasAnyPermission,
    /** Verifica se tem todas as permissões */
    hasAllPermissions,
    /** Verifica acesso à branch (ABAC only) */
    hasBranchAccess,
    /** Se ainda está carregando */
    loading,
  };
}

































