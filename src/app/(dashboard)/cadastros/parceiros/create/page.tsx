"use client";

import { useState } from "react";
import { useCreate } from "@refinedev/core";
import { useRouter } from "next/navigation";
import { PartnerForm } from "@/components/forms/partner-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * 🆕 CRIAR PARCEIRO DE NEGÓCIO
 * 
 * Página de criação que reutiliza o PartnerForm
 */

export default function CreateBusinessPartnerPage() {
  const router = useRouter();
  const { mutate: create } = useCreate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (values: any) => {
    setIsLoading(true);
    // Remove máscaras antes de enviar
    const cleanedData = {
      ...values,
      document: values.document?.replace(/\D/g, ""),
      zipCode: values.zipCode?.replace(/\D/g, ""),
      phone: values.phone?.replace(/\D/g, ""),
    };

    create(
      {
        resource: "business-partners",
        values: cleanedData,
      },
      {
        onSuccess: () => {
          setIsLoading(false);
          router.push("/cadastros/parceiros");
        },
        onError: () => {
          setIsLoading(false);
        },
      }
    );
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
        <h2 className="text-3xl font-bold tracking-tight">Novo Parceiro de Negócio</h2>
        <p className="text-muted-foreground">
          Preencha os dados do novo parceiro (Cliente, Fornecedor ou Transportadora)
        </p>
      </div>

      {/* Card com Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Cadastro de Parceiro</CardTitle>
          <CardDescription>
            * Campos obrigatórios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PartnerForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            isEdit={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}














