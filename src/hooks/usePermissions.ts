"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Hook para verificar permissões no frontend
 * 
 * @example
 * const { hasPermission, loading } = usePermissions();
 * 
 * if (hasPermission("fiscal.cte.create")) {
 *   return <Button>Criar CTe</Button>
 * }
 */
export function usePermissions() {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      if (status === "authenticated" && session?.user?.id) {
        try {
          const response = await fetch("/api/auth/permissions");
          if (response.ok) {
            const data = await response.json();
            setPermissions(data.permissions || []);
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

  const hasPermission = (permissionCode: string): boolean => {
    // Admin sempre tem tudo (temporário - melhorar depois)
    if (permissions.includes("*") || permissions.includes("admin.*")) {
      return true;
    }
    return permissions.includes(permissionCode);
  };

  const hasAnyPermission = (permissionCodes: string[]): boolean => {
    return permissionCodes.some((code) => hasPermission(code));
  };

  const hasAllPermissions = (permissionCodes: string[]): boolean => {
    return permissionCodes.every((code) => hasPermission(code));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    loading,
  };
}

















