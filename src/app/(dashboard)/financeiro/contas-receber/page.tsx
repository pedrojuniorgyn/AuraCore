"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Download, FileText } from "lucide-react";
import { ModernFinancialSummary } from "@/components/financial/ModernFinancialSummary";
import { auraTheme } from "@/lib/ag-grid/theme";
import {
  StatusCellRenderer,
  CurrencyCellRenderer,
  DateCellRenderer,
  OriginCellRenderer,
  ActionsCellRenderer,
} from "@/lib/ag-grid/cell-renderers";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, ShimmerButton } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Receivable {
  id: number;
  partnerName: string;
  categoryName: string;
  description: string;
  documentNumber: string;
  issueDate: string;
  dueDate: string;
  receiveDate: string | null;
  amount: string;
  amountReceived: string;
  status: string;
  origin: string;
}

export default function ContasReceberPage() {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<Receivable[]>([]);

  const { data, isLoading, refetch } = useQuery<{ data: Receivable[]; total: number }>({
    queryKey: ["receivables"],
    queryFn: async () => {
      const response = await fetch("/api/financial/receivables", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Falha ao carregar contas a receber");
      return response.json();
    },
  });

  useEffect(() => {
    if (data?.data) {
      setRowData(data.data);
    }
  }, [data]);

  const handleView = useCallback((receivable: Receivable) => {
    router.push(`/financeiro/contas-receber/${receivable.id}`);
  }, [router]);

  const handleEdit = useCallback((receivable: Receivable) => {
    router.push(`/financeiro/contas-receber/edit/${receivable.id}`);
  }, [router]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: "status",
        headerName: "Status",
        width: 140,
        cellRenderer: StatusCellRenderer,
        filter: "agTextColumnFilter",
        filterParams: {
          values: ["OPEN", "RECEIVED", "OVERDUE", "PARTIAL", "CANCELLED"],
        },
      },
      {
        field: "dueDate",
        headerName: "Vencimento",
        width: 130,
        cellRenderer: DateCellRenderer,
        filter: "agDateColumnFilter",
        sort: "asc",
      },
      {
        field: "partnerName",
        headerName: "Cliente",
        flex: 1,
        minWidth: 200,
        filter: "agTextColumnFilter",
        filterParams: {
          buttons: ["reset", "apply"],
          closeOnApply: true,
        },
      },
      {
        field: "categoryName",
        headerName: "Categoria",
        width: 180,
        filter: "agTextColumnFilter",
      },
      {
        field: "documentNumber",
        headerName: "Documento",
        width: 130,
        filter: "agTextColumnFilter",
      },
      {
        field: "description",
        headerName: "Descrição",
        flex: 1,
        minWidth: 200,
        filter: "agTextColumnFilter",
      },
      {
        field: "amount",
        headerName: "Valor",
        width: 140,
        cellRenderer: CurrencyCellRenderer,
        filter: "agNumberColumnFilter",
        type: "numericColumn",
        valueFormatter: (params) => {
          if (params.value == null) return "-";
          return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(parseFloat(params.value.toString()));
        },
      },
      {
        field: "amountReceived",
        headerName: "Recebido",
        width: 140,
        cellRenderer: CurrencyCellRenderer,
        filter: "agNumberColumnFilter",
        type: "numericColumn",
        valueFormatter: (params) => {
          if (params.value == null) return "-";
          return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(parseFloat(params.value.toString()));
        },
      },
      {
        field: "origin",
        headerName: "Origem",
        width: 160,
        cellRenderer: OriginCellRenderer,
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
      fileName: `contas-a-receber-${new Date().toISOString().split("T")[0]}.xlsx`,
      sheetName: "Contas a Receber",
      author: "AuraCore",
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `contas-a-receber-${new Date().toISOString().split("T")[0]}.csv`,
    });
  }, []);

  return (
    <PageTransition>
      <div className="relative flex flex-col gap-6 p-6">
        {/* Background Pattern */}
        <GridPattern className="opacity-30" />

        {/* 📊 KPIs Summary */}
        <ModernFinancialSummary type="receivable" />

        {/* 📋 Grid de Contas a Receber */}
        <FadeIn delay={0.2}>
          <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">
                  <GradientText>Contas a Receber</GradientText>
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <FileText className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Excel
                  </Button>
                  <ShimmerButton onClick={() => router.push("/financeiro/contas-receber/create")}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Lançamento
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
                    sheetName: "Contas a Receber",
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
