/**
 * AG Grid v34.3 - Sparkline Cell Renderers
 * 
 * Mini-gráficos dentro das células
 */

import React from "react";
import { ICellRendererParams } from "ag-grid-community";

/**
 * 📈 Sparkline Configuration Types
 */
export interface SparklineData {
  values: number[];
  labels?: string[];
}

/**
 * 📊 Line Sparkline Renderer
 * 
 * Mini-gráfico de linha dentro da célula
 */
export const LineSparklineCellRenderer = (params: ICellRendererParams) => {
  if (!params.value || !Array.isArray(params.value)) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const values: number[] = params.value;
  
  if (values.length === 0) {
    return <span className="text-muted-foreground text-xs">Sem dados</span>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Calcula pontos do SVG
  const width = 120;
  const height = 30;
  const padding = 2;
  const step = (width - padding * 2) / (values.length - 1 || 1);

  const points = values
    .map((value, index) => {
      const x = padding + index * step;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  // Determina cor baseado na tendência
  const first = values[0];
  const last = values[values.length - 1];
  const trend = last > first ? "up" : last < first ? "down" : "neutral";
  const color = trend === "up" ? "#10b981" : trend === "down" ? "#ef4444" : "#64748b";

  return (
    <div className="flex items-center gap-2">
      <svg width={width} height={height} className="sparkline">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`text-xs font-medium ${
        trend === "up" ? "text-emerald-400" : 
        trend === "down" ? "text-red-400" : 
        "text-muted-foreground"
      }`}>
        {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {last.toFixed(2)}
      </span>
    </div>
  );
};

/**
 * 📊 Bar Sparkline Renderer
 * 
 * Mini-gráfico de barras dentro da célula
 */
export const BarSparklineCellRenderer = (params: ICellRendererParams) => {
  if (!params.value || !Array.isArray(params.value)) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const values: number[] = params.value;
  
  if (values.length === 0) {
    return <span className="text-muted-foreground text-xs">Sem dados</span>;
  }

  const max = Math.max(...values);
  const width = 100;
  const height = 24;
  const barWidth = width / values.length - 1;

  return (
    <svg width={width} height={height} className="sparkline-bars">
      {values.map((value, index) => {
        const barHeight = (value / max) * height;
        const x = index * (barWidth + 1);
        const y = height - barHeight;

        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            fill="#4F46E5"
            opacity={0.8}
          />
        );
      })}
    </svg>
  );
};

/**
 * 🎯 Win/Loss Sparkline Renderer
 * 
 * Mini-gráfico de ganhos/perdas (verde/vermelho)
 */
export const WinLossSparklineCellRenderer = (params: ICellRendererParams) => {
  if (!params.value || !Array.isArray(params.value)) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const values: number[] = params.value;
  
  if (values.length === 0) {
    return <span className="text-muted-foreground text-xs">Sem dados</span>;
  }

  const width = 80;
  const height = 20;
  const barWidth = width / values.length - 1;

  return (
    <svg width={width} height={height} className="sparkline-winloss">
      {values.map((value, index) => {
        const isPositive = value > 0;
        const barHeight = Math.abs(value) > 0 ? height / 2 : 2;
        const x = index * (barWidth + 1);
        const y = isPositive ? 0 : height / 2;

        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            fill={isPositive ? "#10b981" : "#ef4444"}
          />
        );
      })}
    </svg>
  );
};

/**
 * 📈 Trend Indicator Renderer
 * 
 * Indicador de tendência com porcentagem
 */
export const TrendIndicatorCellRenderer = (params: ICellRendererParams) => {
  if (!params.value || !Array.isArray(params.value) || params.value.length < 2) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const values: number[] = params.value;
  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;
  const percentChange = (change / first) * 100;

  const isPositive = change > 0;

  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-medium ${
        isPositive ? "text-emerald-400" : "text-red-400"
      }`}>
        {isPositive ? "↑" : "↓"} {Math.abs(percentChange).toFixed(1)}%
      </span>
      <LineSparklineCellRenderer {...params} />
    </div>
  );
};

/**
 * 📊 Column Definitions com Sparklines
 * 
 * Exemplo de uso:
 */
export const sparklineColumnDefs = [
  {
    field: "monthlyRevenue",
    headerName: "Receita (Tendência)",
    width: 200,
    cellRenderer: LineSparklineCellRenderer,
  },
  {
    field: "weeklySales",
    headerName: "Vendas (Barras)",
    width: 150,
    cellRenderer: BarSparklineCellRenderer,
  },
  {
    field: "dailyProfitLoss",
    headerName: "Lucro/Prejuízo",
    width: 150,
    cellRenderer: WinLossSparklineCellRenderer,
  },
  {
    field: "quarterlyGrowth",
    headerName: "Crescimento",
    width: 250,
    cellRenderer: TrendIndicatorCellRenderer,
  },
];

/**
 * 📊 Sample Data Generator
 */
export const generateSparklineData = () => {
  const randomData = (count: number, min: number, max: number) => {
    return Array.from({ length: count }, () => 
      Math.random() * (max - min) + min
    );
  };

  return [
    {
      id: 1,
      name: "Produto A",
      monthlyRevenue: randomData(12, 1000, 5000),
      weeklySales: randomData(7, 10, 100),
      dailyProfitLoss: randomData(30, -500, 1000).map(v => v > 250 ? 1 : -1),
      quarterlyGrowth: randomData(4, 10000, 50000),
    },
    {
      id: 2,
      name: "Produto B",
      monthlyRevenue: randomData(12, 2000, 8000),
      weeklySales: randomData(7, 20, 150),
      dailyProfitLoss: randomData(30, -300, 800).map(v => v > 200 ? 1 : -1),
      quarterlyGrowth: randomData(4, 15000, 60000),
    },
    {
      id: 3,
      name: "Produto C",
      monthlyRevenue: randomData(12, 500, 3000),
      weeklySales: randomData(7, 5, 50),
      dailyProfitLoss: randomData(30, -200, 500).map(v => v > 100 ? 1 : -1),
      quarterlyGrowth: randomData(4, 5000, 30000),
    },
  ];
};




























