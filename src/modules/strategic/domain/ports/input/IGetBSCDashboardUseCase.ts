/**
 * Port Input: IGetBSCDashboardUseCase
 * Obter dashboard do Balanced Scorecard
 *
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';

export type BSCPerspective = 'FINANCIAL' | 'CUSTOMER' | 'INTERNAL_PROCESS' | 'LEARNING_GROWTH';

export interface BSCPerspectiveData {
  perspective: BSCPerspective;
  label: string;
  goals: Array<{
    id: string;
    description: string;
    target: number;
    current: number;
    unit: string;
    status: 'GREEN' | 'YELLOW' | 'RED';
  }>;
}

export interface GetBSCDashboardDTO {
  organizationId: number;
  branchId: number;
  strategyId?: string;
}

export interface GetBSCDashboardResult {
  perspectives: BSCPerspectiveData[];
  overallScore: number;
  lastUpdated: Date;
}

export interface IGetBSCDashboardUseCase {
  execute(dto: GetBSCDashboardDTO): Promise<Result<GetBSCDashboardResult, string>>;
}
