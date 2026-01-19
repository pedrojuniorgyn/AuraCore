'use client';

/**
 * Componente: PDCAKanban
 * Kanban de planos de ação com drag & drop por ciclo PDCA
 * 
 * @module strategic/presentation/components
 */
import { useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';

interface KanbanCard {
  id: string;
  code: string;
  what: string;
  who: string;
  whenEnd: string;
  completionPercent: number;
  priority: string;
  isOverdue: boolean;
  daysUntilDue: number;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  items: KanbanCard[];
}

interface PDCAKanbanProps {
  columns: KanbanColumn[];
  onCardMove?: (cardId: string, fromCycle: string, toCycle: string) => void;
  onCardClick?: (cardId: string) => void;
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export function PDCAKanban({ columns, onCardMove, onCardClick }: PDCAKanbanProps) {
  const [localColumns, setLocalColumns] = useState(columns);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Validar transições PDCA válidas
    const validTransitions: Record<string, string[]> = {
      PLAN: ['DO'],
      DO: ['CHECK'],
      CHECK: ['ACT', 'PLAN'], // ACT ou volta para PLAN (reproposição)
      ACT: ['PLAN'], // Novo ciclo
    };

    if (!validTransitions[source.droppableId]?.includes(destination.droppableId)) {
      alert(`Transição inválida: ${source.droppableId} → ${destination.droppableId}`);
      return;
    }

    // Atualizar estado local
    const newColumns = [...localColumns];
    const sourceColumn = newColumns.find(c => c.id === source.droppableId);
    const destColumn = newColumns.find(c => c.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    const [movedCard] = sourceColumn.items.splice(source.index, 1);
    destColumn.items.splice(destination.index, 0, movedCard);

    setLocalColumns(newColumns);

    // Callback para persistir
    onCardMove?.(draggableId, source.droppableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {localColumns.map((column) => (
          <div
            key={column.id}
            className="flex-shrink-0 w-80"
          >
            {/* Header da coluna */}
            <div
              className="px-4 py-2 rounded-t-lg font-semibold text-white flex items-center justify-between"
              style={{ backgroundColor: column.color }}
            >
              <span>{column.title}</span>
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
                  className={`min-h-[400px] p-2 rounded-b-lg border-2 border-t-0 transition-colors ${
                    snapshot.isDraggingOver
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
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
                          onClick={() => onCardClick?.(card.id)}
                          className={`mb-2 p-3 bg-white rounded-lg shadow-sm border cursor-pointer transition-shadow hover:shadow-md ${
                            snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                          } ${card.isOverdue ? 'border-l-4 border-l-red-500' : 'border-gray-200'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-sm text-gray-700">
                              {card.code}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[card.priority] ?? 'bg-gray-100'}`}>
                              {card.priority}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {card.what}
                          </p>

                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>👤 {card.who}</span>
                            <span className={card.isOverdue ? 'text-red-500 font-semibold' : ''}>
                              {card.isOverdue
                                ? `⚠️ ${Math.abs(card.daysUntilDue)}d atrasado`
                                : `📅 ${card.daysUntilDue}d`}
                            </span>
                          </div>

                          {/* Barra de progresso */}
                          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${card.completionPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
