/**
 * Infrastructure: OutboxProcessor
 * Background job que consome eventos da tabela outbox e publica
 * via IEventPublisher.
 *
 * Responsabilidades:
 * - Polling periódico da tabela domain_event_outbox
 * - Deserialização de payload e metadados
 * - Publicação via IEventPublisher
 * - Marcação como PUBLISHED/FAILED conforme resultado
 * - Respeita maxRetries por evento
 *
 * @module shared/infrastructure/events/outbox
 */
import { inject, injectable } from '@/shared/infrastructure/di/container';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type { IEventPublisher } from '@/shared/domain/ports/IEventPublisher';
import type { DomainEvent, EventMetadata } from '@/shared/domain/events/DomainEvent';
import type { ILogger } from '@/shared/infrastructure/logging/ILogger';
import type { IOutboxRepository } from './IOutboxRepository';
import type { OutboxEventRow } from './outbox.schema';

/** Configuração do OutboxProcessor */
export interface OutboxProcessorConfig {
  /** Intervalo entre ciclos de polling em ms (default: 5000) */
  pollingIntervalMs?: number;

  /** Máximo de eventos processados por ciclo (default: 50) */
  batchSize?: number;

  /** Dias para cleanup de eventos antigos (default: 30) */
  cleanupAfterDays?: number;

  /** Intervalo de cleanup em ms (default: 1 hora) */
  cleanupIntervalMs?: number;
}

const DEFAULT_CONFIG: Required<OutboxProcessorConfig> = {
  pollingIntervalMs: 5_000,
  batchSize: 50,
  cleanupAfterDays: 30,
  cleanupIntervalMs: 3_600_000,
};

@injectable()
export class OutboxProcessor {
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private processing = false;
  private readonly config: Required<OutboxProcessorConfig>;

  constructor(
    @inject(TOKENS.OutboxRepository) private readonly outboxRepository: IOutboxRepository,
    @inject(TOKENS.EventPublisher) private readonly eventPublisher: IEventPublisher,
    @inject(TOKENS.Logger) private readonly logger: ILogger,
  ) {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Inicia o processamento de outbox em background.
   * Cria dois timers: polling de eventos e cleanup periódico.
   *
   * @param config - Configuração opcional que sobreescreve defaults
   */
  start(config?: OutboxProcessorConfig): void {
    if (this.pollingTimer) {
      this.logger.warn('OutboxProcessor already running', { component: 'OutboxProcessor' });
      return;
    }

    Object.assign(this.config, config);

    this.logger.info(
      `OutboxProcessor starting — polling every ${this.config.pollingIntervalMs}ms, batch ${this.config.batchSize}`,
      { component: 'OutboxProcessor' },
    );

    // Processar imediatamente na primeira vez
    void this.processOnce();

    // Polling periódico
    this.pollingTimer = setInterval(() => {
      void this.processOnce();
    }, this.config.pollingIntervalMs);

    // Cleanup periódico
    this.cleanupTimer = setInterval(() => {
      void this.cleanupOldEvents();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Para o processamento de outbox.
   * Aguarda o ciclo corrente terminar antes de parar.
   */
  stop(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.logger.info('OutboxProcessor stopped', { component: 'OutboxProcessor' });
  }

  /**
   * Verifica se o processor está em execução.
   */
  isRunning(): boolean {
    return this.pollingTimer !== null;
  }

  /**
   * Executa um único ciclo de processamento.
   * Pode ser chamado manualmente para testes ou flush imediato.
   *
   * @returns Número de eventos publicados neste ciclo
   */
  async processOnce(): Promise<number> {
    if (this.processing) {
      return 0;
    }

    this.processing = true;
    let published = 0;

    try {
      const pendingEvents = await this.outboxRepository.findPendingEvents(
        this.config.batchSize,
      );

      if (pendingEvents.length === 0) {
        return 0;
      }

      this.logger.debug(
        `OutboxProcessor: ${pendingEvents.length} pending event(s) found`,
        { component: 'OutboxProcessor' },
      );

      for (const row of pendingEvents) {
        const success = await this.publishEvent(row);
        if (success) published++;
      }

      if (published > 0) {
        this.logger.info(
          `OutboxProcessor: ${published}/${pendingEvents.length} event(s) published`,
          { component: 'OutboxProcessor' },
        );
      }

      return published;
    } catch (error: unknown) {
      this.logger.error(
        'OutboxProcessor: unexpected error during processing cycle',
        error instanceof Error ? error : undefined,
      );
      return published;
    } finally {
      this.processing = false;
    }
  }

  /**
   * Tenta publicar um evento individual e atualiza status.
   */
  private async publishEvent(row: OutboxEventRow): Promise<boolean> {
    try {
      const domainEvent = this.deserializeEvent(row);
      await this.eventPublisher.publish(domainEvent);
      await this.outboxRepository.markAsPublished(row.id);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `OutboxProcessor: failed to publish event ${row.id} (type: ${row.eventType}, attempt ${row.retryCount + 1}/${row.maxRetries})`,
        { component: 'OutboxProcessor', error: errorMessage },
      );

      try {
        await this.outboxRepository.markAsFailed(row.id, errorMessage);
      } catch (markError: unknown) {
        this.logger.error(
          `OutboxProcessor: failed to mark event ${row.id} as FAILED`,
          markError instanceof Error ? markError : undefined,
        );
      }

      return false;
    }
  }

  /**
   * Reconstrói um DomainEvent a partir da row do outbox.
   */
  private deserializeEvent(row: OutboxEventRow): DomainEvent {
    const payload: Record<string, unknown> = JSON.parse(row.payload);
    const metadata: EventMetadata | undefined = row.metadata
      ? JSON.parse(row.metadata)
      : undefined;

    return {
      eventId: row.id,
      eventType: row.eventType,
      occurredAt: row.createdAt,
      aggregateId: row.aggregateId,
      aggregateType: row.aggregateType,
      payload,
      metadata,
    };
  }

  /**
   * Remove eventos antigos (PUBLISHED e FAILED) conforme configuração.
   */
  private async cleanupOldEvents(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.cleanupAfterDays);

      const deleted = await this.outboxRepository.cleanup(cutoffDate);

      if (deleted > 0) {
        this.logger.info(
          `OutboxProcessor: cleaned up ${deleted} old event(s) (older than ${this.config.cleanupAfterDays} days)`,
          { component: 'OutboxProcessor' },
        );
      }
    } catch (error: unknown) {
      this.logger.error(
        'OutboxProcessor: cleanup failed',
        error instanceof Error ? error : undefined,
      );
    }
  }
}
