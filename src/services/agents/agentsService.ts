/**
 * Serviço de comunicação com Agno Agents.
 *
 * @see E7 Agno Integration
 */

import type {
  AgentContext,
  ChatRequest,
  ChatResponse,
  AgentInfo,
  AgentsHealthStatus,
} from "@/types/agents";

const AGENTS_API_URL = process.env.AGENTS_API_URL || "http://localhost:8080";

export class AgentsService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || AGENTS_API_URL;
  }

  /**
   * Lista agentes disponíveis.
   */
  async listAgents(): Promise<AgentInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/agents`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to list agents: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Envia mensagem para chat (não-streaming).
   */
  async chat(request: ChatRequest, context: AgentContext): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      throw new Error(`Chat failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Envia mensagem com streaming (SSE).
   */
  async *chatStream(
    request: ChatRequest,
    context: AgentContext
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(`${this.baseUrl}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      throw new Error("No response body");
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
   * Verifica health dos agentes.
   */
  async checkHealth(): Promise<AgentsHealthStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/health/full`, {
        method: "GET",
      });

      if (!response.ok) {
        return { status: "unhealthy", services: {} };
      }

      return response.json();
    } catch {
      return { status: "unhealthy", services: {} };
    }
  }
}

// Singleton
let agentsService: AgentsService | null = null;

export function getAgentsService(): AgentsService {
  if (!agentsService) {
    agentsService = new AgentsService();
  }
  return agentsService;
}
