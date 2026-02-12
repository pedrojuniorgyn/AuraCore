'use client';

/**
 * FiscalDocumentsKanban - Kanban de Documentos Fiscais (NFe/CTe)
 * 
 * Colunas: RASCUNHO -> PENDENTE -> AUTORIZADO -> CANCELADO
 */
import { useCallback, useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { 
  FileEdit, Clock, CheckCircle2, XCircle,
  FileText, Hash, Calendar, DollarSign, Truck
} from 'lucide-react';
import { FadeIn } from '@/components/ui/animated-wrappers';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface FiscalDocCard {
  id: string;
  documentNumber: string;
  documentType: 'NFE' | 'CTE' | 'MDFE' | 'NFSE';
  partnerName: string;
  amount: number;
  issueDate: string;
  status: FiscalDocStatus;
  sefazProtocol?: string;
  accessKey?: string;
}

type FiscalDocStatus = 'DRAFT' | 'PENDING' | 'AUTHORIZED' | 'CANCELLED';

interface KanbanColumn {
  id: FiscalDocStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface FiscalDocumentsKanbanProps {
  documents: FiscalDocCard[];
  onStatusChange?: (id: string, newStatus: FiscalDocStatus) => Promise<void>;
  onCardClick?: (id: string) => void;
  filterType?: 'NFE' | 'CTE' | 'MDFE' | 'NFSE' | 'ALL';
}

// ============================================================================
// COLUMNS CONFIG
// ============================================================================

const COLUMNS: KanbanColumn[] = [
  {
    id: 'DRAFT',
    title: 'Rascunho',
    icon: <FileEdit className="h-4 w-4" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
  },
  {
    id: 'PENDING',
    title: 'Pendente SEFAZ',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  {
    id: 'AUTHORIZED',
    title: 'Autorizado',
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  {
    id: 'CANCELLED',
    title: 'Cancelado',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
];

const DOC_TYPE_ICONS: Record<string, React.ReactNode> = {
  NFE: <FileText className="h-3 w-3 text-blue-400" />,
  CTE: <Truck className="h-3 w-3 text-purple-400" />,
  MDFE: <FileText className="h-3 w-3 text-orange-400" />,
  NFSE: <FileText className="h-3 w-3 text-teal-400" />,
};

const DOC_TYPE_COLORS: Record<string, string> = {
  NFE: 'bg-blue-500/20 text-blue-300',
  CTE: 'bg-purple-500/20 text-purple-300',
  MDFE: 'bg-orange-500/20 text-orange-300',
  NFSE: 'bg-teal-500/20 text-teal-300',
};

const VALID_TRANSITIONS: Record<FiscalDocStatus, FiscalDocStatus[]> = {
  DRAFT: ['PENDING'],
  PENDING: ['AUTHORIZED', 'DRAFT'],
  AUTHORIZED: ['CANCELLED'],
  CANCELLED: [],
};

// ============================================================================
// COMPONENT
// ============================================================================

export function FiscalDocumentsKanban({
  documents,
  onStatusChange,
  onCardClick,
  filterType = 'ALL',
}: FiscalDocumentsKanbanProps) {
  const [items, setItems] = useState<FiscalDocCard[]>(documents);

  useEffect(() => {
    setItems(documents);
  }, [documents]);

  const filteredItems = filterType === 'ALL'
    ? items
    : items.filter(d => d.documentType === filterType);

  const getColumnItems = useCallback(
    (status: FiscalDocStatus) => filteredItems.filter(d => d.status === status),
    [filteredItems]
  );

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination || !onStatusChange) return;

    const sourceStatus = result.source.droppableId as FiscalDocStatus;
    const destStatus = result.destination.droppableId as FiscalDocStatus;

    if (sourceStatus === destStatus) return;
    if (!VALID_TRANSITIONS[sourceStatus]?.includes(destStatus)) return;

    const cardId = result.draggableId;

    setItems(prev =>
      prev.map(d => (d.id === cardId ? { ...d, status: destStatus } : d))
    );

    try {
      await onStatusChange(cardId, destStatus);
    } catch {
      setItems(prev =>
        prev.map(d => (d.id === cardId ? { ...d, status: sourceStatus } : d))
      );
    }
  }, [onStatusChange]);

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
                            {/* Doc Type Badge + Number */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1',
                                DOC_TYPE_COLORS[card.documentType]
                              )}>
                                {DOC_TYPE_ICONS[card.documentType]}
                                {card.documentType}
                              </span>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {card.documentNumber}
                              </span>
                            </div>

                            <p className="text-sm font-medium text-white truncate">
                              {card.partnerName}
                            </p>

                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Calendar className="h-3 w-3" />
                                {new Date(card.issueDate).toLocaleDateString('pt-BR')}
                              </div>
                              <div className="flex items-center gap-1 text-sm font-mono font-semibold text-white">
                                <DollarSign className="h-3 w-3 text-green-400" />
                                {card.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>

                            {card.sefazProtocol && (
                              <div className="mt-2 text-[10px] text-gray-500 font-mono truncate">
                                Protocolo: {card.sefazProtocol}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {getColumnItems(col.id).length === 0 && (
                      <div className="flex items-center justify-center h-20 text-xs text-gray-500">
                        Nenhum documento
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
