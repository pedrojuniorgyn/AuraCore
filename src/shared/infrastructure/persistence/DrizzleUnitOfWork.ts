/**
 * Infrastructure: DrizzleUnitOfWork
 * Implementação do Unit of Work usando Drizzle ORM com SQL Server
 *
 * @module shared/infrastructure/persistence
 */
import { injectable } from 'tsyringe';
import type { IUnitOfWork } from '../../domain/ports/IUnitOfWork';
import { db } from '@/lib/db';

@injectable()
export class DrizzleUnitOfWork implements IUnitOfWork {
  private transactionActive = false;
  private transactionClient: typeof db | null = null;

  async begin(): Promise<void> {
    if (this.transactionActive) {
      throw new Error('Transaction already active. Commit or rollback first.');
    }
    this.transactionActive = true;
    // Nota: Drizzle com SQL Server gerencia transações internamente
    // Este flag é usado para controle lógico
  }

  async commit(): Promise<void> {
    if (!this.transactionActive) {
      throw new Error('No active transaction to commit.');
    }
    this.transactionActive = false;
    this.transactionClient = null;
  }

  async rollback(): Promise<void> {
    if (!this.transactionActive) {
      throw new Error('No active transaction to rollback.');
    }
    this.transactionActive = false;
    this.transactionClient = null;
  }

  isActive(): boolean {
    return this.transactionActive;
  }

  /**
   * Executa operações dentro de uma transação Drizzle
   * Usa db.transaction() para garantir atomicidade
   */
  async execute<T>(work: () => Promise<T>): Promise<T> {
    return await db.transaction(async (tx) => {
      this.transactionClient = tx as unknown as typeof db;
      this.transactionActive = true;

      try {
        const result = await work();
        this.transactionActive = false;
        this.transactionClient = null;
        return result;
      } catch (error) {
        this.transactionActive = false;
        this.transactionClient = null;
        throw error;
      }
    });
  }

  /**
   * Obtém o cliente de transação atual (para repositories usarem)
   */
  getTransactionClient(): typeof db {
    return this.transactionClient || db;
  }
}
