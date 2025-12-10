"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllEnterpriseModule, ModuleRegistry } from "ag-grid-enterprise";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { auraTheme } from "@/lib/ag-grid/theme";
import { Truck, DollarSign, CheckCircle, Clock, BarChart3, Plus, Calculator, FileText, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

ModuleRegistry.registerModules([AllEnterpriseModule]);

export default function CIAPPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<AgGridReact>(null);

  const handleEdit = (data: any) => {
    router.push(`/fiscal/ciap/editar/${data.id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este ativo?")) return;
    try {
      const res = await fetch(`/api/ciap/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Erro ao excluir"); return; }
      toast.success("Excluído com sucesso!");
      loadData();
    } catch (error) { toast.error("Erro ao excluir"); }
  };

  const kpis = useMemo(() => ({
    assets: 28,
    totalCredit: 2800000,
    appropriated: 580000,
    pending: 2220000,
    factor: 85.2
  }), []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch('/api/ciap/assets?organizationId=1');
      if (response.ok) {
        const data = await response.json();
        setAssets(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar CIAP:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppropriation = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ciap/appropriate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 1,
          referenceMonth: new Date().toISOString()
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Apropriação CIAP executada com sucesso!\n\nDetalhes:\n• Fator: ${data.details.appropriationFactor}\n• Total Apropriado: R$ ${data.details.totalAppropriated.toFixed(2)}\n• Ativos Processados: ${data.details.assetsProcessed}`);
        await loadData();
      } else {
        alert('❌ Erro ao apropriar: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro ao executar apropriação');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const columnDefs = [
    { field: 'plate', headerName: 'Placa', width: 120, pinned: 'left' as const },
    { field: 'purchase', headerName: 'Compra', width: 110 },
    { 
      field: 'value', 
      headerName: 'Valor', 
      width: 140,
      valueFormatter: (params: any) => `R$ ${params.value?.toLocaleString('pt-BR')}`
    },
    { 
      field: 'icms', 
      headerName: 'ICMS Tot', 
      width: 130,
      valueFormatter: (params: any) => `R$ ${params.value?.toLocaleString('pt-BR')}`
    },
    { 
      field: 'installments', 
      headerName: 'Parc', 
      width: 100,
      cellRenderer: (params: any) => {
        const [current, total] = params.value.split('/');
        const percent = (parseInt(current) / parseInt(total)) * 100;
        return `<div class="flex items-center gap-2">
          <span>${params.value}</span>
          <div class="w-12 h-2 bg-white/10 rounded-full overflow-hidden">
            <div class="h-full bg-blue-500" style="width: ${percent}%"></div>
          </div>
        </div>`;
      }
    },
    { 
      field: 'appropriated', 
      headerName: 'Aprop', 
      width: 120,
      valueFormatter: (params: any) => `R$ ${(params.value / 1000).toFixed(1)}k`
    },
    { 
      field: 'balance', 
      headerName: 'Saldo', 
      width: 120,
      valueFormatter: (params: any) => `R$ ${(params.value / 1000).toFixed(1)}k`
    },
    { field: 'next', headerName: 'Próx', width: 80 }
  ];

  return (
    <PageTransition>
      <div className="p-8 space-y-8">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <GradientText className="text-4xl font-bold mb-2">
                🏛️ CIAP - Controle Crédito ICMS Ativo
              </GradientText>
              <p className="text-gray-400">Recuperação em 48 Meses - Lei Kandir</p>
            </div>
            <RippleButton className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Novo Ativo CIAP
            </RippleButton>
          </div>
        </FadeIn>

        {/* KPIs */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <FadeIn delay={0.1}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Truck className="w-6 h-6 text-blue-400" />
                  <span className="text-sm text-gray-400">Ativos</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  <NumberCounter value={kpis.assets} decimals={0} />
                </div>
                <div className="text-xs text-gray-500 mt-1">Em CIAP</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.2}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-6 h-6 text-green-400" />
                  <span className="text-sm text-gray-400">Total</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.totalCredit / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Crédito</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.3}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-6 h-6 text-purple-400" />
                  <span className="text-sm text-gray-400">Apropriado</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.appropriated / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Acumulado</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.4}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-yellow-400" />
                  <span className="text-sm text-gray-400">Pendente</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.pending / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Saldo</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.5}>
              <GlassmorphismCard className="p-6 bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-6 h-6 text-indigo-400" />
                  <span className="text-sm text-gray-400">Fator</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  <NumberCounter value={kpis.factor} decimals={1} />%
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
              <h2 className="text-xl font-bold text-white">📊 Ativos em Apropriação</h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Gerar Bloco G
                </button>
              </div>
            </div>

            <div className="ag-theme-quartz-dark" style={{ height: 400, width: '100%' }}>
              <AgGridReact
                ref={gridRef}
                rowData={assets}
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

        {/* Apropriação Mensal */}
        <FadeIn delay={0.7}>
          <GlassmorphismCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">📈 Apropriação Mensal</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Mês de Referência</label>
                  <select className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                    <option value="12/2024">12/2024</option>
                    <option value="11/2024">11/2024</option>
                  </select>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Receita Total:</span>
                    <span className="text-white font-bold">R$ 3.850.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Receita Tributada:</span>
                    <span className="text-green-400 font-bold">R$ 3.280.000 (85.2%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Receita Isenta:</span>
                    <span className="text-gray-500">R$ 570.000 (14.8%)</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between">
                    <span className="text-gray-400">Fator de Apropriação:</span>
                    <span className="text-indigo-400 font-bold text-lg">85.2%</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Parcelas Base (1/48):</span>
                    <span className="text-white">R$ 68.250</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Valor a Apropriar:</span>
                    <span className="text-green-400 font-bold text-lg">R$ 58.149</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    (85.2% × 68.250)
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <ShimmerButton 
                    className="flex-1 flex items-center justify-center gap-2"
                    onClick={handleAppropriation}
                    disabled={loading}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Apropriar Mês
                  </ShimmerButton>
                </div>
              </div>
            </div>
          </GlassmorphismCard>
        </FadeIn>
      </div>
    </PageTransition>
  );
}

