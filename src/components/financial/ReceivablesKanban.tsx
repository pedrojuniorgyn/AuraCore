'use client';

/**
 * ReceivablesKanban - Kanban de Contas a Receber
 * 
 * Colunas: EM ABERTO -> VENCIDO -> PARCIAL -> RECEBIDO -> CANCELADO
 */
import { useCallback, useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { 
  Clock, AlertTriangle, PieChart, CheckCircle2, XCircle,
  DollarSign, Calendar, Building2 
} from 'lucide-react';
import { FadeIn } from '@/components/ui/animated-wrappers';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ReceivableCard {
  id: string;
  description: string;
  partnerName: string;
  amount: number;
  amountReceived: number;
  currency: string;
  dueDate: string;
  status: ReceivableStatus;
  categoryName?: string;
  documentNumber?: string;
}

type ReceivableStatus = 'OPEN' | 'OVERDUE' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

interface KanbanColumn {
  id: ReceivableStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface ReceivablesKanbanProps {
  receivables: ReceivableCard[];
  onStatusChange?: (id: string, newStatus: ReceivableStatus) => Promise<void>;
  onCardClick?: (id: string) => void;
  isLoading?: boolean;
}

// ============================================================================
// COLUMNS CONFIG
// ============================================================================

const COLUMNS: KanbanColumn[] = [
  {
    id: 'OPEN',
    title: 'Em Aberto',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'OVERDUE',
    title: 'Vencido',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  {
    id: 'PARTIAL',
    title: 'Parcial',
    icon: <PieChart className="h-4 w-4" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  {
    id: 'RECEIVED',
    title: 'Recebido',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  {
    id: 'CANCELLED',
    title: 'Cancelado',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
  },
];

const VALID_TRANSITIONS: Record<ReceivableStatus, ReceivableStatus[]> = {
  OPEN: ['PARTIAL', 'RECEIVED', 'CANCELLED'],
  OVERDUE: ['PARTIAL', 'RECEIVED', 'CANCELLED'],
  PARTIAL: ['RECEIVED'],
  RECEIVED: [],
  CANCELLED: [],
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ReceivablesKanban({ receivables, onStatusChange, onCardClick, isLoading }: ReceivablesKanbanProps) {
  const [items, setItems] = useState<ReceivableCard[]>(receivables);

  useEffect(() => {
    setItems(receivables);
  }, [receivables]);

  const getColumnItems = useCallback(
    (status: ReceivableStatus) => items.filter(r => r.status === status),
    [items]
  );

  const getColumnTotal = useCallback(
    (status: ReceivableStatus) =>
      items.filter(r => r.status === status).reduce((sum, r) => sum + r.amount, 0),
    [items]
  );

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination || !onStatusChange) return;

    const sourceStatus = result.source.droppableId as ReceivableStatus;
    const destStatus = result.destination.droppableId as ReceivableStatus;

    if (sourceStatus === destStatus) return;
    if (!VALID_TRANSITIONS[sourceStatus]?.includes(destStatus)) return;

    const cardId = result.draggableId;

    setItems(prev =>
      prev.map(r => (r.id === cardId ? { ...r, status: destStatus } : r))
    );

    try {
      await onStatusChange(cardId, destStatus);
    } catch {
      setItems(prev =>
        prev.map(r => (r.id === cardId ? { ...r, status: sourceStatus } : r))
      );
    }
  }, [onStatusChange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col, idx) => (
          <FadeIn key={col.id} delay={idx * 0.1}>
            <div className={cn(
              'flex-shrink-0 w-72 rounded-xl border p-3',
              col.bgColor, col.borderColor
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className={cn('flex items-center gap-2 font-semibold text-sm', col.color)}>
                  {col.icon}
                  {col.title}
                </div>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  col.bgColor, col.color
                )}>
                  {getColumnItems(col.id).length}
                </span>
              </div>

              <div className="text-xs text-gray-400 mb-3 font-mono">
                R$ {getColumnTotal(col.id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'min-h-[200px] space-y-2 transition-colors rounded-lg p-1',
                      snapshot.isDraggingOver && 'bg-white/5'
                    )}
                  >
                    {getColumnItems(col.id).map((card, index) => (
                      <Draggable
                        key={card.id}
                        draggableId={card.id}
                        index={index}
                        isDragDisabled={VALID_TRANSITIONS[card.status]?.length === 0}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            onClick={() => onCardClick?.(card.id)}
                            className={cn(
                              'bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-white/10',
                              'cursor-pointer hover:border-white/20 transition-all',
                              dragSnapshot.isDragging && 'shadow-lg shadow-purple-500/20 rotate-2'
                            )}
                          >
                            <p className="text-sm font-medium text-white truncate">
                              {card.description}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate">{card.partnerName}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Calendar className="h-3 w-3" />
                                {new Date(card.dueDate).toLocaleDateString('pt-BR')}
                              </div>
                              <div className="flex items-center gap-1 text-sm font-mono font-semibold text-white">
                                <DollarSign className="h-3 w-3 text-green-400" />
                                {card.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                            {card.status === 'PARTIAL' && card.amountReceived > 0 && (
                              <div className="mt-2">
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                  <span>Recebido</span>
                                  <span>{((card.amountReceived / card.amount) * 100).toFixed(0)}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 rounded-full transition-all"
                                    style={{ width: `${Math.min((card.amountReceived / card.amount) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {getColumnItems(col.id).length === 0 && (
                      <div className="flex items-center justify-center h-20 text-xs text-gray-500">
                        Nenhum item
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          </FadeIn>
        ))}
      </div>
    </DragDropContext>
  );
}
