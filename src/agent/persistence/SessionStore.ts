/**
 * SessionStore - Persistência de Sessões de Chat
 *
 * Gerencia sessões e mensagens de chat do agente AuraCore.
 * Usa Result pattern para operações que podem falhar.
 *
 * @module agent/persistence
 * @see E-Agent-Fase6
 */

import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { Result } from '@/shared/domain';
import { agentLogger } from '../observability';
import {
  agentSessionsTable,
  agentMessagesTable,
  type AgentSessionRow,
  type AgentMessageRow,
} from './schemas';

/**
 * Interface para sessão de chat
 */
export interface ChatSession {
  id: string;
  userId: string;
  organizationId: number;
  branchId: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

/**
 * Interface para mensagem de chat
 */
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolsUsed?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Parâmetros para criar sessão
 */
export interface CreateSessionParams {
  userId: string;
  organizationId: number;
  branchId: number;
  title?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Parâmetros para listar sessões
 */
export interface ListSessionsParams {
  userId: string;
  organizationId: number;
  branchId: number;
  page?: number;
  pageSize?: number;
}

/**
 * Parâmetros para adicionar mensagem
 */
export interface AddMessageParams {
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolsUsed?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Opções para buscar mensagens
 */
export interface GetMessagesOptions {
  limit?: number;
  before?: Date;
}

/**
 * Resultado paginado de sessões
 */
export interface PaginatedSessions {
  sessions: ChatSession[];
  total: number;
}

/**
 * Converte row do banco para ChatSession
 */
function rowToSession(row: AgentSessionRow): ChatSession {
  return {
    id: row.id,
    userId: row.userId,
    organizationId: row.organizationId,
    branchId: row.branchId,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
  };
}

/**
 * Converte row do banco para ChatMessage
 */
function rowToMessage(row: AgentMessageRow): ChatMessage {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role as 'user' | 'assistant' | 'system',
    content: row.content,
    toolsUsed: row.toolsUsed ? JSON.parse(row.toolsUsed) : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.createdAt,
  };
}

/**
 * SessionStore - Gerenciador de persistência de sessões
 */
export class SessionStore {
  /**
   * Cria uma nova sessão de chat
   */
  async createSession(
    params: CreateSessionParams
  ): Promise<Result<ChatSession, string>> {
    try {
      const id = crypto.randomUUID();
      const now = new Date();

      const session: ChatSession = {
        id,
        userId: params.userId,
        organizationId: params.organizationId,
        branchId: params.branchId,
        title: params.title ?? 'Nova conversa',
        createdAt: now,
        updatedAt: now,
        metadata: params.metadata ?? {},
      };

      await db.insert(agentSessionsTable).values({
        id: session.id,
        userId: session.userId,
        organizationId: session.organizationId,
        branchId: session.branchId,
        title: session.title,
        metadata: JSON.stringify(session.metadata),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      });

      agentLogger.log({
        level: 'info',
        component: 'agent',
        action: 'session_created',
        details: { sessionId: id },
        userId: params.userId,
        organizationId: params.organizationId,
      });

      return Result.ok(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      agentLogger.log({
        level: 'error',
        component: 'agent',
        action: 'session_create_failed',
        details: { error: message },
        userId: params.userId,
      });
      return Result.fail(`Failed to create session: ${message}`);
    }
  }

  /**
   * Busca sessão por ID
   */
  async getSession(
    sessionId: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<ChatSession | null, string>> {
    try {
      const rows = await db
        .select()
        .from(agentSessionsTable)
        .where(
          and(
            eq(agentSessionsTable.id, sessionId),
            eq(agentSessionsTable.organizationId, organizationId),
            eq(agentSessionsTable.branchId, branchId)
          )
        );

      if (rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(rowToSession(rows[0]));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to get session: ${message}`);
    }
  }

  /**
   * Lista sessões do usuário
   *
   * Usa paginação no SQL (OFFSET/FETCH) para eficiência.
   * COUNT é feito em query separada para total correto.
   */
  async listSessions(
    params: ListSessionsParams
  ): Promise<Result<PaginatedSessions, string>> {
    try {
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 20;
      const offset = (page - 1) * pageSize;

      // Condição WHERE reutilizável
      const whereCondition = and(
        eq(agentSessionsTable.userId, params.userId),
        eq(agentSessionsTable.organizationId, params.organizationId),
        eq(agentSessionsTable.branchId, params.branchId)
      );

      // Duas queries paralelas: dados paginados + count total
      const [sessions, countResult] = await Promise.all([
        // Query com paginação no SQL (OFFSET/FETCH NEXT para MSSQL)
        db.execute<AgentSessionRow>(sql`
          SELECT *
          FROM agent_sessions
          WHERE user_id = ${params.userId}
            AND organization_id = ${params.organizationId}
            AND branch_id = ${params.branchId}
          ORDER BY updated_at DESC
          OFFSET ${offset} ROWS
          FETCH NEXT ${pageSize} ROWS ONLY
        `),
        // Count total para paginação correta
        db
          .select({ count: count() })
          .from(agentSessionsTable)
          .where(whereCondition),
      ]);

      // Mapear resultados (db.execute pode retornar { recordset: [...] } ou array direto)
      // Usar padrão PC-001 do codebase para tratar ambos os casos
      const rawResult = sessions as unknown as { recordset?: AgentSessionRow[] };
      const sessionRows = (rawResult.recordset || sessions) as unknown as AgentSessionRow[];

      return Result.ok({
        sessions: sessionRows.map(rowToSession),
        total: countResult[0]?.count ?? 0,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to list sessions: ${message}`);
    }
  }

  /**
   * Adiciona mensagem à sessão
   * 
   * ⚠️ S1.2: Agora requer organizationId e branchId para multi-tenancy
   */
  async addMessage(
    params: AddMessageParams,
    organizationId: number,
    branchId: number
  ): Promise<Result<ChatMessage, string>> {
    try {
      const id = crypto.randomUUID();
      const now = new Date();

      const message: ChatMessage = {
        id,
        sessionId: params.sessionId,
        role: params.role,
        content: params.content,
        toolsUsed: params.toolsUsed,
        metadata: params.metadata,
        createdAt: now,
      };

      // ✅ S1.2: Inserir organizationId e branchId para multi-tenancy
      await db.insert(agentMessagesTable).values({
        id: message.id,
        sessionId: message.sessionId,
        organizationId, // ← S1.2
        branchId, // ← S1.2
        role: message.role,
        content: message.content,
        toolsUsed: JSON.stringify(message.toolsUsed ?? []),
        metadata: JSON.stringify(message.metadata ?? {}),
        createdAt: message.createdAt,
      });

      // Atualizar updatedAt da sessão
      await db
        .update(agentSessionsTable)
        .set({ updatedAt: now })
        .where(eq(agentSessionsTable.id, params.sessionId));

      return Result.ok(message);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to add message: ${errorMessage}`);
    }
  }

  /**
   * Busca mensagens de uma sessão
   *
   * SEGURANÇA: Valida que a sessão pertence ao tenant antes de retornar mensagens.
   * Isso previne acesso não autorizado a mensagens de outras organizações.
   *
   * @param sessionId - ID da sessão
   * @param organizationId - ID da organização (OBRIGATÓRIO - multi-tenancy)
   * @param branchId - ID da filial (OBRIGATÓRIO - multi-tenancy)
   * @param options - Opções de filtro (limit, before)
   */
  async getMessages(
    sessionId: string,
    organizationId: number,
    branchId: number,
    options?: GetMessagesOptions
  ): Promise<Result<ChatMessage[], string>> {
    try {
      // 1. Verificar se a sessão pertence ao tenant (SEGURANÇA)
      const sessionExists = await db
        .select({ id: agentSessionsTable.id })
        .from(agentSessionsTable)
        .where(
          and(
            eq(agentSessionsTable.id, sessionId),
            eq(agentSessionsTable.organizationId, organizationId),
            eq(agentSessionsTable.branchId, branchId)
          )
        );

      if (sessionExists.length === 0) {
        return Result.fail('Session not found or access denied');
      }

      // 2. Buscar mensagens (agora seguro pois validamos o tenant)
      // ✅ S1.2: Filtrar TAMBÉM por organizationId + branchId para multi-tenancy
      const allMessages = await db
        .select()
        .from(agentMessagesTable)
        .where(
          and(
            eq(agentMessagesTable.sessionId, sessionId),
            eq(agentMessagesTable.organizationId, organizationId), // ← S1.2
            eq(agentMessagesTable.branchId, branchId) // ← S1.2
          )
        )
        .orderBy(asc(agentMessagesTable.createdAt));

      // Aplicar limit em memória se fornecido
      const messages = options?.limit
        ? allMessages.slice(0, options.limit)
        : allMessages;

      return Result.ok(messages.map(rowToMessage));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to get messages: ${message}`);
    }
  }

  /**
   * Atualiza título da sessão
   */
  async updateSessionTitle(
    sessionId: string,
    title: string
  ): Promise<Result<void, string>> {
    try {
      await db
        .update(agentSessionsTable)
        .set({ title, updatedAt: new Date() })
        .where(eq(agentSessionsTable.id, sessionId));

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to update session title: ${message}`);
    }
  }

  /**
   * Deleta sessão e suas mensagens
   */
  async deleteSession(
    sessionId: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<void, string>> {
    try {
      // Deletar mensagens primeiro
      // ✅ S1.2: Filtrar por organizationId + branchId para multi-tenancy
      await db
        .delete(agentMessagesTable)
        .where(
          and(
            eq(agentMessagesTable.sessionId, sessionId),
            eq(agentMessagesTable.organizationId, organizationId), // ← S1.2
            eq(agentMessagesTable.branchId, branchId) // ← S1.2
          )
        );

      // Deletar sessão
      await db
        .delete(agentSessionsTable)
        .where(
          and(
            eq(agentSessionsTable.id, sessionId),
            eq(agentSessionsTable.organizationId, organizationId),
            eq(agentSessionsTable.branchId, branchId)
          )
        );

      agentLogger.log({
        level: 'info',
        component: 'agent',
        action: 'session_deleted',
        details: { sessionId },
        organizationId,
      });

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to delete session: ${message}`);
    }
  }
}

/**
 * Singleton instance do SessionStore
 */
export const sessionStore = new SessionStore();
