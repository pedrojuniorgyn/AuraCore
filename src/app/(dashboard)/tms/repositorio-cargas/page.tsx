"use client";

import { useState, useEffect, useRef } from "react";
import { Package, MapPin, Calendar, TrendingUp, AlertCircle, Truck, Settings, RotateCcw, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTenant } from "@/contexts/tenant-context";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import { auraTheme } from "@/lib/ag-grid/theme";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";

interface ICargo {
  id: number;
  accessKey: string;
  nfeNumber: string;
  issuerName: string;
  recipientName: string;
  originUf: string;
  originCity: string;
  destinationUf: string;
  destinationCity: string;
  cargoValue: string;
  weight: string;
  volume: string;
  status: string;
  issueDate: string;
  deliveryDeadline: string;
  hasExternalCte: string;
}

// Configuração padrão de colunas
const DEFAULT_COLUMNS = {
  nfeNumber: true,
  issuerName: true,
  recipientName: true,
  origin: true,
  destination: true,
  cargoValue: true,
  weight: true,
  deadline: true,
  status: true,
  externalCte: true,
};

const COLUMN_LABELS: Record<string, string> = {
  nfeNumber: "#NFe",
  issuerName: "Cliente",
  recipientName: "Destinatário",
  origin: "Origem",
  destination: "Destino",
  cargoValue: "Valor",
  weight: "Peso (kg)",
  deadline: "Prazo",
  status: "Status",
  externalCte: "CTe Externo",
};

export default function CargoRepositoryPage() {
  const router = useRouter();
  const { currentBranch } = useTenant();
  const gridRef = useRef<any>(null);

  const [cargos, setCargos] = useState<ICargo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const handleEdit = (data: ICargo) => {
    router.push(`/tms/repositorio-cargas/editar/${data.id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta carga?")) return;
    try {
      const res = await fetch(`/api/tms/cargo-repository/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Erro ao excluir"); return; }
      toast.success("Excluído com sucesso!");
      fetchCargos();
    } catch (error) { toast.error("Erro"); }
  };
  const [kpis, setKpis] = useState({
    totalPending: 0,
    totalValue: 0,
    urgentCargos: 0,
    criticalCargos: 0,
  });
  
  // Estado para colunas visíveis
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(DEFAULT_COLUMNS);

  // Carregar preferências do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("cargoRepositoryColumns");
    if (saved) {
      try {
        setVisibleColumns(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar preferências de colunas");
      }
    }
  }, []);

  // Salvar preferências no localStorage
  const saveColumnPreferences = (newColumns: Record<string, boolean>) => {
    setVisibleColumns(newColumns);
    localStorage.setItem("cargoRepositoryColumns", JSON.stringify(newColumns));
    toast.success("Preferências de colunas salvas!");
  };

  // Toggle de coluna
  const toggleColumn = (columnKey: string) => {
    const newColumns = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    saveColumnPreferences(newColumns);
  };

  // Restaurar padrão
  const resetColumns = () => {
    saveColumnPreferences(DEFAULT_COLUMNS);
    toast.success("Colunas restauradas para o padrão!");
  };

  // Fetch cargos
  const fetchCargos = async () => {
    if (!currentBranch?.id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/tms/cargo-repository?status=${statusFilter}`,
        {
          headers: { "x-branch-id": currentBranch.id.toString() },
        }
      );

      if (!response.ok) {
        toast.error("Erro ao carregar cargas");
        return;
      }

      const result = await response.json();
      setCargos(result.data || []);
      setKpis(result.kpis || {});
    } catch (error) {
      console.error("❌ Erro:", error);
      toast.error("Erro ao carregar repositório de cargas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCargos();
  }, [statusFilter, currentBranch]);

  // AG Grid Columns - com IDs para gerenciamento
  const allColumnDefs: Array<ColDef<ICargo> & { colId: string }> = [
    {
      colId: "nfeNumber",
      headerName: "#NFe",
      field: "nfeNumber",
      width: 100,
      sortable: true,
    },
    {
      colId: "issuerName",
      headerName: "Cliente",
      field: "issuerName",
      flex: 1,
      minWidth: 200,
      sortable: true,
    },
    {
      colId: "recipientName",
      headerName: "Destinatário",
      field: "recipientName",
      flex: 1,
      minWidth: 200,
      sortable: true,
    },
    {
      colId: "origin",
      headerName: "Origem",
      width: 180,
      valueGetter: (params) => 
        `${params.data?.originCity || ""}/${params.data?.originUf || ""}`,
      cellRenderer: (params: any) => (
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-blue-400" />
          {params.value}
        </span>
      ),
    },
    {
      colId: "destination",
      headerName: "Destino",
      width: 180,
      valueGetter: (params) => 
        `${params.data?.destinationCity || ""}/${params.data?.destinationUf || ""}`,
      cellRenderer: (params: any) => (
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-green-400" />
          {params.value}
        </span>
      ),
    },
    {
      colId: "cargoValue",
      headerName: "Valor",
      field: "cargoValue",
      width: 140,
      sortable: true,
      type: "numericColumn",
      cellRenderer: (params: any) => {
        const value = parseFloat(params.value || "0");
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
      },
    },
    {
      colId: "weight",
      headerName: "Peso (kg)",
      field: "weight",
      width: 120,
      sortable: true,
      type: "numericColumn",
      cellRenderer: (params: any) => {
        const value = parseFloat(params.value || "0");
        return value.toFixed(2) + " kg";
      },
    },
    {
      colId: "deadline",
      headerName: "Prazo",
      field: "deliveryDeadline",
      width: 140,
      sortable: true,
      cellRenderer: (params: any) => {
        if (!params.value) return "-";
        
        const deadline = new Date(params.value);
        const now = new Date();
        const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        let color = "text-gray-400";
        let icon = <Calendar className="h-3 w-3" />;
        
        if (diffHours < 0) {
          color = "text-red-400 font-bold";
          icon = <AlertCircle className="h-3 w-3" />;
        } else if (diffHours < 24) {
          color = "text-orange-400 font-semibold";
          icon = <AlertCircle className="h-3 w-3" />;
        } else if (diffHours < 48) {
          color = "text-yellow-400";
        }
        
        return (
          <span className={`flex items-center gap-1 ${color}`}>
            {icon}
            {deadline.toLocaleDateString("pt-BR")}
          </span>
        );
      },
    },
    {
      colId: "status",
      headerName: "Status",
      field: "status",
      width: 150,
      cellRenderer: (params: any) => {
        const badges: Record<string, { label: string; color: string }> = {
          PENDING: { label: "Pendente", color: "bg-yellow-100 text-yellow-700" },
          ASSIGNED_TO_TRIP: { label: "Em Viagem", color: "bg-blue-100 text-blue-700" },
          IN_TRANSIT: { label: "Em Trânsito", color: "bg-indigo-100 text-indigo-700" },
          DELIVERED: { label: "Entregue", color: "bg-green-100 text-green-700" },
        };
        
        const badge = badges[params.value] || badges.PENDING;
        
        return (
          <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${badge.color}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      colId: "externalCte",
      headerName: "CTe Externo",
      field: "hasExternalCte",
      width: 130,
      cellRenderer: (params: any) => {
        if (params.value === "S") {
          return (
            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
              🌐 Multicte
            </Badge>
          );
        }
        return <span className="text-gray-400 text-xs">-</span>;
      },
    },
  ];

  // Filtrar colunas visíveis
  const columnDefs = allColumnDefs.filter(col => visibleColumns[col.colId]);

  return (
    <PageTransition>
      <div className="relative flex-1 space-y-4 p-8 pt-6">
        <GridPattern className="opacity-30" />

        {/* Header */}
        <FadeIn>
          <div className="relative z-10">
            <h2 className="text-4xl font-bold tracking-tight flex items-center gap-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent animate-gradient">
              <Package className="h-8 w-8 text-cyan-400" />
              📦 Repositório de Cargas
            </h2>
            <p className="text-slate-400">
              Filial: {currentBranch?.name || "Carregando..."}
            </p>
          </div>
        </FadeIn>

        {/* KPIs */}
        <StaggerContainer className="grid gap-4 md:grid-cols-4">
          <Card className="border-white/10 bg-gradient-to-br from-yellow-500/10 to-amber-500/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Package className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                <NumberCounter value={kpis.totalPending} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  notation: "compact",
                }).format(kpis.totalValue)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-gradient-to-br from-orange-500/10 to-red-500/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Urgentes (&lt;48h)</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">
                <NumberCounter value={kpis.urgentCargos} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-gradient-to-br from-red-500/10 to-rose-500/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Críticos (&lt;24h)</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                <NumberCounter value={kpis.criticalCargos} />
              </div>
            </CardContent>
          </Card>
        </StaggerContainer>

        {/* Filtros */}
        <FadeIn delay={0.2}>
          <Card className="border-white/10 bg-slate-900/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Filtrar por Status</CardTitle>
                
                {/* Botão Gerenciar Colunas */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Gerenciar Colunas
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Colunas Visíveis</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={resetColumns}
                          className="h-8 gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restaurar
                        </Button>
                      </div>
                      <Separator />
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {Object.keys(DEFAULT_COLUMNS).map((key) => (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`col-${key}`}
                              checked={visibleColumns[key]}
                              onCheckedChange={() => toggleColumn(key)}
                            />
                            <Label
                              htmlFor={`col-${key}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {COLUMN_LABELS[key]}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <Separator />
                      <div className="text-xs text-muted-foreground">
                        {Object.values(visibleColumns).filter(Boolean).length} de {Object.keys(DEFAULT_COLUMNS).length} colunas visíveis
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === "PENDING" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("PENDING")}
                  className={statusFilter === "PENDING" ? "bg-yellow-600" : ""}
                >
                  📦 Pendentes
                </Button>
                <Button
                  variant={statusFilter === "ASSIGNED_TO_TRIP" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("ASSIGNED_TO_TRIP")}
                  className={statusFilter === "ASSIGNED_TO_TRIP" ? "bg-blue-600" : ""}
                >
                  <Truck className="h-3 w-3 mr-1" />
                  Em Viagem
                </Button>
                <Button
                  variant={statusFilter === "IN_TRANSIT" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("IN_TRANSIT")}
                  className={statusFilter === "IN_TRANSIT" ? "bg-indigo-600" : ""}
                >
                  🚚 Em Trânsito
                </Button>
                <Button
                  variant={statusFilter === "DELIVERED" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("DELIVERED")}
                  className={statusFilter === "DELIVERED" ? "bg-green-600" : ""}
                >
                  ✅ Entregues
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Grid */}
        <FadeIn delay={0.3}>
          <Card className="border-white/10">
            <CardContent className="p-0">
              <div style={{ height: 600, width: "100%" }}>
                <AgGridReact
                  ref={gridRef}
                  
                  rowData={cargos}
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
                  rowSelection={{ 
                    mode: "multiRow",
                    checkboxes: true,
                    headerCheckbox: true,
                  }}
                  selectionColumnDef={{
                    width: 40,
                    minWidth: 40,
                    maxWidth: 40,
                    suppressHeaderMenuButton: true,
                    suppressMovable: true,
                  }}
                  pagination={true}
                  paginationPageSize={20}
                  paginationPageSizeSelector={[10, 20, 50, 100]}
                  animateRows={true}
                  loading={isLoading}
                  localeText={{
                    noRowsToShow: "Nenhuma carga disponível",
                    page: "Página",
                    of: "de",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}


