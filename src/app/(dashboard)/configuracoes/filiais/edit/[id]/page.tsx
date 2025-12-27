"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BranchForm } from "@/components/forms/branch-form";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function EditBranchPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = parseInt(params.id as string);

  const [branchData, setBranchData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBranch() {
      try {
        const response = await fetch(`/api/branches/${branchId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Falha ao carregar filial");
        }

        const result = await response.json();
        setBranchData(result.data || result);
      } catch (error: any) {
        toast.error("Erro ao carregar filial", {
          description: error.message,
        });
        router.push("/configuracoes/filiais");
      } finally {
        setIsLoading(false);
      }
    }

    if (branchId) {
      fetchBranch();
    }
  }, [branchId, router]);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!branchData) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6 text-center text-red-500">
        <h2 className="text-3xl font-bold tracking-tight">Filial não encontrada</h2>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight">Editar Filial</h2>
        <p className="text-muted-foreground">
          Atualize os dados da filial: {branchData.name}
        </p>
      </div>

      <BranchForm
        initialData={branchData}
        branchId={branchId}
        version={branchData.version}
      />
    </div>
  );
}

























