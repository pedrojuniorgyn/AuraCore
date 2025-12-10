"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";

// AG Grid CSS (v34+ Theming API)
import "ag-grid-community/styles/ag-theme-quartz.css";

import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { currencyFormatter, dateFormatter } from "@/components/ag-grid/renderers/aurora-renderers";
import { FileSpreadsheet, TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";
import { auraTheme } from "@/lib/ag-grid/theme";

// Registrar módulos do AG Grid
ModuleRegistry.registerModules([AllEnterpriseModule]);

export default function MargemCtePage() {
  const gridRef = useRef<any>(null);
  const [ctes, setCtes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const columnDefs = [
    { field: 'cteNumber', headerName: 'CTe', filter: 'agTextColumnFilter', floatingFilter: true, width: 120 },
    { field: 'issueDate', headerName: 'Emissão', valueFormatter: dateFormatter, filter: 'agDateColumnFilter', width: 120 },
    { field: 'partnerName', headerName: 'Cliente', flex: 1, filter: 'agTextColumnFilter', floatingFilter: true },
    { field: 'grossRevenue', headerName: 'Receita Bruta', valueFormatter: currencyFormatter, filter: 'agNumberColumnFilter', width: 140 },
    { field: 'taxes', headerName: 'Impostos', valueFormatter: currencyFormatter, width: 120 },
    { field: 'netRevenue', headerName: 'Receita Líquida', valueFormatter: currencyFormatter, width: 140 },
    { field: 'variableCosts', headerName: 'Custos Variáveis', valueFormatter: currencyFormatter, width: 140 },
    { 
      field: 'contributionMargin', 
      headerName: 'Margem R$', 
      valueFormatter: currencyFormatter,
      cellStyle: params => ({
        backgroundColor: params.value > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        color: params.value > 0 ? '#10b981' : '#ef4444',
        fontWeight: 'bold'
      }),
      filter: 'agNumberColumnFilter',
      width: 140
    },
    { 
      field: 'marginPercent', 
      headerName: 'Margem %',
      valueFormatter: (p: any) => `${p.value?.toFixed(2)}%`,
      cellStyle: (params: any) => ({
        color: params.value > 30 ? '#10b981' : params.value > 20 ? '#f59e0b' : '#ef4444',
        fontWeight: 'bold'
      }),
      filter: 'agNumberColumnFilter',
      width: 120
    }
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <FadeIn>
          <GradientText className="text-4xl font-bold mb-2">Análise de Margem por CTe</GradientText>
          <p className="text-gray-400">Rentabilidade por Conhecimento de Transporte</p>
        </FadeIn>

        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassmorphismCard className="aurora-green-shadow hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <Target className="w-10 h-10 text-green-400" />
                <div>
                  <NumberCounter value={28.5} suffix="%" decimals={1} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Margem Média</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <FileSpreadsheet className="w-10 h-10 text-blue-400" />
                <div>
                  <NumberCounter value={1856} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">CTes Analisados</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="aurora-red-shadow pulsating hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <AlertTriangle className="w-10 h-10 text-red-400" />
                <div>
                  <NumberCounter value={23} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">CTes Deficitários</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="aurora-gold-shadow hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <TrendingUp className="w-10 h-10 text-yellow-400" />
                <div>
                  <NumberCounter value={45.8} suffix="%" decimals={1} className="text-3xl font-bold" />
                  <p className="text-gray-400 text-sm">Melhor Margem</p>
                </div>
              </div>
            </GlassmorphismCard>
          </div>
        </StaggerContainer>

        <FadeIn delay={0.2}>
          <GlassmorphismCard>
            <div className="flex justify-between mb-4">
              <GradientText className="text-2xl">Análise de CTes</GradientText>
              <RippleButton onClick={() => gridRef.current?.api?.exportDataAsExcel()}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
              </RippleButton>
            </div>

            <div className="ag-theme-quartz-dark" style={{ height: '600px' }}>
              <AgGridReact
                ref={gridRef}
                theme={auraTheme}
                rowData={ctes}
                columnDefs={columnDefs}
                defaultColDef={{ sortable: true, resizable: true, filter: true }}
                sideBar={{ toolPanels: ['columns', 'filters'] }}
                enableRangeSelection={true}
                pagination={true}
                paginationPageSize={50}
                theme={auraTheme}
                loading={loading}
              />
            </div>
          </GlassmorphismCard>
        </FadeIn>
      </div>
    </PageTransition>
  );
}


