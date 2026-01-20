/**
 * IAgentsGateway - Output Port
 *
 * Interface para comunicação com serviço de Agents (Python FastAPI).
 * Abstrai a API HTTP para uso no padrão DDD.
 *
 * @module integrations/domain/ports/output
 * @see ARCH-011: Gateways implementam Output Ports
 * @see E8 Fase 4: Migração de @/services/agents
 */

import { Result } from '@/shared/domain';

// ============================================================================
// TYPES
// ============================================================================

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AgentContext {
  userId: string;
  organizationId: number;
  branchId: number;
  sessionId?: string;
  roles?: string[];
  permissions?: string[];
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  agentHint?: string;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
  agentId: string;
  metadata?: Record<string, unknown>;
}

export interface AgentsHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  services: Record<string, { status: string; latency?: number }>;
}

// ============================================================================
// INTERFACE
// ============================================================================

/**
 * Gateway para comunicação com serviço de Agents.
 *
 * Implementação em infrastructure/adapters/AgentsAdapter.ts
 */
export interface IAgentsGateway {
  /**
   * Lista agentes disponíveis
   */
  listAgents(): Promise<Result<AgentInfo[], string>>;

  /**
   * Envia mensagem para chat (não-streaming)
   */
  chat(request: ChatRequest, context: AgentContext): Promise<Result<ChatResponse, string>>;

  /**
   * Envia mensagem com streaming (SSE)
   * Retorna AsyncGenerator para consumo incremental
   */
  chatStream(
    request: ChatRequest, 
    context: AgentContext
  ): AsyncGenerator<string, void, unknown>;

  /**
   * Verifica health dos agentes
   */
  checkHealth(): Promise<Result<AgentsHealthStatus, string>>;
}
