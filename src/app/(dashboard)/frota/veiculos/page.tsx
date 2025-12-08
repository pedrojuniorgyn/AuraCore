"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Truck, Cog, CheckCircle2, AlertCircle, Wrench } from "lucide-react";
import { auraTheme } from "@/lib/ag-grid/theme";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { ShimmerButton } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { HoverCard } from "@/components/ui/glassmorphism-card";
import { LicensePlate } from "@/components/fleet/LicensePlate";
import { getStatusConfig } from "@/lib/utils/status-colors";

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
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

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
      width: 100,
      cellRenderer: (params: any) => (
        <Button variant="outline" size="sm">
          <Cog className="h-4 w-4" />
        </Button>
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
              <h1 className="text-3xl font-bold tracking-tight">
                <GradientText>Gestão de Veículos</GradientText>
              </h1>
              <p className="text-muted-foreground mt-1">
                Controle de frota e manutenção
              </p>
            </div>
            <ShimmerButton>
              <Plus className="h-4 w-4 mr-2" />
              Novo Veículo
            </ShimmerButton>
          </div>
        </FadeIn>

        {/* Stats Cards */}
        <FadeIn delay={0.2}>
          <div className="grid gap-4 md:grid-cols-4">
            <HoverCard className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Veículos</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <NumberCounter value={stats.total} />
                </div>
              </CardContent>
            </HoverCard>

            <HoverCard className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disponíveis</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  <NumberCounter value={stats.available} />
                </div>
              </CardContent>
            </HoverCard>

            <HoverCard className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Em Viagem</CardTitle>
                <Truck className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  <NumberCounter value={stats.inTransit} />
                </div>
              </CardContent>
            </HoverCard>

            <HoverCard className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Manutenção</CardTitle>
                <Wrench className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  <NumberCounter value={stats.maintenance} />
                </div>
              </CardContent>
            </HoverCard>
          </div>
        </FadeIn>

        {/* Grid */}
        <FadeIn delay={0.3}>
          <Card className="backdrop-blur-sm bg-card/80 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Frota de Veículos</CardTitle>
                  <CardDescription>
                    Gerenciamento completo da sua frota
                  </CardDescription>
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
            </CardHeader>
            <CardContent className="p-0">
              <div style={{ height: 600, width: "100%" }}>
                <AgGridReact
                  ref={gridRef}
                  theme={auraTheme}
                  rowData={vehicles}
                  columnDefs={columnDefs}
                  defaultColDef={{
                    sortable: true,
                    resizable: true,
                  }}
                  pagination={true}
                  paginationPageSize={20}
                  paginationPageSizeSelector={[10, 20, 50]}
                  animateRows={true}
                  localeText={{
                    noRowsToShow: "Nenhum veículo cadastrado",
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


