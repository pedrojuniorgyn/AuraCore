/**
 * Agents Resource
 * @module @auracore/sdk/resources/agents
 */

import type { AgentInfo, AgentType, ChatRequest, ChatResponse } from '../types';

type RequestFn = <T>(method: string, path: string, data?: unknown) => Promise<T>;
type RequestStreamFn = (method: string, path: string, data?: unknown) => Promise<Response>;

export class AgentsResource {
  constructor(
    private readonly request: RequestFn,
    private readonly requestStream: RequestStreamFn
  ) {}

  /**
   * List available agents
   */
  async list(): Promise<AgentInfo[]> {
    return this.request<AgentInfo[]>('GET', '/v1/agents');
  }

  /**
   * Get agent info
   */
  async get(agent: AgentType): Promise<AgentInfo> {
    return this.request<AgentInfo>('GET', `/v1/agents/${agent}`);
  }

  /**
   * Chat with an agent
   *
   * @example
   * ```typescript
   * // Using request object
   * const response = await client.agents.chat({
   *   agent: 'fiscal',
   *   message: 'Qual a alíquota de ICMS para SP?',
   *   sessionId: 'session-123',
   * });
   *
   * // Using shorthand
   * const response = await client.agents.chat('fiscal', 'Qual a alíquota de ICMS?');
   * ```
   */
  async chat(request: ChatRequest): Promise<ChatResponse>;
  async chat(
    agent: AgentType,
    message: string,
    options?: Partial<Omit<ChatRequest, 'agent' | 'message'>>
  ): Promise<ChatResponse>;
  async chat(
    agentOrRequest: AgentType | ChatRequest,
    message?: string,
    options?: Partial<Omit<ChatRequest, 'agent' | 'message'>>
  ): Promise<ChatResponse> {
    const request: ChatRequest =
      typeof agentOrRequest === 'string'
        ? { agent: agentOrRequest, message: message!, ...options }
        : agentOrRequest;

    return this.request<ChatResponse>('POST', '/v1/agents/chat', request);
  }

  /**
   * Chat with streaming response
   *
   * @example
   * ```typescript
   * for await (const chunk of client.agents.chatStream({
   *   agent: 'fiscal',
   *   message: 'Explique o ICMS',
   * })) {
   *   process.stdout.write(chunk);
   * }
   * ```
   */
  async *chatStream(
    request: ChatRequest
  ): AsyncGenerator<string, void, unknown> {
    // Use requestStream for raw Response (streaming)
    const response = await this.requestStream('POST', '/v1/agents/chat', {
      ...request,
      stream: true,
    });

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield decoder.decode(value, { stream: true });
      }
    } finally {
      reader.releaseLock();
    }
  }
}
