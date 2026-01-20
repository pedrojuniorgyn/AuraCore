"use client";

import { motion } from 'framer-motion';
import { AlertTriangle, ChevronRight, Clock, TrendingDown } from 'lucide-react';
import { Card, Title, Text, Flex } from '@tremor/react';

export interface Alert {
  id: string;
  type: 'CRITICAL' | 'WARNING';
  title: string;
  description: string;
  metric?: string;
  source?: 'KPI' | 'PLAN' | 'GOAL';
}

interface CriticalAlertsProps {
  alerts: Alert[];
  onViewAll?: () => void;
  onAlertClick?: (alert: Alert) => void;
  maxHeight?: string;
}

const alertConfig = {
  CRITICAL: {
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-400',
    pulseColor: 'bg-red-500',
  },
  WARNING: {
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    pulseColor: 'bg-amber-500',
  },
};

const sourceIcons = {
  KPI: TrendingDown,
  PLAN: Clock,
  GOAL: AlertTriangle,
};

export function CriticalAlerts({ 
  alerts, 
  onViewAll, 
  onAlertClick,
  maxHeight = '300px' 
}: CriticalAlertsProps) {
  const criticalCount = alerts.filter(a => a.type === 'CRITICAL').length;
  const warningCount = alerts.filter(a => a.type === 'WARNING').length;

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 h-full">
      <Flex justifyContent="between" alignItems="center" className="mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            {criticalCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full 
                flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
                {criticalCount}
              </span>
            )}
          </div>
          <div>
            <Title className="text-white">Alertas</Title>
            <Text className="text-gray-400 text-xs">
              {criticalCount} críticos, {warningCount} atenção
            </Text>
          </div>
        </div>
        
        {alerts.length > 0 && (
          <div className="flex gap-2">
            <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">
              {criticalCount} 🔴
            </span>
            <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
              {warningCount} 🟡
            </span>
          </div>
        )}
      </Flex>

      <div 
        className="space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
        style={{ maxHeight }}
      >
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
              <span className="text-2xl">✓</span>
            </div>
            <Text className="text-gray-400">Nenhum alerta no momento</Text>
            <Text className="text-gray-500 text-xs">Sistema operando normalmente</Text>
          </div>
        ) : (
          alerts.map((alert, index) => {
            const config = alertConfig[alert.type];
            const SourceIcon = alert.source ? sourceIcons[alert.source] : AlertTriangle;
            
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onAlertClick?.(alert)}
                className={`
                  relative p-4 rounded-xl border cursor-pointer 
                  transition-all duration-200 hover:scale-[1.02] hover:shadow-lg
                  ${config.bgColor} ${config.borderColor}
                `}
              >
                {/* Pulse indicator for critical */}
                {alert.type === 'CRITICAL' && (
                  <div className="absolute top-3 right-3">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pulseColor} opacity-75`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${config.pulseColor}`} />
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <SourceIcon className={`w-4 h-4 ${config.iconColor}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate pr-4">
                      {alert.title}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">
                      {alert.description}
                    </p>
                    {alert.metric && (
                      <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded ${config.bgColor} ${config.iconColor}`}>
                        {alert.metric}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {onViewAll && alerts.length > 0 && (
        <button 
          onClick={onViewAll} 
          className="w-full mt-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/30 
            text-purple-300 flex items-center justify-center gap-2 
            hover:bg-purple-500/20 transition-colors text-sm font-medium"
        >
          Ver todos os alertas
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </Card>
  );
}
