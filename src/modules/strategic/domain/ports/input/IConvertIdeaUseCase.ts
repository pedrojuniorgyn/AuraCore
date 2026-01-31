/**
 * Port Input: IConvertIdeaUseCase
 * Converter ideia aprovada em ActionPlan
 *
 * @module strategic/domain/ports/input
 */
import type { Result } from '@/shared/domain';
import type { ActionPlan } from '../../entities/ActionPlan';

export interface ConvertIdeaDTO {
  ideaId: string;
  organizationId: number;
  branchId: number;
  // Dados do ActionPlan a ser criado
  goalId?: string;
  whereLocation: string;
  whenStart: Date;
  whenEnd: Date;
  who: string;
  whoUserId?: string;
  whoType?: 'USER' | 'EMAIL' | 'PARTNER';
  whoEmail?: string;
  whoPartnerId?: string;
  how: string;
  howMuchAmount?: number;
  howMuchCurrency?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  convertedBy: string;
}

export interface IConvertIdeaUseCase {
  execute(dto: ConvertIdeaDTO): Promise<Result<ActionPlan, string>>;
}
