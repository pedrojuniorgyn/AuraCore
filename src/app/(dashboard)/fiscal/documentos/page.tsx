"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, type GridApi } from "ag-grid-community";
import type { ColDef, GridReadyEvent, ICellRendererParams, ValueFormatterParams } from "ag-grid-community";

// AG Grid Enterprise Modules (v34+)
import { AllEnterpriseModule } from "ag-grid-enterprise";

import { PageTransition } from "@/components/ui/animated-wrappers";
import { FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { NumberCounter } from "@/components/ui/magic-components";
import { GradientText } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { fetchAPI } from "@/lib/api";

// AG Grid CSS (v34+ Theming API)
import "ag-grid-community/styles/ag-theme-quartz.css";
import "@/styles/aurora-premium-grid.css";
import { 
  FileText, 
  Plus, 
  RefreshCw, 
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
  FileCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DocumentDetailModal } from "@/components/fiscal/document-detail-modal";
import { FiscalAIWidget } from "@/components/fiscal";
import { toast } from "sonner";

// SSRM Hook
import { useSSRMDatasource } from "@/hooks/useSSRMDatasource";

// Interface para dados SSRM
interface _FiscalDocumentSSRM {
  id: number;
  accessKey: string;
  number: string | null;
  series: string | null;
  model: string | null;
  partnerName: string | null;
  partnerId: number | null;
  issueDate: string;
  entryDate: string | null;
  totalProducts: string | null;
  totalNfe: string | null;
  status: string | null;
  createdAt: string | null;
}

interface FiscalDocumentStats {
  total: number;
  pending: number;
  classified: number;
  posted: number;
  totalValue: number;
}

// Registrar módulos Enterprise
ModuleRegistry.registerModules([AllEnterpriseModule]);

export default function FiscalDocumentsPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  
  // Modal de visualização
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  
  // KPIs (buscados separadamente)
  const [stats, setStats] = useState<FiscalDocumentStats>({
    total: 0,
    pending: 0,
    classified: 0,
    posted: 0,
    totalValue: 0,
  });
  const [totalRows, setTotalRows] = useState(0);

  // SSRM Datasource Hook
  const datasource = useSSRMDatasource({
    endpoint: '/api/fiscal/documents/ssrm',
    onError: (error) => toast.error(`Erro ao carregar dados: ${error.message}`),
    onSuccess: (rowCount) => setTotalRows(rowCount),
  });

  // Buscar KPIs separadamente (não depende do grid)
  const fetchKPIs = useCallback(async () => {
    try {
      const data = await fetchAPI<FiscalDocumentStats>("/api/fiscal/documents/summary");
      setStats(data);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
    }
  }, []);

  // Excluir documento (soft delete)
  const handleDelete = useCallback(async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) {
      return;
    }

    try {
      await fetchAPI(`/api/fiscal/documents/${id}`, {
        method: "DELETE",
      });

      toast.success("Documento excluído com sucesso!");
      // Refresh grid e KPIs
      gridApi?.refreshServerSide({ purge: true });
      void fetchKPIs();
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      toast.error("Erro ao excluir documento");
    }
  }, [gridApi, fetchKPIs]);

  // Buscar KPIs ao montar
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchKPIs();
  }, [fetchKPIs]);

  // Status Badge Renderers
  const statusCellRenderer = (status: string, type: 'fiscal' | 'accounting' | 'financial') => {
    const colors = {
      fiscal: {
        IMPORTED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        PENDING_CLASSIFICATION: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        CLASSIFIED: "bg-green-500/20 text-green-400 border-green-500/30",
        REJECTED: "bg-red-500/20 text-red-400 border-red-500/30",
      },
      accounting: {
        PENDING: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        CLASSIFIED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        POSTED: "bg-green-500/20 text-green-400 border-green-500/30",
        REVERSED: "bg-red-500/20 text-red-400 border-red-500/30",
      },
      financial: {
        NO_TITLE: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        GENERATED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        PARTIAL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        PAID: "bg-green-500/20 text-green-400 border-green-500/30",
      },
    };

    const labels = {
      IMPORTED: "Importado",
      PENDING_CLASSIFICATION: "Pendente",
      CLASSIFIED: "Classificado",
      REJECTED: "Rejeitado",
      PENDING: "Pendente",
      POSTED: "Contabilizado",
      REVERSED: "Revertido",
      NO_TITLE: "Sem Título",
      GENERATED: "Gerado",
      PARTIAL: "Parcial",
      PAID: "Pago",
    };

    return (
      <Badge className={`${colors[type][status as keyof typeof colors[typeof type]]} border`}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  // Column Definitions - Campos correspondem ao retorno de /api/fiscal/documents/ssrm
  const columnDefs = useMemo(() => [
    {
      headerName: "Modelo",
      field: "model",
      width: 90,
      filter: "agSetColumnFilter",
      cellRenderer: (params: ICellRendererParams) => {
        const icons: Record<string, React.ReactNode> = {
          '55': <FileText className="h-4 w-4 text-blue-400" />,
          '57': <TrendingUp className="h-4 w-4 text-green-400" />,
        };
        return (
          <div className="flex items-center gap-2">
            {icons[params.value] || <FileText className="h-4 w-4 text-gray-400" />}
            <span className="font-medium">{params.value === '55' ? 'NFe' : params.value === '57' ? 'CTe' : params.value}</span>
          </div>
        );
      },
    },
    {
      headerName: "Número",
      field: "number",
      width: 120,
      filter: "agTextColumnFilter",
      cellRenderer: (params: ICellRendererParams) => (
        <span className="font-mono text-purple-400">{params.value}</span>
      ),
    },
    {
      headerName: "Série",
      field: "series",
      width: 80,
      filter: "agTextColumnFilter",
    },
    {
      headerName: "Parceiro",
      field: "partnerName",
      width: 200,
      filter: "agTextColumnFilter",
    },
    {
      headerName: "Emissão",
      field: "issueDate",
      width: 110,
      filter: "agDateColumnFilter",
      valueFormatter: (params: ValueFormatterParams) => 
        params.value ? new Date(params.value).toLocaleDateString('pt-BR') : '',
    },
    {
      headerName: "Entrada",
      field: "entryDate",
      width: 110,
      filter: "agDateColumnFilter",
      valueFormatter: (params: ValueFormatterParams) => 
        params.value ? new Date(params.value).toLocaleDateString('pt-BR') : '',
    },
    {
      headerName: "Valor Total",
      field: "totalNfe",
      width: 140,
      filter: "agNumberColumnFilter",
      valueFormatter: (params: ValueFormatterParams) =>
        params.value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(params.value)) : 'R$ 0,00',
      cellStyle: { textAlign: 'right', fontWeight: 'bold', color: '#10B981' },
    },
    {
      headerName: "Status",
      field: "status",
      width: 140,
      filter: "agSetColumnFilter",
      filterParams: {
        values: ['IMPORTED', 'PENDING_CLASSIFICATION', 'CLASSIFIED', 'REJECTED'],
        buttons: ['apply', 'reset'],
        closeOnApply: true,
      },
      cellRenderer: (params: ICellRendererParams) => statusCellRenderer(params.value || 'IMPORTED', 'fiscal'),
    },
    {
      headerName: "Chave de Acesso",
      field: "accessKey",
      width: 350,
      filter: "agTextColumnFilter",
      cellRenderer: (params: ICellRendererParams) => (
        <span className="font-mono text-xs text-slate-400">{params.value}</span>
      ),
    },
    {
      headerName: "Ações",
      field: "id",
      width: 120,
      pinned: "right",
      filter: false,
      sortable: false,
      cellRenderer: (params: ICellRendererParams) => (
        <div className="flex gap-1">
          <button
            onClick={() => {
              setSelectedDocumentId(params.value);
              setDetailModalOpen(true);
            }}
            className="p-1 rounded hover:bg-blue-500/20 text-blue-400 transition-colors"
            title="Visualizar"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              window.location.href = `/fiscal/documentos/${params.value}/editar`;
            }}
            className="p-1 rounded hover:bg-green-500/20 text-green-400 transition-colors"
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(params.value)}
            className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ] as ColDef[], [handleDelete]);

  const defaultColDef: ColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    filterParams: {
      buttons: ['apply', 'reset'],
      closeOnApply: true,
    },
    enableRowGroup: true,
    enablePivot: true,
    enableValue: true,
  }), []);

  // Callback quando grid está pronto
  const onGridReady = useCallback((event: GridReadyEvent) => {
    setGridApi(event.api);
    event.api.setGridOption('serverSideDatasource', datasource);
    event.api.sizeColumnsToFit();
  }, [datasource]);

  // Refresh dados
  const handleRefresh = useCallback(() => {
    gridApi?.refreshServerSide({ purge: true });
    void fetchKPIs();
  }, [gridApi, fetchKPIs]);

  return (
    <>
    <PageTransition>
      <div className="p-8 space-y-6">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex justify-between items-center">
            <div>
              <GradientText className="text-4xl font-bold mb-2">
                Monitor de Documentos Fiscais
              </GradientText>
              <p className="text-slate-400">
                Visualização unificada de NFe, CTe, NFSe, Recibos e Documentos Manuais ({totalRows} registros)
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
                onClick={() => {
                  gridRef.current?.api?.exportDataAsExcel({
                    fileName: `documentos-fiscais-${new Date().toISOString().split('T')[0]}.xlsx`,
                    sheetName: 'Documentos Fiscais',
                  });
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </RippleButton>
              
              <RippleButton
                onClick={() => window.location.href = "/fiscal/documentos/novo"}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Documento
              </RippleButton>
            </div>
          </div>
        </FadeIn>

        {/* KPI Cards */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Total */}
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="p-4 border-blue-500/20 bg-gradient-to-br from-blue-900/20 to-blue-800/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="h-5 w-5 text-blue-400" />
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Total</Badge>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  <NumberCounter value={stats.total} duration={1.5} />
                </div>
                <div className="text-xs text-slate-400 mt-1">Documentos</div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Pendente */}
            <FadeIn delay={0.3}>
              <GlassmorphismCard className="p-4 border-yellow-500/20 bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 hover:shadow-lg hover:shadow-yellow-500/20 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendente</Badge>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  <NumberCounter value={stats.pending} duration={1.5} />
                </div>
                <div className="text-xs text-slate-400 mt-1">Aguardando Classificação</div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Classificado */}
            <FadeIn delay={0.4}>
              <GlassmorphismCard className="p-4 border-cyan-500/20 bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 hover:shadow-lg hover:shadow-cyan-500/20 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="h-5 w-5 text-cyan-400" />
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Classificado</Badge>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  <NumberCounter value={stats.classified} duration={1.5} />
                </div>
                <div className="text-xs text-slate-400 mt-1">Prontos para Contabilizar</div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Contabilizado */}
            <FadeIn delay={0.5}>
              <GlassmorphismCard className="p-4 border-green-500/20 bg-gradient-to-br from-green-900/20 to-green-800/10 hover:shadow-lg hover:shadow-green-500/20 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <FileCheck className="h-5 w-5 text-green-400" />
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Contabilizado</Badge>
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  <NumberCounter value={stats.posted} duration={1.5} />
                </div>
                <div className="text-xs text-slate-400 mt-1">Lançamentos Efetuados</div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Valor Total */}
            <FadeIn delay={0.6}>
              <GlassmorphismCard className="p-4 border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-purple-800/10 hover:shadow-lg hover:shadow-purple-500/20 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="h-5 w-5 text-purple-400" />
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Valor</Badge>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  R$ <NumberCounter value={stats.totalValue} duration={2} decimals={2} />
                </div>
                <div className="text-xs text-slate-400 mt-1">Total Acumulado</div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* AG Grid */}
        <FadeIn delay={0.7}>
          <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">
            <div className="ag-theme-quartz-dark" style={{ height: "calc(100vh - 380px)" }}>
              <AgGridReact
                ref={gridRef}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                onGridReady={onGridReady}
                
                // SSRM Configuration
                rowModelType="serverSide"
                cacheBlockSize={100}
                maxBlocksInCache={10}
                
                // Pagination
                pagination={true}
                paginationPageSize={50}
                paginationPageSizeSelector={[25, 50, 100, 200]}
                
                // Enterprise Features
                cellSelection={true}
                rowGroupPanelShow="always"
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
                animateRows={true}
                groupDisplayType="multipleColumns"
                
                // Loading Overlay
                loadingOverlayComponent={() => (
                  <div className="flex flex-col items-center justify-center p-8">
                    <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mb-4" />
                    <p className="text-purple-300">Carregando documentos fiscais...</p>
                  </div>
                )}
                
                // Other
                enableCellTextSelection={true}
                ensureDomOrder={true}
                suppressDragLeaveHidesColumns={true}
              />
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Modal de Visualização */}
      <DocumentDetailModal
        documentId={selectedDocumentId}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedDocumentId(null);
        }}
      />

    </PageTransition>

    {/* Widget de Insights - posicionamento interno gerenciado pelo componente */}
    <FiscalAIWidget screen="documentos" position="bottom-right" />
  </>
  );
}

