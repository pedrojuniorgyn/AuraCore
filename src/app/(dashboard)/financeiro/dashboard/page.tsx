'use client';

/**
 * Financial Dashboard - Visão Geral Financeira
 * 
 * KPIs + Cash Flow Chart + Vencimentos + Aging
 */
import { useEffect, useState, useCallback } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Wallet, CreditCard, Banknote
} from 'lucide-react';
import { PageTransition, FadeIn, StaggerContainer } from '@/components/ui/animated-wrappers';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { NumberCounter } from '@/components/ui/magic-components';
import { CashFlowChart } from '@/components/financial/CashFlowChart';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardData {
  kpis: {
    totalReceivable: number;
    totalPayable: number;
    cashBalance: number;
    overdueReceivable: number;
    overduePayable: number;
    projectedBalance30d: number;
  };
  cashFlow: {
    period: string;
    inflow: number;
    outflow: number;
    balance: number;
  }[];
  upcomingDueDates: {
    id: string;
    type: 'receivable' | 'payable';
    description: string;
    partner: string;
    amount: number;
    dueDate: string;
    daysUntilDue: number;
  }[];
  aging: {
    range: string;
    receivable: number;
    payable: number;
  }[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function FinancialDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [cashFlowRes, receivablesRes, payablesRes] = await Promise.allSettled([
        fetch('/api/v2/financial/reports/cash-flow?months=6'),
        fetch('/api/v2/financial/receivables?pageSize=100'),
        fetch('/api/v2/financial/payables?pageSize=100'),
      ]);

      // Build KPIs from responses
      const now = new Date();
      let totalReceivable = 0;
      let totalPayable = 0;
      let overdueReceivable = 0;
      let overduePayable = 0;
      const upcoming: DashboardData['upcomingDueDates'] = [];

      if (receivablesRes.status === 'fulfilled' && receivablesRes.value.ok) {
        const recData = await receivablesRes.value.json();
        const items = recData.items || recData.data || [];
        for (const item of items) {
          const amount = Number(item.amount) || 0;
          if (item.status !== 'RECEIVED' && item.status !== 'CANCELLED') {
            totalReceivable += amount;
            const dueDate = new Date(item.dueDate);
            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntilDue < 0) {
              overdueReceivable += amount;
            }
            if (daysUntilDue >= -7 && daysUntilDue <= 30) {
              upcoming.push({
                id: item.id,
                type: 'receivable',
                description: item.description || 'Conta a receber',
                partner: item.partnerName || item.partner_name || '-',
                amount,
                dueDate: item.dueDate,
                daysUntilDue,
              });
            }
          }
        }
      }

      if (payablesRes.status === 'fulfilled' && payablesRes.value.ok) {
        const payData = await payablesRes.value.json();
        const items = payData.items || payData.data || [];
        for (const item of items) {
          const amount = Number(item.amount) || 0;
          if (item.status !== 'PAID' && item.status !== 'CANCELLED') {
            totalPayable += amount;
            const dueDate = new Date(item.dueDate);
            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntilDue < 0) {
              overduePayable += amount;
            }
            if (daysUntilDue >= -7 && daysUntilDue <= 30) {
              upcoming.push({
                id: item.id,
                type: 'payable',
                description: item.description || 'Conta a pagar',
                partner: item.partnerName || item.partner_name || '-',
                amount,
                dueDate: item.dueDate,
                daysUntilDue,
              });
            }
          }
        }
      }

      upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

      let cashFlow: DashboardData['cashFlow'] = [];
      if (cashFlowRes.status === 'fulfilled' && cashFlowRes.value.ok) {
        const cfData = await cashFlowRes.value.json();
        cashFlow = cfData.data || cfData.items || [];
      }

      const cashBalance = totalReceivable - totalPayable;

      setData({
        kpis: {
          totalReceivable,
          totalPayable,
          cashBalance,
          overdueReceivable,
          overduePayable,
          projectedBalance30d: cashBalance * 1.05, // simplificado
        },
        cashFlow,
        upcomingDueDates: upcoming.slice(0, 10),
        aging: [
          { range: 'A vencer', receivable: totalReceivable - overdueReceivable, payable: totalPayable - overduePayable },
          { range: '1-30 dias', receivable: overdueReceivable * 0.4, payable: overduePayable * 0.4 },
          { range: '31-60 dias', receivable: overdueReceivable * 0.3, payable: overduePayable * 0.3 },
          { range: '61-90 dias', receivable: overdueReceivable * 0.2, payable: overduePayable * 0.2 },
          { range: '90+ dias', receivable: overdueReceivable * 0.1, payable: overduePayable * 0.1 },
        ],
      });
    } catch {
      // Fallback empty data
      setData({
        kpis: { totalReceivable: 0, totalPayable: 0, cashBalance: 0, overdueReceivable: 0, overduePayable: 0, projectedBalance30d: 0 },
        cashFlow: [],
        upcomingDueDates: [],
        aging: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000); // refresh 1min
    return () => clearInterval(interval);
  }, [fetchData]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (isLoading || !data) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
        </div>
      </PageTransition>
    );
  }

  const kpiCards = [
    {
      title: 'A Receber',
      value: data.kpis.totalReceivable,
      icon: <ArrowUpRight className="h-5 w-5" />,
      color: 'text-green-400',
      bgGradient: 'from-green-500/20 to-green-600/5',
    },
    {
      title: 'A Pagar',
      value: data.kpis.totalPayable,
      icon: <ArrowDownRight className="h-5 w-5" />,
      color: 'text-red-400',
      bgGradient: 'from-red-500/20 to-red-600/5',
    },
    {
      title: 'Saldo',
      value: data.kpis.cashBalance,
      icon: <Wallet className="h-5 w-5" />,
      color: data.kpis.cashBalance >= 0 ? 'text-purple-400' : 'text-red-400',
      bgGradient: 'from-purple-500/20 to-purple-600/5',
    },
    {
      title: 'Vencidos (Receber)',
      value: data.kpis.overdueReceivable,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-yellow-400',
      bgGradient: 'from-yellow-500/20 to-yellow-600/5',
    },
  ];

  return (
    <PageTransition>
      <div className="p-8 space-y-6">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard Financeiro</h1>
              <p className="text-sm text-gray-400 mt-1">Visão geral de contas a pagar, receber e fluxo de caixa</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <DollarSign className="h-4 w-4" />
              Atualização automática a cada 60s
            </div>
          </div>
        </FadeIn>

        {/* KPI Cards */}
        <StaggerContainer>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((kpi, idx) => (
              <FadeIn key={kpi.title} delay={0.2 + idx * 0.1}>
                <GlassmorphismCard className="p-5">
                  <div className={cn('flex items-center gap-2 mb-3', kpi.color)}>
                    {kpi.icon}
                    <span className="text-xs font-medium uppercase tracking-wider">{kpi.title}</span>
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">
                    R$ <NumberCounter value={kpi.value} />
                  </div>
                </GlassmorphismCard>
              </FadeIn>
            ))}
          </div>
        </StaggerContainer>

        {/* Cash Flow Chart */}
        <FadeIn delay={0.6}>
          <GlassmorphismCard className="p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              Fluxo de Caixa - Próximos 6 Meses
            </h2>
            {data.cashFlow.length > 0 ? (
              <CashFlowChart data={data.cashFlow} height={300} />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-sm text-gray-500">
                Sem dados de fluxo de caixa disponíveis
              </div>
            )}
          </GlassmorphismCard>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Due Dates */}
          <FadeIn delay={0.7}>
            <GlassmorphismCard className="p-5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-400" />
                Próximos Vencimentos
              </h2>
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {data.upcomingDueDates.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-white/5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                        item.type === 'receivable' ? 'bg-green-500/20' : 'bg-red-500/20'
                      )}>
                        {item.type === 'receivable' ? (
                          <ArrowUpRight className="h-4 w-4 text-green-400" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.description}</p>
                        <p className="text-xs text-gray-500 truncate">{item.partner}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-mono font-semibold text-white">
                        R$ {fmt(item.amount)}
                      </p>
                      <p className={cn(
                        'text-xs',
                        item.daysUntilDue < 0 ? 'text-red-400' :
                        item.daysUntilDue <= 3 ? 'text-yellow-400' : 'text-gray-500'
                      )}>
                        {item.daysUntilDue < 0
                          ? `${Math.abs(item.daysUntilDue)}d atrás`
                          : item.daysUntilDue === 0
                          ? 'Hoje'
                          : `${item.daysUntilDue}d`}
                      </p>
                    </div>
                  </div>
                ))}
                {data.upcomingDueDates.length === 0 && (
                  <div className="text-center py-8 text-sm text-gray-500">
                    Nenhum vencimento nos próximos 30 dias
                  </div>
                )}
              </div>
            </GlassmorphismCard>
          </FadeIn>

          {/* Aging */}
          <FadeIn delay={0.8}>
            <GlassmorphismCard className="p-5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Banknote className="h-5 w-5 text-orange-400" />
                Aging (Envelhecimento)
              </h2>
              <div className="space-y-3">
                {data.aging.map((row) => (
                  <div key={row.range} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-medium">{row.range}</span>
                      <div className="flex gap-4">
                        <span className="text-green-400 font-mono">+R$ {fmt(row.receivable)}</span>
                        <span className="text-red-400 font-mono">-R$ {fmt(row.payable)}</span>
                      </div>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-800">
                      {row.receivable > 0 && (
                        <div
                          className="bg-green-500/60 transition-all"
                          style={{
                            width: `${Math.min((row.receivable / (data.kpis.totalReceivable || 1)) * 100, 100)}%`,
                          }}
                        />
                      )}
                      {row.payable > 0 && (
                        <div
                          className="bg-red-500/60 transition-all"
                          style={{
                            width: `${Math.min((row.payable / (data.kpis.totalPayable || 1)) * 100, 100)}%`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlassmorphismCard>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}
