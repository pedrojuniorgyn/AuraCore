"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type ICellRendererParams } from "ag-grid-community";
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
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { GridPattern } from "@/components/ui/animated-background";
import { Package, CheckCircle, Tag, DollarSign } from "lucide-react";

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
        cellRenderer: (params: ICellRendererParams) => {
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
        cellRenderer: (params: ICellRendererParams) =>
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

  const stats = useMemo(() => {
    const active = rowData.filter(p => p.status === 'ACTIVE').length;
    const avgPrice = rowData.length > 0 
      ? rowData.reduce((sum, p) => sum + (parseFloat(p.priceSale) || 0), 0) / rowData.length 
      : 0;
    return {
      total: rowData.length,
      active,
      avgPrice,
    };
  }, [rowData]);

  return (
    <PageTransition>
      <div className="relative flex flex-col gap-6 p-6">
        {/* Background Pattern */}
        <GridPattern className="opacity-30" />

        {/* KPI Cards */}
        <StaggerContainer>
          <div className="grid gap-6 md:grid-cols-4">
            {/* Total Produtos */}
            <FadeIn delay={0.1}>
              <GlassmorphismCard className="border-blue-500/30 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl shadow-inner">
                      <Package className="h-6 w-6 text-blue-400" />
                    </div>
                    <span className="text-xs text-blue-300 font-semibold px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-400/30">
                      Total
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total de Produtos</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.total} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Ativos */}
            <FadeIn delay={0.15}>
              <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                    <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                      ✅ Ativos
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Produtos Ativos</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.active} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Inativos */}
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-slate-500/30 hover:border-slate-400/50 transition-all hover:shadow-lg hover:shadow-slate-500/20">
                <div className="p-6 bg-gradient-to-br from-slate-900/10 to-slate-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-slate-500/20 to-gray-500/20 rounded-xl shadow-inner">
                      <Tag className="h-6 w-6 text-slate-400" />
                    </div>
                    <span className="text-xs text-slate-300 font-semibold px-3 py-1 bg-gradient-to-r from-slate-500/20 to-gray-500/20 rounded-full border border-slate-400/30">
                      Inativos
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Produtos Inativos</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-slate-400 to-gray-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.total - stats.active} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Preço Médio */}
            <FadeIn delay={0.25}>
              <GlassmorphismCard className="border-purple-500/30 hover:border-purple-400/50 transition-all hover:shadow-lg hover:shadow-purple-500/20">
                <div className="p-6 bg-gradient-to-br from-purple-900/10 to-purple-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl shadow-inner">
                      <DollarSign className="h-6 w-6 text-purple-400" />
                    </div>
                    <span className="text-xs text-purple-300 font-semibold px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-400/30">
                      Média
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Preço Médio</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    R$ <NumberCounter value={stats.avgPrice} decimals={2} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* 📋 Grid de Produtos */}
        <FadeIn delay={0.3}>
          <div className="space-y-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-slate-400 bg-clip-text text-transparent animate-gradient">
                    📦 Produtos
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
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
                  <RippleButton onClick={() => router.push("/cadastros/produtos/create")}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Produto
                  </RippleButton>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">
              <div style={{ height: 'calc(100vh - 550px)', width: "100%", minHeight: '400px' }} className="ag-theme-quartz-dark">
                <AgGridReact
                  ref={gridRef}
                  rowData={rowData}
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
            </div>
          </FadeIn>
        </div>
    </PageTransition>
  );
}
