"use client";

/**
 * PdcaKanban - Kanban de Action Plans por fase PDCA
 * Com drag-and-drop e validação de transições
 * 
 * @module components/strategic
 */
import { useState, useCallback } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { PdcaCard, type Priority } from './PdcaCard';

type PdcaPhase = 'PLAN' | 'DO' | 'CHECK' | 'ACT';

interface KanbanCard {
  id: string;
  code: string;
  what: string;
  who: string;
  whenEnd: string;
  completionPercent: number;
  priority: Priority;
  isOverdue: boolean;
  daysUntilDue: number;
}

interface KanbanColumn {
  id: PdcaPhase;
  title: string;
  items: KanbanCard[];
}

interface PdcaKanbanProps {
  columns: KanbanColumn[];
  onCardMove?: (cardId: string, fromPhase: PdcaPhase, toPhase: PdcaPhase) => Promise<void>;
  onCardClick?: (cardId: string) => void;
  isLoading?: boolean;
}

// Safelist pattern - cores por fase PDCA
const PDCA_PHASE_STYLES = {
  PLAN: {
    headerBg: 'bg-blue-600',
    dropzoneBg: 'bg-blue-900/20',
    dropzoneActive: 'bg-blue-800/40 border-blue-500',
    borderColor: 'border-blue-600',
    icon: '📋',
  },
  DO: {
    headerBg: 'bg-amber-600',
    dropzoneBg: 'bg-amber-900/20',
    dropzoneActive: 'bg-amber-800/40 border-amber-500',
    borderColor: 'border-amber-600',
    icon: '⚡',
  },
  CHECK: {
    headerBg: 'bg-purple-600',
    dropzoneBg: 'bg-purple-900/20',
    dropzoneActive: 'bg-purple-800/40 border-purple-500',
    borderColor: 'border-purple-600',
    icon: '🔍',
  },
  ACT: {
    headerBg: 'bg-emerald-600',
    dropzoneBg: 'bg-emerald-900/20',
    dropzoneActive: 'bg-emerald-800/40 border-emerald-500',
    borderColor: 'border-emerald-600',
    icon: '✅',
  },
} as const;

// Transições válidas do ciclo PDCA
const VALID_TRANSITIONS: Record<PdcaPhase, PdcaPhase[]> = {
  PLAN: ['DO'],
  DO: ['CHECK'],
  CHECK: ['ACT', 'DO'], // CHECK pode voltar para DO (retrabalho)
  ACT: [], // ACT é final
};

export function PdcaKanban({
  columns,
  onCardMove,
  onCardClick,
}: PdcaKanbanProps) {
  const [localColumns, setLocalColumns] = useState(columns);
  const [movingCard, setMovingCard] = useState<string | null>(null);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Sem destino = solto fora
    if (!destination) return;

    // Mesma posição = sem mudança
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourcePhase = source.droppableId as PdcaPhase;
    const destPhase = destination.droppableId as PdcaPhase;

    // Validar transição
    if (!VALID_TRANSITIONS[sourcePhase]?.includes(destPhase)) {
      // Transição inválida - mostrar feedback visual
      const transitionKey = `${sourcePhase}->${destPhase}`;
      console.warn(`Transição inválida: ${transitionKey}`);
      return;
    }

    // Atualizar estado local otimisticamente
    const newColumns = localColumns.map(col => ({
      ...col,
      items: [...col.items],
    }));

    const sourceColumn = newColumns.find(c => c.id === sourcePhase);
    const destColumn = newColumns.find(c => c.id === destPhase);

    if (!sourceColumn || !destColumn) return;

    // Mover card
    const [movedCard] = sourceColumn.items.splice(source.index, 1);
    destColumn.items.splice(destination.index, 0, movedCard);

    setLocalColumns(newColumns);
    setMovingCard(draggableId);

    // Callback para persistir
    try {
      await onCardMove?.(draggableId, sourcePhase, destPhase);
    } catch (error) {
      // Reverter em caso de erro
      console.error('Erro ao mover card:', error);
      setLocalColumns(columns);
    } finally {
      setMovingCard(null);
    }
  }, [localColumns, columns, onCardMove]);

  // Sincronizar com props quando mudam
  if (JSON.stringify(columns) !== JSON.stringify(localColumns) && !movingCard) {
    setLocalColumns(columns);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {localColumns.map((column) => {
          const style = PDCA_PHASE_STYLES[column.id];
          
          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-80"
            >
              {/* Header da coluna */}
              <div
                className={`px-4 py-3 rounded-t-lg font-semibold text-white flex items-center justify-between ${style.headerBg}`}
              >
                <span className="flex items-center gap-2">
                  <span>{style.icon}</span>
                  <span>{column.title}</span>
                </span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
                  {column.items.length}
                </span>
              </div>

              {/* Área de drop */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`
                      min-h-[400px] p-2 rounded-b-lg border-2 border-t-0 transition-colors
                      ${snapshot.isDraggingOver 
                        ? style.dropzoneActive 
                        : `${style.dropzoneBg} border-gray-700`
                      }
                    `}
                  >
                    {column.items.map((card, index) => (
                      <Draggable
                        key={card.id}
                        draggableId={card.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-2 ${movingCard === card.id ? 'opacity-50' : ''}`}
                          >
                            <PdcaCard
                              {...card}
                              onClick={() => onCardClick?.(card.id)}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* Empty state */}
                    {column.items.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                        Nenhum plano nesta fase
                      </div>
                    )}
                  </div>
                )}
              </Droppable>

              {/* Indicador de transições válidas */}
              <div className="mt-2 text-xs text-gray-500 text-center">
                {VALID_TRANSITIONS[column.id].length > 0 ? (
                  <span>
                    Pode mover para: {VALID_TRANSITIONS[column.id].join(', ')}
                  </span>
                ) : (
                  <span className="text-emerald-500">Fase final</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

export type { PdcaKanbanProps, KanbanColumn, KanbanCard, PdcaPhase };
