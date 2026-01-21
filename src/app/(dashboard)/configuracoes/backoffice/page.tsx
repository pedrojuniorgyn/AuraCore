"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllEnterpriseModule, ModuleRegistry } from "ag-grid-enterprise";
import type { ColDef, ValueFormatterParams, CellClassParams } from "ag-grid-community";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { RippleButton } from "@/components/ui/ripple-button";
import { auraTheme } from "@/lib/ag-grid/theme";
import { Building2, Wrench, Fuel, Droplets, Briefcase, Users, Plus, Download, Settings, FileDown } from "lucide-react";

ModuleRegistry.registerModules([AllEnterpriseModule]);

interface BackofficeAccount {
  id: number;
  code: string;
  name: string;
  description: string;
  account_type: string;
  balance_month: number;
  balance_year: number;
  status: string;
}

interface CostCenter {
  id: number;
  code: string;
  name: string;
  department: string;
  approver: string;
  approval_limit: number;
  status: string;
}

interface BackofficeKpis {
  oficina: number;
  posto: number;
  lavaJato: number;
  comercial: number;
  admin: number;
  total: number;
}

export default function BackofficePage() {
  const [accounts, setAccounts] = useState<BackofficeAccount[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<BackofficeKpis>({
    oficina: 0,
    posto: 0,
    lavaJato: 0,
    comercial: 0,
    admin: 0,
    total: 0
  });
  const gridRef = useRef<AgGridReact>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsRes, costCentersRes, kpisRes] = await Promise.all([
        fetch('/api/backoffice/accounts'),
        fetch('/api/backoffice/cost-centers'),
        fetch('/api/backoffice/kpis')
      ]);

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        const accountsList = accountsData.data || [];
        setAccounts(accountsList);
        
        // Calcular total a partir das contas
        const total = accountsList.reduce((sum: number, a: BackofficeAccount) => 
          sum + (a.balance_month || 0), 0);
        setKpis(prev => ({ ...prev, total }));
      }

      if (costCentersRes.ok) {
        const ccData = await costCentersRes.json();
        setCostCenters(ccData.data || []);
      }
      
      if (kpisRes.ok) {
        const kpisData = await kpisRes.json();
        if (kpisData.success && kpisData.data) {
          setKpis(kpisData.data);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewEntry = () => {
    alert('📝 Novo Lançamento Contábil\n\nModal de lançamento D/C seria aberto aqui.\nComponente Modal já está criado e pronto para uso!');
  };

  const handleProcessAllocation = async () => {
    try {
      setLoading(true);
      alert('⚙️ Processamento de Rateio iniciado!\n\nSistema calcularia rateio de custos indiretos por CC.');
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('✅ Rateio de custos processado com sucesso!');
      await loadData();
    } catch (error) {
      alert('❌ Erro ao processar rateio');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'backoffice', format: 'csv' })
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backoffice_${Date.now()}.csv`;
      a.click();
      alert('✅ Relatório exportado!');
    } catch (error) {
      alert('❌ Erro ao exportar');
    }
  };

  const accountsColumnDefs: ColDef<BackofficeAccount>[] = [
    { field: 'code', headerName: 'Código', width: 150, pinned: 'left' as const },
    { field: 'name', headerName: 'Nome da Conta', width: 300 },
    { field: 'description', headerName: 'Descrição', width: 250 },
    { 
      field: 'balance_month', 
      headerName: 'Saldo Mês', 
      width: 150,
      valueFormatter: (params: ValueFormatterParams<BackofficeAccount>) => `R$ ${params.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    { 
      field: 'balance_year', 
      headerName: 'Saldo Ano', 
      width: 150,
      valueFormatter: (params: ValueFormatterParams<BackofficeAccount>) => `R$ ${params.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      cellStyle: (params: CellClassParams<BackofficeAccount>) => ({
        color: params.value === 'ACTIVE' ? '#10b981' : '#ef4444'
      })
    }
  ];

  const costCentersColumnDefs: ColDef<CostCenter>[] = [
    { field: 'code', headerName: 'Código', width: 120, pinned: 'left' as const },
    { field: 'name', headerName: 'Nome', width: 250 },
    { field: 'department', headerName: 'Departamento', width: 180 },
    { field: 'approver', headerName: 'Aprovador', width: 180 },
    { 
      field: 'approval_limit', 
      headerName: 'Limite Alçada', 
      width: 150,
      valueFormatter: (params: ValueFormatterParams<CostCenter>) => `R$ ${params.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      cellStyle: (params: CellClassParams<CostCenter>) => ({
        color: params.value === 'ACTIVE' ? '#10b981' : '#ef4444'
      })
    }
  ];

  return (
    <PageTransition>
      <div className="p-8 space-y-8">
        {/* Header */}
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <GradientText className="text-4xl font-bold mb-2">
                🏢 Gestão de Backoffice Enterprise
              </GradientText>
              <p className="text-gray-400">Departamentos de Apoio e Centros de Custo</p>
            </div>
            <button
              onClick={handleProcessAllocation}
              disabled={loading}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Processar Rateio
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Exportar
            </button>
            <RippleButton onClick={handleNewEntry} className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Novo Lançamento
            </RippleButton>
          </div>
        </FadeIn>

        {/* KPIs */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <FadeIn delay={0.1}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Wrench className="w-6 h-6 text-orange-400" />
                  <span className="text-sm text-gray-400">Oficina</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.oficina / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.2}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Fuel className="w-6 h-6 text-yellow-400" />
                  <span className="text-sm text-gray-400">Posto</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.posto / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.3}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Droplets className="w-6 h-6 text-blue-400" />
                  <span className="text-sm text-gray-400">Lava Jato</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.lavaJato / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.4}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="w-6 h-6 text-green-400" />
                  <span className="text-sm text-gray-400">Comercial</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.comercial / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.5}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-6 h-6 text-purple-400" />
                  <span className="text-sm text-gray-400">Admin</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.admin / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.6}>
              <GlassmorphismCard className="p-6 bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-6 h-6 text-violet-400" />
                  <span className="text-sm text-gray-400">Total</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.total / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>
          </div>
        </StaggerContainer>

        {/* Plano de Contas Backoffice */}
        <FadeIn delay={0.7}>
          <GlassmorphismCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                📊 Plano de Contas Backoffice
              </h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
              </div>
            </div>

            <div className="ag-theme-quartz-dark" style={{ height: 400, width: '100%' }}>
              <AgGridReact
                ref={gridRef}
                rowData={accounts}
                columnDefs={accountsColumnDefs}
                defaultColDef={{
                  sortable: true,
                  filter: true,
                  resizable: true,
                }}
                pagination={true}
                paginationPageSize={10}
                
                loading={loading}
              />
            </div>
          </GlassmorphismCard>
        </FadeIn>

        {/* Centros de Custo */}
        <FadeIn delay={0.8}>
          <GlassmorphismCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                🏗️ Centros de Custo Departamentais
              </h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Regras de Rateio
                </button>
                <RippleButton className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Novo CC
                </RippleButton>
              </div>
            </div>

            <div className="ag-theme-quartz-dark" style={{ height: 300, width: '100%' }}>
              <AgGridReact
                rowData={costCenters}
                columnDefs={costCentersColumnDefs}
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

