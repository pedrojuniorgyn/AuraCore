/**
 * Tipos para o sistema de templates
 * @module lib/templates/template-types
 */

export type TemplateType = 'kpi' | 'action_plan' | 'pdca_cycle' | 'goal';
export type TemplateVisibility = 'system' | 'organization' | 'private';
export type TemplateCategory =
  | 'bsc'
  | 'logistics'
  | 'financial'
  | 'quality'
  | 'hr'
  | 'sales'
  | 'operations'
  | 'commercial'
  | 'general'
  | 'custom';

export interface Template {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  category: TemplateCategory;
  visibility: TemplateVisibility;
  icon?: string;
  color?: string;
  items: TemplateItem[];
  variables: TemplateVariable[];
  metadata: TemplateMetadata;
  createdBy: string;
  createdByName?: string;
  organizationId?: number;
  usageCount: number;
  rating?: number;
  tags: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
  // Legacy compatibility
  isSystem?: boolean;
  isOwner?: boolean;
  structure?: ActionPlanStructure;
  suggestedTasks?: SuggestedTask[];
}

export interface TemplateItem {
  id: string;
  type: TemplateType;
  name: string;
  description?: string;
  properties: Record<string, unknown>;
  order: number;
  parentId?: string;
}

export interface TemplateVariable {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'user';
  defaultValue?: string | number | Date;
  options?: { value: string; label: string }[];
  required: boolean;
  placeholder?: string;
}

export interface TemplateMetadata {
  version: string;
  itemCount: number;
  estimatedTime?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  industries?: string[];
}

// KPI Template Item
export interface KpiTemplateItem extends TemplateItem {
  type: 'kpi';
  properties: {
    code: string;
    perspective: string;
    unit: string;
    frequency: string;
    targetValue?: number;
    thresholds?: {
      critical: number;
      warning: number;
      onTrack: number;
    };
    formula?: string;
  };
}

// Action Plan Template
export interface ActionPlanStructure {
  what: string;
  why: string;
  where?: string;
  when?: string;
  who?: string;
  how?: string[];
  howMuch?: string;
}

export interface SuggestedTask {
  id: string;
  title: string;
  estimatedHours?: number;
  order?: number;
}

// Create from template request
export interface UseTemplateRequest {
  templateId: string;
  variables: Record<string, unknown>;
  selectedItems?: string[];
}

export interface UseTemplateResult {
  success: boolean;
  createdItems: {
    type: TemplateType;
    id: string;
    name: string;
  }[];
  errors?: string[];
}

// Category labels
export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  bsc: 'Balanced Scorecard',
  logistics: 'Logística',
  financial: 'Financeiro',
  quality: 'Qualidade',
  hr: 'RH',
  sales: 'Vendas',
  operations: 'Operações',
  commercial: 'Comercial',
  general: 'Geral',
  custom: 'Customizado',
};

// Category colors
export const CATEGORY_CONFIG: Record<TemplateCategory, { bgClass: string; textClass: string }> = {
  bsc: { bgClass: 'bg-purple-500/20', textClass: 'text-purple-400' },
  logistics: { bgClass: 'bg-blue-500/20', textClass: 'text-blue-400' },
  financial: { bgClass: 'bg-green-500/20', textClass: 'text-green-400' },
  quality: { bgClass: 'bg-orange-500/20', textClass: 'text-orange-400' },
  hr: { bgClass: 'bg-pink-500/20', textClass: 'text-pink-400' },
  sales: { bgClass: 'bg-yellow-500/20', textClass: 'text-yellow-400' },
  operations: { bgClass: 'bg-cyan-500/20', textClass: 'text-cyan-400' },
  commercial: { bgClass: 'bg-indigo-500/20', textClass: 'text-indigo-400' },
  general: { bgClass: 'bg-gray-500/20', textClass: 'text-gray-400' },
  custom: { bgClass: 'bg-slate-500/20', textClass: 'text-slate-400' },
};
