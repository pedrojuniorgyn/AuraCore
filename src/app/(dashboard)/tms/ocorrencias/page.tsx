"use client";

import { useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import { Button } from "@/components/ui/button";
import { PageTransition, FadeIn, StaggerContainer } from "@/components/ui/animated-wrappers";
import { NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { AlertTriangle, AlertCircle, CheckCircle, FileText, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { auraTheme } from "@/lib/ag-grid/theme";

export default function OccurrencesPage() {
  const [occurrences, setOccurrences] = useState([]);

  useEffect(() => {
    fetch("/api/tms/occurrences").then(r => r.json()).then(d => setOccurrences(d.data || []));
  }, []);

  const columnDefs: ColDef[] = [
    { field: "tripId", headerName: "Viagem", width: 100 },
    { field: "occurrenceType", headerName: "Tipo", width: 150 },
    { 
      field: "severity", 
      headerName: "Gravidade", 
      width: 120,
      cellRenderer: (p: any) => {
        const colors: any = {
          LOW: "bg-blue-500",
          MEDIUM: "bg-yellow-500",
          HIGH: "bg-orange-500",
          CRITICAL: "bg-red-500",
        };
        return (
          <span className={`px-2 py-1 rounded text-xs text-white ${colors[p.value]}`}>
            {p.value}
          </span>
        );
      },
    },
    { field: "title", headerName: "Título", width: 250 },
    { 
      field: "estimatedLoss", 
      headerName: "Prejuízo Estimado", 
      width: 150,
      valueFormatter: (p: any) => p.value ? `R$ ${parseFloat(p.value).toFixed(2)}` : "-"
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 120,
      cellRenderer: (p: any) => {
        const colors: any = {
          OPEN: "bg-red-500",
          IN_PROGRESS: "bg-yellow-500",
          RESOLVED: "bg-green-500",
          CLOSED: "bg-gray-500",
        };
        return (
          <span className={`px-2 py-1 rounded text-xs text-white ${colors[p.value]}`}>
            {p.value}
          </span>
        );
      },
    },
    { 
      field: "createdAt", 
      headerName: "Data", 
      width: 150,
      valueFormatter: (p: any) => new Date(p.value).toLocaleString("pt-BR")
    },
  ];

  const stats = useMemo(() => {
    const data = occurrences as any[];
    return {
      total: data.length,
      abertas: data.filter((o: any) => o.status === 'OPEN').length,
      criticas: data.filter((o: any) => o.severity === 'CRITICAL').length,
      resolvidas: data.filter((o: any) => o.status === 'RESOLVED').length,
    };
  }, [occurrences]);

  return (
    <PageTransition>
      <div className="h-full flex flex-col p-6 space-y-6">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent animate-gradient">
                ⚠️ Ocorrências de Viagem
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Gestão de incidentes e problemas em viagens
              </p>
            </div>
            <RippleButton onClick={() => alert("Em construção")} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500">
              Nova Ocorrência
            </RippleButton>
          </div>
        </FadeIn>

        {/* KPI Cards Premium */}
        <StaggerContainer>
          <div className="grid gap-6 md:grid-cols-4">
            {/* Total */}
            <FadeIn delay={0.15}>
              <GlassmorphismCard className="border-blue-500/30 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                <div className="p-6 bg-gradient-to-br from-blue-900/10 to-blue-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl shadow-inner">
                      <FileText className="h-6 w-6 text-blue-400" />
                    </div>
                    <span className="text-xs text-blue-300 font-semibold px-3 py-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full border border-blue-400/30">
                      Total
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Total de Ocorrências</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.total} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Abertas */}
            <FadeIn delay={0.2}>
              <GlassmorphismCard className="border-amber-500/30 hover:border-amber-400/50 transition-all hover:shadow-lg hover:shadow-amber-500/20">
                <div className="p-6 bg-gradient-to-br from-amber-900/10 to-amber-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl shadow-inner">
                      <AlertCircle className="h-6 w-6 text-amber-400" />
                    </div>
                    <span className="text-xs text-amber-300 font-semibold px-3 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full border border-amber-400/30">
                      Abertas
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Ocorrências Abertas</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.abertas} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Críticas */}
            <FadeIn delay={0.25}>
              <GlassmorphismCard className="border-red-500/30 hover:border-red-400/50 transition-all hover:shadow-lg hover:shadow-red-500/20 animate-pulse">
                <div className="p-6 bg-gradient-to-br from-red-900/10 to-red-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-xl shadow-inner animate-pulse">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                    <span className="text-xs text-red-300 font-semibold px-3 py-1 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-full border border-red-400/30 animate-pulse">
                      🚨 Críticas
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Ocorrências Críticas</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.criticas} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>

            {/* Resolvidas */}
            <FadeIn delay={0.3}>
              <GlassmorphismCard className="border-green-500/30 hover:border-green-400/50 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <div className="p-6 bg-gradient-to-br from-green-900/10 to-green-800/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-inner">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                    <span className="text-xs text-green-300 font-semibold px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-400/30">
                      ✅ Resolvidas
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Ocorrências Resolvidas</h3>
                  <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    <NumberCounter value={stats.resolvidas} />
                  </div>
                </div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* Grid */}
        <FadeIn delay={0.35}>
          <div className="ag-theme-quartz-dark" style={{ height: 'calc(100vh - 550px)', minHeight: '400px' }}>
            <AgGridReact
              
              columnDefs={columnDefs}
              rowData={occurrences}
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
              pagination
              paginationPageSize={20}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              domLayout="normal"
            />
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}

