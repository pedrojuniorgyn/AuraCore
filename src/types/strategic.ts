/**
 * Tipos compartilhados para o módulo Strategic
 * Single Source of Truth - Frontend/Backend
 *
 * @module types/strategic
 */

// ===== COMMON TYPES =====

export type MeetingType = 'BOARD' | 'DIRECTOR' | 'MANAGER' | 'TACTICAL' | 'EMERGENCY';
export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ActionPlanStatus = 'DRAFT' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type PdcaCycle = 'PLAN' | 'DO' | 'CHECK' | 'ACT';

// ===== WAR ROOM MEETINGS =====

/**
 * Item retornado pela API GET /api/strategic/war-room/meetings
 * Corresponde EXATAMENTE ao mapeamento feito na route.ts
 */
export interface MeetingListItem {
  id: string;
  strategyId: string | null;
  meetingType: MeetingType;
  title: string;
  description: string | null;
  scheduledAt: string; // ISO string
  expectedDuration: number;
  startedAt: string | null;
  endedAt: string | null;
  actualDuration: number | null;
  participantsCount: number;
  agendaItemsCount: number;
  decisionsCount: number;
  status: MeetingStatus;
  isOverdue: boolean;
  facilitatorUserId: string;
  facilitatorName: string | null; // Adicionado pela API via lookup
  createdBy: string;
  createdAt: string; // ISO string
}

export interface AgendaItem {
  id: string;
  title: string;
  presenter?: string;
  duration: number;
  isCompleted: boolean;
  order: number;
}

export interface Decision {
  id: string;
  description: string;
  responsibleUserId: string;
  responsibleName?: string;
  deadline?: string;
  status: string;
}

/**
 * Dados completos da reunião para página de detalhe
 * Estende MeetingListItem com campos adicionais
 */
export interface MeetingDetail extends MeetingListItem {
  participants: string[];
  agendaItems: AgendaItem[];
  decisions: Decision[];
}

// ===== ACTION PLANS =====

/**
 * Item retornado pela API GET /api/strategic/action-plans
 * Nota: status pode incluir DRAFT que não é exibido no Kanban
 */
export interface ActionPlanApiItem {
  id: string;
  code: string;
  what: string;
  why: string;
  whereLocation: string;
  whenStart: string;
  whenEnd: string;
  who: string;
  whoUserId: string;
  how: string;
  howMuchAmount?: number | null;
  howMuchCurrency?: string | null;
  pdcaCycle: string; // PdcaCycle string (PLAN, DO, CHECK, ACT)
  completionPercent: number;
  priority: string; // Priority string (CRITICAL, HIGH, MEDIUM, LOW)
  status: string; // ActionPlanStatus string (inclui DRAFT)
  isOverdue: boolean;
  goalId?: string | null;
}

// ===== API RESPONSES =====

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type MeetingsApiResponse = PaginatedResponse<MeetingListItem>;
export type ActionPlansApiResponse = PaginatedResponse<ActionPlanApiItem>;
