'use client';

/**
 * Componente: CascadeTimeline
 * Timeline de desdobramento de metas
 * 
 * @module strategic/presentation/components
 */

interface TimelineEvent {
  id: string;
  date: Date | string;
  type: 'CREATE' | 'CASCADE' | 'UPDATE' | 'ACHIEVE';
  goalCode: string;
  description: string;
  level: string;
  user: string;
}

interface CascadeTimelineProps {
  events: TimelineEvent[];
}

const eventColors: Record<string, string> = {
  CREATE: 'bg-blue-500',
  CASCADE: 'bg-purple-500',
  UPDATE: 'bg-yellow-500',
  ACHIEVE: 'bg-green-500',
};

const eventIcons: Record<string, string> = {
  CREATE: '➕',
  CASCADE: '📊',
  UPDATE: '📝',
  ACHIEVE: '🏆',
};

const eventLabels: Record<string, string> = {
  CREATE: 'Meta Criada',
  CASCADE: 'Desdobramento',
  UPDATE: 'Atualização',
  ACHIEVE: 'Meta Atingida',
};

export function CascadeTimeline({ events }: CascadeTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhum evento registrado
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Linha vertical */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-green-500" />

      {/* Eventos */}
      <div className="space-y-6">
        {events.map((event, index) => (
          <div
            key={event.id}
            className="relative pl-12 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Dot */}
            <div
              className={`absolute left-2 w-5 h-5 rounded-full ${eventColors[event.type]} 
                flex items-center justify-center text-xs shadow-lg transform -translate-x-1/2`}
            >
              {eventIcons[event.type]}
            </div>

            {/* Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{event.goalCode}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${eventColors[event.type]} text-white`}>
                    {eventLabels[event.type]}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(event.date)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {event.description}
              </p>
              <div className="flex items-center mt-2 text-xs text-gray-500 gap-2">
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {event.level}
                </span>
                <span>por {event.user}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
