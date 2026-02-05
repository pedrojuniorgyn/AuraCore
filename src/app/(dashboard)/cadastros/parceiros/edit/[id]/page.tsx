"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PartnerForm } from "@/components/forms/partner-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createBusinessPartnerSchema } from "@/lib/validators/business-partner";
import { z } from "zod";
import { fetchAPI } from "@/lib/api";

type BusinessPartnerFormData = z.infer<typeof createBusinessPartnerSchema>;

interface PartnerData extends BusinessPartnerFormData {
  version?: number;
}

/**
 * ✏️ EDITAR PARCEIRO DE NEGÓCIO
 * 
 * Página de edição que reutiliza o PartnerForm
 * Carrega dados do parceiro existente
 */

export default function EditBusinessPartnerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Busca dados do parceiro
  const fetchPartner = async () => {
    try {
      setIsLoading(true);
      const branchId = localStorage.getItem("auracore:current-branch") || "1";

      const data = await fetchAPI<PartnerData>(`/api/business-partners/${id}`, {
        headers: {
          "x-branch-id": branchId,
        },
      });

      setPartner(data);
    } catch (error) {
      console.error("❌ Erro ao buscar parceiro:", error);
      toast.error("Erro ao carregar parceiro");
      router.push("/cadastros/parceiros");
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega ao montar
  useEffect(() => {
    fetchPartner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = async (values: BusinessPartnerFormData) => {
    try {
      setIsUpdating(true);
      const branchId = localStorage.getItem("auracore:current-branch") || "1";

      // Remove máscaras antes de enviar
      const cleanedData = {
        ...values,
        document: values.document?.replace(/\D/g, ""),
        zipCode: values.zipCode?.replace(/\D/g, ""),
        phone: values.phone?.replace(/\D/g, ""),
        version: partner?.version || 1, // Inclui versão para Optimistic Lock
      };

      await fetchAPI(`/api/business-partners/${id}`, {
        method: "PUT",
        headers: {
          "x-branch-id": branchId,
        },
        body: cleanedData,
      });

      toast.success("Parceiro atualizado com sucesso!");
      router.push("/cadastros/parceiros");
    } catch (error) {
      console.error("❌ Erro ao atualizar:", error);
      toast.error("Erro ao atualizar parceiro");
    } finally {
      setIsUpdating(false);
    }
  };

  // Espera dados carregarem
  if (isLoading || !partner) {
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
          Editar Parceiro: {partner?.name}
        </h2>
        <p className="text-muted-foreground">
          ID: #{id} | Versão: {partner?.version}
        </p>
      </div>

      {/* Card com Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Editar Cadastro</CardTitle>
          <CardDescription>
            Altere os dados do parceiro e clique em &quot;Salvar Alterações&quot;
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PartnerForm
            initialData={partner}
            onSubmit={handleSubmit}
            isLoading={isUpdating}
            isEdit={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}

