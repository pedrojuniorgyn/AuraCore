"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileText, Send, CheckCircle2, XCircle, Clock, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { auraTheme } from "@/lib/ag-grid/theme";
import {
  StatusCellRenderer,
  CurrencyCellRenderer,
  DateCellRenderer,
} from "@/lib/ag-grid/cell-renderers";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { GridPattern } from "@/components/ui/animated-background";
import { DollarSign, FileCheck } from "lucide-react";

// === TYPES ===
interface IPayable {
  id: number;
  description: string;
  documentNumber: string;
  amount: string;
  dueDate: string;
  status: string;
  partner?: {
    name: string;
  };
}

interface IRemittance {
  id: number;
  fileName: string;
  remittanceNumber: number;
  type: string;
  status: string;
  totalRecords: number;
  totalAmount: string;
  createdAt: string;
  processedAt?: string;
  notes?: string;
  bankAccount: {
    id: number;
    name: string;
    bankName: string;
  };
}

interface IBankAccount {
  id: number;
  name: string;
  bankName: string;
  bankCode: string;
}

export default function RemittancesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const gridRef = useRef<AgGridReact>(null);
  const historyGridRef = useRef<AgGridReact>(null);

  const [selectedPayableIds, setSelectedPayableIds] = useState<number[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null);

  const handleEdit = useCallback((data: IRemittance) => {
    router.push(`/financeiro/remessas/editar/${data.id}`);
  }, [router]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta remessa?")) return;
    try {
      const res = await fetch(`/api/financial/remittances/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Erro ao excluir"); return; }
      toast.success("Excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
    } catch (error) { toast.error("Erro ao excluir"); }
  }, [queryClient]);

  // === QUERIES ===
  const { data: payables = [], isLoading: loadingPayables } = useQuery({
    queryKey: ["payables", "open"],
    queryFn: async () => {
      const res = await fetch("/api/financial/payables?status=OPEN");
      const json = await res.json();
      return json.data || [];
    },
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/financial/bank-accounts");
      const json = await res.json();
      return json.data || [];
    },
  });

  const { data: remittances = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["remittances"],
    queryFn: async () => {
      const res = await fetch("/api/financial/remittances");
      const json = await res.json();
      return json.data || [];
    },
  });

  // === MUTATIONS ===
  const generateMutation = useMutation({
    mutationFn: async (data: { bankAccountId: number; payableIds: number[] }) => {
      const res = await fetch("/api/financial/remittances/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Falha ao gerar remessa");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Remessa gerada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["remittances"] });
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      setSelectedPayableIds([]);
      setSelectedBankAccountId(null);
    },
    onError: () => {
      toast.error("Erro ao gerar remessa");
    },
  });

  // === HANDLERS ===
  const handleGenerateRemittance = () => {
    if (!selectedBankAccountId) {
      toast.error("Selecione uma conta bancária");
      return;
    }
    if (selectedPayableIds.length === 0) {
      toast.error("Selecione ao menos um título");
      return;
    }

    generateMutation.mutate({
      bankAccountId: selectedBankAccountId,
      payableIds: selectedPayableIds,
    });
  };

  const handleDownloadRemittance = (remittanceId: number, fileName: string) => {
    const url = `/api/financial/remittances/${remittanceId}/download`;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    toast.success(`Download iniciado: ${fileName}`);
  };

  const togglePayable = (id: number) => {
    setSelectedPayableIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // === AG GRID - PAYABLES ===
  const payableColumns: ColDef<IPayable>[] = [
    {
      headerName: "✓",
      width: 50,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      suppressSizeToFit: true,
    },
    {
      field: "documentNumber",
      headerName: "Documento",
      width: 150,
    },
    {
      field: "description",
      headerName: "Descrição",
      flex: 1,
    },
    {
      field: "partner.name",
      headerName: "Fornecedor",
      width: 200,
      valueGetter: (params) => params.data?.partner?.name || "-",
    },
    {
      field: "dueDate",
      headerName: "Vencimento",
      width: 120,
      cellRenderer: DateCellRenderer,
    },
    {
      field: "amount",
      headerName: "Valor",
      width: 140,
      cellRenderer: CurrencyCellRenderer,
      type: "numericColumn",
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      cellRenderer: StatusCellRenderer,
    },
  ];

  // === AG GRID - HISTORY ===
  const remittanceColumns: ColDef<IRemittance>[] = [
    {
      field: "remittanceNumber",
      headerName: "#",
      width: 80,
      valueFormatter: (params) => String(params.value).padStart(3, "0"),
    },
    {
      field: "fileName",
      headerName: "Arquivo",
      width: 220,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-xs">{params.value}</span>
        </div>
      ),
    },
    {
      field: "bankAccount.bankName",
      headerName: "Banco",
      width: 150,
      valueGetter: (params) => params.data?.bankAccount?.bankName || "-",
    },
    {
      field: "totalRecords",
      headerName: "Títulos",
      width: 100,
      type: "numericColumn",
    },
    {
      field: "totalAmount",
      headerName: "Valor Total",
      width: 140,
      cellRenderer: CurrencyCellRenderer,
      type: "numericColumn",
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      cellRenderer: (params: any) => {
        const statusMap: Record<string, { variant: any; icon: any }> = {
          GENERATED: { variant: "default", icon: Clock },
          SENT: { variant: "outline", icon: Send },
          PROCESSED_BY_BANK: { variant: "default", icon: CheckCircle2 },
          ERROR: { variant: "destructive", icon: XCircle },
        };
        const config = statusMap[params.value] || statusMap.GENERATED;
        const Icon = config.icon;
        return (
          <Badge variant={config.variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {params.value}
          </Badge>
        );
      },
    },
    {
      field: "createdAt",
      headerName: "Gerado em",
      width: 160,
      cellRenderer: DateCellRenderer,
    },
    {
      headerName: "Ações",
      width: 120,
      cellRenderer: (params: any) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownloadRemittance(params.data.id, params.data.fileName)}
        >
          <Download className="h-4 w-4 mr-1" />
          Baixar
        </Button>
      ),
    },
  ];

  // === RENDER ===
  return (
    <PageTransition>
      <div className="flex-1 space-y-6 p-8 pt-6 relative">
        {/* Background Pattern */}
        <GridPattern className="opacity-30" />

        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                💳 Remessas Bancárias CNAB
              </h1>
              <p className="text-slate-400 mt-1">
                Geração de arquivos CNAB 240 para pagamentos
              </p>
            </div>
          </div>
        </FadeIn>

        {/* KPI Cards */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Títulos Abertos */}
            <FadeIn delay={0.15}>
              <GlassmorphismCard className="border-blue-500/30 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl shadow-inner">
                      <FileText className="h-6 w-6 text-blue-400" />
                    </div>
                    <span className="text-xs text-blue-300 font-semibold px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-400/30">
                      Abertos
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Títulos Disponíveis</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    <NumberCounter value={payables.length} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Valor Total */}
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                      <DollarSign className="h-6 w-6 text-green-400" />
                    </div>
                    <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                      R$
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Valor Total</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    R$ <NumberCounter value={payables.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)} decimals={2} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Remessas Geradas */}
            <FadeIn delay={0.25}>
              <GlassmorphismCard className="border-purple-500/30 hover:border-purple-400/50 transition-all hover:shadow-lg hover:shadow-purple-500/20">
                <div className="p-6 bg-gradient-to-br from-purple-900/10 to-purple-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl shadow-inner">
                      <FileCheck className="h-6 w-6 text-purple-400" />
                    </div>
                    <span className="text-xs text-purple-300 font-semibold px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-400/30">
                      Histórico
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Remessas Geradas</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    <NumberCounter value={remittances.length} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* Tabs */}
        <FadeIn delay={0.3}>
          <Tabs defaultValue="generate" className="space-y-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="generate">Gerar Remessa</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            {/* TAB 1: GERAR REMESSA */}
            <TabsContent value="generate" className="space-y-4">
              <FadeIn delay={0.3}>
                <Card className="backdrop-blur-sm bg-card/80 border-border/50">
                  <CardHeader>
                    <CardTitle>Selecionar Títulos</CardTitle>
                    <CardDescription>
                      Escolha os títulos a pagar e a conta bancária de origem
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Seletor de Conta */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">
                          Conta Bancária de Débito
                        </label>
                        <Select
                          value={selectedBankAccountId?.toString()}
                          onValueChange={(v) => setSelectedBankAccountId(Number(v))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a conta..." />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts.map((account: IBankAccount) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.bankName} - {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="pt-6">
                        <RippleButton
                          onClick={handleGenerateRemittance}
                          disabled={
                            !selectedBankAccountId ||
                            selectedPayableIds.length === 0 ||
                            generateMutation.isPending
                          }
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {generateMutation.isPending ? "Gerando..." : "Gerar Arquivo CNAB"}
                        </RippleButton>
                      </div>
                    </div>

                    {/* Grid de Títulos */}
                    <div className="ag-theme-quartz-dark" style={{ height: 'calc(100vh - 650px)', width: "100%", minHeight: '350px' }}>
                      <AgGridReact
                        ref={gridRef}
                        rowData={payables}
                        columnDefs={payableColumns}
                        defaultColDef={{
                          sortable: true,
                          resizable: true,
                          filter: true,
                          floatingFilter: true,
                          enableRowGroup: true,
                          enablePivot: true,
                          enableValue: true,
                        }}
                        sideBar={{
                          toolPanels: [
                            { id: "columns", labelDefault: "Colunas", labelKey: "columns", iconKey: "columns", toolPanel: "agColumnsToolPanel" },
                            { id: "filters", labelDefault: "Filtros", labelKey: "filters", iconKey: "filter", toolPanel: "agFiltersToolPanel" },
                          ],
                          defaultToolPanel: "",
                        }}
                        enableRangeSelection={true}
                        rowGroupPanelShow="always"
                        groupDisplayType="groupRows"
                        rowSelection="multiple"
                        suppressRowClickSelection={true}
                        onSelectionChanged={() => {
                          const selected = gridRef.current?.api.getSelectedRows() || [];
                          setSelectedPayableIds(selected.map((r: IPayable) => r.id));
                        }}
                        pagination={true}
                        paginationPageSize={20}
                        animateRows={true}
                        localeText={{
                          noRowsToShow: "Nenhum título em aberto",
                        }}
                      />
                    </div>

                    {/* Resumo */}
                    {selectedPayableIds.length > 0 && (
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {selectedPayableIds.length} título(s) selecionado(s)
                          </span>
                          <span className="text-lg font-bold">
                            Total:{" "}
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(
                              payables
                                .filter((p: IPayable) => selectedPayableIds.includes(p.id))
                                .reduce((sum: number, p: IPayable) => sum + Number(p.amount), 0)
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </FadeIn>
            </TabsContent>

            {/* TAB 2: HISTÓRICO */}
            <TabsContent value="history">
              <FadeIn delay={0.3}>
                <Card className="backdrop-blur-sm bg-card/80 border-border/50">
                  <CardHeader>
                    <CardTitle>Arquivos Gerados</CardTitle>
                    <CardDescription>Histórico de remessas CNAB 240</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="ag-theme-quartz-dark" style={{ height: 'calc(100vh - 450px)', width: "100%", minHeight: '400px' }}>
                      <AgGridReact
                        ref={historyGridRef}
                        rowData={remittances}
                        columnDefs={remittanceColumns}
                        defaultColDef={{
                          sortable: true,
                          resizable: true,
                          filter: true,
                          floatingFilter: true,
                          enableRowGroup: true,
                          enablePivot: true,
                          enableValue: true,
                        }}
                        sideBar={{
                          toolPanels: [
                            { id: "columns", labelDefault: "Colunas", labelKey: "columns", iconKey: "columns", toolPanel: "agColumnsToolPanel" },
                            { id: "filters", labelDefault: "Filtros", labelKey: "filters", iconKey: "filter", toolPanel: "agFiltersToolPanel" },
                          ],
                          defaultToolPanel: "",
                        }}
                        enableRangeSelection={true}
                        rowGroupPanelShow="always"
                        groupDisplayType="groupRows"
                        pagination={true}
                        paginationPageSize={20}
                        paginationPageSizeSelector={[10, 20, 50, 100]}
                        animateRows={true}
                        localeText={{
                          noRowsToShow: "Nenhuma remessa gerada",
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            </TabsContent>
          </Tabs>
        </FadeIn>
      </div>
    </PageTransition>
  );
}




