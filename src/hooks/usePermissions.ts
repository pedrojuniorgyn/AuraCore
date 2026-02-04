"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

/**
 * Opções para validação ABAC (Attribute-Based Access Control)
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
   * Verifica se usuário tem permissão (RBAC + ABAC)
   * 
   * @param slug - Permission slug (ex: "tms.viagens.create")
   * @param options - Atributos para validação ABAC
   * @param options.branchId - Branch ID a validar (data scoping)
   * 
   * @returns true se tem permissão + acesso à branch (se especificada)
   * 
   * @example
   * // RBAC apenas (sem validação de branch)
   * hasPermission("admin.users.manage")
   * 
   * // RBAC + ABAC (valida branchId)
   * hasPermission("tms.viagens.create", { branchId: viagem.branchId })
   */
  const hasPermission = useCallback((slug: string, options?: HasPermissionOptions): boolean => {
    // 1. Super-permissão: wildcard "*" ou "admin.full" significa acesso total
    if (permissions.includes("*") || permissions.includes("admin.full")) {
      return true;
    }

    // 2. Verificar RBAC (slug existe em permissions)
    const hasRole = permissions.includes(slug);
    if (!hasRole) return false;

    // 3. Verificar ABAC (branchId permitido) - somente se options.branchId foi passado
    if (options?.branchId !== undefined) {
      // Admin tem acesso a todas as branches (bypass ABAC)
      if (isAdmin) return true;

      // Verificar se user tem acesso à branchId especificada
      if (!allowedBranches.includes(options.branchId)) {
        console.warn(
          `[ABAC] Permission denied: user has permission "${slug}" but no access to branchId=${options.branchId}`,
          {
            allowedBranches,
            requestedBranch: options.branchId,
          }
        );
        return false;
      }
    }

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

































