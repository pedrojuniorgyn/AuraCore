/**
 * Integrations Module
 * E7.9 Integrações - Semana 2
 * 
 * Hexagonal Architecture para integrações externas
 */

// Ports (Domain Layer)
export type {
  ISefazGateway,
  IBankingGateway,
  INotificationService,
  IBankStatementParser,
} from './domain/ports/output';

// Value Objects
export * from './domain/value-objects';

// Errors
export * from './domain/errors/IntegrationErrors';

// Events
export * from './domain/events/IntegrationEvents';

// DI Module
export { initializeIntegrationsModule } from './infrastructure/di/IntegrationsModule';

