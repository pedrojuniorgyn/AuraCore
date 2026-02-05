"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ProductForm } from "@/components/forms/product-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createProductSchema } from "@/lib/validators/product";
import { z } from "zod";
import { fetchAPI } from "@/lib/api";

type ProductFormData = z.infer<typeof createProductSchema>;

interface ProductData extends ProductFormData {
  version?: number;
}

/**
 * ✏️ EDITAR PRODUTO
 */

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Busca dados do produto
  const fetchProduct = async () => {
    try {
      setIsLoading(true);
      const branchId = localStorage.getItem("auracore:current-branch") || "1";

      const data = await fetchAPI<ProductData>(`/api/products/${id}`, {
        headers: {
          "x-branch-id": branchId,
        },
      });

      setProduct(data);
    } catch (error) {
      console.error("❌ Erro ao buscar produto:", error);
      toast.error("Erro ao carregar produto");
      router.push("/cadastros/produtos");
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega ao montar
  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = async (values: ProductFormData) => {
    try {
      setIsUpdating(true);
      const branchId = localStorage.getItem("auracore:current-branch") || "1";

      // Remove máscaras antes de enviar
      const cleanedData = {
        ...values,
        ncm: values.ncm?.replace(/\D/g, ""),
        version: product?.version || 1, // Inclui versão para Optimistic Lock
      };

      await fetchAPI(`/api/products/${id}`, {
        method: "PUT",
        headers: {
          "x-branch-id": branchId,
        },
        body: cleanedData,
      });

      toast.success("Produto atualizado com sucesso!");
      router.push("/cadastros/produtos");
    } catch (error) {
      console.error("❌ Erro ao atualizar:", error);
      toast.error("Erro ao atualizar produto");
    } finally {
      setIsUpdating(false);
    }
  };

  // Espera dados carregarem
  if (isLoading || !product) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

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
          Editar Produto: {product?.name}
        </h2>
        <p className="text-muted-foreground">
          ID: #{id} | Versão: {product?.version}
        </p>
      </div>

      {/* Card com Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Editar Cadastro</CardTitle>
          <CardDescription>
            Altere os dados do produto e clique em &quot;Salvar Alterações&quot;
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            initialData={product}
            onSubmit={handleSubmit}
            isLoading={isUpdating}
            isEdit={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}




































