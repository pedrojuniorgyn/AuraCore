"use client";

/**
 * PdcaKanban - Kanban de Action Plans por fase PDCA
 * Com drag-and-drop e validação de transições
 * 
 * @module components/strategic
 */
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { toast } from 'sonner';
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
      const allowed = VALID_TRANSITIONS[sourcePhase];
      toast.error(`Transição não permitida: ${sourcePhase} → ${destPhase}`, {
        description: allowed.length > 0 
          ? `De ${sourcePhase} só pode ir para: ${allowed.join(', ')}` 
          : `${sourcePhase} é a fase final`,
      });
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
      <div className="grid grid-cols-4 gap-4">
        {localColumns.map((column, index) => {
          const style = PDCA_PHASE_STYLES[column.id];
          
          return (
            <motion.div
              key={column.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col"
            >
              {/* Header da coluna */}
              <div
                className={`px-4 py-3 rounded-t-xl font-semibold text-white flex items-center justify-between ${style.headerBg}`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">{style.icon}</span>
                  <span>{column.title}</span>
                </span>
                <span className="text-2xl font-bold text-white/40">
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
                      flex-1 min-h-[400px] p-3 rounded-b-xl border-2 border-t-0 transition-all
                      ${snapshot.isDraggingOver 
                        ? `${style.dropzoneActive} ring-2 ring-purple-500/50` 
                        : `${style.dropzoneBg} border-white/10`
                      }
                    `}
                  >
                    <div className="space-y-3">
                      {column.items.map((card, cardIndex) => (
                        <Draggable
                          key={card.id}
                          draggableId={card.id}
                          index={cardIndex}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`${movingCard === card.id ? 'opacity-50' : ''}`}
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
                    </div>
                    {provided.placeholder}

                    {/* Empty state */}
                    {column.items.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex flex-col items-center justify-center h-32 text-white/30">
                        <span className="text-3xl mb-2">{style.icon}</span>
                        <span className="text-sm">Nenhum plano</span>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>

              {/* Indicador de transições válidas */}
              <div className="mt-2 text-xs text-white/40 text-center">
                {VALID_TRANSITIONS[column.id].length > 0 ? (
                  <span>→ {VALID_TRANSITIONS[column.id].join(', ')}</span>
                ) : (
                  <span className="text-emerald-400">✓ Fase final</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

export type { PdcaKanbanProps, KanbanColumn, KanbanCard, PdcaPhase };
