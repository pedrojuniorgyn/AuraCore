"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllEnterpriseModule, ModuleRegistry } from "ag-grid-enterprise";
import type { ValueFormatterParams } from "ag-grid-community";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { auraTheme } from "@/lib/ag-grid/theme";
import { Building2, DollarSign, TrendingUp, CheckCircle, Clock, Plus, Eye, RotateCcw } from "lucide-react";

ModuleRegistry.registerModules([AllEnterpriseModule]);

interface IntercompanyRule {
  period: string;
  rule: string;
  value: number;
  method: string;
  status: string;
}

export default function IntercompanyPage() {
  const [rules, setRules] = useState<IntercompanyRule[]>([]);
  const [history, setHistory] = useState<IntercompanyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<AgGridReact>(null);

  const kpis = useMemo(() => ({
    matrixCosts: 285000,
    branchesTotal: 1200000,
    allocations: 18,
    processed: 15,
    pending: 3
  }), []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rulesRes, historyRes] = await Promise.all([
        fetch('/api/intercompany/allocations?type=rules'),
        fetch('/api/intercompany/allocations')
      ]);

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setRules(rulesData.data || []);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar intercompany:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAllocation = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/intercompany/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: new Date().toISOString().slice(0, 7).replace('-', '/'),
          totalAmount: 50000,
          method: 'REVENUE'
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ Rateio executado!\n\nValor total: R$ ${data.totalAmount?.toFixed(2)}\nFiliais processadas: ${data.targetsProcessed || 0}`);
        await loadData();
      } else {
        alert('❌ ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro ao executar rateio');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'intercompany', format: 'csv' })
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intercompany_${Date.now()}.csv`;
      a.click();
      alert('✅ Histórico exportado!');
    } catch (error) {
      alert('❌ Erro ao exportar');
    }
  };

  const rulesColumnDefs = [
    { field: 'name', headerName: 'Nome Regra', width: 250, pinned: 'left' as const },
    { field: 'origin', headerName: 'Origem', width: 150 },
    { field: 'method', headerName: 'Método', width: 150 },
    { field: 'frequency', headerName: 'Frequência', width: 150 }
  ];

  const historyColumnDefs = [
    { field: 'period', headerName: 'Período', width: 120 },
    { field: 'rule', headerName: 'Regra', width: 200 },
    { 
      field: 'value', 
      headerName: 'Valor', 
      width: 140,
      valueFormatter: (params: ValueFormatterParams) => `R$ ${params.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    { field: 'method', headerName: 'Método', width: 150 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 130,
      cellStyle: { color: '#10b981' }
    }
  ];

  return (
    <PageTransition>
      <div className="p-8 space-y-8">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <GradientText className="text-4xl font-bold mb-2">
                🏢 Intercompany - Rateio Corporativo
              </GradientText>
              <p className="text-gray-400">Gestão de Custos entre Matriz e Filiais</p>
            </div>
          </div>
        </FadeIn>

        {/* KPIs */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <FadeIn delay={0.1}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-6 h-6 text-blue-400" />
                  <span className="text-sm text-gray-400">Matriz</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.matrixCosts / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Custos</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.2}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                  <span className="text-sm text-gray-400">Filiais</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.branchesTotal / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Total</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.3}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                  <span className="text-sm text-gray-400">Rateios</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  <NumberCounter value={kpis.allocations} decimals={0} />
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.4}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-sm text-gray-400">Processados</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  <NumberCounter value={kpis.processed} decimals={0} />
                </div>
                <div className="text-xs text-gray-500 mt-1">Postados</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.5}>
              <GlassmorphismCard className="p-6 bg-gradient-to-br from-orange-500/20 to-yellow-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-orange-400" />
                  <span className="text-sm text-gray-400">Pendentes</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  <NumberCounter value={kpis.pending} decimals={0} />
                </div>
                <div className="text-xs text-gray-500 mt-1">Aguardando</div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* Regras */}
        <FadeIn delay={0.6}>
          <GlassmorphismCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">📊 Regras de Rateio Ativas</h2>
              <RippleButton className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nova Regra
              </RippleButton>
            </div>

            <div className="ag-theme-quartz-dark" style={{ height: 250, width: '100%' }}>
              <AgGridReact
                ref={gridRef}
                rowData={rules}
                columnDefs={rulesColumnDefs}
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

        {/* Rateio do Mês */}
        <FadeIn delay={0.7}>
          <GlassmorphismCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">🎯 Rateio do Mês: 12/2024</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Selecionar Regra</label>
                  <select className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                    <option value="">Energia Elétrica</option>
                    <option value="">AWS/Cloud</option>
                  </select>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Valor Total:</span>
                    <span className="text-white font-bold">R$ 45.000,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Método:</span>
                    <span className="text-white">Rateio por Percentual</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2 text-sm">
                  <div className="font-bold text-white mb-3">Distribuição:</div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">├─ Filial SP1 (40%):</span>
                    <span className="text-white">R$ 18.000,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">├─ Filial RJ1 (30%):</span>
                    <span className="text-white">R$ 13.500,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">├─ Filial MG1 (20%):</span>
                    <span className="text-white">R$ 9.000,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">└─ Filial BA1 (10%):</span>
                    <span className="text-white">R$ 4.500,00</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={handleExport}
                    className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Exportar
                  </button>
                  <ShimmerButton 
                    onClick={handleExecuteAllocation}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Executar Rateio
                  </ShimmerButton>
                </div>
              </div>
            </div>
          </GlassmorphismCard>
        </FadeIn>

        {/* Histórico */}
        <FadeIn delay={0.8}>
          <GlassmorphismCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">📋 Histórico de Rateios</h2>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Estornar
              </button>
            </div>

            <div className="ag-theme-quartz-dark" style={{ height: 300, width: '100%' }}>
              <AgGridReact
                rowData={history}
                columnDefs={historyColumnDefs}
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

