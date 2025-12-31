"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BranchForm } from "@/components/forms/branch-form";

export default function CreateBranchPage() {
  const router = useRouter();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight">Nova Filial</h2>
        <p className="text-muted-foreground">
          Cadastre uma nova filial da sua organização
        </p>
      </div>

      <BranchForm />
    </div>
  );
}































