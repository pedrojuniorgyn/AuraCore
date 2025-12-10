"use client";

import { useEffect, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTransition, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText } from "@/components/ui/magic-components";
import { GridPattern } from "@/components/ui/animated-background";
import { RippleButton } from "@/components/ui/ripple-button";
import { Plus, Building2, MapPin, Phone, Mail } from "lucide-react";
import { auraTheme } from "@/lib/ag-grid-theme";
import { useTenant } from "@/contexts/tenant-context";
import { toast } from "sonner";

interface Branch {
  id: number;
  name: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  phone: string;
  email: string;
  active: boolean;
}

export default function BranchesPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useTenant();

  useEffect(() => {
    fetchBranches();
  }, [organizationId]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/branches?organizationId=${organizationId}`);
      
      if (!response.ok) throw new Error("Erro ao carregar filiais");
      
      const data = await response.json();
      
      // Garantir que data seja um array
      if (Array.isArray(data)) {
        setBranches(data);
      } else {
        console.warn("API retornou dados não-array:", data);
        setBranches([]);
      }
    } catch (error) {
      console.error("Erro ao buscar filiais:", error);
      toast.error("Erro ao carregar filiais");
      setBranches([]); // Garantir que seja array mesmo em erro
    } finally {
      setLoading(false);
    }
  };

  const columnDefs: ColDef[] = [
    {
      headerName: "Nome",
      field: "name",
      flex: 2,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full">
          <Building2 className="h-4 w-4 text-blue-400" />
          <span className="font-semibold">{params.value}</span>
        </div>
      ),
    },
    {
      headerName: "CNPJ",
      field: "cnpj",
      flex: 1,
      valueFormatter: (params) => {
        const cnpj = params.value;
        if (!cnpj) return "";
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
      },
    },
    {
      headerName: "Cidade/UF",
      field: "city",
      flex: 1.5,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full">
          <MapPin className="h-4 w-4 text-emerald-400" />
          <span>{params.data.city} - {params.data.state}</span>
        </div>
      ),
    },
    {
      headerName: "Telefone",
      field: "phone",
      flex: 1,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full">
          <Phone className="h-4 w-4 text-purple-400" />
          <span>{params.value}</span>
        </div>
      ),
    },
    {
      headerName: "E-mail",
      field: "email",
      flex: 1.5,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full">
          <Mail className="h-4 w-4 text-amber-400" />
          <span className="text-zinc-400">{params.value}</span>
        </div>
      ),
    },
    {
      headerName: "Status",
      field: "active",
      flex: 0.8,
      cellRenderer: (params: any) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            params.value
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {params.value ? "Ativa" : "Inativa"}
        </span>
      ),
    },
  ];

  const defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    minWidth: 100,
    enableRowGroup: true,
    enablePivot: true,
    enableValue: true,
  };

  return (
    <PageTransition>
      <div className="relative min-h-screen">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <GridPattern />
        </div>

        <div className="relative z-10 space-y-6">
          {/* Header */}
          <FadeIn>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-slate-400 bg-clip-text text-transparent animate-gradient">
                  🏢 Gestão de Filiais
                </h1>
                <p className="text-slate-400">
                  Gerencie as filiais da sua organização
                </p>
              </div>
              <RippleButton
                onClick={() => toast.info("Funcionalidade em desenvolvimento")}
                background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Filial
              </RippleButton>
            </div>
          </FadeIn>

          {/* KPI Cards */}
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-white/10 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm hover:shadow-lg hover:shadow-blue-500/20 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">
                    Total de Filiais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-blue-400" />
                    <span className="text-3xl font-bold text-white">
                      {Array.isArray(branches) ? branches.length : 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm hover:shadow-lg hover:shadow-green-500/20 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">
                    Filiais Ativas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-green-400" />
                    <span className="text-3xl font-bold text-white">
                      {Array.isArray(branches) ? branches.filter((b) => b.active).length : 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-gradient-to-br from-red-500/10 to-rose-500/10 backdrop-blur-sm hover:shadow-lg hover:shadow-red-500/20 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">
                    Filiais Inativas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-red-400" />
                    <span className="text-3xl font-bold text-white">
                      {Array.isArray(branches) ? branches.filter((b) => !b.active).length : 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm hover:shadow-lg hover:shadow-purple-500/20 transition-all">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">
                    Estados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-8 w-8 text-purple-400" />
                    <span className="text-3xl font-bold text-white">
                      {Array.isArray(branches) ? new Set(branches.map((b) => b.state)).size : 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </FadeIn>

          {/* Data Grid */}
          <FadeIn delay={0.2}>
            <Card className="border-white/10 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-400" />
                  Lista de Filiais
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div style={{ height: 600, width: "100%" }}>
                  <AgGridReact
                    ref={gridRef}
                    theme={auraTheme}
                    rowData={branches}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
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
                    rowHeight={60}
                    loading={loading}
                    animateRows={true}
                    enableCellTextSelection={true}
                    className="ag-theme-aura"
                  />
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}

