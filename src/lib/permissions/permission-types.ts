/**
 * Tipos para o sistema RBAC do módulo Strategic
 * @module lib/permissions/permission-types
 */

// Resources (what can be protected)
export type Resource =
  | 'kpi'
  | 'action_plan'
  | 'pdca_cycle'
  | 'goal'
  | 'dashboard'
  | 'report'
  | 'template'
  | 'integration'
  | 'permission'
  | 'comment'
  | 'analytics';

// Actions (what can be done)
export type Action =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'update_value' // For KPIs - update current value
  | 'approve' // For action plans
  | 'execute' // For action plans
  | 'comment'
  | 'export'
  | 'import'
  | 'manage' // Full management (settings, config)
  | 'customize'; // Customize layout, widgets

// Permission = Resource + Action
export interface Permission {
  resource: Resource;
  action: Action;
}

// Role definition
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean; // System roles can't be edited/deleted
  isDefault: boolean; // Assigned to new users automatically
  priority: number; // Higher = more privileges (for conflict resolution)
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// User role assignment
export interface UserRole {
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date; // Optional expiration
}

// User with roles
export interface UserWithRoles {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  initials: string;
  roles: Role[];
}

// Permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  missingPermission?: Permission;
}

// Resource labels
export const RESOURCE_LABELS: Record<Resource, string> = {
  kpi: 'KPIs',
  action_plan: 'Planos de Ação',
  pdca_cycle: 'Ciclos PDCA',
  goal: 'Metas Estratégicas',
  dashboard: 'Dashboard',
  report: 'Relatórios',
  template: 'Templates',
  integration: 'Integrações',
  permission: 'Permissões',
  comment: 'Comentários',
  analytics: 'Analytics',
};

// Action labels
export const ACTION_LABELS: Record<Action, string> = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
  update_value: 'Atualizar Valor',
  approve: 'Aprovar',
  execute: 'Executar',
  comment: 'Comentar',
  export: 'Exportar',
  import: 'Importar',
  manage: 'Gerenciar',
  customize: 'Customizar',
};

// Resource-specific actions
export const RESOURCE_ACTIONS: Record<Resource, Action[]> = {
  kpi: ['view', 'create', 'edit', 'delete', 'update_value', 'comment', 'export'],
  action_plan: ['view', 'create', 'edit', 'delete', 'approve', 'execute', 'comment'],
  pdca_cycle: ['view', 'create', 'edit', 'delete', 'manage', 'comment'],
  goal: ['view', 'create', 'edit', 'delete', 'comment'],
  dashboard: ['view', 'customize', 'export'],
  report: ['view', 'create', 'edit', 'delete', 'export'],
  template: ['view', 'create', 'edit', 'delete', 'manage'],
  integration: ['view', 'manage'],
  permission: ['view', 'manage'],
  comment: ['view', 'create', 'edit', 'delete'],
  analytics: ['view', 'export'],
};

// Default system roles
export const SYSTEM_ROLES: Omit<Role, 'id' | 'userCount' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Administrador Strategic',
    description: 'Acesso total ao módulo Strategic',
    isSystem: true,
    isDefault: false,
    priority: 100,
    permissions: Object.entries(RESOURCE_ACTIONS).flatMap(([resource, actions]) =>
      actions.map((action) => ({ resource: resource as Resource, action }))
    ),
  },
  {
    name: 'Gestor de KPIs',
    description: 'Gerenciar e atualizar KPIs',
    isSystem: true,
    isDefault: false,
    priority: 70,
    permissions: [
      { resource: 'kpi', action: 'view' },
      { resource: 'kpi', action: 'create' },
      { resource: 'kpi', action: 'edit' },
      { resource: 'kpi', action: 'delete' },
      { resource: 'kpi', action: 'update_value' },
      { resource: 'kpi', action: 'comment' },
      { resource: 'kpi', action: 'export' },
      { resource: 'dashboard', action: 'view' },
      { resource: 'dashboard', action: 'customize' },
      { resource: 'report', action: 'view' },
      { resource: 'analytics', action: 'view' },
      { resource: 'comment', action: 'view' },
      { resource: 'comment', action: 'create' },
    ],
  },
  {
    name: 'Executor de Planos',
    description: 'Gerenciar e executar planos de ação',
    isSystem: true,
    isDefault: false,
    priority: 60,
    permissions: [
      { resource: 'kpi', action: 'view' },
      { resource: 'kpi', action: 'update_value' },
      { resource: 'action_plan', action: 'view' },
      { resource: 'action_plan', action: 'create' },
      { resource: 'action_plan', action: 'edit' },
      { resource: 'action_plan', action: 'execute' },
      { resource: 'action_plan', action: 'comment' },
      { resource: 'pdca_cycle', action: 'view' },
      { resource: 'pdca_cycle', action: 'create' },
      { resource: 'pdca_cycle', action: 'manage' },
      { resource: 'dashboard', action: 'view' },
      { resource: 'comment', action: 'view' },
      { resource: 'comment', action: 'create' },
    ],
  },
  {
    name: 'Visualizador',
    description: 'Apenas visualização de dados',
    isSystem: true,
    isDefault: true,
    priority: 10,
    permissions: [
      { resource: 'kpi', action: 'view' },
      { resource: 'action_plan', action: 'view' },
      { resource: 'pdca_cycle', action: 'view' },
      { resource: 'goal', action: 'view' },
      { resource: 'dashboard', action: 'view' },
      { resource: 'report', action: 'view' },
      { resource: 'analytics', action: 'view' },
      { resource: 'comment', action: 'view' },
    ],
  },
];
