'use client';

/**
 * Componente: SWOTMatrix
 * Matriz 2x2 tradicional de SWOT
 * 
 * @module strategic/presentation/components
 */

interface SWOTItem {
  id: string;
  title: string;
  description?: string;
  impactScore: number;
  probabilityScore?: number;
  priorityScore: number;
}

interface SWOTMatrixProps {
  strengths: SWOTItem[];
  weaknesses: SWOTItem[];
  opportunities: SWOTItem[];
  threats: SWOTItem[];
  onItemClick?: (item: SWOTItem, quadrant: string) => void;
}

const quadrantConfig = {
  STRENGTH: {
    title: '💪 FORÇAS',
    subtitle: 'Interno / Positivo',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-500',
    badgeColor: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
  },
  WEAKNESS: {
    title: '⚠️ FRAQUEZAS',
    subtitle: 'Interno / Negativo',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-500',
    badgeColor: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
  },
  OPPORTUNITY: {
    title: '🌟 OPORTUNIDADES',
    subtitle: 'Externo / Positivo',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-500',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
  },
  THREAT: {
    title: '🚨 AMEAÇAS',
    subtitle: 'Externo / Negativo',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-500',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-100',
  },
};

export function SWOTMatrix({
  strengths,
  weaknesses,
  opportunities,
  threats,
  onItemClick,
}: SWOTMatrixProps) {
  const renderQuadrant = (
    items: SWOTItem[],
    quadrant: keyof typeof quadrantConfig
  ) => {
    const config = quadrantConfig[quadrant];

    return (
      <div
        className={`${config.bgColor} border-2 ${config.borderColor} rounded-lg p-4 min-h-[250px]`}
      >
        <div className="mb-3">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            {config.title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {config.subtitle}
          </p>
        </div>

        <div className="space-y-2">
          {items
            .sort((a, b) => b.priorityScore - a.priorityScore)
            .map((item) => (
              <div
                key={item.id}
                onClick={() => onItemClick?.(item, quadrant)}
                className="bg-white dark:bg-gray-800 rounded p-2 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                    {item.title}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.badgeColor}`}
                  >
                    {item.priorityScore.toFixed(1)}
                  </span>
                </div>
                {item.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                    {item.description}
                  </p>
                )}
              </div>
            ))}

          {items.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              Nenhum item cadastrado
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Linha superior: Interno */}
      {renderQuadrant(strengths, 'STRENGTH')}
      {renderQuadrant(weaknesses, 'WEAKNESS')}

      {/* Linha inferior: Externo */}
      {renderQuadrant(opportunities, 'OPPORTUNITY')}
      {renderQuadrant(threats, 'THREAT')}
    </div>
  );
}
