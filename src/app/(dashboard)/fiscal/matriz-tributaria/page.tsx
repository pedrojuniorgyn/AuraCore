"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllEnterpriseModule, ModuleRegistry } from "ag-grid-enterprise";
import type { ValueFormatterParams, CellClassParams, ColDef } from "ag-grid-community";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { auraTheme } from "@/lib/ag-grid/theme";
import { Scale, CheckCircle, XCircle, AlertTriangle, Target, Plus, Upload, FileText, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FiscalAIWidget } from "@/components/fiscal";

ModuleRegistry.registerModules([AllEnterpriseModule]);

interface TaxRule {
  route: string;
  cargo: string;
  contributor: string;
  cst: string;
  icms: number;
  fcp: number;
  difal: string;
  legal: string;
}

interface SimResult {
  cst: string;
  icms: number;
  icmsValue: number;
  fcp: number;
  fcpValue: number;
  totalTax: number;
  total?: number;
  legal: string;
  rule?: string;
}

interface MatrixKpis {
  rules: number;
  validations: number;
  blocks: number;
  warnings: number;
  coverage: number;
}

export default function MatrizTributariaPage() {
  const [rules, setRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [kpis, setKpis] = useState<MatrixKpis>({
    rules: 0,
    validations: 0,
    blocks: 0,
    warnings: 0,
    coverage: 0
  });
  const gridRef = useRef<AgGridReact>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rulesRes, kpisRes] = await Promise.all([
        fetch('/api/fiscal/tax-matrix'),
        fetch('/api/fiscal/tax-matrix/kpis')
      ]);
      
      if (rulesRes.ok) {
        const data = await rulesRes.json();
        const rulesList = data.data || [];
        setRules(rulesList);
        
        // Calcular KPIs a partir das regras
        setKpis(prev => ({
          ...prev,
          rules: rulesList.length,
          coverage: rulesList.length > 0 ? 100 : 0
        }));
      }
      
      if (kpisRes.ok) {
        const kpisData = await kpisRes.json();
        if (kpisData.success && kpisData.data) {
          setKpis(kpisData.data);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar matriz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    try {
      const response = await fetch('/api/fiscal/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ufOrigin: 'SP',
          ufDestination: 'RJ',
          cargoType: 'GERAL',
          isContributor: true,
          baseValue: 10000
        })
      });
      const data = await response.json();
      if (data.success && data.result) {
        alert(`✅ Simulação Fiscal\n\nCST: ${data.result.cst}\nICMS: ${data.result.icms}% = R$ ${data.result.icmsValue?.toFixed(2)}\nFCP: ${data.result.fcp}% = R$ ${data.result.fcpValue?.toFixed(2)}\nTotal: R$ ${data.result.totalTax?.toFixed(2)}\n\nBase Legal: ${data.result.legal}`);
      } else {
        alert('❌ ' + (data.error || 'Erro na simulação'));
      }
    } catch (error) {
      alert('❌ Erro ao simular');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'matrix', format: 'csv' })
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matriz_tributaria_${Date.now()}.csv`;
      a.click();
      alert('✅ Matriz exportada!');
    } catch (error) {
      alert('❌ Erro ao exportar');
    }
  };

  const columnDefs: ColDef[] = [
    { field: 'route', headerName: 'Rota', width: 150, pinned: 'left' as const },
    { field: 'cargo', headerName: 'Carga', width: 120 },
    { field: 'contributor', headerName: 'Contrib', width: 100 },
    { field: 'cst', headerName: 'CST', width: 80 },
    { 
      field: 'icms', 
      headerName: 'ICMS%', 
      width: 100,
      valueFormatter: (params: ValueFormatterParams<TaxRule>) => `${params.value?.toFixed(2)}%`
    },
    { 
      field: 'fcp', 
      headerName: 'FCP%', 
      width: 100,
      valueFormatter: (params: ValueFormatterParams<TaxRule>) => `${params.value?.toFixed(2)}%`
    },
    { 
      field: 'difal', 
      headerName: 'DIFAL', 
      width: 100,
      cellStyle: (params: CellClassParams<TaxRule>) => ({
        color: params.value === 'Sim' ? '#3b82f6' : '#6b7280'
      })
    },
    { field: 'legal', headerName: 'Base Legal', width: 180 }
  ];

  return (
    <>
      <PageTransition>
      <div className="p-8 space-y-8">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <GradientText className="text-4xl font-bold mb-2">
                🏛️ Central de Inteligência Fiscal
              </GradientText>
              <p className="text-gray-400">Matriz Tributária Automatizada - Tax Engine</p>
            </div>
          </div>
        </FadeIn>

        {/* KPIs */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <FadeIn delay={0.1}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Scale className="w-6 h-6 text-blue-400" />
                  <span className="text-sm text-gray-400">Regras</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  <NumberCounter value={kpis.rules} decimals={0} />
                </div>
                <div className="text-xs text-gray-500 mt-1">Ativas</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.2}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-sm text-gray-400">Validações</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  <NumberCounter value={kpis.validations} decimals={0} />
                </div>
                <div className="text-xs text-gray-500 mt-1">Sucesso</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.3}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <XCircle className="w-6 h-6 text-red-400" />
                  <span className="text-sm text-gray-400">Bloqueios</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  <NumberCounter value={kpis.blocks} decimals={0} />
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.4}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  <span className="text-sm text-gray-400">Avisos</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  <NumberCounter value={kpis.warnings} decimals={0} />
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.5}>
              <GlassmorphismCard className="p-6 bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-6 h-6 text-blue-400" />
                  <span className="text-sm text-gray-400">Cobertura</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  <NumberCounter value={kpis.coverage} decimals={1} />%
                </div>
                <div className="text-xs text-gray-500 mt-1">Rotas</div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* Simulador */}
        <FadeIn delay={0.6}>
          <GlassmorphismCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">🎯 Simulador de Tributação</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">UF Origem</label>
                <select className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                  <option value="SP">SP</option>
                  <option value="RJ">RJ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">UF Destino</label>
                <select className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                  <option value="RJ">RJ</option>
                  <option value="BA">BA</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tipo Carga</label>
                <select className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                  <option value="GERAL">GERAL</option>
                  <option value="GRAOS">GRÃOS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Valor Base</label>
                <input 
                  type="text" 
                  defaultValue="R$ 10.000,00"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                />
              </div>
            </div>

            <ShimmerButton onClick={handleSimulate} className="w-full md:w-auto">
              🔍 Simular Tributação
            </ShimmerButton>

            {simResult && (
              <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-green-400 font-bold mb-2">✅ Regra Encontrada: {simResult.rule}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-gray-400">CST:</span> <span className="text-white">{simResult.cst} - Tributação Normal</span></div>
                  <div><span className="text-gray-400">ICMS:</span> <span className="text-white">{simResult.icms}% = R$ {(simResult.total ?? 0).toFixed(2)}</span></div>
                  <div><span className="text-gray-400">FCP:</span> <span className="text-white">{simResult.fcp}% = R$ 0,00</span></div>
                  <div><span className="text-gray-400">DIFAL:</span> <span className="text-white">Não Aplicável</span></div>
                  <div className="col-span-2"><span className="text-gray-400">Base Legal:</span> <span className="text-white">{simResult.legal}</span></div>
                </div>
              </div>
            )}
          </GlassmorphismCard>
        </FadeIn>

        {/* Matriz */}
        <FadeIn delay={0.7}>
          <GlassmorphismCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">📊 Matriz Tributária</h2>
              <div className="flex gap-2">
                <button 
                  onClick={handleExport}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Exportar CSV
                </button>
                <button 
                  onClick={() => alert('🔍 Log de Validações\n\nFuncionalidade disponível em Config Enterprise')}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Ver Log
                </button>
              </div>
            </div>

            <div className="ag-theme-quartz-dark" style={{ height: 400, width: '100%' }}>
              <AgGridReact
                ref={gridRef}
                rowData={rules}
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
      
      {/* AI Assistant Widget - FORA do PageTransition (FIXED-001) */}
      <FiscalAIWidget screen="matriz-tributaria" defaultMinimized={true} />
    </>
  );
}
