/**
 * Port: IOutboxRepository
 * Interface para persistência de eventos no Transactional Outbox.
 *
 * @module shared/infrastructure/events/outbox
 * @see DrizzleOutboxRepository — implementação Drizzle
 * @see OutboxProcessor         — consome via findPendingEvents / markAs*
 */
import type { OutboxEventRow, OutboxEventInsert } from './outbox.schema';

export interface IOutboxRepository {
  /**
   * Persiste um ou mais eventos com status PENDING.
   * Deve ser chamado dentro da mesma transação que a mutação de estado.
   *
   * @param events - Registros a inserir na tabela outbox
   */
  saveToPending(events: OutboxEventInsert[]): Promise<void>;

  /**
   * Busca eventos pendentes de publicação, ordenados por criação (FIFO).
   * Usado pelo OutboxProcessor para polling periódico.
   *
   * @param limit - Máximo de eventos a retornar (default: 50)
   * @returns Lista de eventos com status PENDING e retryCount < maxRetries
   */
  findPendingEvents(limit?: number): Promise<OutboxEventRow[]>;

  /**
   * Marca um evento como publicado com sucesso.
   * Atualiza status para PUBLISHED e registra publishedAt.
   *
   * @param id - UUID do registro outbox
   */
  markAsPublished(id: string): Promise<void>;

  /**
   * Marca um evento como falhado e incrementa retryCount.
   * Se retryCount >= maxRetries, muda status para FAILED.
   *
   * @param id    - UUID do registro outbox
   * @param error - Mensagem de erro para diagnóstico
   */
  markAsFailed(id: string, error: string): Promise<void>;

  /**
   * Remove eventos antigos já publicados ou falhados definitivamente.
   * Usado para evitar crescimento indefinido da tabela.
   *
   * @param olderThan - Remover eventos criados antes desta data
   * @returns Número de registros removidos
   */
  cleanup(olderThan: Date): Promise<number>;
}
