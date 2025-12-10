"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import type { ColDef, GridReadyEvent, IDetailCellRendererParams } from "ag-grid-community";

// AG Grid Enterprise Modules (v34+)
import { AllEnterpriseModule } from "ag-grid-enterprise";

import { PageTransition } from "@/components/ui/animated-wrappers";
import { FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { NumberCounter } from "@/components/ui/magic-components";
import { GradientText } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";

// AG Grid CSS (v34+ Theming API)
import "ag-grid-community/styles/ag-theme-quartz.css";
import "@/styles/aurora-premium-grid.css";
import { auraTheme } from "@/lib/ag-grid/theme";
import { auraThemePremium } from "@/lib/ag-grid/aurora-premium-theme";
import { 
  FileText, 
  Plus, 
  RefreshCw, 
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  DollarSign,
  FileCheck,
  Receipt
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DocumentDetailModal } from "@/components/fiscal/document-detail-modal";

interface FiscalDocument {
  id: number;
  documentType: string;
  documentNumber: string;
  documentSeries: string;
  accessKey: string;
  partnerId: number;
  partnerName: string;
  issueDate: Date;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  fiscalStatus: string;
  accountingStatus: string;
  financialStatus: string;
  fiscalClassification: string;
  operationType: string;
  journalEntryId: number;
  editable: boolean;
}

// Registrar módulos Enterprise
ModuleRegistry.registerModules([AllEnterpriseModule]);

export default function FiscalDocumentsPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal de visualização
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    partnerId: "",
    documentType: "",
    fiscalStatus: "",
  });
  
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    classified: 0,
    posted: 0,
    totalValue: 0,
  });

  // Buscar documentos
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/fiscal/documents?limit=1000");
      const data = await response.json();
      
      setDocuments(data.data || []);
      
      // Calcular estatísticas
      const docs = data.data || [];
      setStats({
        total: docs.length,
        pending: docs.filter((d: FiscalDocument) => d.fiscalStatus === "PENDING_CLASSIFICATION").length,
        classified: docs.filter((d: FiscalDocument) => d.fiscalStatus === "CLASSIFIED").length,
        posted: docs.filter((d: FiscalDocument) => d.accountingStatus === "POSTED").length,
        totalValue: docs.reduce((sum: number, d: FiscalDocument) => sum + parseFloat(d.netAmount as any), 0),
      });
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Excluir documento (soft delete)
  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) {
      return;
    }

    try {
      const response = await fetch(`/api/fiscal/documents/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Documento excluído com sucesso!");
        fetchDocuments(); // Recarregar lista
      } else {
        const error = await response.json();
        alert(`Erro ao excluir: ${error.error}`);
      }
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      alert("Erro ao excluir documento");
    }
  };

  // Reclassificar documento automaticamente
  const handleReclassify = async (id: number) => {
    if (!confirm("Reclassificar este documento automaticamente?")) {
      return;
    }

    try {
      const response = await fetch(`/api/fiscal/documents/${id}/reclassify`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Documento reclassificado!\nDe: ${result.oldClassification}\nPara: ${result.newClassification}`);
        fetchDocuments(); // Recarregar lista
      } else {
        const error = await response.json();
        alert(`Erro ao reclassificar: ${error.error}`);
      }
    } catch (error) {
      console.error("Erro ao reclassificar documento:", error);
      alert("Erro ao reclassificar documento");
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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

  // Column Definitions
  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: "Tipo",
      field: "documentType",
      width: 90,
      filter: "agSetColumnFilter",
      cellRenderer: (params: any) => {
        const icons = {
          NFE: <FileText className="h-4 w-4 text-blue-400" />,
          CTE: <TrendingUp className="h-4 w-4 text-green-400" />,
          NFSE: <FileCheck className="h-4 w-4 text-purple-400" />,
          RECEIPT: <Receipt className="h-4 w-4 text-orange-400" />,
          MANUAL: <Edit className="h-4 w-4 text-gray-400" />,
        };
        return (
          <div className="flex items-center gap-2">
            {icons[params.value as keyof typeof icons]}
            <span className="font-medium">{params.value}</span>
          </div>
        );
      },
    },
    {
      headerName: "Número",
      field: "documentNumber",
      width: 120,
      filter: "agTextColumnFilter",
      cellRenderer: (params: any) => (
        <span className="font-mono text-purple-400">{params.value}</span>
      ),
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
      valueFormatter: (params: any) => 
        params.value ? new Date(params.value).toLocaleDateString('pt-BR') : '',
    },
    {
      headerName: "Valor Bruto",
      field: "grossAmount",
      width: 130,
      filter: "agNumberColumnFilter",
      valueFormatter: (params: any) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.value),
      cellStyle: { textAlign: 'right' },
    },
    {
      headerName: "Impostos",
      field: "taxAmount",
      width: 120,
      filter: "agNumberColumnFilter",
      valueFormatter: (params: any) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.value),
      cellStyle: { textAlign: 'right', color: '#F59E0B' },
    },
    {
      headerName: "Valor Líquido",
      field: "netAmount",
      width: 140,
      filter: "agNumberColumnFilter",
      valueFormatter: (params: any) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(params.value),
      cellStyle: { textAlign: 'right', fontWeight: 'bold', color: '#10B981' },
    },
    {
      headerName: "Status Fiscal",
      field: "fiscalStatus",
      width: 130,
      filter: "agSetColumnFilter",
      cellRenderer: (params: any) => statusCellRenderer(params.value, 'fiscal'),
    },
    {
      headerName: "Status Contábil",
      field: "accountingStatus",
      width: 150,
      filter: "agSetColumnFilter",
      cellRenderer: (params: any) => statusCellRenderer(params.value, 'accounting'),
    },
    {
      headerName: "Status Financeiro",
      field: "financialStatus",
      width: 150,
      filter: "agSetColumnFilter",
      cellRenderer: (params: any) => statusCellRenderer(params.value, 'financial'),
    },
    {
      headerName: "Ações",
      field: "id",
      width: 160,
      pinned: "right",
      cellRenderer: (params: any) => (
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
          {params.data.editable && (
            <button
              onClick={() => {
                window.location.href = `/fiscal/documentos/${params.value}/editar`;
              }}
              className="p-1 rounded hover:bg-green-500/20 text-green-400 transition-colors"
              title="Editar/Reclassificar"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {params.data.fiscalClassification === "OTHER" && (
            <button
              onClick={() => handleReclassify(params.value)}
              className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
              title="Reclassificar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          {params.data.accountingStatus === "PENDING" && (
            <button
              onClick={() => handleDelete(params.value)}
              className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ], [handleDelete, handleReclassify]);

  const defaultColDef: ColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    enableRowGroup: true,
    enablePivot: true,
    enableValue: true,
  }), []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  return (
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
                Visualização unificada de NFe, CTe, NFSe, Recibos e Documentos Manuais
              </p>
            </div>
            
            <div className="flex gap-3">
              <RippleButton
                onClick={fetchDocuments}
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
                theme={auraTheme}
                ref={gridRef}
                rowData={documents}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                onGridReady={onGridReady}
                pagination={true}
                paginationPageSize={50}
                paginationPageSizeSelector={[25, 50, 100, 200]}
                enableRangeSelection={true}
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
                loading={loading}
                animateRows={true}
                groupDisplayType="multipleColumns"
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
  );
}

