/**
 * Tipos para o sistema de exportação e importação
 * @module lib/export/export-types
 */

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';
export type ExportEntity = 'kpi' | 'action_plan' | 'pdca_cycle' | 'goal' | 'dashboard_config';

export interface ExportOptions {
  format: ExportFormat;
  entities: ExportEntity[];
  filters?: {
    dateRange?: { start: Date; end: Date };
    perspective?: string;
    status?: string;
    ids?: string[];
  };
  options?: {
    // PDF options
    includeCharts?: boolean;
    includeHistory?: boolean;
    includeComments?: boolean;
    includeAttachments?: boolean;
    orientation?: 'portrait' | 'landscape';
    // Excel options
    separateSheets?: boolean;
    includeFormulas?: boolean;
    // CSV options
    delimiter?: ',' | ';' | '\t';
    encoding?: 'utf-8' | 'latin1';
  };
}

export interface ExportResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  expiresAt: Date;
  itemCount: number;
}

export interface ImportOptions {
  entity: ExportEntity;
  mode: 'create' | 'update' | 'upsert';
  skipErrors: boolean;
  dryRun: boolean;
}

export interface ImportMapping {
  sourceColumn: string;
  targetField: string;
  transform?: 'none' | 'uppercase' | 'lowercase' | 'trim' | 'date' | 'number';
  defaultValue?: string | number;
}

export interface ImportValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  issues: ImportIssue[];
  preview: ImportPreviewRow[];
}

export interface ImportIssue {
  row: number;
  column?: string;
  type: 'error' | 'warning';
  message: string;
  suggestion?: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  status: 'valid' | 'warning' | 'error';
  data: Record<string, unknown>;
  issues: ImportIssue[];
}

export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportIssue[];
}

// Field definitions for mapping
export interface FieldDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  required: boolean;
  enumValues?: { value: string; label: string }[];
}

export const KPI_FIELDS: FieldDefinition[] = [
  { name: 'name', label: 'Nome', type: 'string', required: true },
  { name: 'code', label: 'Código', type: 'string', required: true },
  { name: 'description', label: 'Descrição', type: 'string', required: false },
  {
    name: 'perspective',
    label: 'Perspectiva',
    type: 'enum',
    required: false,
    enumValues: [
      { value: 'financial', label: 'Financeira' },
      { value: 'customer', label: 'Cliente' },
      { value: 'internal_process', label: 'Processos Internos' },
      { value: 'learning_growth', label: 'Aprendizado e Crescimento' },
    ],
  },
  { name: 'unit', label: 'Unidade', type: 'string', required: false },
  { name: 'targetValue', label: 'Valor Meta', type: 'number', required: false },
  { name: 'currentValue', label: 'Valor Atual', type: 'number', required: false },
  {
    name: 'frequency',
    label: 'Frequência',
    type: 'enum',
    required: false,
    enumValues: [
      { value: 'daily', label: 'Diário' },
      { value: 'weekly', label: 'Semanal' },
      { value: 'monthly', label: 'Mensal' },
      { value: 'quarterly', label: 'Trimestral' },
      { value: 'yearly', label: 'Anual' },
    ],
  },
  { name: 'responsible', label: 'Responsável', type: 'string', required: false },
];

export const ACTION_PLAN_FIELDS: FieldDefinition[] = [
  { name: 'name', label: 'Nome', type: 'string', required: true },
  { name: 'description', label: 'Descrição', type: 'string', required: false },
  { name: 'what', label: 'O Quê', type: 'string', required: false },
  { name: 'why', label: 'Por Quê', type: 'string', required: false },
  { name: 'where', label: 'Onde', type: 'string', required: false },
  { name: 'who', label: 'Quem', type: 'string', required: false },
  { name: 'when', label: 'Quando', type: 'date', required: false },
  { name: 'how', label: 'Como', type: 'string', required: false },
  { name: 'howMuch', label: 'Quanto', type: 'number', required: false },
  {
    name: 'priority',
    label: 'Prioridade',
    type: 'enum',
    required: false,
    enumValues: [
      { value: 'low', label: 'Baixa' },
      { value: 'medium', label: 'Média' },
      { value: 'high', label: 'Alta' },
      { value: 'critical', label: 'Crítica' },
    ],
  },
  {
    name: 'status',
    label: 'Status',
    type: 'enum',
    required: false,
    enumValues: [
      { value: 'not_started', label: 'Não Iniciado' },
      { value: 'in_progress', label: 'Em Andamento' },
      { value: 'completed', label: 'Concluído' },
      { value: 'cancelled', label: 'Cancelado' },
    ],
  },
];

export const ENTITY_FIELDS: Record<ExportEntity, FieldDefinition[]> = {
  kpi: KPI_FIELDS,
  action_plan: ACTION_PLAN_FIELDS,
  pdca_cycle: [],
  goal: [],
  dashboard_config: [],
};
