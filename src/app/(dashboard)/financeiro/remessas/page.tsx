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
import { Download, FileText, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { auraTheme } from "@/lib/ag-grid/theme";
import {
  StatusCellRenderer,
  CurrencyCellRenderer,
  DateCellRenderer,
} from "@/lib/ag-grid/cell-renderers";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { ShimmerButton } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";

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
  const queryClient = useQueryClient();
  const gridRef = useRef<AgGridReact>(null);
  const historyGridRef = useRef<AgGridReact>(null);

  const [selectedPayableIds, setSelectedPayableIds] = useState<number[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null);

  // === QUERIES ===
  const { data: payables = [], isLoading: loadingPayables } = useQuery({
    queryKey: ["payables", "open"],
    queryFn: async () => {
      const res = await fetch("/api/financial/payables?status=OPEN&organizationId=1");
      const json = await res.json();
      return json.data || [];
    },
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/financial/bank-accounts?organizationId=1");
      const json = await res.json();
      return json.data || [];
    },
  });

  const { data: remittances = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["remittances"],
    queryFn: async () => {
      const res = await fetch("/api/financial/remittances?organizationId=1");
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
              <h1 className="text-3xl font-bold tracking-tight">
                <GradientText>Remessas Bancárias CNAB</GradientText>
              </h1>
              <p className="text-muted-foreground mt-1">
                Geração de arquivos CNAB 240 para pagamentos
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Tabs */}
        <FadeIn delay={0.2}>
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
                        <ShimmerButton
                          onClick={handleGenerateRemittance}
                          disabled={
                            !selectedBankAccountId ||
                            selectedPayableIds.length === 0 ||
                            generateMutation.isPending
                          }
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {generateMutation.isPending ? "Gerando..." : "Gerar Arquivo CNAB"}
                        </ShimmerButton>
                      </div>
                    </div>

                    {/* Grid de Títulos */}
                    <div style={{ height: 500, width: "100%" }}>
                      <AgGridReact
                        ref={gridRef}
                        theme={auraTheme}
                        rowData={payables}
                        columnDefs={payableColumns}
                        defaultColDef={{
                          sortable: true,
                          resizable: true,
                        }}
                        rowSelection="multiple"
                        suppressRowClickSelection={true}
                        onSelectionChanged={() => {
                          const selected = gridRef.current?.api.getSelectedRows() || [];
                          setSelectedPayableIds(selected.map((r: IPayable) => r.id));
                        }}
                        pagination={true}
                        paginationPageSize={20}
                        paginationPageSizeSelector={[10, 20, 50]}
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
                    <div style={{ height: 600, width: "100%" }}>
                      <AgGridReact
                        ref={historyGridRef}
                        theme={auraTheme}
                        rowData={remittances}
                        columnDefs={remittanceColumns}
                        defaultColDef={{
                          sortable: true,
                          resizable: true,
                        }}
                        pagination={true}
                        paginationPageSize={20}
                        paginationPageSizeSelector={[10, 20, 50]}
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


