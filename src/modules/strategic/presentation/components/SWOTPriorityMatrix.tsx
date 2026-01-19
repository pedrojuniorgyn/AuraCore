'use client';

/**
 * Componente: SWOTPriorityMatrix
 * Matriz de priorização Impacto x Probabilidade
 * 
 * @module strategic/presentation/components
 */

interface PriorityItem {
  id: string;
  title: string;
  quadrant: string;
  impactScore: number;
  probabilityScore: number;
}

interface SWOTPriorityMatrixProps {
  items: PriorityItem[];
  onItemClick?: (item: PriorityItem) => void;
}

const quadrantColors: Record<string, string> = {
  STRENGTH: '#22c55e',
  WEAKNESS: '#ef4444',
  OPPORTUNITY: '#3b82f6',
  THREAT: '#f59e0b',
};

const quadrantLabels: Record<string, string> = {
  STRENGTH: 'Forças',
  WEAKNESS: 'Fraquezas',
  OPPORTUNITY: 'Oportunidades',
  THREAT: 'Ameaças',
};

export function SWOTPriorityMatrix({ items, onItemClick }: SWOTPriorityMatrixProps) {
  // Converter escala 1-5 para posição no grid (0-100%)
  const getPosition = (value: number) => ((value - 1) / 4) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Matriz de Priorização
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Impacto x Probabilidade
      </p>

      <div className="relative h-[400px] border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
        {/* Grid de fundo */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border-r border-b border-gray-200 dark:border-gray-600 flex items-center justify-center">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Monitorar
            </span>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 border-b border-gray-200 dark:border-gray-600 flex items-center justify-center">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Prioridade Alta
            </span>
          </div>
          <div className="bg-green-50 dark:bg-green-900/10 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Baixa Prioridade
            </span>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/10 flex items-center justify-center">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Prioridade Média
            </span>
          </div>
        </div>

        {/* Itens posicionados */}
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className="absolute w-8 h-8 rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-white text-xs font-bold shadow-lg hover:scale-110 transition-transform z-10"
            style={{
              left: `${getPosition(item.probabilityScore)}%`,
              bottom: `${getPosition(item.impactScore)}%`,
              backgroundColor: quadrantColors[item.quadrant] ?? '#6b7280',
            }}
            title={`${item.title}\nImpacto: ${item.impactScore} | Prob: ${item.probabilityScore}`}
          >
            {item.title.substring(0, 2).toUpperCase()}
          </div>
        ))}

        {/* Labels dos eixos */}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Probabilidade →
          </span>
        </div>
        <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 -rotate-90 origin-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Impacto →
          </span>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 mt-8 justify-center flex-wrap">
        {Object.entries(quadrantColors).map(([quadrant, color]) => (
          <div key={quadrant} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {quadrantLabels[quadrant]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
