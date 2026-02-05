"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
import { AllEnterpriseModule, ModuleRegistry } from "ag-grid-enterprise";
import { toast } from "sonner";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Modal } from "@/components/ui/modal";
import { FileUpload } from "@/components/ui/file-upload";
import { auraTheme } from "@/lib/ag-grid/theme";
import { AlertTriangle, DollarSign, CheckCircle, Clock, Shield, Plus, Upload, FileText, Edit, Truck } from "lucide-react";
import { OperationalAIWidget } from "@/components/operational";
import { fetchAPI } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

// Interface para detalhes completos do sinistro (retorno da API em snake_case)
interface ClaimDetails {
  id: number;
  claim_number?: string;
  claim_type?: string;
  claim_status?: string;
  claim_date?: string;
  asset_type?: string;
  vehicle_id?: number;
  asset_description?: string;
  notes?: string;
  estimated_damage?: number;
  franchise_amount?: number;
  insurance_coverage?: number;
  deductible_amount?: number;
  insurance_company?: string;
  policy_number?: string;
  third_party_fault?: boolean;
  third_party_name?: string;
  third_party_insurance?: string;
  recoverable_from_third?: number;
  police_report_number?: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  vehicle_brand?: string;
  vehicle_type?: string;
  organization_id?: number;
  branch_id?: number;
  created_at?: string;
  updated_at?: string;
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

  // Estados para modal de detalhes
  const [selectedClaimDetails, setSelectedClaimDetails] = useState<ClaimDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

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

  const fetchClaimDetails = useCallback(async (claimId: number) => {
    try {
      setIsLoadingDetails(true);
      
      const response = await fetch(`/api/claims/${claimId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        // Tentar parsear JSON de erro, mas tratar falhas graciosamente
        let errorMessage = `Erro ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Se não conseguir parsear JSON (ex: página de erro HTML do nginx/proxy),
          // usar mensagem baseada no status code
        }
        throw new Error(errorMessage);
      }

      const { data } = await response.json();
      setSelectedClaimDetails(data);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Erro ao buscar detalhes do sinistro:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao carregar detalhes");
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

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

  const ClaimDetailsModal = () => {
    if (!selectedClaimDetails) return null;

    return (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              Detalhes do Sinistro #{selectedClaimDetails.claim_number || selectedClaimDetails.id}
            </DialogTitle>
            <DialogDescription>
              Informações completas do sinistro registrado
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Seção 1: Status e Tipo */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-lg font-semibold">
                    {selectedClaimDetails.claim_status === 'OPENED' && '🟡 Aberto'}
                    {selectedClaimDetails.claim_status === 'IN_ANALYSIS' && '🔵 Em Análise'}
                    {selectedClaimDetails.claim_status === 'APPROVED' && '🟢 Aprovado'}
                    {selectedClaimDetails.claim_status === 'REJECTED' && '🔴 Rejeitado'}
                    {selectedClaimDetails.claim_status === 'CLOSED' && '⚫ Fechado'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="text-lg font-semibold">
                    {selectedClaimDetails.claim_type === 'THEFT' && '🚨 Roubo'}
                    {selectedClaimDetails.claim_type === 'ACCIDENT' && '💥 Acidente'}
                    {selectedClaimDetails.claim_type === 'DAMAGE' && '🔧 Avaria'}
                    {selectedClaimDetails.claim_type === 'LOSS' && '📦 Perda'}
                  </p>
                </div>
              </div>

              {/* Seção 2: Dados Gerais */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Dados Gerais
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Data da Ocorrência</p>
                    <p className="font-medium">
                      {selectedClaimDetails.claim_date ? 
                        new Date(selectedClaimDetails.claim_date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        }) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Ativo</p>
                    <p className="font-medium">{selectedClaimDetails.asset_type || 'Não informado'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Descrição do Ativo</p>
                    <p className="font-medium">{selectedClaimDetails.asset_description || 'Sem descrição'}</p>
                  </div>
                  {selectedClaimDetails.police_report_number && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Número do Boletim de Ocorrência</p>
                      <p className="font-medium font-mono">{selectedClaimDetails.police_report_number}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Observações</p>
                    <p className="font-medium text-muted-foreground italic">
                      {selectedClaimDetails.notes || 'Nenhuma observação registrada'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Seção 3: Veículo */}
              {selectedClaimDetails.vehicle_id && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Veículo Envolvido
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Placa</p>
                      <p className="font-medium font-mono">
                        {selectedClaimDetails.vehicle_plate || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo</p>
                      <p className="font-medium">{selectedClaimDetails.vehicle_type || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Marca</p>
                      <p className="font-medium">{selectedClaimDetails.vehicle_brand || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Modelo</p>
                      <p className="font-medium">{selectedClaimDetails.vehicle_model || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Seção 4: Seguro */}
              {selectedClaimDetails.insurance_company && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Seguradora
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Seguradora</p>
                      <p className="font-medium">{selectedClaimDetails.insurance_company}</p>
                    </div>
                    {selectedClaimDetails.policy_number && (
                      <div>
                        <p className="text-sm text-muted-foreground">Apólice</p>
                        <p className="font-medium font-mono">{selectedClaimDetails.policy_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Seção 5: Terceiros */}
              {selectedClaimDetails.third_party_fault && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Informações de Terceiros
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedClaimDetails.third_party_name && (
                      <div>
                        <p className="text-sm text-muted-foreground">Terceiro Envolvido</p>
                        <p className="font-medium">{selectedClaimDetails.third_party_name}</p>
                      </div>
                    )}
                    {selectedClaimDetails.third_party_insurance && (
                      <div>
                        <p className="text-sm text-muted-foreground">Seguradora do Terceiro</p>
                        <p className="font-medium">{selectedClaimDetails.third_party_insurance}</p>
                      </div>
                    )}
                    {selectedClaimDetails.recoverable_from_third && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Valor Recuperável</p>
                        <p className="text-lg font-bold text-green-500">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(selectedClaimDetails.recoverable_from_third)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Seção 6: Valores */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Valores
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedClaimDetails.estimated_damage && (
                    <div>
                      <p className="text-sm text-muted-foreground">Dano Estimado</p>
                      <p className="text-xl font-bold text-orange-500">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(selectedClaimDetails.estimated_damage)}
                      </p>
                    </div>
                  )}
                  {selectedClaimDetails.insurance_coverage && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cobertura Seguro</p>
                      <p className="text-xl font-bold text-blue-500">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(selectedClaimDetails.insurance_coverage)}
                      </p>
                    </div>
                  )}
                  {selectedClaimDetails.franchise_amount && (
                    <div>
                      <p className="text-sm text-muted-foreground">Franquia</p>
                      <p className="text-xl font-bold text-yellow-500">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(selectedClaimDetails.franchise_amount)}
                      </p>
                    </div>
                  )}
                  {selectedClaimDetails.deductible_amount && (
                    <div>
                      <p className="text-sm text-muted-foreground">Dedutível</p>
                      <p className="text-xl font-bold text-red-500">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(selectedClaimDetails.deductible_amount)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer com ações */}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Fechar
            </Button>
            <Button
              variant="default"
              onClick={() => {
                setIsModalOpen(false);
                toast.info('Edição de sinistro será implementada em breve');
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
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
                  if (event.data?.id) {
                    fetchClaimDetails(event.data.id);
                  }
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
      
      {/* Modal de Detalhes */}
      <ClaimDetailsModal />
      
      {/* AI Assistant Widget - FORA do PageTransition (FIXED-001) */}
      <OperationalAIWidget screen="sinistros" />
    </>
  );
}
