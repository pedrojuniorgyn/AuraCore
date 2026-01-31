/**
 * Port Input: IGetStrategicMapUseCase
 * Obter mapa estratégico (Strategic Map)
 *
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';

export type MapNodeType = 'STRATEGY' | 'GOAL' | 'KPI' | 'ACTION_PLAN';

export interface MapNode {
  id: string;
  type: MapNodeType;
  label: string;
  description?: string;
  status?: string;
  layer: number;
  position?: { x: number; y: number };
}

export interface MapEdge {
  from: string;
  to: string;
  label?: string;
  type: 'SUPPORTS' | 'MEASURES' | 'EXECUTES';
}

export interface GetStrategicMapDTO {
  organizationId: number;
  branchId: number;
  strategyId?: string;
}

export interface GetStrategicMapResult {
  nodes: MapNode[];
  edges: MapEdge[];
}

export interface IGetStrategicMapUseCase {
  execute(dto: GetStrategicMapDTO): Promise<Result<GetStrategicMapResult, string>>;
}
