/**
 * @module agent
 * @description Módulo do Agente AuraCore - Assistente de IA para usuários do ERP
 * 
 * O AuraCore Agent é um assistente integrado ao ERP que auxilia usuários nas
 * operações diárias de logística, fiscal, financeiro e operacional.
 * 
 * Arquitetura:
 * - LLM: Gemini 3 Pro (principal) / Gemini 2.5 Flash (tarefas simples)
 * - Orquestração: LangGraph (workflows)
 * - Integrações: Google Cloud (Document AI, Speech) + Google Workspace
 * 
 * @see docs/agent/README.md para documentação completa
 */

// Core
export { AuraAgent } from './core/AuraAgent';
export type { AgentConfig } from './core/AgentConfig';
export type { AgentContext, AgentExecutionContext } from './core/AgentContext';

// Integrations
export * from './integrations/google';

// Tools
export * from './tools';

// Workflows
export * from './workflows';

// Voice
export * from './voice';

// Observability
export * from './observability';

// Persistence
export * from './persistence';
