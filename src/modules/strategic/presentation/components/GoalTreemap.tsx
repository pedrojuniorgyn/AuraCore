'use client';

/**
 * Componente: GoalTreemap
 * Visualização hierárquica de metas com @nivo/treemap
 * 
 * @module strategic/presentation/components
 */
import { ResponsiveTreeMap } from '@nivo/treemap';

interface TreemapNode {
  name: string;
  description?: string;
  value: number;
  progress?: number;
  status?: string;
  statusColor?: string;
  level?: string;
  children?: TreemapNode[];
}

interface GoalTreemapProps {
  data: TreemapNode;
  onNodeClick?: (node: TreemapNode) => void;
  height?: number;
}

const levelColors: Record<string, string> = {
  CEO: '#fbbf24',
  DIRECTOR: '#f97316',
  MANAGER: '#8b5cf6',
  TEAM: '#06b6d4',
};

export function GoalTreemap({ data, onNodeClick, height = 500 }: GoalTreemapProps) {
  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveTreeMap
        data={data}
        identity="name"
        value="value"
        valueFormat=".0f"
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        labelSkipSize={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
        parentLabelPosition="left"
        parentLabelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        colors={(node) => {
          // Usar cor do status se disponível, senão cor do nível
          const statusColor = node.data.statusColor as string | undefined;
          const level = node.data.level as string | undefined;
          return statusColor || (level ? levelColors[level] : '#6b7280') || '#6b7280';
        }}
        borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
        onClick={(node) => onNodeClick?.(node.data as TreemapNode)}
        tooltip={({ node }) => (
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="font-semibold">{node.data.name}</div>
            {node.data.description && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-xs">
                {String(node.data.description).substring(0, 100)}
                {String(node.data.description).length > 100 ? '...' : ''}
              </div>
            )}
            <div className="text-sm mt-2 space-y-1">
              <div>
                <span className="text-gray-500">Peso:</span> {node.data.value}%
              </div>
              {node.data.progress !== undefined && (
                <div>
                  <span className="text-gray-500">Progresso:</span> {node.data.progress}%
                </div>
              )}
              {node.data.level && (
                <div>
                  <span className="text-gray-500">Nível:</span> {String(node.data.level)}
                </div>
              )}
            </div>
          </div>
        )}
      />
    </div>
  );
}
