/**
 * Port: IUnitOfWork
 * Interface para gerenciamento de transações cross-aggregate
 *
 * Padrão: Unit of Work (Fowler, 2002)
 *
 * @module shared/domain/ports
 */

export interface IUnitOfWork {
  /**
   * Inicia uma nova transação
   */
  begin(): Promise<void>;

  /**
   * Confirma todas as operações da transação
   */
  commit(): Promise<void>;

  /**
   * Desfaz todas as operações da transação
   */
  rollback(): Promise<void>;

  /**
   * Verifica se há uma transação ativa
   */
  isActive(): boolean;

  /**
   * Executa uma função dentro de uma transação
   * Faz commit automaticamente se sucesso, rollback se erro
   */
  execute<T>(work: () => Promise<T>): Promise<T>;
}

/**
 * Interface para repositórios que suportam Unit of Work
 */
export interface ITransactionalRepository {
  /**
   * Define o Unit of Work para este repositório
   */
  setUnitOfWork(uow: IUnitOfWork): void;

  /**
   * Obtém o Unit of Work atual (se houver)
   */
  getUnitOfWork(): IUnitOfWork | null;
}
