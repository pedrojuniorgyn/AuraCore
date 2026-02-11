/**
 * ProcessJobsCommand - Use Case para processar jobs da fila
 * 
 * Processa jobs pendentes usando lock/claim pattern.
 * Suporta retry com backoff.
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IProcessJobUseCase,
  ProcessJobInput,
  ProcessJobOutput,
} from '../../domain/ports/input/IProcessJobUseCase';
import type { IDocumentRepository } from '../../domain/ports/output/IDocumentRepository';
import type { IDocumentJobRepository } from '../../domain/ports/output/IDocumentJobRepository';
import type { IStorageProvider } from '../../domain/ports/output/IStorageProvider';
import type { DocumentJob } from '../../domain/entities/DocumentJob';
import { log } from '@/lib/observability/logger';

/**
 * Interface para processadores de jobs específicos
 */
export interface JobProcessor {
  jobType: string;
  process(
    job: DocumentJob,
    context: {
      documentRepository: IDocumentRepository;
      storageProvider: IStorageProvider;
    },
  ): Promise<Result<Record<string, unknown>, string>>;
}

@injectable()
export class ProcessJobsCommand implements IProcessJobUseCase {
  private static processors: Map<string, JobProcessor> = new Map();

  constructor(
    @inject('IDocumentRepository') private readonly documentRepository: IDocumentRepository,
    @inject('IDocumentJobRepository') private readonly jobRepository: IDocumentJobRepository,
    @inject('IStorageProvider') private readonly storageProvider: IStorageProvider,
  ) {}

  /**
   * Registra um processador de job
   */
  static registerProcessor(processor: JobProcessor): void {
    this.processors.set(processor.jobType, processor);
    log('info', 'documents.processor.registered', { jobType: processor.jobType });
  }

  async execute(input?: ProcessJobInput): Promise<Result<ProcessJobOutput, string>> {
    const maxJobs = Math.max(1, Math.min(50, input?.maxJobs ?? 5));
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < maxJobs; i++) {
      // Claim próximo job
      const claimResult = await this.jobRepository.claimNextJob();
      if (Result.isFail(claimResult)) {
        log('error', 'documents.job.claim_failed', { error: claimResult.error });
        break;
      }

      const { job } = claimResult.value;
      if (!job) {
        // Não há mais jobs na fila
        break;
      }

      processed++;
      log('info', 'documents.job.claimed', {
        jobId: job.id,
        jobType: job.jobType.value,
        organizationId: job.organizationId,
        attempt: job.attempts,
      });

      // Buscar processador
      const processor = ProcessJobsCommand.processors.get(job.jobType.value);
      if (!processor) {
        failed++;
        await this.handleJobError(job, `Nenhum processador registrado para: ${job.jobType.value}`);
        continue;
      }

      try {
        // Atualizar status do documento para PROCESSING
        const docResult = await this.documentRepository.findById(
          job.documentId,
          job.organizationId,
          job.branchId,
        );
        if (Result.isOk(docResult) && docResult.value) {
          docResult.value.updateStatus('PROCESSING');
          await this.documentRepository.save(docResult.value);
        }

        // Executar processamento
        const processResult = await processor.process(job, {
          documentRepository: this.documentRepository,
          storageProvider: this.storageProvider,
        });

        if (Result.isFail(processResult)) {
          failed++;
          await this.handleJobError(job, processResult.error);
          continue;
        }

        // Marcar como sucesso
        job.markAsSucceeded(processResult.value);
        await this.jobRepository.save(job);

        // Atualizar documento
        if (Result.isOk(docResult) && docResult.value) {
          docResult.value.updateStatus('SUCCEEDED');
          await this.documentRepository.save(docResult.value);
        }

        succeeded++;
        log('info', 'documents.job.succeeded', {
          jobId: job.id,
          jobType: job.jobType.value,
          organizationId: job.organizationId,
        });
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        await this.handleJobError(job, errorMessage);
      }
    }

    return Result.ok({ processed, succeeded, failed });
  }

  /**
   * Handles job failure: logs error, marks job as failed, updates document status
   */
  private async handleJobError(job: DocumentJob, errorMessage: string): Promise<void> {
    log('error', 'documents.job.failed', {
      jobId: job.id,
      jobType: job.jobType.value,
      organizationId: job.organizationId,
      error: errorMessage,
    });

    // Marcar como falha (pode voltar para QUEUED se ainda tiver tentativas)
    job.markAsFailed(errorMessage);
    await this.jobRepository.save(job);

    // Atualizar documento se falha definitiva
    if (job.status.isFailed) {
      const docResult = await this.documentRepository.findById(
        job.documentId,
        job.organizationId,
        job.branchId,
      );
      if (Result.isOk(docResult) && docResult.value) {
        docResult.value.updateStatus('FAILED', errorMessage);
        await this.documentRepository.save(docResult.value);
      }
    }
  }
}
