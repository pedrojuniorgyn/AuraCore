"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * 🔐 TENANT CONTEXT (Frontend State Management)
 * 
 * Gerencia o estado global do tenant (organização + filial ativa) no frontend.
 * 
 * Funcionalidades:
 * - Sincroniza com sessão do Next-Auth
 * - Persiste filial selecionada no localStorage
 * - Valida permissões de acesso à filial
 * - Fornece dados do usuário e organização para toda a aplicação
 */

interface Branch {
  id: number;
  name: string;
  tradeName: string;
  document: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  organizationId: number;
  defaultBranchId: number | null;
  allowedBranches: number[];
}

interface TenantContextData {
  user: User | null;
  currentBranch: Branch | null;
  availableBranches: Branch[];
  isLoading: boolean;
  switchBranch: (branchId: number) => Promise<void>;
  refreshBranches: () => Promise<void>;
}

const TenantContext = createContext<TenantContextData>({} as TenantContextData);

const STORAGE_KEY = "auracore:current-branch";

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Busca as filiais disponíveis para o usuário da API
   */
  const fetchAvailableBranches = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch("/api/branches");
      
      if (!response.ok) {
        throw new Error("Falha ao carregar filiais");
      }

      const { data } = await response.json();
      setAvailableBranches(data || []);

      return data;
    } catch (error) {
      console.error("❌ Erro ao buscar filiais:", error);
      toast.error("Falha ao carregar filiais disponíveis.");
      return [];
    }
  }, [session]);

  /**
   * Seleciona a filial inicial ao carregar a aplicação
   */
  const selectInitialBranch = useCallback(
    (branches: Branch[]) => {
      if (!session?.user || !branches.length) return;

      const user = session.user as User;

      // 1️⃣ Tenta carregar do localStorage
      const storedBranchId = localStorage.getItem(STORAGE_KEY);
      if (storedBranchId) {
        const storedBranch = branches.find((b) => b.id === parseInt(storedBranchId));
        
        // Valida se o usuário ainda tem permissão
        const hasPermission =
          user.role === "ADMIN" ||
          user.allowedBranches.includes(parseInt(storedBranchId));

        if (storedBranch && hasPermission) {
          setCurrentBranch(storedBranch);
          console.log(`✅ Filial restaurada do localStorage: ${storedBranch.tradeName}`);
          return;
        } else {
          // Remove do localStorage se não tiver mais permissão
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      // 2️⃣ Usa defaultBranchId do usuário
      if (user.defaultBranchId) {
        const defaultBranch = branches.find((b) => b.id === user.defaultBranchId);
        if (defaultBranch) {
          setCurrentBranch(defaultBranch);
          localStorage.setItem(STORAGE_KEY, defaultBranch.id.toString());
          console.log(`✅ Filial padrão selecionada: ${defaultBranch.tradeName}`);
          return;
        }
      }

      // 3️⃣ Usa a primeira filial disponível
      if (branches.length > 0) {
        const firstBranch = branches[0];
        setCurrentBranch(firstBranch);
        localStorage.setItem(STORAGE_KEY, firstBranch.id.toString());
        console.log(`✅ Primeira filial selecionada: ${firstBranch.tradeName}`);
      }
    },
    [session]
  );

  /**
   * Inicializa o contexto ao montar ou quando a sessão mudar
   */
  useEffect(() => {
    const initializeTenant = async () => {
      if (status === "loading") {
        return;
      }

      if (status === "unauthenticated") {
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        setIsLoading(true);
        const branches = await fetchAvailableBranches();
        if (branches && branches.length > 0) {
          selectInitialBranch(branches);
        } else {
          toast.error("Você não tem acesso a nenhuma filial.");
        }
        setIsLoading(false);
      }
    };

    initializeTenant();
  }, [session, status, fetchAvailableBranches, selectInitialBranch]);

  /**
   * Troca de filial (chamado pelo BranchSwitcher)
   */
  const switchBranch = useCallback(
    async (branchId: number) => {
      if (!session?.user) return;

      const user = session.user as User;

      // Valida permissão
      const hasPermission =
        user.role === "ADMIN" || user.allowedBranches.includes(branchId);

      if (!hasPermission) {
        toast.error("Você não tem permissão para acessar esta filial.");
        return;
      }

      const branch = availableBranches.find((b) => b.id === branchId);
      if (!branch) {
        toast.error("Filial não encontrada.");
        return;
      }

      // Atualiza estado e localStorage
      setCurrentBranch(branch);
      localStorage.setItem(STORAGE_KEY, branchId.toString());

      toast.success(`Filial alterada: ${branch.tradeName}`);

      // 🔄 Recarrega a página para atualizar todos os dados
      // Alternativa: Invalidar queries do React Query/Refine
      router.refresh();
    },
    [session, availableBranches, router]
  );

  /**
   * Força atualização das filiais (útil após criar/editar)
   */
  const refreshBranches = useCallback(async () => {
    const branches = await fetchAvailableBranches();
    if (branches && branches.length > 0) {
      // Mantém a filial atual se ainda existir
      if (currentBranch) {
        const stillExists = branches.find((b) => b.id === currentBranch.id);
        if (!stillExists) {
          selectInitialBranch(branches);
        }
      }
    }
  }, [fetchAvailableBranches, currentBranch, selectInitialBranch]);

  const value: TenantContextData = {
    user: session?.user as User | null,
    currentBranch,
    availableBranches,
    isLoading,
    switchBranch,
    refreshBranches,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

/**
 * Hook para acessar o contexto do tenant
 */
export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant deve ser usado dentro de um TenantProvider");
  }

  return context;
}





















