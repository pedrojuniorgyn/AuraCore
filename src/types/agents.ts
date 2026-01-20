/**
 * Tipos para integração com Agno Agents.
 */

export interface AgentContext {
  userId: string;
  organizationId: number;
  branchId: number;
  sessionId: string;
  roles: string[];
  permissions: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    agentId?: string;
    toolsUsed?: string[];
    processingTime?: number;
  };
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  agentHint?: string; // Sugerir agente específico
}

export interface ChatResponse {
  id: string;
  conversationId: string;
  message: ChatMessage;
  suggestedActions?: string[];
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  tools: string[];
  riskLevels: Record<string, string>;
}

export interface StreamChunk {
  type: "text" | "tool_start" | "tool_end" | "error" | "done";
  content?: string;
  toolName?: string;
  error?: string;
}

export interface AgentsHealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  services: Record<string, string>;
  timestamp?: string;
}
