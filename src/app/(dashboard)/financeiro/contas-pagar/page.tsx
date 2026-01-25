"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import type { ColDef, IDetailCellRendererParams, ValueFormatterParams, GridReadyEvent, GridApi } from "ag-grid-community";

// AG Grid Enterprise Modules (v34+)
import { AllEnterpriseModule } from "ag-grid-enterprise";

import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { NumberCounter } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { Plus, Download, RefreshCw, DollarSign, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AIInsightWidget } from "@/components/ai";
import { fetchAPI } from "@/lib/api";

// AG Grid CSS (v34+ Theming API)
import "ag-grid-community/styles/ag-theme-quartz.css";
import "@/styles/aurora-premium-grid.css";
import {
  PremiumStatusCell,
  PremiumCurrencyCell,
  PremiumDateCell,
  PremiumActionCell,
  PremiumDocumentCell,
  PremiumPartnerCell,
  PremiumOriginCell
} from "@/lib/ag-grid/aurora-premium-cells";

// SSRM Hook
import { useSSRMDatasource } from "@/hooks/useSSRMDatasource";

// Registrar TODOS os módulos Enterprise de uma vez
ModuleRegistry.registerModules([AllEnterpriseModule]);

interface PayableItem {
  id: number;
  ncmCode: string;
  productDescription: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  categoryName: string;
  accountCode: string;
  accountName: string;
}

interface Payable {
  id: number;
  documentNumber: string;
  partnerId: number;
  partnerName: string;
  categoryId: number;
  categoryName: string;
  description: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  amountPaid: number;
  status: "PENDING" | "PAID" | "PARTIAL" | "OVERDUE";
  origin: string;
  createdAt: string;
}

interface KPIs {
  totalOpen: number;
  countOpen: number;
  totalOverdue: number;
  countOverdue: number;
  totalPaidThisMonth: number;
  countPaidThisMonth: number;
}

// Detail Grid (Master-Detail)
function DetailCellRenderer(props: IDetailCellRendererParams) {
  const [items, setItems] = useState<PayableItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await fetchAPI<PayableItem[]>(`/api/financial/payables/${props.data.id}/items`);
        setItems(data);
      } catch (error) {
        console.error("Error fetching items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [props.data.id]);

  const detailColDefs: ColDef[] = [
    { field: "ncmCode", headerName: "NCM", width: 120, filter: true },
    { field: "productDescription", headerName: "Descrição do Produto", flex: 1, filter: true },
    {
      field: "quantity",
      headerName: "Qtd",
      width: 100,
      type: "numericColumn",
      valueFormatter: (params: ValueFormatterParams<PayableItem>) => params.value?.toLocaleString("pt-BR"),
    },
    {
      field: "unitValue",
      headerName: "Valor Unit.",
      width: 130,
      type: "numericColumn",
      valueFormatter: (params: ValueFormatterParams<PayableItem>) => `R$ ${params.value?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    },
    {
      field: "totalValue",
      headerName: "Valor Total",
      width: 140,
      type: "numericColumn",
      valueFormatter: (params: ValueFormatterParams<PayableItem>) => `R$ ${params.value?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    },
    { field: "categoryName", headerName: "Categoria", width: 150, filter: true },
    { field: "accountCode", headerName: "Conta", width: 100, filter: true },
    { field: "accountName", headerName: "Nome da Conta", flex: 1, filter: true },
  ];

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
        <p className="mt-2 text-sm">Carregando itens...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p className="text-sm">Nenhum item encontrado</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-gray-900/50 to-purple-900/10">
      <h4 className="text-sm font-semibold text-purple-300 mb-3">
        📦 Itens da NFe #{props.data.documentNumber} ({items.length} {items.length === 1 ? "item" : "itens"})
      </h4>
      <div className="ag-theme-quartz-dark" style={{ height: Math.min(items.length * 42 + 50, 300) }}>
        <AgGridReact
          rowData={items}
          columnDefs={detailColDefs}
          defaultColDef={{
            sortable: true,
            resizable: true,
          }}
          domLayout="autoHeight"
        />
      </div>
    </div>
  );
}

export default function ContasPagarPage() {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [kpis, setKpis] = useState<KPIs>({
    totalOpen: 0,
    countOpen: 0,
    totalOverdue: 0,
    countOverdue: 0,
    totalPaidThisMonth: 0,
    countPaidThisMonth: 0,
  });
  const [totalRows, setTotalRows] = useState(0);

  // ✅ SSRM Datasource Hook
  const datasource = useSSRMDatasource({
    endpoint: '/api/financial/payables/ssrm',
    onError: (error) => toast.error(`Erro ao carregar dados: ${error.message}`),
    onSuccess: (rowCount) => setTotalRows(rowCount),
  });

  // Buscar KPIs separadamente (não depende do grid)
  const fetchKPIs = useCallback(async () => {
    try {
      const data = await fetchAPI<KPIs>("/api/financial/payables/summary");
      setKpis(data);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
    }
  }, []);

  // Handler para editar
  const handleEdit = useCallback((data: Payable) => {
    router.push(`/financeiro/contas-pagar/editar/${data.id}`);
  }, [router]);

  // Handler para excluir
  const handleDelete = useCallback(async (id: number) => {
    try {
      await fetchAPI(`/api/financial/payables/${id}`, {
        method: "DELETE",
      });

      toast.success("Conta a pagar excluída com sucesso!");
      // Refresh grid e KPIs
      gridApi?.refreshServerSide({ purge: true });
      void fetchKPIs();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir conta a pagar");
    }
  }, [gridApi, fetchKPIs]);

  // Context para o AG Grid (passa handlers para PremiumActionCell)
  const gridContext = useMemo(() => ({
    onEdit: handleEdit,
    onDelete: handleDelete,
  }), [handleEdit, handleDelete]);

  // Buscar KPIs ao montar (fetch on mount pattern)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchKPIs();
  }, [fetchKPIs]);

  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: "Documento",
      children: [
        {
          field: "documentNumber",
          headerName: "Número",
          width: 150,
          filter: "agTextColumnFilter",
          filterParams: {
            filterOptions: ['contains', 'startsWith', 'equals'],
            defaultOption: 'contains',
            buttons: ['apply', 'reset'],
            closeOnApply: true,
            debounceMs: 500,
          },
          cellRenderer: PremiumDocumentCell,
        },
        {
          field: "origin",
          headerName: "Origem",
          width: 140,
          filter: "agSetColumnFilter",
          filterParams: {
            values: ['MANUAL', 'INVOICE_IMPORT', 'OTHER'],
            buttons: ['apply', 'reset'],
            closeOnApply: true,
          },
          cellRenderer: PremiumOriginCell,
        },
      ],
    },
    {
      headerName: "Fornecedor",
      children: [
        {
          field: "partnerName",
          headerName: "Nome",
          width: 250,
          filter: "agTextColumnFilter",
          filterParams: {
            filterOptions: ['contains', 'startsWith', 'equals'],
            buttons: ['apply', 'reset'],
            closeOnApply: true,
          },
          enableRowGroup: true,
          cellRenderer: PremiumPartnerCell,
        },
      ],
    },
    {
      headerName: "Financeiro",
      children: [
        {
          field: "amount",
          headerName: "Valor",
          width: 170,
          type: "numericColumn",
          filter: "agNumberColumnFilter",
          filterParams: {
            filterOptions: ['equals', 'greaterThan', 'lessThan', 'inRange'],
            defaultOption: 'greaterThan',
            buttons: ['apply', 'reset'],
            closeOnApply: true,
          },
          cellRenderer: PremiumCurrencyCell,
          aggFunc: "sum",
        },
        {
          field: "amountPaid",
          headerName: "Pago",
          width: 170,
          type: "numericColumn",
          cellRenderer: PremiumCurrencyCell,
          aggFunc: "sum",
        },
        {
          field: "status",
          headerName: "Status",
          width: 160,
          filter: "agSetColumnFilter",
          filterParams: {
            values: ['PAID', 'PENDING', 'OVERDUE', 'PARTIAL'],
            buttons: ['apply', 'reset'],
            closeOnApply: true,
          },
          cellRenderer: PremiumStatusCell,
        },
      ],
    },
    {
      headerName: "Datas",
      children: [
        {
          field: "issueDate",
          headerName: "Emissão",
          width: 180,
          filter: "agDateColumnFilter",
          filterParams: {
            filterOptions: ['equals', 'lessThan', 'greaterThan', 'inRange'],
            defaultOption: 'inRange',
            buttons: ['apply', 'reset'],
            closeOnApply: true,
          },
          cellRenderer: PremiumDateCell,
        },
        {
          field: "dueDate",
          headerName: "Vencimento",
          width: 180,
          filter: "agDateColumnFilter",
          cellRenderer: PremiumDateCell,
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
    {
      headerName: "Ações",
      width: 200,
      pinned: "right",
      lockPosition: "right",
      cellRenderer: PremiumActionCell,
      suppressNavigable: true,
      filter: false,
      sortable: false,
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

  // Callback quando grid está pronto
  const onGridReady = useCallback((event: GridReadyEvent) => {
    setGridApi(event.api);
    event.api.setGridOption('serverSideDatasource', datasource);
  }, [datasource]);

  // Refresh dados
  const handleRefresh = useCallback(() => {
    gridApi?.refreshServerSide({ purge: true });
    void fetchKPIs();
  }, [gridApi, fetchKPIs]);

  const handleExport = useCallback(() => {
    gridRef.current?.api.exportDataAsExcel({
      fileName: `contas-pagar-${new Date().toISOString().split("T")[0]}.xlsx`,
      sheetName: "Contas a Pagar",
    });
  }, []);

  return (
    <>
    <PageTransition>
      <div className="p-8 space-y-6">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                💰 Contas a Pagar
              </h1>
              <p className="text-slate-400">
                Gestão completa de contas a pagar com detalhamento por NCM ({totalRows} registros)
              </p>
            </div>
            <div className="flex gap-3">
              <RippleButton
                onClick={handleRefresh}
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
              <Link href="/financeiro/contas-pagar/create">
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
            {/* Total Aberto */}
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-purple-500/30 hover:border-purple-400/50 transition-all hover:shadow-lg hover:shadow-purple-500/20">
                <div className="p-6 bg-gradient-to-br from-purple-900/10 to-purple-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl shadow-inner">
                      <DollarSign className="h-6 w-6 text-purple-400" />
                    </div>
                    <span className="text-xs text-purple-300 font-semibold px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-400/30">
                      Em Aberto
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total em Aberto</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    R$ <NumberCounter value={kpis.totalOpen} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{kpis.countOpen} conta(s)</p>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Total Pago Este Mês */}
            <FadeIn delay={0.3}>
              <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                      <TrendingUp className="h-6 w-6 text-green-400" />
                    </div>
                    <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                      ✅ Pago
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Pago Este Mês</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    R$ <NumberCounter value={kpis.totalPaidThisMonth} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {kpis.countPaidThisMonth} conta(s)
                  </p>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Placeholder para Pendente */}
            <FadeIn delay={0.4}>
              <GlassmorphismCard className="border-amber-500/30 hover:border-amber-400/50 transition-all hover:shadow-lg hover:shadow-amber-500/20">
                <div className="p-6 bg-gradient-to-br from-amber-900/10 to-amber-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl shadow-inner">
                      <Clock className="h-6 w-6 text-amber-400" />
                    </div>
                    <span className="text-xs text-amber-300 font-semibold px-3 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full border border-amber-400/30">
                      ⏰ Total
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total de Registros</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                    <NumberCounter value={totalRows} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">conta(s) no sistema</p>
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
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total Vencido</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                    R$ <NumberCounter value={kpis.totalOverdue} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {kpis.countOverdue} conta(s)
                  </p>
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* AG Grid - SSRM */}
        <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">
          <div className="ag-theme-quartz-dark" style={{ height: "calc(100vh - 300px)" }}>
            <AgGridReact
              ref={gridRef}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              context={gridContext}
              
              // ✅ SSRM Configuration
              rowModelType="serverSide"
              cacheBlockSize={100}
              maxBlocksInCache={10}
              
              // Master-Detail
              masterDetail={true}
              detailCellRenderer={DetailCellRenderer}
              detailRowAutoHeight={true}
              
              // Enterprise Features
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
              
              // Pagination
              pagination={true}
              paginationPageSize={50}
              paginationPageSizeSelector={[25, 50, 100, 200]}
              
              // Callbacks
              onGridReady={onGridReady}
              
              // Loading
              loadingOverlayComponent={() => (
                <div className="flex flex-col items-center justify-center p-8">
                  <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mb-4" />
                  <p className="text-purple-300">Carregando contas a pagar...</p>
                </div>
              )}
              
              // Other
              enableCellTextSelection={true}
              ensureDomOrder={true}
              suppressDragLeaveHidesColumns={true}
            />
          </div>
        </div>
      </div>
    </PageTransition>

    {/* AI Insight Widget - Assistente Contas a Pagar */}
    <AIInsightWidget
      agentType="financial"
      context={{
        module: 'financial',
        screen: 'payables',
      }}
      suggestedPrompts={[
        'Quais contas vencem hoje?',
        'Total a pagar esta semana',
        'Fornecedores com maior volume',
        'Títulos vencidos há mais de 30 dias',
        'Simule o impacto de pagar tudo hoje',
      ]}
      title="Assistente Contas a Pagar"
      position="bottom-right"
      defaultMinimized={false}
    />
  </>
  );
}
