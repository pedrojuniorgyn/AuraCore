"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllEnterpriseModule, ModuleRegistry } from "ag-grid-enterprise";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { auraTheme } from "@/lib/ag-grid/theme";
import { AlertTriangle, Clock, DollarSign, Moon, FileDown, Settings, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

ModuleRegistry.registerModules([AllEnterpriseModule]);

export default function JornadasPage() {
  const [journeys, setJourneys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<AgGridReact>(null);

  const kpis = useMemo(() => ({
    alerts: 12,
    he50: 248,
    he100: 16,
    noturno: 185,
    espera: 96
  }), []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch('/api/hr/driver-journey');
      if (response.ok) {
        const data = await response.json();
        setJourneys(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar jornadas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessJourneys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/hr/process-payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: new Date().toISOString() })
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ Jornadas processadas!\nTotal: R$ ${data.totalPayroll?.toFixed(2) || '0.00'}`);
        await loadData();
      } else {
        alert('❌ Erro: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterAlerts = () => {
    if (gridRef.current) {
      gridRef.current.api.setFilterModel({
        status: { filterType: 'text', type: 'equals', filter: 'CRITICAL' }
      });
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'hr', format: 'csv' })
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jornadas_${Date.now()}.csv`;
      a.click();
      alert('✅ Relatório exportado!');
    } catch (error) {
      alert('❌ Erro ao exportar');
    }
  };

  const columnDefs = [
    { field: 'date', headerName: 'Data', width: 120 },
    { field: 'driver', headerName: 'Motorista', width: 200 },
    { 
      field: 'driving_hours', 
      headerName: 'Dirigiu', 
      width: 110,
      valueFormatter: (params: any) => `${params.value}h`
    },
    { 
      field: 'waiting_hours', 
      headerName: 'Esperou', 
      width: 110,
      valueFormatter: (params: any) => `${params.value}h`
    },
    { 
      field: 'alert', 
      headerName: 'Alerta', 
      width: 180,
      cellRenderer: (params: any) => {
        if (params.value === 'EXCESSO') {
          return '<span class="text-red-400">⚠️ EXCESSO JORNADA</span>';
        }
        return '<span class="text-green-400">✅ OK</span>';
      }
    },
    { 
      field: 'status', 
      headerName: 'Ações', 
      width: 120,
      cellRenderer: () => '<button class="text-blue-400 hover:text-blue-300">[Ver]</button>'
    }
  ];

  return (
    <PageTransition>
      <div className="p-8 space-y-8">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <GradientText className="text-4xl font-bold mb-2">
                👮 RH Especializado - Lei do Motorista 13.103
              </GradientText>
              <p className="text-gray-400">Controle de Jornadas e Compliance Trabalhista</p>
            </div>
          </div>
        </FadeIn>

        {/* KPIs */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <FadeIn delay={0.1}>
              <GlassmorphismCard className="p-6 bg-gradient-to-br from-red-500/20 to-orange-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <span className="text-sm text-gray-400">Alertas</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  <NumberCounter value={kpis.alerts} decimals={0} />
                </div>
                <div className="text-xs text-gray-500 mt-1">Críticos</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.2}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-yellow-400" />
                  <span className="text-sm text-gray-400">HE 50%</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  <NumberCounter value={kpis.he50} decimals={0} />h
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.3}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-orange-400" />
                  <span className="text-sm text-gray-400">HE 100%</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  <NumberCounter value={kpis.he100} decimals={0} />h
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.4}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Moon className="w-6 h-6 text-indigo-400" />
                  <span className="text-sm text-gray-400">Noturno</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  <NumberCounter value={kpis.noturno} decimals={0} />h
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.5}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-6 h-6 text-green-400" />
                  <span className="text-sm text-gray-400">Espera</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  <NumberCounter value={kpis.espera} decimals={0} />h
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* Grid */}
        <FadeIn delay={0.6}>
          <GlassmorphismCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">📊 Jornadas com Alertas</h2>
              <div className="flex gap-2">
                <button 
                  onClick={handleProcessJourneys}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Processar Jornadas
                </button>
                <button 
                  onClick={handleFilterAlerts}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Alertas
                </button>
                <button 
                  onClick={handleExport}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Exportar
                </button>
              </div>
            </div>

            <div className="ag-theme-quartz-dark" style={{ height: 400, width: '100%' }}>
              <AgGridReact
                ref={gridRef}
                rowData={journeys}
                columnDefs={columnDefs}
                defaultColDef={{
                  sortable: true,
                  filter: true,
                  resizable: true,
                }}
                
                loading={loading}
              />
            </div>
          </GlassmorphismCard>
        </FadeIn>
      </div>
    </PageTransition>
  );
}

