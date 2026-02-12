'use client';

/**
 * PayablesKanban - Kanban de Contas a Pagar
 * 
 * Colunas: EM ABERTO -> VENCIDO -> EM PROCESSAMENTO -> PAGO -> CANCELADO
 * Padrão: PdcaKanban.tsx (Strategic module)
 */
import { useCallback, useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { 
  Clock, AlertTriangle, Loader2, CheckCircle2, XCircle,
  DollarSign, Calendar, Building2 
} from 'lucide-react';
import { GlassmorphismCard } from '@/components/ui/glassmorphism-card';
import { FadeIn, StaggerContainer } from '@/components/ui/animated-wrappers';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface PayableCard {
  id: string;
  description: string;
  partnerName: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: PayableStatus;
  categoryName?: string;
  documentNumber?: string;
}

type PayableStatus = 'OPEN' | 'OVERDUE' | 'PROCESSING' | 'PAID' | 'CANCELLED';

interface KanbanColumn {
  id: PayableStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface PayablesKanbanProps {
  payables: PayableCard[];
  onStatusChange?: (id: string, newStatus: PayableStatus) => Promise<void>;
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
    id: 'PROCESSING',
    title: 'Processando',
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  {
    id: 'PAID',
    title: 'Pago',
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

const VALID_TRANSITIONS: Record<PayableStatus, PayableStatus[]> = {
  OPEN: ['PROCESSING', 'CANCELLED'],
  OVERDUE: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PAID', 'OPEN'],
  PAID: [],
  CANCELLED: [],
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PayablesKanban({ payables, onStatusChange, onCardClick, isLoading }: PayablesKanbanProps) {
  const [items, setItems] = useState<PayableCard[]>(payables);

  useEffect(() => {
    setItems(payables);
  }, [payables]);

  const getColumnItems = useCallback(
    (status: PayableStatus) => items.filter(p => p.status === status),
    [items]
  );

  const getColumnTotal = useCallback(
    (status: PayableStatus) => 
      items.filter(p => p.status === status).reduce((sum, p) => sum + p.amount, 0),
    [items]
  );

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination || !onStatusChange) return;

    const sourceStatus = result.source.droppableId as PayableStatus;
    const destStatus = result.destination.droppableId as PayableStatus;

    if (sourceStatus === destStatus) return;

    // Validar transição
    if (!VALID_TRANSITIONS[sourceStatus]?.includes(destStatus)) return;

    const cardId = result.draggableId;

    // Optimistic update
    setItems(prev =>
      prev.map(p => (p.id === cardId ? { ...p, status: destStatus } : p))
    );

    try {
      await onStatusChange(cardId, destStatus);
    } catch {
      // Rollback
      setItems(prev =>
        prev.map(p => (p.id === cardId ? { ...p, status: sourceStatus } : p))
      );
    }
  }, [onStatusChange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
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
              {/* Column Header */}
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

              {/* Column Total */}
              <div className="text-xs text-gray-400 mb-3 font-mono">
                R$ {getColumnTotal(col.id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>

              {/* Droppable Area */}
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
                            {/* Card Content */}
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
                            {card.categoryName && (
                              <div className="mt-2">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                                  {card.categoryName}
                                </span>
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
