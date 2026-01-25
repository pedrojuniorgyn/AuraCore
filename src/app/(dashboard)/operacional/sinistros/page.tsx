"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
import { AllEnterpriseModule, ModuleRegistry } from "ag-grid-enterprise";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Modal } from "@/components/ui/modal";
import { FileUpload } from "@/components/ui/file-upload";
import { auraTheme } from "@/lib/ag-grid/theme";
import { AlertTriangle, DollarSign, CheckCircle, Clock, Shield, Plus, Upload, FileText } from "lucide-react";
import { OperationalAIWidget } from "@/components/operational";
import { fetchAPI } from "@/lib/api";

ModuleRegistry.registerModules([AllEnterpriseModule]);

interface Claim {
  id: number;
  claimNumber: string;
  claimType: string;
  vehicleId: number;
  vehiclePlate: string;
  estimatedDamage: number;
  finalCost: number;
  deductible: number;
  netCost: number;
  status: string;
  createdAt: string;
  resolvedAt?: string;
}

export default function SinistrosPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<AgGridReact>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDecideModal, setShowDecideModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [formData, setFormData] = useState({
    claimType: 'ACCIDENT',
    vehicleId: 1,
    estimatedDamage: 0,
    description: ''
  });

  // Calcular KPIs a partir dos claims carregados
  const kpis = useMemo(() => {
    if (claims.length === 0) {
      return { open: 0, totalEstimated: 0, approved: 0, paid: 0, franchise: 0 };
    }
    
    const open = claims.filter((c: Claim) => c.status === 'OPENED' || c.status === 'UNDER_REVIEW').length;
    const totalEstimated = claims.reduce((sum: number, c: Claim) => sum + (c.estimatedDamage || 0), 0);
    const approved = claims.filter((c: Claim) => c.status === 'APPROVED' || c.status === 'PAID')
      .reduce((sum: number, c: Claim) => sum + (c.finalCost || 0), 0);
    const paid = claims.filter((c: Claim) => c.status === 'PAID')
      .reduce((sum: number, c: Claim) => sum + (c.finalCost || 0), 0);
    const franchise = claims.reduce((sum: number, c: Claim) => sum + (c.deductible || 0), 0);
    
    return { open, totalEstimated, approved, paid, franchise };
  }, [claims]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await fetchAPI<{ data: Claim[] }>('/api/claims');
      setClaims(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar sinistros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewClaim = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI<{ success: boolean; error?: string; claimNumber: string }>('/api/claims', {
        method: 'POST',
        body: formData,
      });

      if (data.success) {
        alert(`✅ Sinistro registrado!\nNúmero: ${data.claimNumber}`);
        setShowNewModal(false);
        setFormData({ claimType: 'ACCIDENT', vehicleId: 1, estimatedDamage: 0, description: '' });
        await loadData();
      } else {
        alert('❌ Erro: ' + data.error);
      }
    } catch {
      alert('❌ Erro ao registrar sinistro');
    } finally {
      setLoading(false);
    }
  };

  const handleDecide = async (decision: string, amount: number) => {
    if (!selectedClaim) return;
    try {
      const data = await fetchAPI<{ success: boolean; error?: string; message: string }>(`/api/claims/${selectedClaim.id}/decide`, {
        method: 'POST',
        body: { decision, amount, notes: 'Decisão via sistema' }
      });

      if (data.success) {
        alert(`✅ ${data.message}`);
        setShowDecideModal(false);
        setSelectedClaim(null);
        await loadData();
      } else {
        alert('❌ Erro: ' + data.error);
      }
    } catch {
      alert('❌ Erro ao decidir');
    }
  };

  const handleUploadDoc = (file: File) => {
    alert(`📄 Arquivo "${file.name}" selecionado!\n(Upload real seria integrado com S3/Azure)`);
  };

  const handleExport = async () => {
    try {
      // Retorna blob, não pode usar fetchAPI
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'claims', format: 'csv' }),
        credentials: 'include',
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sinistros_${Date.now()}.csv`;
      a.click();
      alert('✅ Relatório exportado com sucesso!');
    } catch {
      alert('❌ Erro ao exportar');
    }
  };

  const columnDefs = [
    { field: 'number', headerName: 'Nº Sinistro', width: 130, pinned: 'left' as const },
    { field: 'date', headerName: 'Data', width: 110 },
    { 
      field: 'type', 
      headerName: 'Tipo', 
      width: 130,
      cellRenderer: (params: ICellRendererParams) => {
        const icons: Record<string, string> = {
          ACCIDENT: '🚗',
          THEFT: '🚨',
          DAMAGE: '⚠️'
        };
        const labels: Record<string, string> = {
          ACCIDENT: 'Acidente',
          THEFT: 'Roubo',
          DAMAGE: 'Avaria'
        };
        return `${icons[params.value] || ''} ${labels[params.value] || params.value}`;
      }
    },
    { field: 'vehicle', headerName: 'Placa', width: 100 },
    { 
      field: 'estimated_damage', 
      headerName: 'Dano Est.', 
      width: 130,
      valueFormatter: (params: ValueFormatterParams) => `R$ ${params.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    { 
      field: 'coverage', 
      headerName: 'Cobertura', 
      width: 130,
      valueFormatter: (params: ValueFormatterParams) => `R$ ${params.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    { 
      field: 'franchise', 
      headerName: 'Franquia', 
      width: 120,
      valueFormatter: (params: ValueFormatterParams) => `R$ ${params.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 150,
      cellRenderer: (params: ICellRendererParams) => {
        const colors: Record<string, string> = {
          OPENED: 'text-yellow-400',
          UNDER_REVIEW: 'text-blue-400',
          APPROVED: 'text-green-400',
          PAID: 'text-purple-400',
          CLOSED: 'text-gray-400'
        };
        const labels: Record<string, string> = {
          OPENED: 'ABERTO',
          UNDER_REVIEW: 'AVALIANDO',
          APPROVED: 'APROVADO',
          PAID: 'PAGO',
          CLOSED: 'FECHADO'
        };
        return `<span class="${colors[params.value]}">${labels[params.value]}</span>`;
      }
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
                🚨 Gestão de Sinistros e Seguros
              </GradientText>
              <p className="text-gray-400">Controle de Acidentes, Roubos e Ressarcimentos</p>
            </div>
            <RippleButton className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Novo Sinistro
            </RippleButton>
          </div>
        </FadeIn>

        {/* KPIs */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <FadeIn delay={0.1}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  <span className="text-sm text-gray-400">Abertos</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  <NumberCounter value={kpis.open} decimals={0} />
                </div>
                <div className="text-xs text-gray-500 mt-1">Sinistros</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.2}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-6 h-6 text-red-400" />
                  <span className="text-sm text-gray-400">Valor Est.</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.totalEstimated / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Estimado</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.3}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-sm text-gray-400">Aprovado</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.approved / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Seguradora</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.4}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-purple-400" />
                  <span className="text-sm text-gray-400">Pagos</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.paid / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Recebido</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.5}>
              <GlassmorphismCard className="p-6 bg-gradient-to-br from-orange-500/20 to-red-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-6 h-6 text-orange-400" />
                  <span className="text-sm text-gray-400">Risco</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.franchise / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Franquias</div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* Grid Principal */}
        <FadeIn delay={0.6}>
          <GlassmorphismCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">📊 Sinistros Ativos</h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Relatório Mensal
                </button>
              </div>
            </div>

            <div className="ag-theme-quartz-dark" style={{ height: 400, width: '100%' }}>
              <AgGridReact
                ref={gridRef}
                rowData={claims}
                columnDefs={columnDefs}
                defaultColDef={{
                  sortable: true,
                  filter: true,
                  resizable: true,
                }}
                
                loading={loading}
                onRowClicked={(event) => {
                  console.log('Sinistro selecionado:', event.data);
                }}
              />
            </div>
          </GlassmorphismCard>
        </FadeIn>

        {/* Workflow Timeline */}
        <FadeIn delay={0.7}>
          <GlassmorphismCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">💼 Workflow do Sinistro</h2>
            <div className="text-gray-400 mb-4">[Sinistro Selecionado: SIN-001]</div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-300">Abertura: 15/12 - BO 12345 registrado</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-300">Orçamento: 16/12 - R$ 150.000 (Oficina XYZ)</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-300">Acionamento: 17/12 - Seguradora ACME notificada</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-300">Avaliação: 18/12 - Seguradora aprovou R$ 145.000</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-gray-500">Pendente: Pagamento franquia R$ 5.000</span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <ShimmerButton className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Pagar Franquia
              </ShimmerButton>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Docs
              </button>
            </div>
          </GlassmorphismCard>
        </FadeIn>
      </div>
      </PageTransition>
      
      {/* AI Assistant Widget - FORA do PageTransition (FIXED-001) */}
      <OperationalAIWidget screen="sinistros" />
    </>
  );
}
