"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  RefreshCw,
  Link as LinkIcon,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
} from "lucide-react";
import { auraTheme } from "@/lib/ag-grid/theme";
import { CurrencyCellRenderer, DateCellRenderer } from "@/lib/ag-grid/cell-renderers";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { GridPattern } from "@/components/ui/animated-background";
import { HoverCard } from "@/components/ui/glassmorphism-card";

// === TYPES ===
interface IDdaItem {
  id: number;
  externalId: string;
  beneficiaryName: string;
  beneficiaryDocument: string;
  amount: string;
  dueDate: string;
  issueDate: string;
  barcode: string;
  digitableLine: string;
  status: string;
  matchScore: number;
  notes: string;
  createdAt: string;
  matchedPayable?: {
    id: number;
    description: string;
    documentNumber: string;
  };
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
}

interface IPayable {
  id: number;
  description: string;
  amount: string;
  dueDate: string;
  documentNumber: string;
}

export default function RadarDdaPage() {
  const queryClient = useQueryClient();
  const gridRef = useRef<AgGridReact>(null);

  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number>(1);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedDdaItem, setSelectedDdaItem] = useState<IDdaItem | null>(null);
  const [selectedPayableId, setSelectedPayableId] = useState<number | null>(null);

  // === QUERIES ===
  const { data: ddaItems = [], isLoading: loadingDda, refetch: refetchDda } = useQuery({
    queryKey: ["dda-inbox", selectedBankAccountId],
    queryFn: async () => {
      const res = await fetch(`/api/financial/dda?organizationId=1`);
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

  const { data: payables = [] } = useQuery({
    queryKey: ["payables", "open"],
    queryFn: async () => {
      const res = await fetch("/api/financial/payables?status=OPEN&organizationId=1");
      const json = await res.json();
      return json.data || [];
    },
    enabled: linkDialogOpen,
  });

  // === MUTATIONS ===
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/financial/dda/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: 1,
          bankAccountId: selectedBankAccountId,
        }),
      });
      if (!res.ok) throw new Error("Falha ao sincronizar");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`${data.imported} boleto(s) importado(s)!`);
      refetchDda();
    },
    onError: () => {
      toast.error("Erro ao sincronizar DDA");
    },
  });

  const linkMutation = useMutation({
    mutationFn: async (data: { ddaId: number; payableId: number }) => {
      const res = await fetch(`/api/financial/dda/${data.ddaId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: 1,
          bankAccountId: selectedBankAccountId,
          payableId: data.payableId,
        }),
      });
      if (!res.ok) throw new Error("Falha ao vincular");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Boleto vinculado com sucesso!");
      setLinkDialogOpen(false);
      refetchDda();
    },
    onError: () => {
      toast.error("Erro ao vincular boleto");
    },
  });

  const createPayableMutation = useMutation({
    mutationFn: async (ddaId: number) => {
      const res = await fetch(`/api/financial/dda/${ddaId}/create-payable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: 1,
          bankAccountId: selectedBankAccountId,
        }),
      });
      if (!res.ok) throw new Error("Falha ao criar conta a pagar");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Conta a pagar criada com sucesso!");
      refetchDda();
    },
    onError: () => {
      toast.error("Erro ao criar conta a pagar");
    },
  });

  // === HANDLERS ===
  const handleSync = () => {
    syncMutation.mutate();
  };

  const handleOpenLinkDialog = (ddaItem: IDdaItem) => {
    setSelectedDdaItem(ddaItem);
    setSelectedPayableId(null);
    setLinkDialogOpen(true);
  };

  const handleLink = () => {
    if (!selectedDdaItem || !selectedPayableId) return;
    linkMutation.mutate({
      ddaId: selectedDdaItem.id,
      payableId: selectedPayableId,
    });
  };

  const handleCreatePayable = (ddaItem: IDdaItem) => {
    if (confirm(`Criar conta a pagar para ${ddaItem.beneficiaryName}?`)) {
      createPayableMutation.mutate(ddaItem.id);
    }
  };

  // === STATS ===
  const stats = {
    total: ddaItems.length,
    linked: ddaItems.filter((d: IDdaItem) => d.status === "LINKED").length,
    pending: ddaItems.filter((d: IDdaItem) => d.status === "PENDING").length,
    totalAmount: ddaItems.reduce((sum: number, d: IDdaItem) => sum + Number(d.amount), 0),
  };

  // === AG GRID COLUMNS ===
  const columnDefs: ColDef<IDdaItem>[] = [
    {
      field: "status",
      headerName: "Status",
      width: 140,
      cellRenderer: (params: any) => {
        const statusMap: Record<string, { variant: any; icon: any; label: string }> = {
          PENDING: { variant: "outline", icon: Clock, label: "Pendente" },
          LINKED: { variant: "default", icon: CheckCircle2, label: "Vinculado" },
          DISMISSED: { variant: "secondary", icon: AlertCircle, label: "Dispensado" },
        };
        const config = statusMap[params.value] || statusMap.PENDING;
        const Icon = config.icon;
        return (
          <Badge variant={config.variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      field: "matchScore",
      headerName: "Match",
      width: 100,
      cellRenderer: (params: any) => {
        if (!params.value) return "-";
        const score = params.value;
        const color =
          score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : "text-orange-500";
        return (
          <div className="flex items-center gap-1">
            <Zap className={`h-3 w-3 ${color}`} />
            <span className={`font-bold ${color}`}>{score}%</span>
          </div>
        );
      },
    },
    {
      field: "beneficiaryName",
      headerName: "Beneficiário",
      flex: 1,
    },
    {
      field: "beneficiaryDocument",
      headerName: "CNPJ",
      width: 160,
      valueFormatter: (params) => {
        const doc = params.value;
        if (doc.length === 14) {
          return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
        }
        return doc;
      },
    },
    {
      field: "amount",
      headerName: "Valor",
      width: 140,
      cellRenderer: CurrencyCellRenderer,
      type: "numericColumn",
    },
    {
      field: "dueDate",
      headerName: "Vencimento",
      width: 120,
      cellRenderer: DateCellRenderer,
    },
    {
      field: "matchedPayable.description",
      headerName: "Vinculado a",
      width: 250,
      valueGetter: (params) => params.data?.matchedPayable?.description || "-",
      cellRenderer: (params: any) => {
        if (!params.data?.matchedPayable) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs">{params.value}</span>
          </div>
        );
      },
    },
    {
      headerName: "Ações",
      width: 200,
      cellRenderer: (params: any) => {
        const item: IDdaItem = params.data;
        if (item.status === "LINKED") {
          return (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Pronto para Pagar
            </Badge>
          );
        }
        return (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenLinkDialog(item)}>
              <LinkIcon className="h-4 w-4 mr-1" />
              Vincular
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleCreatePayable(item)}>
              <Plus className="h-4 w-4 mr-1" />
              Criar
            </Button>
          </div>
        );
      },
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
                🎯 Radar DDA - Boletos Eletrônicos
              </h1>
              <p className="text-slate-400 mt-1">
                Débito Direto Autorizado - Integração BTG Pactual
              </p>
            </div>
            <RippleButton onClick={handleSync} disabled={syncMutation.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              {syncMutation.isPending ? "Sincronizando..." : "Sincronizar com Banco"}
            </RippleButton>
          </div>
        </FadeIn>

        {/* Stats Cards */}
        <FadeIn delay={0.2}>
          <div className="grid gap-4 md:grid-cols-4">
            <HoverCard className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Boletos</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <NumberCounter value={stats.total} />
                </div>
              </CardContent>
            </HoverCard>

            <HoverCard className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vinculados</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  <NumberCounter value={stats.linked} />
                </div>
              </CardContent>
            </HoverCard>

            <HoverCard className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  <NumberCounter value={stats.pending} />
                </div>
              </CardContent>
            </HoverCard>

            <HoverCard className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                <Zap className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-500">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    minimumFractionDigits: 0,
                  }).format(stats.totalAmount)}
                </div>
              </CardContent>
            </HoverCard>
          </div>
        </FadeIn>

        {/* Grid */}
        <FadeIn delay={0.3}>
          <Card className="backdrop-blur-sm bg-card/80 border-border/50">
            <CardHeader>
              <CardTitle>Inbox de Boletos DDA</CardTitle>
              <CardDescription>
                Boletos recebidos automaticamente do banco
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div style={{ height: 600, width: "100%" </div>
                <AgGridReact
                  ref={gridRef}
                  
                  rowData={ddaItems}
                  columnDefs={columnDefs}
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
                  paginationPageSizeSelector={[10, 20, 50]}
                  animateRows={true}
                  localeText={{
                    noRowsToShow: "Nenhum boleto DDA encontrado. Clique em 'Sincronizar'.",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Link Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular Boleto a Conta a Pagar</DialogTitle>
              <DialogDescription>
                Selecione uma conta a pagar existente para vincular este boleto
              </DialogDescription>
            </DialogHeader>
            
            {selectedDdaItem && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="text-sm">
                    <p><strong>Beneficiário:</strong> {selectedDdaItem.beneficiaryName}</p>
                    <p><strong>Valor:</strong> {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(Number(selectedDdaItem.amount))}</p>
                    <p><strong>Vencimento:</strong> {new Date(selectedDdaItem.dueDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>

                <Select
                  value={selectedPayableId?.toString()}
                  onValueChange={(v) => setSelectedPayableId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta a pagar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {payables.map((p: IPayable) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.description} - {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(Number(p.amount))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleLink}
                disabled={!selectedPayableId || linkMutation.isPending}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {linkMutation.isPending ? "Vinculando..." : "Vincular"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}




