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
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, ShimmerButton } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";

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

        {/* 📋 Grid de Filiais */}
        <FadeIn delay={0.2}>
          <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">
                    <GradientText>Filiais</GradientText>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
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
                  <ShimmerButton onClick={() => router.push("/configuracoes/filiais/create")}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nova Filial
                  </ShimmerButton>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div style={{ height: 600, width: "100%" }}>
                <AgGridReact
                  ref={gridRef}
                  rowData={rowData}
                  columnDefs={columnDefs}
                  theme={auraTheme}
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
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
