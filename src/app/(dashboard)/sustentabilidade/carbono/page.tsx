"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllEnterpriseModule, ModuleRegistry } from "ag-grid-enterprise";
import type { ValueFormatterParams } from "ag-grid-community";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { auraTheme } from "@/lib/ag-grid/theme";
import { Leaf, Truck, Fuel, TrendingDown, Trees, FileText, Send, Plus, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fetchAPI } from "@/lib/api";

ModuleRegistry.registerModules([AllEnterpriseModule]);

interface CarbonEmission {
  id: number;
  tripId: number;
  date: string;
  route: string;
  distance: number;
  fuelLiters: number;
  co2Kg: number;
  vehiclePlate: string;
}

interface ESGStats {
  co2: number;
  trips: number;
  diesel: number;
  efficiency: number;
  offset: number;
  yearlyEmissions: number;
  compensated: number;
}

export default function ESGCarbonoPage() {
  const [emissions, setEmissions] = useState<CarbonEmission[]>([]);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<AgGridReact>(null);
  const [stats, setStats] = useState<ESGStats>({
    co2: 0,
    trips: 0,
    diesel: 0,
    efficiency: 0,
    offset: 0,
    yearlyEmissions: 0,
    compensated: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [emissionsRes, statsRes] = await Promise.all([
        fetch('/api/esg/emissions'),
        fetch('/api/esg/stats')
      ]);
      
      if (emissionsRes.ok) {
        const data = await emissionsRes.json();
        const emissionsList: CarbonEmission[] = data.data || [];
        setEmissions(emissionsList);
        
        // Calcular stats a partir dos dados se não houver endpoint específico
        if (emissionsList.length > 0) {
          const totalCo2 = emissionsList.reduce((sum: number, e: CarbonEmission) => sum + (e.co2Kg || 0), 0) / 1000; // kg para ton
          const totalDiesel = emissionsList.reduce((sum: number, e: CarbonEmission) => sum + (e.fuelLiters || 0), 0);
          const totalDistance = emissionsList.reduce((sum: number, e: CarbonEmission) => sum + (e.distance || 0), 0);
          
          setStats(prev => ({
            ...prev,
            co2: totalCo2,
            trips: emissionsList.length,
            diesel: totalDiesel,
            efficiency: totalDistance > 0 && totalDiesel > 0 ? totalDistance / totalDiesel : 0,
            yearlyEmissions: totalCo2 * 12, // estimativa anual
          }));
        }
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.data) {
          setStats(statsData.data);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar emissões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCalculate = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI<{ success: boolean; error?: string; processed: number; message: string }>('/api/esg/batch-calculate', {
        method: 'POST',
        body: {
          startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
          endDate: new Date().toISOString()
        }
      });
      if (data.success) {
        alert(`✅ Cálculo em lote concluído!\n\n${data.processed} CT-es processados\n${data.message}`);
        await loadData();
      } else {
        alert('❌ ' + data.error);
      }
    } catch {
      alert('❌ Erro ao calcular lote');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Retorna blob, não pode usar fetchAPI
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'esg', format: 'csv' }),
        credentials: 'include',
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `esg_carbono_${Date.now()}.csv`;
      a.click();
      alert('✅ Relatório ESG exportado!');
    } catch {
      alert('❌ Erro ao exportar');
    }
  };

  const columnDefs = [
    { field: 'customer', headerName: 'Cliente', width: 200, pinned: 'left' as const },
    { 
      field: 'trips', 
      headerName: 'Viagens', 
      width: 120,
      valueFormatter: (params: ValueFormatterParams) => params.value?.toLocaleString('pt-BR')
    },
    { 
      field: 'diesel', 
      headerName: 'Diesel (L)', 
      width: 140,
      valueFormatter: (params: ValueFormatterParams) => params.value?.toLocaleString('pt-BR')
    },
    { 
      field: 'distance', 
      headerName: 'Distância (km)', 
      width: 150,
      valueFormatter: (params: ValueFormatterParams) => params.value?.toLocaleString('pt-BR')
    },
    { 
      field: 'co2_kg', 
      headerName: 'CO2 (kg)', 
      width: 140,
      valueFormatter: (params: ValueFormatterParams) => params.value?.toLocaleString('pt-BR')
    },
    { 
      field: 'co2_ton', 
      headerName: 'CO2 (t)', 
      width: 120,
      valueFormatter: (params: ValueFormatterParams) => params.value?.toFixed(1),
      cellStyle: { color: '#10b981', fontWeight: 'bold' }
    }
  ];

  return (
    <PageTransition>
      <div className="p-8 space-y-8">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <GradientText className="text-4xl font-bold mb-2">
                🌱 ESG Dashboard - Emissões de Carbono
              </GradientText>
              <p className="text-gray-400">Sustentabilidade e Relatório de CO2</p>
            </div>
          </div>
        </FadeIn>

        {/* KPIs */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <FadeIn delay={0.1}>
              <GlassmorphismCard className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <Leaf className="w-6 h-6 text-green-400" />
                  <span className="text-sm text-gray-400">CO2</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  <NumberCounter value={stats.co2} decimals={0} /> ton
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.2}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Truck className="w-6 h-6 text-blue-400" />
                  <span className="text-sm text-gray-400">Viagens</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  <NumberCounter value={stats.trips} decimals={0} />
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.3}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Fuel className="w-6 h-6 text-yellow-400" />
                  <span className="text-sm text-gray-400">Diesel</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  <NumberCounter value={stats.diesel / 1000} decimals={1} />k L
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.4}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingDown className="w-6 h-6 text-purple-400" />
                  <span className="text-sm text-gray-400">Eficiência</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  <NumberCounter value={stats.efficiency} decimals={2} /> km/l
                </div>
                <div className="text-xs text-gray-500 mt-1">Média</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.5}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Trees className="w-6 h-6 text-green-400" />
                  <span className="text-sm text-gray-400">Compensado</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  <NumberCounter value={stats.offset} decimals={0} /> ton
                </div>
                <div className="text-xs text-gray-500 mt-1">Offset</div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* Grid */}
        <FadeIn delay={0.6}>
          <GlassmorphismCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">📊 Emissões por Cliente</h2>
              <div className="flex gap-2">
                <button 
                  onClick={handleBatchCalculate}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Calcular Lote
                </button>
                <button 
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Exportar CSV
                </button>
              </div>
            </div>

            <div className="ag-theme-quartz-dark" style={{ height: 350, width: '100%' }}>
              <AgGridReact
                ref={gridRef}
                rowData={emissions}
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

        {/* Compensação */}
        <FadeIn delay={0.7}>
          <GlassmorphismCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">🌳 Programa de Compensação</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Emissões do Ano:</span>
                  <span className="text-white font-bold">{stats.yearlyEmissions.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} toneladas CO2e</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Compensado:</span>
                  <span className="text-green-400 font-bold">
                    {stats.compensated.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} toneladas 
                    ({stats.yearlyEmissions > 0 ? ((stats.compensated / stats.yearlyEmissions) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Pendente:</span>
                  <span className="text-orange-400 font-bold">{(stats.yearlyEmissions - stats.compensated).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} toneladas</span>
                </div>
                <div className="border-t border-white/10 pt-4 flex justify-between">
                  <span className="text-gray-400">Equivalente a:</span>
                  <span className="text-green-400 font-bold text-lg">{((stats.yearlyEmissions - stats.compensated) * 67.4).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} árvores</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Cálculo de Emissões</div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>CO2 (kg) = Diesel (L) × 2,60 kg/L</div>
                    <div>Árvores = CO2 (ton) × 67,4 árvores/ton</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <ShimmerButton className="flex-1 flex items-center justify-center gap-2">
                    <Trees className="w-4 h-4" />
                    Registrar Compensação
                  </ShimmerButton>
                  <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                    📄 Certificados
                  </button>
                </div>
              </div>
            </div>
          </GlassmorphismCard>
        </FadeIn>
      </div>
    </PageTransition>
  );
}

