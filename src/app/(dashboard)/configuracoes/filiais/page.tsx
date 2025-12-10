"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Download, FileText, Settings } from "lucide-react";
import { toast } from "sonner";
import { auraTheme } from "@/lib/ag-grid/theme";
import {
  StatusCellRenderer,
  DocumentCellRenderer,
  ActionsCellRenderer,
} from "@/lib/ag-grid/cell-renderers";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { GridPattern } from "@/components/ui/animated-background";
import { Building2, CheckCircle, XCircle, MapPin } from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Branch {
  id: number;
  name: string;
  tradeName: string;
  document: string;
  cityName: string;
  state: string;
  status: string;
  certificateExpiry?: string;
  environment?: string;
}

export default function BranchesPage() {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranches = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/branches?_start=0&_end=1000");

      if (!response.ok) {
        toast.error("Erro ao carregar filiais");
        return;
      }

      const result = await response.json();
      setRowData(result.data || []);
    } catch (error) {
      console.error("Erro ao buscar filiais:", error);
      toast.error("Erro ao carregar filiais");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleEdit = useCallback((branch: Branch) => {
    router.push(`/configuracoes/filiais/${branch.id}`);
  }, [router]);

  const handleView = useCallback((branch: Branch) => {
    router.push(`/configuracoes/filiais/${branch.id}`);
  }, [router]);

  const handleConfig = useCallback((branch: Branch) => {
    router.push(`/configuracoes/filiais/${branch.id}`);
  }, [router]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: "id",
        headerName: "#ID",
        width: 80,
        filter: "agNumberColumnFilter",
      },
      {
        field: "document",
        headerName: "CNPJ",
        width: 170,
        cellRenderer: DocumentCellRenderer,
        filter: "agTextColumnFilter",
      },
      {
        field: "name",
        headerName: "Razão Social",
        flex: 1,
        minWidth: 250,
        filter: "agTextColumnFilter",
        filterParams: {
          buttons: ["reset", "apply"],
          closeOnApply: true,
        },
      },
      {
        field: "tradeName",
        headerName: "Nome Fantasia",
        width: 200,
        filter: "agTextColumnFilter",
      },
      {
        field: "cityName",
        headerName: "Cidade",
        width: 150,
        filter: "agTextColumnFilter",
      },
      {
        field: "state",
        headerName: "UF",
        width: 80,
        filter: "agTextColumnFilter",
      },
      {
        field: "environment",
        headerName: "Ambiente Sefaz",
        width: 150,
        cellRenderer: (params: any) => {
          if (params.value === "PRODUCTION") {
            return <span className="text-emerald-400 font-medium">Produção</span>;
          } else if (params.value === "HOMOLOGATION") {
            return <span className="text-amber-400 font-medium">Homologação</span>;
          }
          return <span className="text-muted-foreground">-</span>;
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 120,
        cellRenderer: StatusCellRenderer,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Ações",
        width: 160,
        pinned: "right",
        cellRenderer: (params: any) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleConfig(params.data)}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
            {ActionsCellRenderer({
              ...params,
              onEdit: handleEdit,
            })}
          </div>
        ),
        sortable: false,
        filter: false,
      },
    ],
    [handleEdit, handleConfig]
  );

  const handleExportExcel = useCallback(() => {
    gridRef.current?.api.exportDataAsExcel({
      fileName: `filiais-${new Date().toISOString().split("T")[0]}.xlsx`,
      sheetName: "Filiais",
      author: "AuraCore",
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `filiais-${new Date().toISOString().split("T")[0]}.csv`,
    });
  }, []);

  return (
    <PageTransition>
      <div className="relative flex flex-col gap-6 p-6">
        {/* Background Pattern */}
        <GridPattern className="opacity-30" />

        {/* KPI Cards */}
        <StaggerContainer>
          <div className="grid gap-6 md:grid-cols-4">
            {/* Total Filiais */}
            <FadeIn delay={0.1}>
              <GlassmorphismCard className="border-blue-500/30 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl shadow-inner">
                      <Building2 className="h-6 w-6 text-blue-400" />
                    </div>
                    <span className="text-xs text-blue-300 font-semibold px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-400/30">
                      Total
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total de Filiais</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    <NumberCounter value={rowData.length} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Filiais Ativas */}
            <FadeIn delay={0.15}>
              <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                    <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                      ✅ Ativas
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Filiais Ativas</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    <NumberCounter value={rowData.filter((f: any) => f.status === 'ACTIVE').length} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Filiais Inativas */}
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-red-500/30 hover:border-red-400/50 transition-all hover:shadow-lg hover:shadow-red-500/20">
                <div className="p-6 bg-gradient-to-br from-red-900/10 to-red-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-xl shadow-inner">
                      <XCircle className="h-6 w-6 text-red-400" />
                    </div>
                    <span className="text-xs text-red-300 font-semibold px-3 py-1 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-full border border-red-400/30">
                      Inativas
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Filiais Inativas</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                    <NumberCounter value={rowData.filter((f: any) => f.status === 'INACTIVE').length} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Estados */}
            <FadeIn delay={0.25}>
              <GlassmorphismCard className="border-purple-500/30 hover:border-purple-400/50 transition-all hover:shadow-lg hover:shadow-purple-500/20">
                <div className="p-6 bg-gradient-to-br from-purple-900/10 to-purple-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl shadow-inner">
                      <MapPin className="h-6 w-6 text-purple-400" />
                    </div>
                    <span className="text-xs text-purple-300 font-semibold px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-400/30">
                      UF
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Estados Atendidos</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    <NumberCounter value={new Set(rowData.map((f: any) => f.state)).size} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* 📋 Grid de Filiais */}
        <FadeIn delay={0.3}>
          <div className="space-y-4 mb-4">
          <div className="flex items-center justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                    ⚙️ Filiais
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Gerencie filiais e configurações Sefaz
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <FileText className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Excel
                  </Button>
                  <RippleButton onClick={() => router.push("/configuracoes/filiais/create")}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nova Filial
                  </RippleButton>
                </div>
              </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">
              <div style={{ height: 'calc(100vh - 650px)', width: "100%", minHeight: '400px' }}>
                <AgGridReact
                  ref={gridRef}
                  rowData={rowData}
                  columnDefs={columnDefs}
                  
                  autoSizeStrategy={{
                    type: "fitGridWidth",
                    defaultMinWidth: 100,
                  }}
                  rowSelection="multiple"
                  suppressRowClickSelection={true}
                  suppressColumnVirtualisation={false}
                  suppressRowVirtualisation={false}
                  animateRows={true}
                  pagination={true}
                  paginationPageSize={50}
                  paginationPageSizeSelector={[20, 50, 100, 200]}
                  defaultExcelExportParams={{
                    author: "AuraCore",
                    sheetName: "Filiais",
                  }}
                  defaultCsvExportParams={{
                    columnSeparator: ";",
                  }}
                  localeText={{
                    contains: "Contém",
                    notContains: "Não contém",
                    equals: "Igual a",
                    notEqual: "Diferente de",
                    startsWith: "Começa com",
                    endsWith: "Termina com",
                    page: "Página",
                    of: "de",
                    to: "até",
                    more: "mais",
                    next: "Próxima",
                    previous: "Anterior",
                    selectAll: "Selecionar Tudo",
                    searchOoo: "Buscar...",
                    blanks: "Em branco",
                    noRowsToShow: "Nenhum registro encontrado",
                    export: "Exportar",
                    csvExport: "Exportar CSV",
                    excelExport: "Exportar Excel",
                    columns: "Colunas",
                    filters: "Filtros",
                  }}
                  loading={isLoading}
                />
              </div>
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
