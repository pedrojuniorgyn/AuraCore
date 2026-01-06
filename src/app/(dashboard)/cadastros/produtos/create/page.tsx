"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ProductForm } from "@/components/forms/product-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createProductSchema } from "@/lib/validators/product";
import { z } from "zod";

type ProductFormData = z.infer<typeof createProductSchema>;

/**
 * ➕ CRIAR NOVO PRODUTO
 */

export default function CreateProductPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (values: ProductFormData) => {
    try {
      setIsCreating(true);
      const branchId = localStorage.getItem("auracore:current-branch") || "1";

      // Remove máscaras antes de enviar
      const cleanedData = {
        ...values,
        ncm: values.ncm?.replace(/\D/g, ""),
      };

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-branch-id": branchId,
        },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Erro ao criar produto");
        return;
      }

      toast.success("Produto criado com sucesso!");
      router.push("/cadastros/produtos");
    } catch (error) {
      console.error("❌ Erro ao criar:", error);
      toast.error("Erro ao criar produto");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header com Breadcrumb */}
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Novo Produto
        </h2>
        <p className="text-muted-foreground">
          Preencha os dados do novo produto
        </p>
      </div>

      {/* Card com Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Produto</CardTitle>
          <CardDescription>
            Preencha as informações do produto e clique em &quot;Criar Produto&quot;
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            onSubmit={handleSubmit}
            isLoading={isCreating}
            isEdit={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}




































