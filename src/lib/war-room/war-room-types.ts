/**
 * Tipos para o sistema de War Room
 * @module lib/war-room/war-room-types
 */

export type WarRoomStatus = 'active' | 'monitoring' | 'resolved' | 'cancelled';
export type WarRoomSeverity = 'low' | 'medium' | 'high' | 'critical';
export type EscalationLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'DIR';

export interface WarRoom {
  id: string;
  title: string;
  description: string;
  status: WarRoomStatus;
  severity: WarRoomSeverity;
  startedAt: Date;
  resolvedAt?: Date;
  commanderId: string;
  commanderName: string;
  currentEscalation: EscalationLevel;
  escalationHistory: EscalationEvent[];
  nextEscalationAt?: Date;
  linkedKpis: LinkedKpi[];
  linkedActionPlans: string[];
  teamMembers: TeamMember[];
  actions: WarRoomAction[];
  updates: WarRoomUpdate[];
  organizationId: number;
  branchId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkedKpi {
  kpiId: string;
  kpiName: string;
  kpiCode: string;
  currentValue: number;
  targetValue: number;
  threshold: number;
  status: 'critical' | 'warning' | 'ok';
}

export interface TeamMember {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'commander' | 'member' | 'observer';
  joinedAt: Date;
  isOnline: boolean;
  lastSeenAt?: Date;
}

export interface WarRoomAction {
  id: string;
  title: string;
  description?: string;
  assigneeId: string;
  assigneeName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}

export type WarRoomUpdateType =
  | 'kpi_update'
  | 'action_created'
  | 'action_completed'
  | 'action_blocked'
  | 'member_joined'
  | 'member_left'
  | 'escalation'
  | 'comment'
  | 'status_change'
  | 'severity_change';

export interface WarRoomUpdate {
  id: string;
  type: WarRoomUpdateType;
  title: string;
  description?: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface EscalationEvent {
  fromLevel: EscalationLevel;
  toLevel: EscalationLevel;
  reason: string;
  escalatedBy: string;
  escalatedAt: Date;
}

export const SEVERITY_CONFIG: Record<
  WarRoomSeverity,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
  }
> = {
  low: {
    label: 'Baixo',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: '📘',
  },
  medium: {
    label: 'Médio',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    icon: '⚠️',
  },
  high: {
    label: 'Alto',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    icon: '🔶',
  },
  critical: {
    label: 'Crítico',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    icon: '🚨',
  },
};

export const STATUS_CONFIG: Record<
  WarRoomStatus,
  {
    label: string;
    color: string;
    bgColor: string;
  }
> = {
  active: {
    label: 'Ativa',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  monitoring: {
    label: 'Monitorando',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  resolved: {
    label: 'Resolvida',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  cancelled: {
    label: 'Cancelada',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
};

export const ESCALATION_LEVELS: Record<
  EscalationLevel,
  {
    label: string;
    description: string;
    autoEscalateHours: number;
  }
> = {
  N1: {
    label: 'Nível 1 - Analista',
    description: 'Tratamento inicial pela equipe operacional',
    autoEscalateHours: 4,
  },
  N2: {
    label: 'Nível 2 - Coordenador',
    description: 'Escalação para coordenação do setor',
    autoEscalateHours: 8,
  },
  N3: {
    label: 'Nível 3 - Gerente',
    description: 'Escalação para gerência regional',
    autoEscalateHours: 24,
  },
  N4: {
    label: 'Nível 4 - Diretor',
    description: 'Escalação para diretoria',
    autoEscalateHours: 48,
  },
  DIR: {
    label: 'Diretoria Executiva',
    description: 'Máximo nível de escalação',
    autoEscalateHours: 0,
  },
};

export const UPDATE_TYPE_LABELS: Record<
  WarRoomUpdateType,
  {
    label: string;
    icon: string;
  }
> = {
  kpi_update: { label: 'KPI Atualizado', icon: '📊' },
  action_created: { label: 'Ação Criada', icon: '📋' },
  action_completed: { label: 'Ação Concluída', icon: '✅' },
  action_blocked: { label: 'Ação Bloqueada', icon: '🚫' },
  member_joined: { label: 'Membro Entrou', icon: '👥' },
  member_left: { label: 'Membro Saiu', icon: '👤' },
  escalation: { label: 'Escalação', icon: '⬆️' },
  comment: { label: 'Comentário', icon: '💬' },
  status_change: { label: 'Status Alterado', icon: '🔄' },
  severity_change: { label: 'Severidade Alterada', icon: '⚡' },
};

export const ACTION_PRIORITY_CONFIG: Record<
  WarRoomAction['priority'],
  { label: string; color: string }
> = {
  low: { label: 'Baixa', color: 'text-blue-400' },
  medium: { label: 'Média', color: 'text-yellow-400' },
  high: { label: 'Alta', color: 'text-orange-400' },
  urgent: { label: 'Urgente', color: 'text-red-400' },
};

export const ACTION_STATUS_CONFIG: Record<
  WarRoomAction['status'],
  { label: string; color: string; icon: string }
> = {
  pending: { label: 'Pendente', color: 'text-gray-400', icon: '○' },
  in_progress: { label: 'Em Andamento', color: 'text-blue-400', icon: '⏳' },
  completed: { label: 'Concluída', color: 'text-green-400', icon: '✅' },
  blocked: { label: 'Bloqueada', color: 'text-red-400', icon: '🚫' },
};
