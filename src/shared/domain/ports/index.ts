/**
 * Domain Ports
 * Interfaces que definem contratos para infraestrutura
 */
export type { IUuidGenerator } from './IUuidGenerator';
export type { IUnitOfWork, ITransactionalRepository } from './IUnitOfWork';
export type { IEventPublisher, EventHandler, IEventEmitter } from './IEventPublisher';
