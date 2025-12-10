"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Truck, Cog, CheckCircle2, AlertCircle, Wrench, Edit, Trash2 } from "lucide-react";
import { auraTheme } from "@/lib/ag-grid/theme";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { GridPattern } from "@/components/ui/animated-background";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { LicensePlate } from "@/components/fleet/LicensePlate";
import { getStatusConfig } from "@/lib/utils/status-colors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";

// === TYPES ===
interface IVehicle {
  id: number;
  plate: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  status: string;
  maintenanceStatus: string;
  currentKm: number;
  capacityKg: string;
}

export default function VehiclesPage() {
  const gridRef = useRef<AgGridReact>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // === QUERY ===
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles", filterStatus],
    queryFn: async () => {
      let url = "/api/fleet/vehicles?organizationId=1";
      if (filterStatus) url += `&status=${filterStatus}`;
      const res = await fetch(url);
      const json = await res.json();
      return json.data || [];
    },
  });

  // === HANDLERS ===
  const handleEdit = (vehicle: IVehicle) => {
    router.push(`/frota/veiculos/editar/${vehicle.id}`);
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/fleet/vehicles/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erro ao excluir veículo");
        return;
      }

      toast.success("Veículo excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setShowDeleteDialog(false);
      setDeleteId(null);
    } catch (error) {
      console.error("Erro ao excluir veículo:", error);
      toast.error("Erro ao excluir veículo");
    }
  };

  // === STATS ===
  const stats = {
    total: vehicles.length,
    available: vehicles.filter((v: IVehicle) => v.status === "AVAILABLE").length,
    inTransit: vehicles.filter((v: IVehicle) => v.status === "IN_TRANSIT").length,
    maintenance: vehicles.filter((v: IVehicle) => v.status === "MAINTENANCE").length,
  };

  // === AG GRID COLUMNS ===
  const columnDefs: ColDef<IVehicle>[] = [
    {
      field: "plate",
      headerName: "Placa",
      width: 150,
      cellRenderer: (params: any) => {
        return <LicensePlate plate={params.value} size="sm" />;
      },
    },
    {
      field: "type",
      headerName: "Tipo",
      width: 140,
      cellRenderer: (params: any) => {
        const typeMap: Record<string, { icon: any; label: string; color: string }> = {
          TRUCK: { icon: Truck, label: "Caminhão", color: "text-blue-500" },
          TRAILER: { icon: Truck, label: "Carreta", color: "text-purple-500" },
          VAN: { icon: Truck, label: "Van", color: "text-green-500" },
          CAR: { icon: Truck, label: "Carro", color: "text-gray-500" },
        };
        const config = typeMap[params.value] || typeMap.TRUCK;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.color}`} />
            <span>{config.label}</span>
          </div>
        );
      },
    },
    {
      field: "brand",
      headerName: "Marca",
      width: 120,
    },
    {
      field: "model",
      headerName: "Modelo",
      flex: 1,
    },
    {
      field: "year",
      headerName: "Ano",
      width: 100,
      type: "numericColumn",
    },
    {
      field: "currentKm",
      headerName: "KM Atual",
      width: 120,
      type: "numericColumn",
      valueFormatter: (params) => {
        return new Intl.NumberFormat("pt-BR").format(params.value);
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      cellRenderer: (params: any) => {
        const statusConfig = getStatusConfig(params.value);
        const iconMap: Record<string, any> = {
          AVAILABLE: CheckCircle2,
          IN_TRANSIT: Truck,
          MAINTENANCE: Wrench,
          INACTIVE: AlertCircle,
        };
        const Icon = iconMap[params.value] || CheckCircle2;
        return (
          <Badge variant={statusConfig.variant} className={`gap-1 ${statusConfig.className}`}>
            <Icon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        );
      },
    },
    {
      field: "maintenanceStatus",
      headerName: "Manutenção",
      width: 120,
      cellRenderer: (params: any) => {
        const statusConfig = getStatusConfig(params.value);
        return <Badge variant={statusConfig.variant} className={statusConfig.className}>{statusConfig.label}</Badge>;
      },
    },
    {
      headerName: "Ações",
      width: 120,
      pinned: "right",
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(params.data)}
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(params.data.id)}
            title="Excluir"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  // === RENDER ===
  return (
    <PageTransition>
      <div className="flex-1 space-y-6 p-8 pt-6 relative">
        {/* Background Pattern */}
        <GridPattern className="opacity-30" />

        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent animate-gradient">
                🚛 Gestão de Veículos
              </h1>
              <p className="text-slate-400 mt-1">
                Controle de frota e manutenção
              </p>
            </div>
            <Link href="/frota/veiculos/novo">
              <RippleButton className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500">
                <Plus className="h-4 w-4 mr-2" />
                Novo Veículo
              </RippleButton>
            </Link>
          </div>
        </FadeIn>

        {/* Stats Cards Premium */}
        <StaggerContainer>
          <div className="grid gap-6 md:grid-cols-4">
            {/* Total Veículos */}
            <FadeIn delay={0.15}>
              <GlassmorphismCard className="border-blue-500/30 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl shadow-inner">
                      <Truck className="h-6 w-6 text-blue-400" />
                    </div>
                    <span className="text-xs text-blue-300 font-semibold px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-400/30">
                      Total
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total de Veículos</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.total} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Disponíveis */}
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                      <CheckCircle2 className="h-6 w-6 text-green-400" />
                    </div>
                    <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                      ✅ OK
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Veículos Disponíveis</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.available} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Em Viagem */}
            <FadeIn delay={0.25}>
              <GlassmorphismCard className="border-cyan-500/30 hover:border-cyan-400/50 transition-all hover:shadow-lg hover:shadow-cyan-500/20">
                <div className="p-6 bg-gradient-to-br from-cyan-900/10 to-cyan-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl shadow-inner">
                      <Truck className="h-6 w-6 text-cyan-400" />
                    </div>
                    <span className="text-xs text-cyan-300 font-semibold px-3 py-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full border border-cyan-400/30">
                      🚚 Viagem
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Em Viagem</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.inTransit} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Manutenção */}
            <FadeIn delay={0.3}>
              <GlassmorphismCard className="border-orange-500/30 hover:border-orange-400/50 transition-all hover:shadow-lg hover:shadow-orange-500/20">
                <div className="p-6 bg-gradient-to-br from-orange-900/10 to-orange-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl shadow-inner">
                      <Wrench className="h-6 w-6 text-orange-400" />
                    </div>
                    <span className="text-xs text-orange-300 font-semibold px-3 py-1 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-full border border-orange-400/30">
                      🔧 Manutenção
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Em Manutenção</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.maintenance} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* Grid */}
        <FadeIn delay={0.3}>
          <div>
            <div className="space-y-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2>Frota de Veículos</h2>
                  <p className="text-sm text-slate-400">
                    Gerenciamento completo da sua frota
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filterStatus === "AVAILABLE" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setFilterStatus(filterStatus === "AVAILABLE" ? null : "AVAILABLE")
                    }
                  >
                    Apenas Disponíveis
                  </Button>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">
            <div style={{ height: 600, width: "100%" }} className="ag-theme-quartz-dark">
                <AgGridReact
                  ref={gridRef}
                  
                  rowData={vehicles}
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
                  paginationPageSizeSelector={[10, 20, 50]}
                  animateRows={true}
                  localeText={{
                    noRowsToShow: "Nenhum veículo cadastrado",
                  }}
                />
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  );
}


