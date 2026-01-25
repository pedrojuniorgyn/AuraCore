"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ModuleRegistry, ICellRendererParams, GridReadyEvent, type GridApi } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";

ModuleRegistry.registerModules([AllEnterpriseModule]);
import { Button } from "@/components/ui/button";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { NumberCounter } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle, Download, RefreshCw } from "lucide-react";
import { FiscalAIWidget } from "@/components/fiscal";
import { toast } from "sonner";
import { fetchAPI } from "@/lib/api";

// SSRM Hook
import { useSSRMDatasource } from "@/hooks/useSSRMDatasource";

interface CteSummary {
  total: number;
  draft: number;
  authorized: number;
  rejected: number;
  totalValue: number;
}

export default function CtePage() {
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  
  // KPIs (buscados separadamente)
  const [stats, setStats] = useState<CteSummary>({
    total: 0,
    draft: 0,
    authorized: 0,
    rejected: 0,
    totalValue: 0,
  });

  // SSRM Datasource Hook
  const datasource = useSSRMDatasource({
    endpoint: '/api/fiscal/cte/ssrm',
    onError: (error) => toast.error(`Erro ao carregar dados: ${error.message}`),
    onSuccess: (rowCount) => setTotalRows(rowCount),
  });

  // Buscar KPIs separadamente
  const fetchKPIs = useCallback(async () => {
    try {
      const data = await fetchAPI<CteSummary>("/api/fiscal/cte/summary");
      setStats(data);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
    }
  }, []);


  // Column Definitions - Campos correspondem ao retorno de /api/fiscal/cte/ssrm
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: "cteNumber",
      headerName: "Número",
      width: 100,
      filter: "agNumberColumnFilter",
      cellRenderer: (params: ICellRendererParams) => (
        <span className="font-semibold">{params.value}</span>
      ),
    },
    {
      field: "serie",
      headerName: "Série",
      width: 80,
      filter: "agTextColumnFilter",
    },
    {
      field: "takerName",
      headerName: "Tomador",
      width: 200,
      filter: "agTextColumnFilter",
    },
    {
      field: "originUf",
      headerName: "UF Origem",
      width: 100,
      filter: "agSetColumnFilter",
    },
    {
      field: "destinationUf",
      headerName: "UF Destino",
      width: 100,
      filter: "agSetColumnFilter",
    },
    {
      field: "issueDate",
      headerName: "Emissão",
      width: 120,
      filter: "agDateColumnFilter",
      cellRenderer: (params: ICellRendererParams) =>
        params.value ? new Date(params.value).toLocaleDateString('pt-BR') : "-",
    },
    {
      field: "serviceValue",
      headerName: "Valor Serviço",
      width: 140,
      filter: "agNumberColumnFilter",
      cellRenderer: (params: ICellRendererParams) => (
        <span className="font-semibold">
          {params.value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(params.value)) : 'R$ 0,00'}
        </span>
      ),
    },
    {
      field: "totalValue",
      headerName: "Total",
      width: 140,
      filter: "agNumberColumnFilter",
      cellRenderer: (params: ICellRendererParams) => (
        <span className="font-bold text-green-400">
          {params.value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(params.value)) : 'R$ 0,00'}
        </span>
      ),
    },
    {
      field: "status",
      headerName: "Status SEFAZ",
      width: 150,
      filter: "agSetColumnFilter",
      filterParams: {
        values: ['DRAFT', 'SIGNED', 'SENT', 'AUTHORIZED', 'REJECTED', 'CANCELLED'],
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
      cellRenderer: (params: ICellRendererParams) => {
        const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
          DRAFT: { label: "Rascunho", color: "bg-gray-500/20 text-gray-300", icon: Clock },
          SIGNED: { label: "Assinado", color: "bg-blue-500/20 text-blue-300", icon: FileText },
          SENT: { label: "Enviado", color: "bg-yellow-500/20 text-yellow-300", icon: AlertTriangle },
          AUTHORIZED: { label: "Autorizado", color: "bg-green-500/20 text-green-300", icon: CheckCircle },
          REJECTED: { label: "Rejeitado", color: "bg-red-500/20 text-red-300", icon: XCircle },
          CANCELLED: { label: "Cancelado", color: "bg-gray-500/20 text-gray-400", icon: XCircle },
        };

        const config = statusConfig[params.value] || statusConfig.DRAFT;
        const Icon = config.icon;

        return (
          <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${config.color}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
        );
      },
    },
    {
      field: "cteKey",
      headerName: "Chave de Acesso",
      width: 350,
      filter: "agTextColumnFilter",
      cellRenderer: (params: ICellRendererParams) => (
        <span className="font-mono text-xs text-slate-400">{params.value || "-"}</span>
      ),
    },
    {
      headerName: "Ações",
      width: 120,
      pinned: "right",
      filter: false,
      sortable: false,
      cellRenderer: (params: ICellRendererParams) => (
        <div className="flex gap-1 items-center h-full">
          {params.data.status === "AUTHORIZED" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownloadXml(params.data.id)}
              className="h-7 px-2"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {params.data.status === "REJECTED" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.info("Mensagem de rejeição não disponível")}
              className="h-7 px-2"
            >
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </Button>
          )}
        </div>
      ),
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

  // Buscar KPIs ao montar
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchKPIs();
  }, [fetchKPIs]);

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

  const handleDownloadXml = (_id: number) => {
    toast.info("Download de XML será implementado em produção");
  };

  return (
    <>
    <PageTransition>
      <GridPattern />

      <FadeIn delay={0.1}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
              📄 Conhecimentos de Transporte Eletrônico (CTe)
            </h1>
            <p className="text-sm text-slate-400">
              Gestão de Documentos Fiscais de Saída
            </p>
          </div>
        </div>
      </FadeIn>

      {/* KPI Cards Premium */}
      <StaggerContainer>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total CTes */}
          <FadeIn delay={0.15}>
            <GlassmorphismCard className="border-blue-500/30 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
              <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl shadow-inner">
                    <FileText className="h-6 w-6 text-blue-400" />
                  </div>
                  <span className="text-xs text-blue-300 font-semibold px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-400/30">
                    Total
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Total de CTes</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  <NumberCounter value={stats.total} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Autorizados */}
          <FadeIn delay={0.2}>
            <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
              <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                    ✅ OK
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">CTes Autorizados</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  <NumberCounter value={stats.authorized} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Rascunhos */}
          <FadeIn delay={0.25}>
            <GlassmorphismCard className="border-amber-500/30 hover:border-amber-400/50 transition-all hover:shadow-lg hover:shadow-amber-500/20">
              <div className="p-6 bg-gradient-to-br from-amber-900/10 to-amber-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl shadow-inner">
                    <Clock className="h-6 w-6 text-amber-400" />
                  </div>
                  <span className="text-xs text-amber-300 font-semibold px-3 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full border border-amber-400/30">
                    ⏰ Pendente
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Rascunhos</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                  <NumberCounter value={stats.draft} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Rejeitados */}
          <FadeIn delay={0.3}>
            <GlassmorphismCard className="border-red-500/30 hover:border-red-400/50 transition-all hover:shadow-lg hover:shadow-red-500/20">
              <div className="p-6 bg-gradient-to-br from-red-900/10 to-red-800/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-xl shadow-inner animate-pulse">
                    <XCircle className="h-6 w-6 text-red-400" />
                  </div>
                  <span className="text-xs text-red-300 font-semibold px-3 py-1 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-full border border-red-400/30 animate-pulse">
                    ❌ Erro
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Rejeitados</h3>
                <div className="text-2xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                  <NumberCounter value={stats.rejected} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>
        </div>
      </StaggerContainer>

      {/* Grid */}
      <FadeIn delay={0.2}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <FileText className="h-5 w-5 text-blue-400" />
            CTes Emitidos ({totalRows} registros)
          </h2>
          <RippleButton
            onClick={handleRefresh}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </RippleButton>
        </div>
        
        <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">
          <div className="ag-theme-quartz-dark" style={{ height: 'calc(100vh - 300px)', width: "100%" }}>
            <AgGridReact
              ref={gridRef}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onGridReady={onGridReady}
              
              // SSRM Configuration
              rowModelType="serverSide"
              cacheBlockSize={100}
              maxBlocksInCache={10}
              
              // Enterprise Features
              sideBar={{
                toolPanels: [
                  { id: "columns", labelDefault: "Colunas", labelKey: "columns", iconKey: "columns", toolPanel: "agColumnsToolPanel" },
                  { id: "filters", labelDefault: "Filtros", labelKey: "filters", iconKey: "filter", toolPanel: "agFiltersToolPanel" },
                ],
                defaultToolPanel: "",
              }}
              enableRangeSelection={true}
              rowGroupPanelShow="always"
              
              // Pagination
              pagination={true}
              paginationPageSize={50}
              paginationPageSizeSelector={[25, 50, 100, 200]}
              
              // Loading Overlay
              loadingOverlayComponent={() => (
                <div className="flex flex-col items-center justify-center p-8">
                  <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
                  <p className="text-blue-300">Carregando CTes...</p>
                </div>
              )}
              
              // Other
              animateRows={true}
              enableCellTextSelection={true}
              ensureDomOrder={true}
              suppressDragLeaveHidesColumns={true}
            />
          </div>
        </div>
      </FadeIn>

    </PageTransition>

    {/* Widget de Insights - posicionamento interno gerenciado pelo componente */}
    <FiscalAIWidget screen="cte" position="bottom-right" />
    </>
  );
}


