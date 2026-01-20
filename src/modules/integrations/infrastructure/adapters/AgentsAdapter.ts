/**
 * AgentsAdapter - Infrastructure Adapter
 *
 * Implementação de IAgentsGateway para comunicação HTTP com
 * serviço de Agents (Python FastAPI).
 *
 * @module integrations/infrastructure/adapters
 * @see E8 Fase 4: Migração de @/services/agents
 */

import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IAgentsGateway,
  AgentInfo,
  AgentContext,
  ChatRequest,
  ChatResponse,
  AgentsHealthStatus,
} from '../../domain/ports/output/IAgentsGateway';

const AGENTS_API_URL = process.env.AGENTS_API_URL || 'http://localhost:8080';

@injectable()
export class AgentsAdapter implements IAgentsGateway {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = AGENTS_API_URL;
  }

  /**
   * Lista agentes disponíveis
   */
  async listAgents(): Promise<Result<AgentInfo[], string>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/agents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return Result.fail(`Failed to list agents: ${response.statusText}`);
      }

      const agents = await response.json();
      return Result.ok(agents);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Agents service unavailable: ${message}`);
    }
  }

  /**
   * Envia mensagem para chat (não-streaming)
   */
  async chat(
    request: ChatRequest,
    context: AgentContext
  ): Promise<Result<ChatResponse, string>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: request.message,
          conversation_id: request.conversationId,
          agent_hint: request.agentHint,
          context: {
            user_id: context.userId,
            org_id: context.organizationId,
            branch_id: context.branchId,
            session_id: context.sessionId,
            roles: context.roles,
            permissions: context.permissions,
          },
        }),
      });

      if (!response.ok) {
        return Result.fail(`Chat failed: ${response.statusText}`);
      }

      const data = await response.json();
      return Result.ok(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Chat error: ${message}`);
    }
  }

  /**
   * Envia mensagem com streaming (SSE)
   */
  async *chatStream(
    request: ChatRequest,
    context: AgentContext
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${this.baseUrl}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: request.message,
        conversation_id: request.conversationId,
        agent_hint: request.agentHint,
        context: {
          user_id: context.userId,
          org_id: context.organizationId,
          branch_id: context.branchId,
          session_id: context.sessionId,
          roles: context.roles,
          permissions: context.permissions,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat stream failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      yield chunk;
    }
  }

  /**
   * Verifica health dos agentes
   */
  async checkHealth(): Promise<Result<AgentsHealthStatus, string>> {
    try {
      const response = await fetch(`${this.baseUrl}/health/full`, {
        method: 'GET',
      });

      if (!response.ok) {
        return Result.ok({ status: 'unhealthy', services: {} });
      }

      const data = await response.json();
      return Result.ok(data);
    } catch {
      return Result.ok({ status: 'unhealthy', services: {} });
    }
  }
}
