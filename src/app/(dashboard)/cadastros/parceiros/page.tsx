"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { auraTheme } from "@/lib/ag-grid/theme";
import {
  StatusCellRenderer,
  TypeBadgeCellRenderer,
  DocumentCellRenderer,
  ActionsCellRenderer,
} from "@/lib/ag-grid/cell-renderers";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, ShimmerButton } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Partner {
  id: number;
  type: string;
  document: string;
  name: string;
  tradeName: string;
  email: string;
  phone: string;
  cityName: string;
  state: string;
  status: string;
}

export default function BusinessPartnersPage() {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPartners = useCallback(async () => {
    try {
      setIsLoading(true);
      const branchId = localStorage.getItem("auracore:current-branch") || "1";
      
      const response = await fetch("/api/business-partners?_start=0&_end=1000", {
        headers: {
          "x-branch-id": branchId,
        },
      });

      if (!response.ok) {
        toast.error("Erro ao carregar parceiros");
        return;
      }

      const result = await response.json();
      setRowData(result.data || []);
    } catch (error) {
      console.error("Erro ao buscar parceiros:", error);
      toast.error("Erro ao carregar parceiros");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleEdit = useCallback((partner: Partner) => {
    router.push(`/cadastros/parceiros/edit/${partner.id}`);
  }, [router]);

  const handleView = useCallback((partner: Partner) => {
    router.push(`/cadastros/parceiros/${partner.id}`);
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
        field: "type",
        headerName: "Tipo",
        width: 130,
        cellRenderer: TypeBadgeCellRenderer,
        filter: "agTextColumnFilter",
      },
      {
        field: "document",
        headerName: "CNPJ/CPF",
        width: 160,
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
        field: "email",
        headerName: "Email",
        width: 200,
        filter: "agTextColumnFilter",
      },
      {
        field: "phone",
        headerName: "Telefone",
        width: 140,
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
        field: "status",
        headerName: "Status",
        width: 120,
        cellRenderer: StatusCellRenderer,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Ações",
        width: 140,
        pinned: "right",
        cellRenderer: (params: any) =>
          ActionsCellRenderer({
            ...params,
            onView: handleView,
            onEdit: handleEdit,
          }),
        sortable: false,
        filter: false,
      },
    ],
    [handleView, handleEdit]
  );

  const handleExportExcel = useCallback(() => {
    gridRef.current?.api.exportDataAsExcel({
      fileName: `parceiros-${new Date().toISOString().split("T")[0]}.xlsx`,
      sheetName: "Parceiros",
      author: "AuraCore",
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `parceiros-${new Date().toISOString().split("T")[0]}.csv`,
    });
  }, []);

  return (
    <PageTransition>
      <div className="relative flex flex-col gap-6 p-6">
        {/* Background Pattern */}
        <GridPattern className="opacity-30" />

        {/* 📋 Grid de Parceiros */}
        <FadeIn delay={0.2}>
          <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">
                    <GradientText>Parceiros de Negócio</GradientText>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gerencie clientes, fornecedores e parceiros comerciais
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
                  <ShimmerButton onClick={() => router.push("/cadastros/parceiros/create")}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Parceiro
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
                    sheetName: "Parceiros",
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
