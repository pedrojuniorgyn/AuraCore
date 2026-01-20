"use client";

import { Card, Title, Text, AreaChart, Flex, BadgeDelta, type DeltaType } from '@tremor/react';
import { motion } from 'framer-motion';

interface TrendDataPoint {
  period: string;
  healthScore: number;
  financial: number;
  customer: number;
  internal: number;
  learning: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  currentScore: number;
  previousScore?: number;
}

// Mock data para demonstração
const defaultData: TrendDataPoint[] = [
  { period: 'Ago', healthScore: 65, financial: 60, customer: 70, internal: 62, learning: 68 },
  { period: 'Set', healthScore: 68, financial: 65, customer: 72, internal: 65, learning: 70 },
  { period: 'Out', healthScore: 72, financial: 70, customer: 75, internal: 68, learning: 75 },
  { period: 'Nov', healthScore: 70, financial: 68, customer: 73, internal: 66, learning: 73 },
  { period: 'Dez', healthScore: 75, financial: 72, customer: 78, internal: 70, learning: 80 },
  { period: 'Jan', healthScore: 78, financial: 75, customer: 82, internal: 68, learning: 87 },
];

export function TrendChart({ 
  data = defaultData, 
  currentScore, 
  previousScore 
}: TrendChartProps) {
  const delta = previousScore ? currentScore - previousScore : 0;
  const deltaType: DeltaType = delta > 0 ? 'increase' : delta < 0 ? 'decrease' : 'unchanged';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <Flex justifyContent="between" alignItems="start" className="mb-4">
          <div>
            <Title className="text-white">Tendência Estratégica</Title>
            <Text className="text-gray-400">Evolução dos últimos 6 meses</Text>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">{currentScore}%</span>
              {previousScore && (
                <BadgeDelta deltaType={deltaType} size="xs">
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                </BadgeDelta>
              )}
            </div>
            <Text className="text-gray-500 text-xs">Score Atual</Text>
          </div>
        </Flex>

        <AreaChart
          className="h-48 mt-4"
          data={data}
          index="period"
          categories={['healthScore', 'financial', 'customer', 'internal', 'learning']}
          colors={['purple', 'emerald', 'blue', 'amber', 'pink']}
          valueFormatter={(value) => `${value}%`}
          showLegend={true}
          showGridLines={false}
          showAnimation={true}
          curveType="natural"
        />

        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <div className="grid grid-cols-5 gap-2 text-center">
            <div>
              <div className="w-3 h-3 bg-purple-500 rounded-full mx-auto mb-1" />
              <Text className="text-gray-400 text-xs">Geral</Text>
            </div>
            <div>
              <div className="w-3 h-3 bg-emerald-500 rounded-full mx-auto mb-1" />
              <Text className="text-gray-400 text-xs">Financ.</Text>
            </div>
            <div>
              <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1" />
              <Text className="text-gray-400 text-xs">Cliente</Text>
            </div>
            <div>
              <div className="w-3 h-3 bg-amber-500 rounded-full mx-auto mb-1" />
              <Text className="text-gray-400 text-xs">Processo</Text>
            </div>
            <div>
              <div className="w-3 h-3 bg-pink-500 rounded-full mx-auto mb-1" />
              <Text className="text-gray-400 text-xs">Aprend.</Text>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
