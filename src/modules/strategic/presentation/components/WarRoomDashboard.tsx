'use client';

/**
 * Componente: WarRoomDashboard
 * Dashboard executivo do War Room
 * 
 * @module strategic/presentation/components
 */
import { useEffect, useState } from 'react';

interface WarRoomData {
  updatedAt: string;
  healthScore: number;
  criticalKpis: Array<{
    id: string;
    code: string;
    name: string;
    currentValue: number;
    targetValue: number;
    unit: string;
    variance: number;
  }>;
  alertKpis: Array<{
    id: string;
    code: string;
    name: string;
    currentValue: number;
    targetValue: number;
    unit: string;
  }>;
  overduePlans: Array<{
    id: string;
    code: string;
    what: string;
    who: string;
    daysOverdue: number;
  }>;
  stats: {
    totalGoals: number;
    goalsOnTrack: number;
    goalsAtRisk: number;
    goalsDelayed: number;
    totalKpis: number;
    kpisGreen: number;
    kpisYellow: number;
    kpisRed: number;
    totalActionPlans: number;
    plansOverdue: number;
    plansInProgress: number;
  };
}

interface WarRoomDashboardProps {
  initialData?: WarRoomData;
  refreshInterval?: number;
}

export function WarRoomDashboard({ 
  initialData, 
  refreshInterval = 30000 
}: WarRoomDashboardProps) {
  const [data, setData] = useState<WarRoomData | null>(initialData ?? null);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialData);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/strategic/war-room/dashboard', {
          credentials: 'include', // Enviar cookies de autenticação
        });

        if (response.ok) {
          const newData = await response.json();
          setData(newData);
          setIsLive(true);
        } else {
          console.error(`Dashboard fetch failed: ${response.status}`);
          setIsLive(false);
        }
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        setIsLive(false);
      } finally {
        setIsLoading(false); // Sempre resetar loading
      }
    };

    // Fetch inicial
    if (!initialData) {
      fetchData();
    }

    // Polling
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [initialData, refreshInterval]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500">
        Erro ao carregar dados do War Room
      </div>
    );
  }

  const healthPercent = Math.round(data.healthScore * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            🎖️ WAR ROOM
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Visão executiva em tempo real
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isLive && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600 dark:text-gray-300">AO VIVO</span>
            </div>
          )}
          <span className="text-sm text-gray-500">
            Atualizado: {new Date(data.updatedAt).toLocaleTimeString('pt-BR')}
          </span>
        </div>
      </div>

      {/* Health Score + Stats */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
        <div className="grid grid-cols-5 gap-6">
          {/* Gauge */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-gray-300 text-sm mb-2">Saúde Estratégica</span>
            <div className="relative w-32 h-16">
              <svg viewBox="0 0 120 60" className="w-full h-full">
                {/* Background arc */}
                <path
                  d="M 10 55 A 50 50 0 0 1 110 55"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Value arc */}
                <path
                  d="M 10 55 A 50 50 0 0 1 110 55"
                  fill="none"
                  stroke={healthPercent >= 70 ? '#22c55e' : healthPercent >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(healthPercent / 100) * 157} 157`}
                />
              </svg>
            </div>
            <span className="text-3xl font-bold mt-2">{healthPercent}%</span>
          </div>

          {/* Stats */}
          <StatCard
            label="Metas"
            value={data.stats.totalGoals}
            detail={`${data.stats.goalsOnTrack} no prazo`}
            color="blue"
          />
          <StatCard
            label="KPIs Verdes"
            value={data.stats.kpisGreen}
            detail={`de ${data.stats.totalKpis} total`}
            color="green"
          />
          <StatCard
            label="KPIs em Alerta"
            value={data.stats.kpisYellow + data.stats.kpisRed}
            detail={`${data.stats.kpisRed} críticos`}
            color={data.stats.kpisRed > 0 ? 'red' : 'yellow'}
          />
          <StatCard
            label="Planos Atrasados"
            value={data.stats.plansOverdue}
            detail={`de ${data.stats.totalActionPlans} total`}
            color={data.stats.plansOverdue > 0 ? 'red' : 'green'}
          />
        </div>
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-2 gap-6">
        {/* KPIs Críticos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-red-500 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🚨 KPIs Críticos
          </h2>
          <div className="space-y-3">
            {data.criticalKpis.length === 0 ? (
              <p className="text-green-600 dark:text-green-400">
                ✅ Nenhum KPI crítico
              </p>
            ) : (
              data.criticalKpis.map((kpi) => (
                <div
                  key={kpi.id}
                  className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded"
                >
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs rounded mr-2">
                      {kpi.code}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {kpi.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-sm">
                      {kpi.currentValue} / {kpi.targetValue} {kpi.unit}
                    </span>
                    <span className="block text-red-500 text-xs">
                      {kpi.variance.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Planos Atrasados */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-amber-500 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ⏰ Planos de Ação Atrasados
          </h2>
          <div className="space-y-3">
            {data.overduePlans.length === 0 ? (
              <p className="text-green-600 dark:text-green-400">
                ✅ Nenhum plano atrasado
              </p>
            ) : (
              data.overduePlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex justify-between items-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded"
                >
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs rounded mr-2">
                      {plan.code}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">
                      {plan.what}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">{plan.who}</span>
                    <span className="block text-red-500 text-xs font-semibold">
                      {plan.daysOverdue} dias atrasado
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* KPIs em Alerta */}
      {data.alertKpis.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-yellow-500 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ⚠️ KPIs em Alerta
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.alertKpis.map((kpi) => (
              <div
                key={kpi.id}
                className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded text-center"
              >
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {kpi.code}
                </span>
                <span className="block font-semibold text-sm text-gray-900 dark:text-white">
                  {kpi.currentValue} / {kpi.targetValue}
                </span>
                <span className="block text-xs text-gray-600 dark:text-gray-300">
                  {kpi.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: number;
  detail: string;
  color: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  };

  return (
    <div className="text-center">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`block text-3xl font-bold ${colorClasses[color]}`}>
        {value}
      </span>
      <span className="text-gray-500 text-xs">{detail}</span>
    </div>
  );
}
