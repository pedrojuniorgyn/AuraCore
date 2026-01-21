"use client";

import { useState, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, ColDef } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";

// AG Grid CSS (v34+ Theming API)
import "ag-grid-community/styles/ag-theme-quartz.css";

import { GlassmorphismCard } from "@/components/ui/glassmorphism-card";
import { GradientText, NumberCounter } from "@/components/ui/magic-components";
import { RippleButton } from "@/components/ui/ripple-button";
import { PageTransition, StaggerContainer, FadeIn } from "@/components/ui/animated-wrappers";
import { currencyFormatter, dateFormatter, StatusCellRenderer } from "@/components/ag-grid/renderers/aurora-renderers";
import { Play, FileSpreadsheet, DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { auraTheme } from "@/lib/ag-grid/theme";

// Registrar módulos do AG Grid
ModuleRegistry.registerModules([AllEnterpriseModule]);

export default function CreditosFiscaisPage() {
  const gridRef = useRef<AgGridReact>(null);
  const [credits, setCredits] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({
    currentMonth: 0,
    ytd: 0,
    pending: 0,
    processed: 0,
    successRate: 0
  });

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    setLoading(true);
    try {
      const [creditsRes, statsRes] = await Promise.all([
        fetch('/api/tax/credits'),
        fetch('/api/tax/credits/stats')
      ]);
      
      if (creditsRes.ok) {
        const creditsData = await creditsRes.json();
        const creditsList = creditsData.data || [];
        setCredits(creditsList);
        
        // Calcular stats a partir dos créditos se não houver endpoint específico
        if (creditsList.length > 0) {
          const totalCredit = creditsList.reduce((sum: number, c: Record<string, unknown>) => 
            sum + ((c.totalCredit as number) || 0), 0);
          const processed = creditsList.filter((c: Record<string, unknown>) => c.status === 'SUCCESS').length;
          const pending = creditsList.filter((c: Record<string, unknown>) => c.status === 'PENDING').length;
          const failed = creditsList.filter((c: Record<string, unknown>) => c.status === 'FAILED').length;
          const successRate = (processed + pending > 0) ? (processed / (processed + failed)) * 100 : 0;
          
          setStats(prev => ({
            ...prev,
            currentMonth: totalCredit,
            processed,
            pending,
            successRate: isNaN(successRate) ? 0 : successRate
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
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const processPending = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/tax/credits/process', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        alert(`✅ ${result.data.documentsProcessed} documentos processados!`);
        fetchCredits();
      }
    } catch (error) {
      alert("Erro ao processar créditos");
    } finally {
      setProcessing(false);
    }
  };

  const columnDefs: ColDef[] = [
    { field: 'processedDate', headerName: 'Data', valueFormatter: dateFormatter, filter: 'agDateColumnFilter', floatingFilter: true, sort: 'desc', width: 120 },
    { field: 'documentNumber', headerName: 'NFe', filter: 'agTextColumnFilter', floatingFilter: true, width: 120 },
    { field: 'supplierName', headerName: 'Fornecedor', flex: 1, filter: 'agTextColumnFilter', floatingFilter: true },
    { field: 'accountCode', headerName: 'Conta', width: 150 },
    { field: 'purchaseAmount', headerName: 'Valor Compra', valueFormatter: currencyFormatter, filter: 'agNumberColumnFilter', width: 140 },
    { field: 'pisCredit', headerName: 'PIS (1.65%)', valueFormatter: currencyFormatter, cellStyle: { color: '#10b981', fontWeight: 'bold' }, width: 130 },
    { field: 'cofinsCredit', headerName: 'COFINS (7.6%)', valueFormatter: currencyFormatter, cellStyle: { color: '#10b981', fontWeight: 'bold' }, width: 140 },
    { field: 'totalCredit', headerName: 'Total (9.25%)', valueFormatter: currencyFormatter, cellStyle: { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 'bold', fontSize: '1.1em' }, filter: 'agNumberColumnFilter', width: 140 },
    { field: 'status', headerName: 'Status', cellRenderer: StatusCellRenderer, filter: 'agSetColumnFilter', width: 120 }
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <FadeIn>
          <GradientText className="text-4xl font-bold mb-2">Créditos Fiscais PIS/COFINS</GradientText>
          <p className="text-gray-400">Motor de Recuperação Tributária - Regime Não-Cumulativo</p>
        </FadeIn>

        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <GlassmorphismCard className="aurora-green-shadow hover:scale-105 transition-transform">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-400" />
                <div>
                  <NumberCounter value={stats.currentMonth} prefix="R$ " className="text-2xl font-bold" />
                  <p className="text-gray-400 text-xs">Mês Atual</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-400" />
                <div>
                  <NumberCounter value={stats.ytd} prefix="R$ " className="text-2xl font-bold" />
                  <p className="text-gray-400 text-xs">Acum. Ano</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="pulsating hover:scale-105 transition-transform">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-400" />
                <div>
                  <NumberCounter value={stats.pending} className="text-2xl font-bold" />
                  <p className="text-gray-400 text-xs">Pendentes</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-purple-400" />
                <div>
                  <NumberCounter value={stats.processed} className="text-2xl font-bold" />
                  <p className="text-gray-400 text-xs">Processados</p>
                </div>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-purple-300">9.25%</div>
                <p className="text-gray-400 text-xs">Alíquota</p>
              </div>
            </GlassmorphismCard>

            <GlassmorphismCard className="hover:scale-105 transition-transform">
              <div className="flex items-center gap-3">
                {stats.processed > 0 ? (
                  <NumberCounter value={stats.successRate} suffix="%" decimals={1} className="text-3xl font-bold" />
                ) : (
                  <span className="text-3xl font-bold text-gray-500">N/A</span>
                )}
                <p className="text-gray-400 text-xs">Taxa Sucesso</p>
              </div>
            </GlassmorphismCard>
          </div>
        </StaggerContainer>

        <FadeIn delay={0.1}>
          <GlassmorphismCard>
            <div className="flex justify-between items-center">
              <div>
                <GradientText className="text-xl">Motor de Crédito Fiscal</GradientText>
                <p className="text-gray-400 text-sm mt-1">Processamento automático sobre insumos essenciais</p>
              </div>
              <RippleButton onClick={processPending} disabled={processing}>
                <Play className="w-4 h-4 mr-2" />
                {processing ? 'Processando...' : `Processar Pendentes (${stats.pending})`}
              </RippleButton>
            </div>
          </GlassmorphismCard>
        </FadeIn>

        <FadeIn delay={0.2}>
          <GlassmorphismCard>
            <div className="flex justify-between mb-4">
              <GradientText className="text-2xl">Histórico de Créditos Fiscais</GradientText>
              <RippleButton onClick={() => gridRef.current?.api?.exportDataAsExcel()}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
              </RippleButton>
            </div>

            <div className="ag-theme-quartz-dark" style={{ height: "calc(100vh - 300px)" }}>
              <AgGridReact
                ref={gridRef}
                
                rowData={credits}
                columnDefs={columnDefs}
                defaultColDef={{ sortable: true, resizable: true, filter: true }}
                sideBar={{ toolPanels: ['columns', 'filters'] }}
                enableRangeSelection={true}
                pagination={true}
                paginationPageSize={50}
                loading={loading}
              />
            </div>
          </GlassmorphismCard>
        </FadeIn>
      </div>
    </PageTransition>
  );
}


