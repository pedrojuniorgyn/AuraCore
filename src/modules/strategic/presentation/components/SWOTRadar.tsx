'use client';

/**
 * Componente: SWOTRadar
 * Radar Chart para visualização SWOT
 * 
 * @module strategic/presentation/components
 */
import { useMemo } from 'react';

interface SWOTRadarData {
  quadrant: string;
  score: number;
  count: number;
}

interface SWOTRadarProps {
  data: SWOTRadarData[];
  title?: string;
  size?: number;
}

const quadrantLabels: Record<string, string> = {
  STRENGTH: 'Forças',
  WEAKNESS: 'Fraquezas',
  OPPORTUNITY: 'Oportunidades',
  THREAT: 'Ameaças',
};

const quadrantColors: Record<string, string> = {
  STRENGTH: '#22c55e',
  WEAKNESS: '#ef4444',
  OPPORTUNITY: '#3b82f6',
  THREAT: '#f59e0b',
};

export function SWOTRadar({ 
  data, 
  title = 'Análise SWOT',
  size = 300
}: SWOTRadarProps) {
  const radarData = useMemo(() => {
    const quadrants = ['STRENGTH', 'WEAKNESS', 'OPPORTUNITY', 'THREAT'];
    return quadrants.map((q) => {
      const item = data.find((d) => d.quadrant === q);
      return {
        quadrant: q,
        label: quadrantLabels[q],
        score: item?.score ?? 0,
        count: item?.count ?? 0,
        color: quadrantColors[q],
      };
    });
  }, [data]);

  const maxScore = 25; // 5 items * 5 max score
  const center = size / 2;
  const radius = (size - 80) / 2;

  // Calculate polygon points
  const getPoint = (index: number, value: number): { x: number; y: number } => {
    const angle = (Math.PI * 2 * index) / 4 - Math.PI / 2;
    const normalizedValue = (value / maxScore) * radius;
    return {
      x: center + normalizedValue * Math.cos(angle),
      y: center + normalizedValue * Math.sin(angle),
    };
  };

  const polygonPoints = radarData
    .map((d, i) => {
      const point = getPoint(i, d.score);
      return `${point.x},${point.y}`;
    })
    .join(' ');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>

      <div className="flex justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Grid circles */}
          {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => (
            <circle
              key={scale}
              cx={center}
              cy={center}
              r={radius * scale}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}

          {/* Axis lines */}
          {radarData.map((_, i) => {
            const point = getPoint(i, maxScore);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={point.x}
                y2={point.y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            );
          })}

          {/* Data polygon */}
          <polygon
            points={polygonPoints}
            fill="rgba(59, 130, 246, 0.3)"
            stroke="#3b82f6"
            strokeWidth="2"
          />

          {/* Data points */}
          {radarData.map((d, i) => {
            const point = getPoint(i, d.score);
            return (
              <circle
                key={d.quadrant}
                cx={point.x}
                cy={point.y}
                r="6"
                fill={d.color}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}

          {/* Labels */}
          {radarData.map((d, i) => {
            const labelPoint = getPoint(i, maxScore + 5);
            const textAnchor =
              i === 0 ? 'middle' : i === 2 ? 'middle' : i === 1 ? 'start' : 'end';
            const dy = i === 0 ? -10 : i === 2 ? 20 : 5;

            return (
              <text
                key={d.quadrant}
                x={labelPoint.x}
                y={labelPoint.y + dy}
                textAnchor={textAnchor}
                className="text-xs fill-gray-600 dark:fill-gray-400"
              >
                {d.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {radarData.map((d) => (
          <div
            key={d.quadrant}
            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {d.label}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {d.score.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500 ml-1">({d.count})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
