/**
 * IProcessJobUseCase - Port de Input para processamento de jobs
 */
import { Result } from '@/shared/domain';

export interface ProcessJobInput {
  /** Número máximo de jobs para processar */
  maxJobs?: number;
}

export interface ProcessJobOutput {
  processed: number;
  succeeded: number;
  failed: number;
}

export interface IProcessJobUseCase {
  execute(input?: ProcessJobInput): Promise<Result<ProcessJobOutput, string>>;
}
