/**
 * IIntercompanyGateway - Output Port
 *
 * Interface para alocações intercompany.
 * Wrapa o serviço legado intercompany-allocation-engine.ts
 *
 * @module integrations/domain/ports/output
 * @see E9 Fase 2: Migração de @/services/intercompany-allocation-engine
 */

import { Result } from '@/shared/domain';

export interface IntercompanyReverseParams {
  allocationId: number;
  organizationId: number;
  branchId: number;
}

export interface IntercompanyReverseResult {
  success: boolean;
  allocationId: number;
  reversedAt: Date;
}

export interface IIntercompanyGateway {
  reverseAllocation(params: IntercompanyReverseParams): Promise<Result<IntercompanyReverseResult, string>>;
}
