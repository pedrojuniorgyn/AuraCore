/**
 * @description Contexto de execução do Agente AuraCore
 * 
 * Contém informações sobre o usuário, organização e sessão atual.
 * Segue o padrão multi-tenancy do AuraCore (organizationId + branchId).
 */

/**
 * Contexto do usuário autenticado
 */
export interface UserContext {
  /** ID do usuário no AuraCore */
  userId: string;
  /** Nome do usuário */
  name: string;
  /** Email do usuário */
  email: string;
  /** Roles/permissões do usuário */
  roles: string[];
  /** Token de acesso Google (para APIs Workspace) */
  googleAccessToken?: string;
  /** Refresh token Google */
  googleRefreshToken?: string;
}

/**
 * Contexto da organização (multi-tenancy)
 */
export interface OrganizationContext {
  /** ID da organização */
  organizationId: number;
  /** ID da filial */
  branchId: number;
  /** Nome da organização */
  organizationName: string;
  /** Nome da filial */
  branchName: string;
  /** Timezone da organização (default: America/Sao_Paulo) */
  timezone: string;
  /** Regime tributário */
  taxRegime: 'lucro_real' | 'lucro_presumido' | 'simples';
}

/**
 * Contexto da sessão de chat
 */
export interface SessionContext {
  /** ID único da sessão */
  sessionId: string;
  /** Data/hora de início da sessão */
  startedAt: Date;
  /** Histórico de mensagens da sessão */
  messageHistory: ChatMessage[];
  /** Metadados da sessão */
  metadata: Record<string, unknown>;
}

/**
 * Mensagem do chat
 */
export interface ChatMessage {
  /** ID único da mensagem */
  id: string;
  /** Papel: usuário ou assistente */
  role: 'user' | 'assistant' | 'system';
  /** Conteúdo da mensagem */
  content: string;
  /** Data/hora da mensagem */
  timestamp: Date;
  /** Anexos (opcional) */
  attachments?: MessageAttachment[];
  /** Metadados (tool calls, etc) */
  metadata?: Record<string, unknown>;
}

/**
 * Anexo de mensagem
 */
export interface MessageAttachment {
  /** ID do anexo */
  id: string;
  /** Nome do arquivo */
  name: string;
  /** Tipo MIME */
  mimeType: string;
  /** Tamanho em bytes */
  size: number;
  /** URL ou base64 do conteúdo */
  content: string;
  /** Tipo do conteúdo */
  contentType: 'url' | 'base64';
}

/**
 * Contexto completo de execução do agente
 */
export interface AgentContext {
  /** Contexto do usuário */
  user: UserContext;
  /** Contexto da organização */
  organization: OrganizationContext;
  /** Contexto da sessão */
  session: SessionContext;
}

/**
 * Contexto de execução passado para tools e use cases
 * Similar ao ExecutionContext usado no restante do AuraCore
 */
export interface AgentExecutionContext {
  /** ID do usuário */
  userId: string;
  /** ID da organização */
  organizationId: number;
  /** ID da filial */
  branchId: number;
  /** ID da sessão do agente */
  sessionId: string;
  /** Token Google (se disponível) */
  googleAccessToken?: string;
}

/**
 * Cria um contexto de execução a partir do contexto completo do agente
 */
export function createExecutionContext(context: AgentContext): AgentExecutionContext {
  return {
    userId: context.user.userId,
    organizationId: context.organization.organizationId,
    branchId: context.organization.branchId,
    sessionId: context.session.sessionId,
    googleAccessToken: context.user.googleAccessToken,
  };
}

/**
 * Cria uma nova sessão
 */
export function createSession(): SessionContext {
  return {
    sessionId: globalThis.crypto.randomUUID(),
    startedAt: new Date(),
    messageHistory: [],
    metadata: {},
  };
}

/**
 * Adiciona mensagem ao histórico da sessão
 */
export function addMessage(
  session: SessionContext,
  role: ChatMessage['role'],
  content: string,
  metadata?: Record<string, unknown>
): ChatMessage {
  const message: ChatMessage = {
    id: globalThis.crypto.randomUUID(),
    role,
    content,
    timestamp: new Date(),
    metadata,
  };
  
  session.messageHistory.push(message);
  return message;
}
