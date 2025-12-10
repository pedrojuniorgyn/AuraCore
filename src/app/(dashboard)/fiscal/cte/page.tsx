"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ModuleRegistry } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";

ModuleRegistry.registerModules([AllEnterpriseModule]);
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle, Download, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { auraTheme } from "@/lib/ag-grid/theme";
import { toast } from "sonner";

interface Cte {
  id: number;
  cteNumber: number;
  serie: string;
  cteKey: string;
  issueDate: string;
  takerId: number;
  serviceValue: string;
  totalValue: string;
  icmsValue: string;
  status: string;
  protocolNumber?: string;
  rejectionMessage?: string;
  // ✅ OPÇÃO A - BLOCO 4
  cteOrigin?: string; // INTERNAL ou EXTERNAL
  externalEmitter?: string;
}

export default function CtePage() {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);
  const [ctes, setCtes] = useState<Cte[]>([]);

  const handleEdit = (data: Cte) => {
    router.push(`/fiscal/cte/editar/${data.id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este CTe?")) return;
    try {
      const res = await fetch(`/api/fiscal/cte/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Erro ao excluir"); return; }
      toast.success("Excluído com sucesso!");
      fetchCtes();
    } catch (error) { toast.error("Erro ao excluir"); }
  };

  const columnDefs: ColDef[] = [
    {
      field: "cteNumber",
      headerName: "Número",
      width: 100,
      filter: "agNumberColumnFilter",
      cellRenderer: (params: any) => (
        <span className="font-semibold">{params.value}</span>
      ),
    },
    {
      field: "serie",
      headerName: "Série",
      width: 80,
    },
    {
      field: "cteKey",
      headerName: "Chave de Acesso",
      width: 200,
      filter: "agTextColumnFilter",
      cellRenderer: (params: any) => (
        <span className="font-mono text-xs">{params.value || "-"}</span>
      ),
    },
    {
      field: "issueDate",
      headerName: "Emissão",
      width: 120,
      cellRenderer: (params: any) =>
        params.value ? new Date(params.value).toLocaleDateString() : "-",
    },
    {
      field: "serviceValue",
      headerName: "Valor Serviço",
      width: 130,
      cellRenderer: (params: any) => (
        <span className="font-semibold">
          R$ {parseFloat(params.value || "0").toFixed(2)}
        </span>
      ),
    },
    {
      field: "icmsValue",
      headerName: "ICMS",
      width: 110,
      cellRenderer: (params: any) => (
        <span className="text-red-600">
          R$ {parseFloat(params.value || "0").toFixed(2)}
        </span>
      ),
    },
    {
      field: "totalValue",
      headerName: "Total",
      width: 130,
      cellRenderer: (params: any) => (
        <span className="font-bold text-blue-600">
          R$ {parseFloat(params.value || "0").toFixed(2)}
        </span>
      ),
    },
    {
      field: "cteOrigin",
      headerName: "Origem",
      width: 140,
      cellRenderer: (params: any) => {
        const origin = params.value || "INTERNAL";
        
        if (origin === "EXTERNAL") {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300">
              🌐 Externo (Multicte)
            </span>
          );
        }
        
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">
            🏢 Interno (Aura)
          </span>
        );
      },
    },
    {
      field: "status",
      headerName: "Status SEFAZ",
      width: 150,
      filter: "agSetColumnFilter",
      cellRenderer: (params: any) => {
        const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
          DRAFT: { label: "Rascunho", color: "bg-gray-100 text-gray-700", icon: Clock },
          SIGNED: { label: "Assinado", color: "bg-blue-100 text-blue-700", icon: FileText },
          SENT: { label: "Enviado", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
          AUTHORIZED: { label: "Autorizado", color: "bg-green-100 text-green-700", icon: CheckCircle },
          REJECTED: { label: "Rejeitado", color: "bg-red-100 text-red-700", icon: XCircle },
          CANCELLED: { label: "Cancelado", color: "bg-gray-100 text-gray-700", icon: XCircle },
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
      field: "protocolNumber",
      headerName: "Protocolo",
      width: 140,
      cellRenderer: (params: any) => (
        <span className="font-mono text-xs">{params.value || "-"}</span>
      ),
    },
    {
      headerName: "Ações",
      width: 150,
      cellRenderer: (params: any) => (
        <div className="flex gap-2 items-center h-full">
          {params.data.status === "AUTHORIZED" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadXml(params.data.id)}
              >
                <Download className="h-4 w-4 mr-1" />
                XML
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPdf(params.data.id)}
              >
                <FileText className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </>
          )}
          {params.data.status === "REJECTED" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => alert(params.data.rejectionMessage || "Sem detalhes")}
            >
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const fetchCtes = async () => {
    try {
      const response = await fetch("/api/fiscal/cte");
      const result = await response.json();
      if (result.success) {
        setCtes(result.data);
      }
    } catch (error) {
      console.error("Erro ao buscar CTes:", error);
      toast.error("Erro ao carregar CTes");
    }
  };

  useEffect(() => {
    fetchCtes();
  }, []);

  const handleDownloadXml = async (id: number) => {
    toast.info("Download de XML será implementado em produção");
  };

  const handleDownloadPdf = async (id: number) => {
    toast.info("Geração de DACTE (PDF) será implementada em produção");
  };

  const statusCounts = {
    total: ctes.length,
    draft: ctes.filter((c) => c.status === "DRAFT").length,
    authorized: ctes.filter((c) => c.status === "AUTHORIZED").length,
    rejected: ctes.filter((c) => c.status === "REJECTED").length,
  };

  return (
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
                  <NumberCounter value={statusCounts.total} />
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
                  <NumberCounter value={statusCounts.authorized} />
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
                  <NumberCounter value={statusCounts.draft} />
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
                  <NumberCounter value={statusCounts.rejected} />
                </div>
              </div>
            </GlassmorphismCard>
          </FadeIn>
        </div>
      </StaggerContainer>

      {/* Grid */}
      <FadeIn delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              CTes Emitidos ({ctes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ height: 'calc(100vh - 600px)', width: "100%", minHeight: '400px' }}>
              <AgGridReact
                ref={gridRef}
                theme={auraTheme}
                rowData={ctes}
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
                domLayout="normal"
              />
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}


