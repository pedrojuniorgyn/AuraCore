"use client";

import { useEffect, useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MaskedInput } from "@/components/ui/masked-input";

// Schema de validação
const branchFormSchema = z.object({
  // Identificação
  name: z.string().min(3, "Razão Social deve ter no mínimo 3 caracteres"),
  tradeName: z.string().min(3, "Nome Fantasia deve ter no mínimo 3 caracteres"),
  document: z.string().min(14, "CNPJ deve ter 14 dígitos"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  // Integração (legado / Auditoria)
  legacyCompanyBranchCode: z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      const n = typeof v === "number" ? v : Number(String(v));
      return Number.isFinite(n) ? n : undefined;
    },
    z.number().int().min(1).max(32767)
  ).optional(),

  // Fiscal
  ie: z.string().min(1, "Inscrição Estadual é obrigatória"),
  im: z.string().optional(),
  crt: z.enum(["1", "2", "3"]),
  cClassTrib: z.string().optional(),

  // Endereço
  zipCode: z.string().min(8, "CEP deve ter 8 dígitos"),
  street: z.string().min(3, "Logradouro é obrigatório"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  district: z.string().min(3, "Bairro é obrigatório"),
  cityCode: z.string().length(7, "Código IBGE deve ter 7 dígitos"),
  cityName: z.string().min(3, "Nome da cidade é obrigatório"),
  state: z.string().length(2, "UF deve ter 2 letras"),

  // Configurações
  timeZone: z.string().default("America/Sao_Paulo"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

type BranchFormValues = z.infer<typeof branchFormSchema>;

interface BranchFormProps {
  initialData?: Partial<BranchFormValues>;
  branchId?: number;
  version?: number;
}

export function BranchForm({ initialData, branchId, version }: BranchFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [legacyBranchOptions, setLegacyBranchOptions] = useState<Array<{ code: number; label: string }>>([]);
  const [taxClassOptions, setTaxClassOptions] = useState<Array<{ value: string; label: string }>>([]);
  const NONE = "__none__";

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema) as Resolver<BranchFormValues>,
    defaultValues: {
      name: initialData?.name || "",
      tradeName: initialData?.tradeName || "",
      document: initialData?.document || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      legacyCompanyBranchCode: (initialData as unknown)?.legacyCompanyBranchCode ?? undefined,
      ie: initialData?.ie || "",
      im: initialData?.im || "",
      crt: initialData?.crt || "1",
      cClassTrib: initialData?.cClassTrib || "",
      zipCode: initialData?.zipCode || "",
      street: initialData?.street || "",
      number: initialData?.number || "",
      complement: initialData?.complement || "",
      district: initialData?.district || "",
      cityCode: initialData?.cityCode || "",
      cityName: initialData?.cityName || "",
      state: initialData?.state || "",
      timeZone: initialData?.timeZone || "America/Sao_Paulo",
      status: initialData?.status || "ACTIVE",
    },
  });

  // Carrega opções do banco legado (se disponível). Se falhar, mantém inputs manuais.
  useEffect(() => {
    let mounted = true;

    async function loadLegacyOptions() {
      try {
        const [rBranches, rTax] = await Promise.all([
          fetch("/api/admin/audit/legacy/branch-codes", { credentials: "include" }),
          fetch("/api/admin/audit/legacy/tax-classifications", { credentials: "include" }),
        ]);

        if (rBranches.ok) {
          const data = await rBranches.json();
          const items = Array.isArray(data?.items) ? data.items : [];
          if (mounted) {
            setLegacyBranchOptions(
              items
                .map((it: unknown) => {
                  const item = it as { code?: unknown; label?: unknown };
                  return { code: Number(item.code), label: String(item.label ?? item.code) };
                })
                .filter((it: unknown) => {
                  const item = it as { code?: unknown };
                  return Number.isFinite(Number(item.code));
                })
            );
          }
        }

        if (rTax.ok) {
          const data = await rTax.json();
          const items = Array.isArray(data?.items) ? data.items : [];
          if (mounted) {
            setTaxClassOptions(
              items
                .map((it: unknown) => {
                  const item = it as { value?: unknown; label?: unknown };
                  return { value: String(item.value ?? ""), label: String(item.label ?? item.value ?? "") };
                })
                .filter((it: unknown) => {
                  const item = it as { value?: unknown };
                  return Boolean(item.value);
                })
            );
          }
        }
      } catch {
        // silencioso: UI continua com inputs manuais
      }
    }

    void loadLegacyOptions();
    return () => {
      mounted = false;
    };
  }, []);

  // Busca automática de endereço via CEP
  const handleCepBlur = async () => {
    const cep = form.getValues("zipCode").replace(/\D/g, "");
    if (cep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        headers: { Accept: "application/json" },
      });
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      form.setValue("street", data.logradouro || "");
      form.setValue("district", data.bairro || "");
      form.setValue("cityName", data.localidade || "");
      form.setValue("state", data.uf || "");
      if (typeof data.complemento === "string" && data.complemento) {
        form.setValue("complement", data.complemento);
      }

      // IBGE às vezes não vem. Se vier, valida e preenche; se não vier, deixa o usuário preencher manualmente.
      const ibge = typeof data.ibge === "string" ? data.ibge.replace(/\D/g, "") : "";
      if (/^\d{7}$/.test(ibge)) {
        form.setValue("cityCode", ibge);
        toast.success("Endereço preenchido automaticamente!");
      } else {
        toast.success("Endereço preenchido (IBGE pendente)", {
          description: "Preencha o Código IBGE manualmente para concluir o cadastro.",
        });
      }
    } catch {
      toast.error("Erro ao buscar CEP", {
        description: "Não foi possível consultar o ViaCEP. Preencha o endereço manualmente.",
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const onSubmit = async (data: BranchFormValues) => {
    setIsLoading(true);

    try {
      const url = branchId ? `/api/branches/${branchId}` : "/api/branches";
      const method = branchId ? "PUT" : "POST";

      const body = branchId
        ? { ...data, version }
        : { ...data, branchId: 1 };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar filial");
      }

      toast.success(branchId ? "Filial atualizada com sucesso!" : "Filial criada com sucesso!");
      router.push("/configuracoes/filiais");
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Erro ao salvar filial", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="identification" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="identification">Identificação</TabsTrigger>
            <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
            <TabsTrigger value="address">Endereço</TabsTrigger>
          </TabsList>

          {/* ABA 1: IDENTIFICAÇÃO */}
          <TabsContent value="identification" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Dados da Filial</CardTitle>
                <CardDescription>Informações básicas de identificação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razão Social *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="AURACORE LOGISTICA LTDA" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tradeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Fantasia *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="AuraCore Matriz" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="document"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ *</FormLabel>
                        <FormControl>
                          <MaskedInput
                            mask="00.000.000/0000-00"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="00.000.000/0000-00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="contato@empresa.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone *</FormLabel>
                        <FormControl>
                          <MaskedInput
                            mask="(00) 00000-0000"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="(00) 00000-0000"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Ativa</SelectItem>
                          <SelectItem value="INACTIVE">Inativa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="legacyCompanyBranchCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código da Filial (Legado)</FormLabel>
                      <FormControl>
                        {legacyBranchOptions.length ? (
                          <Select
                            value={field.value == null ? NONE : String(field.value)}
                            onValueChange={(v) => {
                              if (v === NONE) {
                                field.onChange(undefined);
                                return;
                              }
                              const n = Number(v);
                              field.onChange(Number.isFinite(n) ? n : undefined);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione do legado (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>Não usar</SelectItem>
                              {legacyBranchOptions.map((opt) => (
                                <SelectItem key={opt.code} value={String(opt.code)}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={field.value === undefined ? "" : String(field.value)}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder="Ex: 1"
                            inputMode="numeric"
                          />
                        )}
                      </FormControl>
                      <FormDescription>
                        Opcional. Preencha com o <code>CodigoEmpresaFilial</code> do banco legado para o módulo Auditoria
                        filtrar corretamente por filial.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 2: FISCAL */}
          <TabsContent value="fiscal" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações Fiscais</CardTitle>
                <CardDescription>Dados tributários da filial</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ie"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição Estadual *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123456789 ou ISENTO" />
                        </FormControl>
                        <FormDescription>Digite &quot;ISENTO&quot; se não tiver IE</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="im"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição Municipal</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Opcional" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="crt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Regime Tributário (CRT) *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o regime tributário" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 - Simples Nacional</SelectItem>
                            <SelectItem value="2">2 - Simples Nacional (Excesso de Sublimite)</SelectItem>
                            <SelectItem value="3">3 - Regime Normal (Lucro Real, Lucro Presumido)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Para Lucro Real ou Lucro Presumido, selecione a opção 3
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cClassTrib"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Classificação Tributária</FormLabel>
                        <FormControl>
                          {taxClassOptions.length ? (
                            <Select
                              value={(field.value ?? "").trim() ? (field.value as string) : NONE}
                              onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione do legado (opcional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE}>Não informado</SelectItem>
                                {taxClassOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input {...field} placeholder="Opcional" />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 3: ENDEREÇO */}
          <TabsContent value="address" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
                <CardDescription>Localização da filial</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP *</FormLabel>
                        <FormControl>
                          <MaskedInput
                            mask="00000-000"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={handleCepBlur}
                            placeholder="00000-000"
                          />
                        </FormControl>
                        {isLoadingCep && <FormDescription>Buscando...</FormDescription>}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF *</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={2} placeholder="SP" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cityName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="São Paulo" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Logradouro *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Av. Paulista" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="1000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="complement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Sala 10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Centro" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cityCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código IBGE *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="3550308" maxLength={7} inputMode="numeric" />
                        </FormControl>
                        <FormDescription>
                          Tenta preencher automaticamente pelo CEP. Se não vier, digite manualmente (7 dígitos).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {branchId ? "Atualizar" : "Criar"} Filial
          </Button>
        </div>
      </form>
    </Form>
  );
}

