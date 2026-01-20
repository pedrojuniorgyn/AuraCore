"use client";

import { motion } from 'framer-motion';
import { 
  Map, 
  ListChecks, 
  RefreshCw, 
  Shield,
  Target,
  BarChart3,
  Users,
  type LucideIcon
} from 'lucide-react';
import { Card, Title, Text } from '@tremor/react';

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  href: string;
}

interface QuickActionsProps {
  onNavigate: (href: string) => void;
}

const defaultActions: QuickAction[] = [
  {
    id: 'map',
    label: 'Mapa BSC',
    description: 'Visualizar mapa estratégico',
    icon: Map,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20 hover:bg-blue-500/30',
    href: '/strategic/map',
  },
  {
    id: '5w2h',
    label: '5W2H',
    description: 'Planos de ação',
    icon: ListChecks,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20 hover:bg-purple-500/30',
    href: '/strategic/action-plans',
  },
  {
    id: 'pdca',
    label: 'PDCA',
    description: 'Ciclos de melhoria',
    icon: RefreshCw,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20 hover:bg-amber-500/30',
    href: '/strategic/pdca',
  },
  {
    id: 'warroom',
    label: 'War Room',
    description: 'Central de comando',
    icon: Shield,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20 hover:bg-red-500/30',
    href: '/strategic/war-room',
  },
  {
    id: 'goals',
    label: 'Objetivos',
    description: 'Metas estratégicas',
    icon: Target,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20 hover:bg-emerald-500/30',
    href: '/strategic/goals',
  },
  {
    id: 'kpis',
    label: 'KPIs',
    description: 'Indicadores',
    icon: BarChart3,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20 hover:bg-cyan-500/30',
    href: '/strategic/kpis',
  },
];

export function QuickActions({ onNavigate }: QuickActionsProps) {
  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
      <Title className="text-white mb-1">Ações Rápidas</Title>
      <Text className="text-gray-400 text-xs mb-4">Navegação do módulo estratégico</Text>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {defaultActions.map((action, index) => {
          const Icon = action.icon;
          
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate(action.href)}
              className={`
                p-4 rounded-xl border border-gray-700/50 transition-all duration-200
                ${action.bgColor} group
              `}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={`p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors`}>
                  <Icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <span className="text-white text-sm font-medium">{action.label}</span>
                {action.description && (
                  <span className="text-gray-500 text-xs hidden sm:block">{action.description}</span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </Card>
  );
}
