/**
 * Tipos para o sistema de auditoria do módulo Strategic
 * @module lib/audit/audit-types
 */

export type AuditEntityType =
  | 'kpi'
  | 'action_plan'
  | 'pdca_cycle'
  | 'goal'
  | 'template'
  | 'integration'
  | 'webhook'
  | 'role'
  | 'permission'
  | 'report'
  | 'comment'
  | 'dashboard_config';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'view'
  | 'export'
  | 'import'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'unassign'
  | 'login'
  | 'logout'
  | 'permission_change';

export interface AuditLog {
  id: string;
  organizationId: number;
  branchId: number;

  // Who
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;

  // What
  entityType: AuditEntityType;
  entityId: string;
  entityName: string;
  action: AuditAction;

  // Changes
  changes?: AuditChange[];
  previousSnapshot?: Record<string, unknown>;
  currentSnapshot?: Record<string, unknown>;

  // Context
  reason?: string;
  metadata?: Record<string, unknown>;

  // Where
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;

  // When
  createdAt: Date;
}

export interface AuditChange {
  field: string;
  fieldLabel?: string;
  previousValue: unknown;
  newValue: unknown;
  changeType: 'added' | 'removed' | 'modified';
}

export interface AuditFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditAction;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface EntityVersion {
  version: number;
  snapshot: Record<string, unknown>;
  changes: AuditChange[];
  userId: string;
  userName: string;
  reason?: string;
  createdAt: Date;
}

export interface EntityHistory {
  entityType: AuditEntityType;
  entityId: string;
  entityName: string;
  currentVersion: number;
  versions: EntityVersion[];
  total: number;
}

export interface VersionComparison {
  entityType: AuditEntityType;
  entityId: string;
  fromVersion: number;
  toVersion: number;
  changes: AuditChange[];
  fromSnapshot: Record<string, unknown>;
  toSnapshot: Record<string, unknown>;
}

// Labels
export const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  kpi: 'KPI',
  action_plan: 'Plano de Ação',
  pdca_cycle: 'Ciclo PDCA',
  goal: 'Meta',
  template: 'Template',
  integration: 'Integração',
  webhook: 'Webhook',
  role: 'Papel',
  permission: 'Permissão',
  report: 'Relatório',
  comment: 'Comentário',
  dashboard_config: 'Dashboard',
};

export const ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Criou',
  update: 'Atualizou',
  delete: 'Excluiu',
  restore: 'Restaurou',
  view: 'Visualizou',
  export: 'Exportou',
  import: 'Importou',
  approve: 'Aprovou',
  reject: 'Rejeitou',
  assign: 'Atribuiu',
  unassign: 'Removeu atribuição',
  login: 'Fez login',
  logout: 'Fez logout',
  permission_change: 'Alterou permissão',
};

export const ACTION_ICONS: Record<AuditAction, string> = {
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  restore: '♻️',
  view: '👁️',
  export: '📤',
  import: '📥',
  approve: '✅',
  reject: '❌',
  assign: '👤',
  unassign: '👤',
  login: '🔑',
  logout: '🚪',
  permission_change: '🔐',
};

export const ACTION_COLORS: Record<AuditAction, string> = {
  create: 'text-green-400 bg-green-500/10',
  update: 'text-blue-400 bg-blue-500/10',
  delete: 'text-red-400 bg-red-500/10',
  restore: 'text-purple-400 bg-purple-500/10',
  view: 'text-white/60 bg-white/5',
  export: 'text-orange-400 bg-orange-500/10',
  import: 'text-cyan-400 bg-cyan-500/10',
  approve: 'text-green-400 bg-green-500/10',
  reject: 'text-red-400 bg-red-500/10',
  assign: 'text-indigo-400 bg-indigo-500/10',
  unassign: 'text-gray-400 bg-gray-500/10',
  login: 'text-emerald-400 bg-emerald-500/10',
  logout: 'text-amber-400 bg-amber-500/10',
  permission_change: 'text-yellow-400 bg-yellow-500/10',
};
