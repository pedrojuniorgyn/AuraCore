"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllEnterpriseModule, ModuleRegistry } from "ag-grid-enterprise";
import type { ValueFormatterParams, ColDef } from "ag-grid-community";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AccountingAIWidget } from "@/components/accounting";
import { auraTheme } from "@/lib/ag-grid/theme";
import { Building2, DollarSign, TrendingUp, CheckCircle, Clock, Plus, Eye, RotateCcw } from "lucide-react";
import { fetchAPI } from "@/lib/api";

ModuleRegistry.registerModules([AllEnterpriseModule]);

interface IntercompanyRule {
  period: string;
  rule: string;
  value: number;
  method: string;
  status: string;
}

interface IntercompanyKpis {
  matrixCosts: number;
  branchesTotal: number;
  allocations: number;
  processed: number;
  pending: number;
}

export default function IntercompanyPage() {
  const [rules, setRules] = useState<IntercompanyRule[]>([]);
  const [history, setHistory] = useState<IntercompanyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<IntercompanyKpis>({
    matrixCosts: 0,
    branchesTotal: 0,
    allocations: 0,
    processed: 0,
    pending: 0
  });
  const gridRef = useRef<AgGridReact>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rulesRes, historyRes, kpisRes] = await Promise.all([
        fetch('/api/intercompany/allocations?type=rules'),
        fetch('/api/intercompany/allocations'),
        fetch('/api/intercompany/kpis')
      ]);

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setRules(rulesData.data || []);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.data || []);
        
        // Calcular KPIs a partir do histórico se não houver endpoint específico
        const historyItems = historyData.data || [];
        const processed = historyItems.filter((h: IntercompanyRule) => h.status === 'POSTED').length;
        const pending = historyItems.filter((h: IntercompanyRule) => h.status === 'PENDING').length;
        
        setKpis(prev => ({
          ...prev,
          allocations: historyItems.length,
          processed,
          pending
        }));
      }

      if (kpisRes.ok) {
        const kpisData = await kpisRes.json();
        if (kpisData.success && kpisData.data) {
          setKpis(kpisData.data);
        }
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
      const data = await fetchAPI<{ success: boolean; error?: string; totalAmount?: number; targetsProcessed?: number }>('/api/intercompany/allocations', {
        method: 'POST',
        body: {
          period: new Date().toISOString().slice(0, 7).replace('-', '/'),
          totalAmount: 50000,
          method: 'REVENUE'
        }
      });
      if (data.success) {
        alert(`✅ Rateio executado!\n\nValor total: R$ ${data.totalAmount?.toFixed(2)}\nFiliais processadas: ${data.targetsProcessed || 0}`);
        await loadData();
      } else {
        alert('❌ ' + data.error);
      }
    } catch {
      alert('❌ Erro ao executar rateio');
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
        body: JSON.stringify({ type: 'intercompany', format: 'csv' }),
        credentials: 'include',
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

  const rulesColumnDefs: ColDef[] = [
    { field: 'name', headerName: 'Nome Regra', width: 250, pinned: 'left' as const },
    { field: 'origin', headerName: 'Origem', width: 150 },
    { field: 'method', headerName: 'Método', width: 150 },
    { field: 'frequency', headerName: 'Frequência', width: 150 }
  ];

  const historyColumnDefs: ColDef[] = [
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
    <>
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
            <h2 className="text-xl font-bold text-white mb-4">🎯 Novo Rateio</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Selecionar Regra</label>
                  <select className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                    <option value="">Selecione uma regra...</option>
                    {rules.map((rule, idx) => (
                      <option key={idx} value={rule.rule}>{rule.rule}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Regras Cadastradas:</span>
                    <span className="text-white font-bold">{rules.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rateios Pendentes:</span>
                    <span className="text-white">{kpis.pending}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2 text-sm">
                  <div className="font-bold text-white mb-3">Instruções:</div>
                  {rules.length === 0 ? (
                    <p className="text-gray-400">
                      Nenhuma regra de rateio cadastrada. Clique em &quot;Nova Regra&quot; para configurar as regras de distribuição intercompany.
                    </p>
                  ) : (
                    <p className="text-gray-400">
                      Selecione uma regra de rateio acima e clique em &quot;Executar Rateio&quot; para distribuir os custos entre as filiais conforme configurado.
                    </p>
                  )}
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
                    disabled={loading || rules.length === 0}
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

      {/* AI Insight Widget - Assistente Intercompany */}
      <AccountingAIWidget screen="intercompany" defaultMinimized={true} />
    </>
  );
}
