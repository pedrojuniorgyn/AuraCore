"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProductSchema } from "@/lib/validators/product";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";

type ProductFormData = z.infer<typeof createProductSchema>;

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

/**
 * 📦 FORMULÁRIO DE PRODUTOS
 * 
 * Formulário completo com 2 abas:
 * 1. Geral (SKU, Nome, Unidade, Peso, Descrição)
 * 2. Fiscal (NCM, Origem, Custos)
 * 
 * Funcionalidades:
 * - Validação Zod
 * - Máscaras de input (NCM)
 * - Reutilizável (Create e Edit)
 */

export function ProductForm({ initialData, onSubmit, isLoading, isEdit }: ProductFormProps) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(createProductSchema),
    defaultValues: initialData || {
      sku: "",
      name: "",
      description: "",
      unit: "UN",
      ncm: "",
      origin: "0",
      weightKg: undefined,
      priceCost: undefined,
      priceSale: undefined,
      status: "ACTIVE",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="geral">📦 Geral</TabsTrigger>
            <TabsTrigger value="fiscal">🧾 Fiscal</TabsTrigger>
          </TabsList>

          {/* ABA 1: GERAL */}
          <TabsContent value="geral" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* SKU */}
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="PROD-001"
                        className="uppercase font-mono"
                        disabled={isEdit} // SKU não editável em modo edição
                      />
                    </FormControl>
                    <FormDescription>
                      Código único do produto (sem espaços)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unidade */}
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a unidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UN">UN - Unidade</SelectItem>
                        <SelectItem value="KG">KG - Quilograma</SelectItem>
                        <SelectItem value="CX">CX - Caixa</SelectItem>
                        <SelectItem value="LT">LT - Litro</SelectItem>
                        <SelectItem value="M">M - Metro</SelectItem>
                        <SelectItem value="M2">M² - Metro Quadrado</SelectItem>
                        <SelectItem value="M3">M³ - Metro Cúbico</SelectItem>
                        <SelectItem value="TON">TON - Tonelada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Nome do Produto */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Parafuso Sextavado M10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Descrição detalhada do produto..."
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Informações adicionais (opcional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Peso */}
            <FormField
              control={form.control}
              name="weightKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso Bruto (kg)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.001"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0.000"
                    />
                  </FormControl>
                  <FormDescription>
                    Peso em quilogramas (importante para cálculo de frete)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          {/* ABA 2: FISCAL */}
          <TabsContent value="fiscal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* NCM */}
              <FormField
                control={form.control}
                name="ncm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NCM *</FormLabel>
                    <FormControl>
                      <MaskedInput
                        mask="0000.00.00"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="0000.00.00"
                      />
                    </FormControl>
                    <FormDescription>
                      Nomenclatura Comum do Mercosul (8 dígitos)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Origem */}
              <FormField
                control={form.control}
                name="origin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a origem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">0 - Nacional</SelectItem>
                        <SelectItem value="1">1 - Estrangeira (Importação Direta)</SelectItem>
                        <SelectItem value="2">2 - Estrangeira (Mercado Interno)</SelectItem>
                        <SelectItem value="3">3 - Nacional (Conteúdo &gt; 40%)</SelectItem>
                        <SelectItem value="4">4 - Nacional (Processo Básico)</SelectItem>
                        <SelectItem value="5">5 - Nacional (Conteúdo &lt; 40%)</SelectItem>
                        <SelectItem value="6">6 - Estrangeira (Importação Direta, sem similar)</SelectItem>
                        <SelectItem value="7">7 - Estrangeira (Mercado Interno, sem similar)</SelectItem>
                        <SelectItem value="8">8 - Nacional (Conteúdo &gt; 70%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Origem do produto (conforme Sefaz)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Preço de Custo */}
              <FormField
                control={form.control}
                name="priceCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Custo (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormDescription>
                      Custo de aquisição do produto
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preço de Venda */}
              <FormField
                control={form.control}
                name="priceSale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Venda (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormDescription>
                      Preço de venda sugerido
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Ativo</SelectItem>
                      <SelectItem value="INACTIVE">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        {/* Botões de Ação */}
        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar Alterações" : "Criar Produto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
























