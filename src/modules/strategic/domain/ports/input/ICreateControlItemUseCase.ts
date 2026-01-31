import { Result } from '@/shared/domain';

export interface CreateControlItemInput {
  code: string;
  name: string;
  processArea: string;
  responsibleUserId: string;
  measurementFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  targetValue: number;
  upperLimit: number;
  lowerLimit: number;
  unit: string;
  kpiId?: string;
  description?: string;
}

export interface CreateControlItemOutput {
  id: string;
  code: string;
}

export interface ICreateControlItemUseCase {
  execute(
    input: CreateControlItemInput,
    organizationId: number,
    branchId: number,
    createdBy: string
  ): Promise<Result<CreateControlItemOutput, string>>;
}
