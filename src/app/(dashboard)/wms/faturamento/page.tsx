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
import { Package, ArrowDownToLine, ArrowUpFromLine, Zap, DollarSign, CheckCircle, FileText, Send } from "lucide-react";

ModuleRegistry.registerModules([AllEnterpriseModule]);

export default function WMSFaturamentoPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<AgGridReact>(null);

  const kpis = useMemo(() => ({
    storage: 185000,
    inbound: 95000,
    outbound: 142000,
    extras: 38000,
    total: 460000
  }), []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsRes, invoicesRes] = await Promise.all([
        fetch('/api/wms/billing-events?organizationId=1'),
        fetch('/api/wms/pre-invoices?organizationId=1')
      ]);

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data || []);
      }

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseMeasurement = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wms/pre-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 1,
          customerId: 1,
          period: '12/2024',
          subtotal: kpis.total
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Medição fechada e pré-fatura gerada com sucesso!');
        await loadData();
      } else {
        alert('❌ Erro ao fechar medição: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro ao fechar medição');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendApproval = async (invoiceId: number) => {
    try {
      const response = await fetch(`/api/wms/pre-invoices/${invoiceId}/send-approval`, {
        method: 'PUT'
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Pré-fatura enviada para aprovação do cliente!');
        await loadData();
      } else {
        alert('❌ Erro ao enviar: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro ao enviar para aprovação');
      console.error(error);
    }
  };

  const handleIssueNFSe = async (invoiceId: number) => {
    try {
      const response = await fetch(`/api/wms/pre-invoices/${invoiceId}/issue-nfse`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ NFS-e emitida com sucesso!\nNúmero: ${data.invoiceNumber}`);
        await loadData();
      } else {
        alert('❌ Erro ao emitir NFS-e: ' + data.error);
      }
    } catch (error) {
      alert('❌ Erro ao emitir NFS-e');
      console.error(error);
    }
  };

  const eventsColumnDefs = [
    { field: 'date', headerName: 'Data', width: 120 },
    { field: 'customer', headerName: 'Cliente', width: 200 },
    { 
      field: 'event_type', 
      headerName: 'Tipo Evento', 
      width: 150,
      cellRenderer: (params: any) => {
        const icons: any = {
          STORAGE: '📦',
          INBOUND: '📥',
          OUTBOUND: '📤',
          EXTRAS: '⚡'
        };
        return `${icons[params.value] || ''} ${params.value}`;
      }
    },
    { field: 'quantity', headerName: 'Qtd', width: 100 },
    { field: 'unit', headerName: 'Unidade', width: 120 },
    { 
      field: 'subtotal', 
      headerName: 'Valor', 
      width: 130,
      valueFormatter: (params: any) => `R$ ${params.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      cellStyle: (params: any) => ({
        color: params.value === 'PENDING' ? '#f59e0b' : '#10b981'
      })
    }
  ];

  const invoicesColumnDefs = [
    { field: 'period', headerName: 'Período', width: 120 },
    { field: 'customer', headerName: 'Cliente', width: 180 },
    { 
      field: 'subtotal', 
      headerName: 'Subtotal', 
      width: 130,
      valueFormatter: (params: any) => `R$ ${params.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    { 
      field: 'iss', 
      headerName: 'ISS', 
      width: 110,
      valueFormatter: (params: any) => `R$ ${params.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    { 
      field: 'total', 
      headerName: 'Total', 
      width: 130,
      valueFormatter: (params: any) => `R$ ${params.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      cellRenderer: (params: any) => {
        const colors: any = {
          DRAFT: 'text-gray-400',
          SENT: 'text-blue-400',
          APPROVED: 'text-green-400',
          REJECTED: 'text-red-400',
          INVOICED: 'text-purple-400'
        };
        return `<span class="${colors[params.value]}">${params.value}</span>`;
      }
    },
    {
      headerName: 'Ações',
      width: 220,
      cellRenderer: (params: any) => {
        const status = params.data.status;
        if (status === 'DRAFT') {
          return `<button class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm" data-action="send" data-id="${params.data.id}">📤 Enviar</button>`;
        } else if (status === 'APPROVED') {
          return `<button class="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm" data-action="issue" data-id="${params.data.id}">📄 Emitir NFS-e</button>`;
        }
        return '';
      }
    }
  ];

  return (
    <PageTransition>
      <div className="p-8 space-y-8">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <GradientText className="text-4xl font-bold mb-2">
                📦 WMS Billing Engine
              </GradientText>
              <p className="text-gray-400">Faturamento Logístico por Eventos e Medição</p>
            </div>
          </div>
        </FadeIn>

        {/* KPIs */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <FadeIn delay={0.1}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="w-6 h-6 text-indigo-400" />
                  <span className="text-sm text-gray-400">Storage</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.storage / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.2}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <ArrowDownToLine className="w-6 h-6 text-green-400" />
                  <span className="text-sm text-gray-400">Inbound</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.inbound / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.3}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <ArrowUpFromLine className="w-6 h-6 text-blue-400" />
                  <span className="text-sm text-gray-400">Outbound</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.outbound / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.4}>
              <GlassmorphismCard className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  <span className="text-sm text-gray-400">Extras</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  R$ <NumberCounter value={kpis.extras / 1000} decimals={0} />k
                </div>
                <div className="text-xs text-gray-500 mt-1">Mês Atual</div>
              </GlassmorphismCard>
            </FadeIn>

            <FadeIn delay={0.5}>
              <GlassmorphismCard className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-6 h-6 text-green-400" />
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

        {/* Eventos para Faturamento */}
        <FadeIn delay={0.6}>
          <GlassmorphismCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">📊 Eventos para Faturamento</h2>
              <div className="flex gap-2">
                <ShimmerButton 
                  className="flex items-center gap-2"
                  onClick={handleCloseMeasurement}
                  disabled={loading}
                >
                  <CheckCircle className="w-4 h-4" />
                  Fechar Medição e Gerar Pré-Fatura
                </ShimmerButton>
              </div>
            </div>

            <div className="ag-theme-quartz-dark" style={{ height: 350, width: '100%' }}>
              <AgGridReact
                ref={gridRef}
                rowData={events}
                columnDefs={eventsColumnDefs}
                defaultColDef={{
                  sortable: true,
                  filter: true,
                  resizable: true,
                }}
                theme={auraTheme}
                loading={loading}
              />
            </div>
          </GlassmorphismCard>
        </FadeIn>

        {/* Pré-Faturas e NFS-e */}
        <FadeIn delay={0.7}>
          <GlassmorphismCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">📋 Pré-Faturas e NFS-e</h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Enviar p/ Aprovação
                </button>
                <ShimmerButton className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Emitir NFS-e
                </ShimmerButton>
              </div>
            </div>

            <div 
              className="ag-theme-quartz-dark" 
              style={{ height: 300, width: '100%' }}
              onClick={(e: any) => {
                const target = e.target as HTMLElement;
                if (target.tagName === 'BUTTON') {
                  const action = target.getAttribute('data-action');
                  const id = target.getAttribute('data-id');
                  if (action === 'send' && id) {
                    handleSendApproval(parseInt(id));
                  } else if (action === 'issue' && id) {
                    handleIssueNFSe(parseInt(id));
                  }
                }
              }}
            >
              <AgGridReact
                rowData={invoices}
                columnDefs={invoicesColumnDefs}
                defaultColDef={{
                  sortable: true,
                  filter: true,
                  resizable: true,
                }}
                theme={auraTheme}
                loading={loading}
              />
            </div>
          </GlassmorphismCard>
        </FadeIn>
      </div>
    </PageTransition>
  );
}

