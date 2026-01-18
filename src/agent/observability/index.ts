/**
 * @module agent/observability
 * @description Módulo de observabilidade do Agente AuraCore
 * 
 * Fornece logging, métricas e tracing para o agente.
 */

export {
  AgentLogger,
  agentLogger,
  type AgentLogEntry,
  type AgentMetrics,
  type AgentLoggerConfig,
  type AgentComponent,
  type LogLevel,
  type LogInput,
} from './AgentLogger';
