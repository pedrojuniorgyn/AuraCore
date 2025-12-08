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
import { PaymentModal } from "@/components/financial/PaymentModal";
import { GridPattern } from "@/components/ui/animated-background";
import { ShimmerButton, GradientText } from "@/components/ui/magic-components";
import { FadeIn, PageTransition } from "@/components/ui/animated-wrappers";

// 🎨 AG Grid v34.3 - Tema e Configurações Modernas
import { auraTheme } from "@/lib/ag-grid/theme";
import {
  StatusCellRenderer,
  CurrencyCellRenderer,
  DateCellRenderer,
  DocumentCellRenderer,
  OriginCellRenderer,
  ActionsCellRenderer,
} from "@/lib/ag-grid/cell-renderers";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Payable {
  id: number;
  partnerName: string;
  categoryName: string;
  description: string;
  documentNumber: string;
  issueDate: string;
  dueDate: string;
  payDate: string | null;
  amount: string;
  amountPaid: string;
  status: string;
  origin: string;
}

export default function ContasPagarPage() {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<Payable[]>([]);
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery<{ data: Payable[]; total: number }>({
    queryKey: ["payables"],
    queryFn: async () => {
      const response = await fetch("/api/financial/payables", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Falha ao carregar contas a pagar");
      return response.json();
    },
  });

  useEffect(() => {
    if (data?.data) {
      setRowData(data.data);
    }
  }, [data]);

  const handlePayClick = useCallback((payable: Payable) => {
    setSelectedPayable(payable);
    setPaymentModalOpen(true);
  }, []);

  const handleEdit = useCallback((payable: Payable) => {
    router.push(`/financeiro/contas-pagar/edit/${payable.id}`);
  }, [router]);

  const handleView = useCallback((payable: Payable) => {
    router.push(`/financeiro/contas-pagar/${payable.id}`);
  }, [router]);

  // 📊 AG Grid v34.3 - Column Definitions com Cell Renderers Modernos
  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: "status",
        headerName: "Status",
        width: 140,
        cellRenderer: StatusCellRenderer,
        filter: "agTextColumnFilter",
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
        headerName: "Fornecedor",
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
        field: "amountPaid",
        headerName: "Pago",
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
        width: 160,
        pinned: "right",
        cellRenderer: (params: any) =>
          ActionsCellRenderer({
            ...params,
            onView: handleView,
            onPay: params.data.status !== "PAID" ? handlePayClick : undefined,
            onEdit: handleEdit,
          }),
        sortable: false,
        filter: false,
      },
    ],
    [handleView, handlePayClick, handleEdit]
  );

  // 📤 Exportação Excel/CSV
  const handleExportExcel = useCallback(() => {
    gridRef.current?.api.exportDataAsExcel({
      fileName: `contas-a-pagar-${new Date().toISOString().split("T")[0]}.xlsx`,
      sheetName: "Contas a Pagar",
      author: "AuraCore",
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `contas-a-pagar-${new Date().toISOString().split("T")[0]}.csv`,
    });
  }, []);

  return (
    <PageTransition>
      <div className="relative flex flex-col gap-6 p-6">
        {/* Background Pattern */}
        <GridPattern className="opacity-30" />

        {/* 📊 KPIs Summary */}
        <ModernFinancialSummary type="payable" />

      {/* 📋 Grid de Contas a Pagar */}
      <FadeIn delay={0.2}>
        <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">
                <GradientText>Contas a Pagar</GradientText>
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
                <ShimmerButton onClick={() => router.push("/financeiro/contas-pagar/create")}>
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
              // 🎨 Tema Customizado do AuraCore
              theme={auraTheme}
              // 📊 Auto-Size Escalável (NOVO v34.3)
              autoSizeStrategy={{
                type: "fitGridWidth",
                defaultMinWidth: 100,
              }}
              // 🎯 Seleção
              rowSelection="multiple"
              suppressRowClickSelection={true}
              // 📱 Responsividade
              suppressColumnVirtualisation={false}
              suppressRowVirtualisation={false}
              // 🎨 Animações
              animateRows={true}
              // 📊 Paginação
              pagination={true}
              paginationPageSize={50}
              paginationPageSizeSelector={[20, 50, 100, 200]}
              // 📤 Exportação
              defaultExcelExportParams={{
                author: "AuraCore",
                sheetName: "Contas a Pagar",
              }}
              defaultCsvExportParams={{
                columnSeparator: ";",
              }}
              // 🌐 Localização
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
                sum: "Soma",
                min: "Mínimo",
                max: "Máximo",
                count: "Contagem",
                avg: "Média",
              }}
              // 🔍 Quick Filter (Busca rápida)
              quickFilterText={undefined}
              // 🎯 Loading
              loading={isLoading}
            />
          </div>
        </CardContent>
      </Card>
    </FadeIn>

      {/* 💳 Modal de Pagamento */}
      {selectedPayable && (
        <PaymentModal
          open={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedPayable(null);
          }}
          payable={selectedPayable}
          onSuccess={() => {
            refetch();
            setPaymentModalOpen(false);
            setSelectedPayable(null);
          }}
        />
      )}
      </div>
    </PageTransition>
  );
}
