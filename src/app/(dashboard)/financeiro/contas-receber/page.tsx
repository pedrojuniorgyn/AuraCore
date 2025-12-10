"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import type { ColDef, ICellRendererParams } from "ag-grid-community";

// AG Grid Enterprise Modules (v34+)
import { AllEnterpriseModule } from "ag-grid-enterprise";

import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { Plus, Download, RefreshCw, DollarSign, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// AG Grid CSS (v34+ Theming API)
import "ag-grid-community/styles/ag-theme-quartz.css";

// Registrar TODOS os módulos Enterprise de uma vez
ModuleRegistry.registerModules([AllEnterpriseModule]);

interface Receivable {
  id: number;
  documentNumber: string;
  partnerId: number;
  partnerName: string;
  categoryId: number;
  categoryName: string;
  description: string;
  issueDate: string;
  dueDate: string;
  receiveDate: string | null;
  amount: number;
  amountReceived: number;
  status: "OPEN" | "RECEIVED" | "PARTIAL" | "OVERDUE" | "CANCELLED";
  origin: string;
  createdAt: string;
}

// Custom Cell Renderer para Status
function StatusCellRenderer(props: ICellRendererParams) {
  const statusConfig = {
    RECEIVED: { label: "✅ Recebido", class: "bg-green-500/20 text-green-300 border-green-500/50" },
    OPEN: { label: "⏰ Aberto", class: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50" },
    OVERDUE: { label: "❌ Vencido", class: "bg-red-500/20 text-red-300 border-red-500/50" },
    PARTIAL: { label: "📋 Parcial", class: "bg-blue-500/20 text-blue-300 border-blue-500/50" },
    CANCELLED: { label: "🚫 Cancelado", class: "bg-gray-500/20 text-gray-300 border-gray-500/50" },
  };

  const config = statusConfig[props.value as keyof typeof statusConfig] || statusConfig.OPEN;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${config.class}`}>
      {config.label}
    </span>
  );
}

export default function ContasReceberPage() {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/financial/receivables");
      if (response.ok) {
        const data = await response.json();
        setReceivables(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error("Error fetching receivables:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, []);

  // Calcular KPIs
  const kpis = useMemo(() => {
    const total = receivables.reduce((sum, r) => sum + r.amount, 0);
    const received = receivables.filter(r => r.status === "RECEIVED").reduce((sum, r) => sum + r.amount, 0);
    const open = receivables.filter(r => r.status === "OPEN").reduce((sum, r) => sum + r.amount, 0);
    const overdue = receivables.filter(r => r.status === "OVERDUE").reduce((sum, r) => sum + r.amount, 0);

    return { total, received, open, overdue };
  }, [receivables]);

  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: "Documento",
      children: [
        {
          field: "documentNumber",
          headerName: "Número",
          width: 150,
          filter: "agTextColumnFilter",
          cellRenderer: (params: ICellRendererParams) => (
            <span className="font-mono text-purple-300">{params.value}</span>
          ),
        },
        {
          field: "origin",
          headerName: "Origem",
          width: 140,
          filter: "agSetColumnFilter",
          cellRenderer: (params: ICellRendererParams) => {
            const badges: Record<string, string> = {
              MANUAL: "🖊️ Manual",
              CTE_EMISSION: "🚚 CTe",
              INVOICE: "📋 Fatura",
              OTHER: "📋 Outro",
            };
            return (
              <span className="text-xs text-gray-400">
                {badges[params.value] || params.value}
              </span>
            );
          },
        },
      ],
    },
    {
      headerName: "Cliente",
      children: [
        {
          field: "partnerName",
          headerName: "Nome",
          width: 250,
          filter: "agTextColumnFilter",
          enableRowGroup: true,
        },
      ],
    },
    {
      headerName: "Financeiro",
      children: [
        {
          field: "amount",
          headerName: "Valor",
          width: 140,
          type: "numericColumn",
          filter: "agNumberColumnFilter",
          valueFormatter: (params) =>
            `R$ ${params.value?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          aggFunc: "sum",
        },
        {
          field: "amountReceived",
          headerName: "Recebido",
          width: 140,
          type: "numericColumn",
          valueFormatter: (params) =>
            `R$ ${params.value?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          aggFunc: "sum",
        },
        {
          field: "status",
          headerName: "Status",
          width: 140,
          filter: "agSetColumnFilter",
          cellRenderer: StatusCellRenderer,
        },
      ],
    },
    {
      headerName: "Datas",
      children: [
        {
          field: "issueDate",
          headerName: "Emissão",
          width: 130,
          filter: "agDateColumnFilter",
          valueFormatter: (params) =>
            params.value ? new Date(params.value).toLocaleDateString("pt-BR") : "",
        },
        {
          field: "dueDate",
          headerName: "Vencimento",
          width: 130,
          filter: "agDateColumnFilter",
          valueFormatter: (params) =>
            params.value ? new Date(params.value).toLocaleDateString("pt-BR") : "",
          cellStyle: (params) => {
            if (!params.value) return {};
            const dueDate = new Date(params.value);
            const today = new Date();
            if (dueDate < today && params.data.status !== "RECEIVED") {
              return { color: "#ef4444", fontWeight: "bold" };
            }
            return {};
          },
        },
        {
          field: "receiveDate",
          headerName: "Recebimento",
          width: 130,
          filter: "agDateColumnFilter",
          valueFormatter: (params) =>
            params.value ? new Date(params.value).toLocaleDateString("pt-BR") : "-",
        },
      ],
    },
    {
      field: "categoryName",
      headerName: "Categoria",
      width: 180,
      filter: "agTextColumnFilter",
      enableRowGroup: true,
    },
    {
      field: "description",
      headerName: "Descrição",
      flex: 1,
      filter: "agTextColumnFilter",
    },
  ], []);

  const defaultColDef: ColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    filterParams: {
      buttons: ['apply', 'reset'],
      closeOnApply: true,
    },
  }), []);

  const handleExport = useCallback(() => {
    gridRef.current?.api.exportDataAsExcel({
      fileName: `contas-receber-${new Date().toISOString().split("T")[0]}.xlsx`,
      sheetName: "Contas a Receber",
    });
  }, []);

  return (
    <PageTransition>
      <div className="p-8 space-y-6">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                💵 Contas a Receber
              </h1>
              <p className="text-slate-400">
                Gestão completa de contas a receber e fluxo de caixa
              </p>
            </div>
            <div className="flex gap-3">
              <RippleButton
                onClick={() => fetchReceivables()}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </RippleButton>
              <RippleButton
                onClick={handleExport}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </RippleButton>
              <Link href="/financeiro/contas-receber/create">
                <RippleButton className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conta
                </RippleButton>
              </Link>
            </div>
          </div>
        </FadeIn>

        {/* KPI Cards */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total a Receber */}
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-purple-500/30 hover:border-purple-400/50 transition-all hover:shadow-lg hover:shadow-purple-500/20">
                <div className="p-6 bg-gradient-to-br from-purple-900/10 to-purple-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl shadow-inner">
                      <DollarSign className="h-6 w-6 text-purple-400" />
                    </div>
                    <span className="text-xs text-purple-300 font-semibold px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-400/30">
                      Total
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total a Receber</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    R$ <NumberCounter value={kpis.total} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{receivables.length} conta(s)</p>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Total Recebido */}
            <FadeIn delay={0.3}>
              <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                      <TrendingUp className="h-6 w-6 text-green-400" />
                    </div>
                    <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                      ✅ Recebido
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total Recebido</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    R$ <NumberCounter value={kpis.received} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {receivables.filter(r => r.status === "RECEIVED").length} conta(s)
                  </p>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Total Aberto */}
            <FadeIn delay={0.4}>
              <GlassmorphismCard className="border-amber-500/30 hover:border-amber-400/50 transition-all hover:shadow-lg hover:shadow-amber-500/20">
                <div className="p-6 bg-gradient-to-br from-amber-900/10 to-amber-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl shadow-inner">
                      <Clock className="h-6 w-6 text-amber-400" />
                    </div>
                    <span className="text-xs text-amber-300 font-semibold px-3 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full border border-amber-400/30">
                      ⏰ Aberto
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total Aberto</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                    R$ <NumberCounter value={kpis.open} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {receivables.filter(r => r.status === "OPEN").length} conta(s)
                  </p>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Total Vencido */}
            <FadeIn delay={0.5}>
              <GlassmorphismCard className="border-red-500/30 hover:border-red-400/50 transition-all hover:shadow-lg hover:shadow-red-500/20">
                <div className="p-6 bg-gradient-to-br from-red-900/10 to-red-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-xl shadow-inner animate-pulse">
                      <AlertCircle className="h-6 w-6 text-red-400" />
                    </div>
                    <span className="text-xs text-red-300 font-semibold px-3 py-1 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-full border border-red-400/30 animate-pulse">
                      ❌ Vencido
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Total Vencido</h3>
                  <div className="text-2xl font-bold text-white">
                    R$ <NumberCounter value={kpis.overdue} />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {receivables.filter(r => r.status === "OVERDUE").length} conta(s)
                  </p>
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* AG Grid */}
        <FadeIn delay={0.6}>
          <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">
            <div className="ag-theme-quartz-dark" style={{ height: "calc(100vh - 500px)" }}>
              <AgGridReact
                ref={gridRef}
                rowData={receivables}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                animateRows={true}
                enableRangeSelection={true}
                sideBar={{
                  toolPanels: [
                    {
                      id: "columns",
                      labelDefault: "Colunas",
                      labelKey: "columns",
                      iconKey: "columns",
                      toolPanel: "agColumnsToolPanel",
                    },
                    {
                      id: "filters",
                      labelDefault: "Filtros",
                      labelKey: "filters",
                      iconKey: "filter",
                      toolPanel: "agFiltersToolPanel",
                    },
                  ],
                  defaultToolPanel: "",
                }}
                rowGroupPanelShow="always"
                groupDisplayType="groupRows"
                pagination={true}
                paginationPageSize={50}
                paginationPageSizeSelector={[25, 50, 100, 200]}
                loading={loading}
                loadingOverlayComponent={() => (
                  <div className="flex flex-col items-center justify-center p-8">
                    <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mb-4" />
                    <p className="text-purple-300">Carregando contas a receber...</p>
                  </div>
                )}
              />
            </div>
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
