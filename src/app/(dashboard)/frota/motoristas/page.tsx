"use client";

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, User, Phone, AlertTriangle } from "lucide-react";
import { auraTheme } from "@/lib/ag-grid/theme";
import { DateCellRenderer } from "@/lib/ag-grid/cell-renderers";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { ShimmerButton } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { HoverCard } from "@/components/ui/glassmorphism-card";
import { DriverStatusBadge } from "@/components/fleet/DriverStatusBadge";
import { format, isPast } from "date-fns";

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

  // === QUERY ===
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const res = await fetch("/api/fleet/drivers?organizationId=1");
      const json = await res.json();
      return json.data || [];
    },
  });

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
      cellRenderer: (params: any) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Editar
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
              <h1 className="text-3xl font-bold tracking-tight">
                <GradientText>Motoristas</GradientText>
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerenciamento de motoristas e CNHs
              </p>
            </div>
            <ShimmerButton>
              <Plus className="h-4 w-4 mr-2" />
              Novo Motorista
            </ShimmerButton>
          </div>
        </FadeIn>

        {/* Stats Cards */}
        <FadeIn delay={0.2}>
          <div className="grid gap-4 md:grid-cols-4">
            <HoverCard className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Motoristas</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <NumberCounter value={stats.total} />
                </div>
              </CardContent>
            </HoverCard>

            <HoverCard className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                <User className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  <NumberCounter value={stats.active} />
                </div>
              </CardContent>
            </HoverCard>

            <HoverCard className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Em Férias</CardTitle>
                <User className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  <NumberCounter value={stats.vacation} />
                </div>
              </CardContent>
            </HoverCard>

            <HoverCard className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CNH Vencida</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  <NumberCounter value={stats.expired} />
                </div>
              </CardContent>
            </HoverCard>
          </div>
        </FadeIn>

        {/* Grid */}
        <FadeIn delay={0.3}>
          <Card className="backdrop-blur-sm bg-card/80 border-border/50">
            <CardHeader>
              <CardTitle>Cadastro de Motoristas</CardTitle>
              <CardDescription>
                Controle de habilitações e status
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div style={{ height: 600, width: "100%" }}>
                <AgGridReact
                  ref={gridRef}
                  theme={auraTheme}
                  rowData={drivers}
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
                    noRowsToShow: "Nenhum motorista cadastrado",
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


