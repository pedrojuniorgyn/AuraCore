"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTenant } from "@/contexts/tenant-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvalidate } from "@refinedev/core";
import { toast } from "sonner";

/**
 * 🏢 BRANCH SWITCHER
 * 
 * Componente para trocar de filial no header do dashboard.
 * 
 * Funcionalidades:
 * - Lista filiais disponíveis para o usuário
 * - Destaca a filial ativa
 * - Persiste seleção no localStorage
 * - Recarrega dados ao trocar
 * - Busca rápida de filiais (search)
 */

export function BranchSwitcher() {
  const { currentBranch, availableBranches, isLoading, switchBranch } = useTenant();
  const [open, setOpen] = React.useState(false);
  const invalidate = useInvalidate();

  /**
   * Troca de filial com invalidação de cache
   */
  const handleBranchSwitch = React.useCallback(
    async (branchId: number) => {
      if (branchId === currentBranch?.id) {
        setOpen(false);
        return;
      }

      try {
        // 1️⃣ Invalida TODOS os recursos do Refine antes de trocar
        // Isso garante que os dados antigos não sejam exibidos
        invalidate({
          invalidates: ["all"],
        });

        // 2️⃣ Troca de filial (atualiza contexto e localStorage)
        await switchBranch(branchId);

        // 3️⃣ Fecha o popover
        setOpen(false);

        // 4️⃣ Toast de sucesso já é exibido pelo switchBranch()
        
        // 5️⃣ Recarrega página para garantir sincronização total
        // (router.refresh() já é chamado dentro de switchBranch)
      } catch (error) {
        console.error("❌ Erro ao trocar filial:", error);
        toast.error("Erro ao trocar de filial. Tente novamente.");
      }
    },
    [currentBranch, switchBranch, invalidate]
  );

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Skeleton className="h-10 w-[200px]" />
      </div>
    );
  }

  if (!currentBranch || availableBranches.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>Sem filiais disponíveis</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Selecione uma filial"
          className="w-full justify-between hover:bg-accent"
        >
          <div className="flex items-center space-x-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">{currentBranch.tradeName || currentBranch.name}</span>
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 z-[60]" align="start" side="right">
        <Command>
          <CommandInput placeholder="Buscar filial..." />
          <CommandEmpty>Nenhuma filial encontrada.</CommandEmpty>
          <CommandGroup heading="Filiais Disponíveis">
            {availableBranches.map((branch) => (
              <CommandItem
                key={branch.id}
                value={branch.tradeName || branch.name}
                onSelect={() => handleBranchSwitch(branch.id)}
                className="cursor-pointer"
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-medium truncate">
                    {branch.tradeName || branch.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    CNPJ: {formatCNPJ(branch.document)}
                  </span>
                </div>
                <Check
                  className={cn(
                    "ml-2 h-4 w-4 shrink-0",
                    currentBranch.id === branch.id ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Formata CNPJ para exibição
 */
function formatCNPJ(cnpj: string): string {
  if (!cnpj) return "";
  
  // Remove caracteres não numéricos
  const cleaned = cnpj.replace(/\D/g, "");
  
  // Formata: XX.XXX.XXX/XXXX-XX
  if (cleaned.length === 14) {
    return cleaned.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );
  }
  
  return cnpj;
}

