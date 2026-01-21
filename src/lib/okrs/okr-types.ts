/**
 * Tipos para o sistema de OKRs
 * @module lib/okrs/okr-types
 */

export type OKRLevel = 'corporate' | 'department' | 'team' | 'individual';
export type OKRStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type KeyResultStatus = 'not_started' | 'on_track' | 'at_risk' | 'behind' | 'completed';

export interface OKR {
  id: string;
  title: string;
  description?: string;

  // Hierarchy
  level: OKRLevel;
  parentId?: string;
  children?: OKR[];

  // Period
  periodType: 'quarter' | 'semester' | 'year' | 'custom';
  periodLabel: string;
  startDate: Date;
  endDate: Date;

  // Owner
  ownerId: string;
  ownerName: string;
  ownerType: 'user' | 'team' | 'department';

  // Key Results
  keyResults: KeyResult[];

  // Progress
  progress: number;
  status: OKRStatus;

  // Metadata
  organizationId: number;
  branchId: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface KeyResult {
  id: string;
  okrId: string;

  title: string;
  description?: string;

  metricType: 'number' | 'percentage' | 'currency' | 'boolean';
  startValue: number;
  targetValue: number;
  currentValue: number;
  unit?: string;

  progress: number;
  status: KeyResultStatus;

  linkedKpiId?: string;
  linkedKpiName?: string;
  linkedActionPlanId?: string;
  linkedActionPlanName?: string;

  weight: number;
  valueHistory: KeyResultValueEntry[];

  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface KeyResultValueEntry {
  value: number;
  progress: number;
  timestamp: Date;
  updatedBy: string;
  comment?: string;
}

export interface OKRTreeNode extends OKR {
  children: OKRTreeNode[];
  depth: number;
  isExpanded: boolean;
}

export interface OKRFilters {
  level?: OKRLevel | OKRLevel[];
  status?: OKRStatus | OKRStatus[];
  ownerId?: string;
  periodType?: string;
  search?: string;
  parentId?: string | null;
}

export const PERIOD_PRESETS = [
  { value: 'Q1-2026', label: 'Q1 2026', start: '2026-01-01', end: '2026-03-31' },
  { value: 'Q2-2026', label: 'Q2 2026', start: '2026-04-01', end: '2026-06-30' },
  { value: 'Q3-2026', label: 'Q3 2026', start: '2026-07-01', end: '2026-09-30' },
  { value: 'Q4-2026', label: 'Q4 2026', start: '2026-10-01', end: '2026-12-31' },
  { value: 'H1-2026', label: 'H1 2026', start: '2026-01-01', end: '2026-06-30' },
  { value: 'H2-2026', label: 'H2 2026', start: '2026-07-01', end: '2026-12-31' },
  { value: '2026', label: 'Ano 2026', start: '2026-01-01', end: '2026-12-31' },
];

export const LEVEL_LABELS: Record<OKRLevel, string> = {
  corporate: 'Corporativo',
  department: 'Departamental',
  team: 'Equipe',
  individual: 'Individual',
};

export const STATUS_LABELS: Record<OKRStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const KR_STATUS_LABELS: Record<KeyResultStatus, string> = {
  not_started: 'Não Iniciado',
  on_track: 'No Caminho',
  at_risk: 'Em Risco',
  behind: 'Atrasado',
  completed: 'Concluído',
};

export const KR_STATUS_COLORS: Record<KeyResultStatus, string> = {
  not_started: 'bg-gray-500',
  on_track: 'bg-green-500',
  at_risk: 'bg-yellow-500',
  behind: 'bg-red-500',
  completed: 'bg-blue-500',
};
