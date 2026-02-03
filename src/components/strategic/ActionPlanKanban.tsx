"use client";

/**
 * ActionPlanKanban - Kanban de Action Plans por Status
 * Com drag-and-drop para mudança de status
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
import { ActionPlanCard, type ActionPlanStatus } from './ActionPlanCard';

type PdcaPhase = 'PLAN' | 'DO' | 'CHECK' | 'ACT';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface ActionPlanItem {
  id: string;
  code: string;
  what: string;
  who: string;
  whereLocation: string;
  whenStart: string;
  whenEnd: string;
  how: string;
  howMuchAmount?: number | null;
  howMuchCurrency?: string | null;
  pdcaCycle: PdcaPhase;
  completionPercent: number;
  priority: Priority;
  status: ActionPlanStatus;
  isOverdue: boolean;
  daysUntilDue?: number;
  followUpCount?: number;
}

interface StatusColumn {
  id: ActionPlanStatus;
  title: string;
  items: ActionPlanItem[];
}

interface ActionPlanKanbanProps {
  columns: StatusColumn[];
  onStatusChange?: (planId: string, newStatus: ActionPlanStatus) => Promise<void>;
  onCardClick?: (planId: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

// Safelist pattern - estilos por status
const STATUS_COLUMN_STYLES = {
  PENDING: {
    headerBg: 'bg-gray-600',
    dropzoneBg: 'bg-gray-900/30',
    dropzoneActive: 'bg-gray-800/50 border-gray-500',
    icon: '⏳',
    label: 'Pendente',
  },
  IN_PROGRESS: {
    headerBg: 'bg-blue-600',
    dropzoneBg: 'bg-blue-900/20',
    dropzoneActive: 'bg-blue-800/40 border-blue-500',
    icon: '🔄',
    label: 'Em Andamento',
  },
  COMPLETED: {
    headerBg: 'bg-emerald-600',
    dropzoneBg: 'bg-emerald-900/20',
    dropzoneActive: 'bg-emerald-800/40 border-emerald-500',
    icon: '✅',
    label: 'Concluído',
  },
  BLOCKED: {
    headerBg: 'bg-red-600',
    dropzoneBg: 'bg-red-900/20',
    dropzoneActive: 'bg-red-800/40 border-red-500',
    icon: '🚫',
    label: 'Bloqueado',
  },
  CANCELLED: {
    headerBg: 'bg-gray-700',
    dropzoneBg: 'bg-gray-900/30',
    dropzoneActive: 'bg-gray-800/40 border-gray-600',
    icon: '❌',
    label: 'Cancelado',
  },
} as const;

// Transições válidas de status
const VALID_STATUS_TRANSITIONS: Record<ActionPlanStatus, ActionPlanStatus[]> = {
  PENDING: ['IN_PROGRESS', 'BLOCKED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'BLOCKED', 'PENDING'],
  COMPLETED: [], // Final - não pode mudar
  BLOCKED: ['PENDING', 'IN_PROGRESS', 'CANCELLED'],
  CANCELLED: [], // Final - não pode mudar
};

export function ActionPlanKanban({
  columns,
  onStatusChange,
  onCardClick,
  onRefresh,
}: ActionPlanKanbanProps) {
  const [localColumns, setLocalColumns] = useState(columns);
  const [movingCard, setMovingCard] = useState<string | null>(null);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId as ActionPlanStatus;
    const destStatus = destination.droppableId as ActionPlanStatus;

    // Validar transição
    if (!VALID_STATUS_TRANSITIONS[sourceStatus]?.includes(destStatus)) {
      console.warn(`Transição de status inválida: ${sourceStatus} → ${destStatus}`);
      return;
    }

    // Atualizar estado local otimisticamente
    const newColumns = localColumns.map(col => ({
      ...col,
      items: [...col.items],
    }));

    const sourceColumn = newColumns.find(c => c.id === sourceStatus);
    const destColumn = newColumns.find(c => c.id === destStatus);

    if (!sourceColumn || !destColumn) return;

    const [movedCard] = sourceColumn.items.splice(source.index, 1);
    movedCard.status = destStatus;
    destColumn.items.splice(destination.index, 0, movedCard);

    setLocalColumns(newColumns);
    setMovingCard(draggableId);

    try {
      await onStatusChange?.(draggableId, destStatus);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setLocalColumns(columns);
    } finally {
      setMovingCard(null);
    }
  }, [localColumns, columns, onStatusChange]);

  // Sincronizar com props
  if (JSON.stringify(columns) !== JSON.stringify(localColumns) && !movingCard) {
    setLocalColumns(columns);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {localColumns.map((column) => {
          const style = STATUS_COLUMN_STYLES[column.id] || STATUS_COLUMN_STYLES.PENDING;
          
          return (
            <div key={column.id} className="flex-shrink-0 w-96">
              {/* Header */}
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

              {/* Droppable Area */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`
                      min-h-[450px] p-2 rounded-b-lg border-2 border-t-0 transition-colors
                      ${snapshot.isDraggingOver 
                        ? style.dropzoneActive 
                        : `${style.dropzoneBg} border-gray-700`
                      }
                    `}
                  >
                    {column.items.map((item, index) => (
                      <Draggable
                        key={item.id}
                        draggableId={item.id}
                        index={index}
                        isDragDisabled={
                          item.status === 'COMPLETED' || item.status === 'CANCELLED'
                        }
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 ${movingCard === item.id ? 'opacity-50' : ''}`}
                          >
                            <ActionPlanCard
                              {...item}
                              onClick={() => onCardClick?.(item.id)}
                              isDragging={snapshot.isDragging}
                              onRefresh={onRefresh}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {column.items.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                        Nenhum plano neste status
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

export type { ActionPlanKanbanProps, StatusColumn, ActionPlanItem };
