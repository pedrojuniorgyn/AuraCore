"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ModuleRegistry } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";

ModuleRegistry.registerModules([AllEnterpriseModule]);
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { RippleButton } from "@/components/ui/ripple-button";
import { FileText, CheckCircle, XCircle, Clock, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { auraTheme } from "@/lib/ag-grid/theme";

interface Quote {
  id: number;
  quoteNumber: string;
  customerId: number;
  originUf: string;
  destinationUf: string;
  weightKg: string;
  calculatedPrice: string;
  quotedPrice: string;
  status: string;
  createdAt: string;
}

export default function QuotesPage() {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const handleEdit = (data: Quote) => {
    router.push(`/comercial/cotacoes/editar/${data.id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta cotação?")) return;
    try {
      const res = await fetch(`/api/commercial/quotes/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Erro ao excluir"); return; }
      toast.success("Excluído com sucesso!");
      fetchQuotes();
    } catch (error) { toast.error("Erro"); }
  };

  const columnDefs: ColDef[] = [
    {
      field: "quoteNumber",
      headerName: "Cotação",
      width: 150,
      filter: "agTextColumnFilter",
      cellRenderer: (params: any) => (
        <span className="font-semibold">{params.value}</span>
      ),
    },
    {
      field: "originUf",
      headerName: "Origem",
      width: 100,
    },
    {
      field: "destinationUf",
      headerName: "Destino",
      width: 100,
    },
    {
      field: "weightKg",
      headerName: "Peso (kg)",
      width: 120,
      cellRenderer: (params: any) => (
        <span>{parseFloat(params.value || "0").toFixed(2)}</span>
      ),
    },
    {
      field: "calculatedPrice",
      headerName: "Preço Calculado",
      width: 150,
      cellRenderer: (params: any) => (
        <span className="font-semibold text-blue-600">
          {params.value
            ? `R$ ${parseFloat(params.value).toFixed(2)}`
            : "-"}
        </span>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      filter: "agSetColumnFilter",
      cellRenderer: (params: any) => {
        const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
          NEW: { label: "Nova", color: "bg-gray-100 text-gray-700", icon: Clock },
          QUOTED: { label: "Cotada", color: "bg-blue-100 text-blue-700", icon: FileText },
          ACCEPTED: { label: "Aceita", color: "bg-green-100 text-green-700", icon: CheckCircle },
          REJECTED: { label: "Recusada", color: "bg-red-100 text-red-700", icon: XCircle },
        };

        const config = statusConfig[params.value] || statusConfig.NEW;
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
      headerName: "Ações",
      width: 200,
      cellRenderer: (params: any) => (
        <div className="flex gap-2 items-center h-full">
          {params.data.status === "NEW" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApprove(params.data.id)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Aprovar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReject(params.data.id)}
              >
                <XCircle className="h-4 w-4 text-red-500" />
              </Button>
            </>
          )}
          {params.data.status === "ACCEPTED" && (
            <span className="text-xs text-green-600 font-semibold">
              ✅ Aprovada
            </span>
          )}
        </div>
      ),
    },
  ];

  const fetchQuotes = async () => {
    try {
      const response = await fetch("/api/commercial/quotes");
      const result = await response.json();
      if (result.success) {
        setQuotes(result.data);
      }
    } catch (error) {
      console.error("Erro ao buscar cotações:", error);
      toast.error("Erro ao carregar cotações");
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      const response = await fetch(`/api/commercial/quotes/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Cotação aprovada! Ordem de Coleta ${result.data.pickupOrderNumber} criada!`);
        fetchQuotes();
      } else {
        toast.error(result.error || "Erro ao aprovar");
      }
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      toast.error("Erro ao aprovar cotação");
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Motivo da recusa:");
    if (!reason) return;

    try {
      const response = await fetch(`/api/commercial/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "REJECTED",
          rejectionReason: reason,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Cotação recusada");
        fetchQuotes();
      } else {
        toast.error(result.error || "Erro ao recusar");
      }
    } catch (error) {
      console.error("Erro ao recusar:", error);
      toast.error("Erro ao recusar cotação");
    }
  };

  return (
    <PageTransition>
      <GridPattern />

      <FadeIn delay={0.1}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent animate-gradient">
              🎯 Torre de Controle Comercial
            </h1>
            <p className="text-sm text-slate-400">
              Cotações em Tempo Real - Aceitar/Recusar
            </p>
          </div>
        </div>
      </FadeIn>

      {/* KPIs */}
      <FadeIn delay={0.15}>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Clock className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold">
                    {quotes.filter((q) => q.status === "NEW").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aceitas</p>
                  <p className="text-2xl font-bold">
                    {quotes.filter((q) => q.status === "ACCEPTED").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recusadas</p>
                  <p className="text-2xl font-bold">
                    {quotes.filter((q) => q.status === "REJECTED").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{quotes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      {/* Grid */}
      <FadeIn delay={0.2}>
        <div>
          <div className="space-y-4 mb-4">
            <h2 className="text-2xl font-bold">Cotações ({quotes.length})</h2>
          </div>

          <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">
            <div style={{ height: 600, width: "100%" }} className="ag-theme-quartz-dark">
              <AgGridReact
                ref={gridRef}
                
                rowData={quotes}
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
                enableRangeSelection={true}
                rowGroupPanelShow="always"
                groupDisplayType="groupRows"
                pagination={true}
                paginationPageSize={20}
                paginationPageSizeSelector={[10, 20, 50, 100]}
                domLayout="normal"
              />
            </div>
          </div>
        </div>
      </FadeIn>
    </PageTransition>
  );
}



