"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, User, Phone, AlertTriangle, Edit, Trash2 } from "lucide-react";
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
import { auraTheme } from "@/lib/ag-grid/theme";
import { DateCellRenderer } from "@/lib/ag-grid/cell-renderers";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { GridPattern } from "@/components/ui/animated-background";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { DriverStatusBadge } from "@/components/fleet/DriverStatusBadge";
import { format, isPast } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";

// === TYPES ===
interface IDriver {
  id: number;
  name: string;
  cpf: string;
  phone: string;
  cnhNumber: string;
  cnhCategory: string;
  cnhExpiry: string;
  status: string;
}

export default function DriversPage() {
  const gridRef = useRef<AgGridReact>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // === QUERY ===
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const res = await fetch("/api/fleet/drivers");
      const json = await res.json();
      return json.data || [];
    },
  });

  // === HANDLERS ===
  const handleEdit = (driver: IDriver) => {
    router.push(`/frota/motoristas/editar/${driver.id}`);
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/fleet/drivers/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erro ao excluir motorista");
        return;
      }

      toast.success("Motorista excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setShowDeleteDialog(false);
      setDeleteId(null);
    } catch (error) {
      console.error("Erro ao excluir motorista:", error);
      toast.error("Erro ao excluir motorista");
    }
  };

  // === STATS ===
  const stats = {
    total: drivers.length,
    active: drivers.filter((d: IDriver) => d.status === "ACTIVE").length,
    vacation: drivers.filter((d: IDriver) => d.status === "VACATION").length,
    expired: drivers.filter((d: IDriver) => isPast(new Date(d.cnhExpiry))).length,
  };

  // === AG GRID COLUMNS ===
  const columnDefs: ColDef<IDriver>[] = [
    {
      field: "name",
      headerName: "Nome",
      flex: 1,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{params.value}</span>
        </div>
      ),
    },
    {
      field: "cpf",
      headerName: "CPF",
      width: 150,
    },
    {
      field: "phone",
      headerName: "Telefone",
      width: 140,
      cellRenderer: (params: any) => {
        if (!params.value) return "-";
        return (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{params.value}</span>
          </div>
        );
      },
    },
    {
      field: "cnhNumber",
      headerName: "CNH",
      width: 150,
    },
    {
      field: "cnhCategory",
      headerName: "Categoria",
      width: 110,
      cellRenderer: (params: any) => (
        <Badge variant="outline" className="font-mono">
          {params.value}
        </Badge>
      ),
    },
    {
      field: "cnhExpiry",
      headerName: "Validade CNH",
      width: 160,
      cellRenderer: (params: any) => {
        const expiryDate = new Date(params.value);
        const isExpired = isPast(expiryDate);
        
        return (
          <div className="flex items-center gap-2">
            {isExpired && <AlertTriangle className="h-4 w-4 text-red-500" />}
            <span className={isExpired ? "text-red-500 font-bold" : ""}>
              {format(expiryDate, "dd/MM/yyyy")}
            </span>
          </div>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      cellRenderer: (params: any) => (
        <DriverStatusBadge status={params.value} cnhExpiry={params.data.cnhExpiry} />
      ),
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
                🚗 Motoristas
              </h1>
              <p className="text-slate-400 mt-1">
                Gerenciamento de motoristas e CNHs
              </p>
            </div>
            <Link href="/frota/motoristas/novo">
              <RippleButton className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500">
                <Plus className="h-4 w-4 mr-2" />
                Novo Motorista
              </RippleButton>
            </Link>
          </div>
        </FadeIn>

        {/* Stats Cards Premium */}
        <StaggerContainer>
          <div className="grid gap-6 md:grid-cols-4">
            {/* Total Motoristas */}
            <FadeIn delay={0.15}>
              <GlassmorphismCard className="border-blue-500/30 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl shadow-inner">
                      <User className="h-6 w-6 text-blue-400" />
                    </div>
                    <span className="text-xs text-blue-300 font-semibold px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-400/30">
                      Total
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total de Motoristas</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.total} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Ativos */}
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                      <User className="h-6 w-6 text-green-400" />
                    </div>
                    <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                      ✅ Ativos
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Motoristas Ativos</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.active} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Em Férias */}
            <FadeIn delay={0.25}>
              <GlassmorphismCard className="border-amber-500/30 hover:border-amber-400/50 transition-all hover:shadow-lg hover:shadow-amber-500/20">
                <div className="p-6 bg-gradient-to-br from-amber-900/10 to-amber-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl shadow-inner">
                      <User className="h-6 w-6 text-amber-400" />
                    </div>
                    <span className="text-xs text-amber-300 font-semibold px-3 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full border border-amber-400/30">
                      🏖️ Férias
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Em Férias</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.vacation} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* CNH Vencida */}
            <FadeIn delay={0.3}>
              <GlassmorphismCard className="border-red-500/30 hover:border-red-400/50 transition-all hover:shadow-lg hover:shadow-red-500/20 animate-pulse">
                <div className="p-6 bg-gradient-to-br from-red-900/10 to-red-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-xl shadow-inner animate-pulse">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                    <span className="text-xs text-red-300 font-semibold px-3 py-1 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-full border border-red-400/30 animate-pulse">
                      ⚠️ Vencida
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">CNH Vencida</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.expired} />
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
              <h2>Cadastro de Motoristas</h2>
              <p className="text-sm text-slate-400">
                Controle de habilitações e status
              </p>
            </div>
            <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 rounded-2xl border border-purple-500/20 overflow-hidden shadow-2xl">
            <div style={{ height: "calc(100vh - 300px)", width: "100%" }} className="ag-theme-quartz-dark">
                <AgGridReact
                  ref={gridRef}
                  
                  rowData={drivers}
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
                  animateRows={true}
                  localeText={{
                    noRowsToShow: "Nenhum motorista cadastrado",
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
                Tem certeza que deseja excluir este motorista? Esta ação não pode ser desfeita.
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




