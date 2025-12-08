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
  CurrencyCellRenderer,
  ActionsCellRenderer,
} from "@/lib/ag-grid/cell-renderers";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, ShimmerButton } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  unit: string;
  weightKg: string;
  ncm: string;
  origin: string;
  priceCost: string;
  priceSale: string;
  status: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const branchId = localStorage.getItem("auracore:current-branch") || "1";
      
      const response = await fetch("/api/products?_start=0&_end=1000", {
        headers: {
          "x-branch-id": branchId,
        },
      });

      if (!response.ok) {
        toast.error("Erro ao carregar produtos");
        return;
      }

      const result = await response.json();
      setRowData(result.data || []);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleEdit = useCallback((product: Product) => {
    router.push(`/cadastros/produtos/edit/${product.id}`);
  }, [router]);

  const handleView = useCallback((product: Product) => {
    router.push(`/cadastros/produtos/${product.id}`);
  }, [router]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: "sku",
        headerName: "SKU",
        width: 130,
        filter: "agTextColumnFilter",
        cellClass: "font-mono",
      },
      {
        field: "name",
        headerName: "Nome",
        flex: 1,
        minWidth: 250,
        filter: "agTextColumnFilter",
        filterParams: {
          buttons: ["reset", "apply"],
          closeOnApply: true,
        },
      },
      {
        field: "unit",
        headerName: "Unidade",
        width: 100,
        filter: "agTextColumnFilter",
      },
      {
        field: "ncm",
        headerName: "NCM",
        width: 120,
        filter: "agTextColumnFilter",
        cellRenderer: (params: any) => {
          if (!params.value) return "-";
          const ncm = params.value.replace(/\D/g, "");
          if (ncm.length === 8) {
            return `${ncm.substr(0, 4)}.${ncm.substr(4, 2)}.${ncm.substr(6, 2)}`;
          }
          return params.value;
        },
      },
      {
        field: "weightKg",
        headerName: "Peso (kg)",
        width: 120,
        type: "numericColumn",
        valueFormatter: (params) => {
          if (!params.value) return "-";
          return `${parseFloat(params.value).toFixed(3)} kg`;
        },
      },
      {
        field: "priceCost",
        headerName: "Custo",
        width: 130,
        cellRenderer: CurrencyCellRenderer,
        type: "numericColumn",
      },
      {
        field: "priceSale",
        headerName: "Venda",
        width: 130,
        cellRenderer: CurrencyCellRenderer,
        type: "numericColumn",
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
      fileName: `produtos-${new Date().toISOString().split("T")[0]}.xlsx`,
      sheetName: "Produtos",
      author: "AuraCore",
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `produtos-${new Date().toISOString().split("T")[0]}.csv`,
    });
  }, []);

  return (
    <PageTransition>
      <div className="relative flex flex-col gap-6 p-6">
        {/* Background Pattern */}
        <GridPattern className="opacity-30" />

        {/* 📋 Grid de Produtos */}
        <FadeIn delay={0.2}>
          <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">
                    <GradientText>Produtos</GradientText>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Catálogo completo de produtos e mercadorias
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
                  <ShimmerButton onClick={() => router.push("/cadastros/produtos/create")}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Produto
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
                    sheetName: "Produtos",
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
