"use client";

/**
 * ActivityFeed - Feed de atividades recentes
 * 
 * @module components/strategic
 */
import { motion } from 'framer-motion';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MessageCircle, CheckCircle, FileText, TrendingUp, 
  UserPlus, Edit2, type LucideIcon
} from 'lucide-react';

export type ActivityType = 
  | 'comment' 
  | 'task_completed' 
  | 'plan_created' 
  | 'kpi_updated' 
  | 'status_changed'
  | 'user_assigned'
  | 'edited';

export interface Activity {
  id: string;
  type: ActivityType;
  actor: {
    id: string;
    name: string;
    avatar?: string;
  };
  target: {
    type: string;
    id: string;
    title: string;
  };
  description?: string;
  createdAt: Date | string;
}

interface Props {
  activities: Activity[];
  isLoading?: boolean;
}

const activityConfig: Record<ActivityType, { icon: LucideIcon; colorClass: string }> = {
  comment: { icon: MessageCircle, colorClass: 'bg-blue-500/20 text-blue-400' },
  task_completed: { icon: CheckCircle, colorClass: 'bg-green-500/20 text-green-400' },
  plan_created: { icon: FileText, colorClass: 'bg-purple-500/20 text-purple-400' },
  kpi_updated: { icon: TrendingUp, colorClass: 'bg-orange-500/20 text-orange-400' },
  status_changed: { icon: Edit2, colorClass: 'bg-yellow-500/20 text-yellow-400' },
  user_assigned: { icon: UserPlus, colorClass: 'bg-pink-500/20 text-pink-400' },
  edited: { icon: Edit2, colorClass: 'bg-gray-500/20 text-gray-400' },
};

const getActivityText = (activity: Activity): string => {
  switch (activity.type) {
    case 'comment':
      return `comentou em ${activity.target.title}`;
    case 'task_completed':
      return `completou tarefa em ${activity.target.title}`;
    case 'plan_created':
      return `criou novo plano ${activity.target.title}`;
    case 'kpi_updated':
      return `atualizou KPI ${activity.target.title}`;
    case 'status_changed':
      return `alterou status de ${activity.target.title}`;
    case 'user_assigned':
      return `foi atribuído a ${activity.target.title}`;
    case 'edited':
      return `editou ${activity.target.title}`;
    default:
      return `interagiu com ${activity.target.title}`;
  }
};

export function ActivityFeed({ activities, isLoading }: Props) {
  // Group by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.createdAt);
    let key: string;

    if (isToday(date)) {
      key = 'Hoje';
    } else if (isYesterday(date)) {
      key = 'Ontem';
    } else {
      key = format(date, "d 'de' MMMM", { locale: ptBR });
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(activity);
    return groups;
  }, {} as Record<string, Activity[]>);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedActivities).map(([date, items]) => (
        <div key={date}>
          <h4 className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">
            {date}
          </h4>
          <div className="space-y-2">
            {items.map((activity, i) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;
              const timeAgo = formatDistanceToNow(new Date(activity.createdAt), { 
                addSuffix: true, 
                locale: ptBR 
              });

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${config.colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">
                        <span className="font-medium">{activity.actor.name}</span>
                        {' '}
                        <span className="text-white/60">{getActivityText(activity)}</span>
                      </p>
                      {activity.description && (
                        <p className="text-white/40 text-xs mt-1 truncate">
                          &quot;{activity.description}&quot;
                        </p>
                      )}
                    </div>
                    <span className="text-white/30 text-xs whitespace-nowrap">
                      {timeAgo}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}

      {activities.length === 0 && (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">Nenhuma atividade recente</p>
        </div>
      )}
    </div>
  );
}
