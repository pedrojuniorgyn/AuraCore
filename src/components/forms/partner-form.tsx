"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBusinessPartnerSchema } from "@/lib/validators/business-partner";
import { z } from "zod";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { MaskedInput } from "@/components/ui/masked-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BusinessPartnerFormData = z.infer<typeof createBusinessPartnerSchema>;

interface PartnerFormProps {
  initialData?: Partial<BusinessPartnerFormData>;
  onSubmit: (data: BusinessPartnerFormData) => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

/**
 * 🤝 FORMULÁRIO DE PARCEIROS DE NEGÓCIO
 * 
 * Formulário completo com 3 abas:
 * 1. Identificação (Tipo, CNPJ, Razão Social, etc.)
 * 2. Fiscal (Regime Tributário, IE, Indicador IE, etc.)
 * 3. Endereço (CEP com busca automática via ViaCEP)
 * 
 * Funcionalidades:
 * - Validação Zod
 * - Máscaras de input (CNPJ, CEP, Telefone)
 * - Busca automática de endereço (ViaCEP)
 * - Reutilizável (Create e Edit)
 */

export function PartnerForm({ initialData, onSubmit, isLoading, isEdit }: PartnerFormProps) {
  const [loadingCEP, setLoadingCEP] = useState(false);

  console.log("🔍 PartnerForm initialData:", initialData);
  console.log("🔍 Document value:", initialData?.document);

  const form = useForm<BusinessPartnerFormData>({
    resolver: zodResolver(createBusinessPartnerSchema),
    defaultValues: initialData || {
      type: "CLIENT",
      document: "",
      name: "",
      tradeName: "",
      email: "",
      phone: "",
      dataSource: "MANUAL",
      taxRegime: "SIMPLE",
      ie: "",
      im: "",
      indIeDest: "9",
      cClassTrib: "",
      zipCode: "",
      street: "",
      number: "",
      complement: "",
      district: "",
      cityCode: "",
      cityName: "",
      state: "",
      status: "ACTIVE",
    },
  });

  /**
   * Busca endereço via ViaCEP ao digitar CEP
   */
  const handleCEPBlur = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, "");
    
    if (cleanCEP.length !== 8) {
      return;
    }

    setLoadingCEP(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();

      if (data.erro) {
        form.setError("zipCode", {
          message: "CEP não encontrado.",
        });
        return;
      }

      // Preenche campos automaticamente
      form.setValue("street", data.logradouro || "");
      form.setValue("district", data.bairro || "");
      form.setValue("cityName", data.localidade || "");
      form.setValue("state", data.uf || "");
      form.setValue("cityCode", data.ibge || ""); // ViaCEP retorna código IBGE!

      console.log("✅ Endereço preenchido via ViaCEP:", data);
    } catch (error) {
      console.error("❌ Erro ao buscar CEP:", error);
      form.setError("zipCode", {
        message: "Erro ao buscar CEP. Preencha manualmente.",
      });
    } finally {
      setLoadingCEP(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="identificacao" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="identificacao">📋 Identificação</TabsTrigger>
            <TabsTrigger value="fiscal">🧾 Fiscal</TabsTrigger>
            <TabsTrigger value="endereco">📍 Endereço</TabsTrigger>
          </TabsList>

          {/* ABA 1: IDENTIFICAÇÃO */}
          <TabsContent value="identificacao">
            <Card>
              <CardHeader>
                <CardTitle>Dados de Identificação</CardTitle>
                <CardDescription>
                  Informações básicas do parceiro de negócio.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tipo */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Parceiro *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CLIENT">Cliente</SelectItem>
                          <SelectItem value="PROVIDER">Fornecedor</SelectItem>
                          <SelectItem value="CARRIER">Transportadora</SelectItem>
                          <SelectItem value="BOTH">Cliente e Fornecedor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* CNPJ/CPF */}
                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ/CPF *</FormLabel>
                      <FormControl>
                        <MaskedInput
                          mask="00.000.000/0000-00"
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="00.000.000/0000-00"
                        />
                      </FormControl>
                      <FormDescription>
                        Apenas números (14 dígitos para CNPJ, 11 para CPF)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Razão Social */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social *</FormLabel>
                      <FormControl>
                        <Input placeholder="EMPRESA EXEMPLO LTDA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Nome Fantasia */}
                <FormField
                  control={form.control}
                  name="tradeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Fantasia</FormLabel>
                      <FormControl>
                        <Input placeholder="Empresa Exemplo" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contato@empresa.com.br"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Telefone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <MaskedInput
                          mask="(00) 00000-0000"
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="(11) 98888-8888"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 2: FISCAL */}
          <TabsContent value="fiscal">
            <Card>
              <CardHeader>
                <CardTitle>Informações Fiscais</CardTitle>
                <CardDescription>
                  Dados necessários para emissão de NFe/CTe 4.0 e Reforma Tributária.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Regime Tributário */}
                <FormField
                  control={form.control}
                  name="taxRegime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regime Tributário *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o regime" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SIMPLE">Simples Nacional</SelectItem>
                          <SelectItem value="NORMAL">Regime Normal</SelectItem>
                          <SelectItem value="PRESUMED">Lucro Presumido</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Inscrição Estadual */}
                <FormField
                  control={form.control}
                  name="ie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inscrição Estadual (IE)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123456789 ou ISENTO"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Digite "ISENTO" se não possuir IE
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Inscrição Municipal */}
                <FormField
                  control={form.control}
                  name="im"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inscrição Municipal (IM)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123456"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Indicador IE Destinatário */}
                <FormField
                  control={form.control}
                  name="indIeDest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indicador IE do Destinatário *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">
                            1 - Contribuinte ICMS
                          </SelectItem>
                          <SelectItem value="2">
                            2 - Contribuinte Isento
                          </SelectItem>
                          <SelectItem value="9">
                            9 - Não Contribuinte
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Obrigatório para NFe/CTe 4.0
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Classificação Tributária */}
                <FormField
                  control={form.control}
                  name="cClassTrib"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classificação Tributária</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 01, 02, 03"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Código de Classificação Tributária (Reforma Tributária)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 3: ENDEREÇO */}
          <TabsContent value="endereco">
            <Card>
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
                <CardDescription>
                  Digite o CEP para preenchimento automático via ViaCEP.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* CEP com busca automática */}
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MaskedInput
                            mask="00000-000"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={() => handleCEPBlur(field.value)}
                            placeholder="00000-000"
                          />
                          {loadingCEP && (
                            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Digite 8 dígitos para buscar automaticamente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  {/* Rua */}
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Rua/Logradouro *</FormLabel>
                        <FormControl>
                          <Input placeholder="Avenida Paulista" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Número */}
                  <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número *</FormLabel>
                        <FormControl>
                          <Input placeholder="1000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Complemento */}
                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Sala 100, Andar 5, etc."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Bairro */}
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro *</FormLabel>
                      <FormControl>
                        <Input placeholder="Bela Vista" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  {/* Cidade */}
                  <FormField
                    control={form.control}
                    name="cityName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade *</FormLabel>
                        <FormControl>
                          <Input placeholder="São Paulo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Estado (UF) */}
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado (UF) *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="SP"
                            maxLength={2}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Código IBGE (Hidden/Readonly - Preenchido pelo ViaCEP) */}
                <FormField
                  control={form.control}
                  name="cityCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código IBGE *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="3550308"
                          {...field}
                          readOnly
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormDescription>
                        Preenchido automaticamente pelo CEP (7 dígitos)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Botões de Ação */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar Alterações" : "Criar Parceiro"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

