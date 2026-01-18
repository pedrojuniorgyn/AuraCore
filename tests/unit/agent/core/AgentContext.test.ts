/**
 * @description Testes para AgentContext
 */

import { describe, it, expect } from 'vitest';
import {
  createSession,
  addMessage,
  createExecutionContext,
  type AgentContext,
  type UserContext,
  type OrganizationContext,
} from '@/agent/core/AgentContext';

describe('AgentContext', () => {
  describe('createSession', () => {
    it('deve criar uma nova sessão com ID único', () => {
      const session = createSession();
      
      expect(session.sessionId).toBeDefined();
      expect(session.sessionId.length).toBe(36); // UUID
      expect(session.startedAt).toBeInstanceOf(Date);
      expect(session.messageHistory).toEqual([]);
      expect(session.metadata).toEqual({});
    });

    it('deve gerar IDs únicos para cada sessão', () => {
      const session1 = createSession();
      const session2 = createSession();
      
      expect(session1.sessionId).not.toBe(session2.sessionId);
    });
  });

  describe('addMessage', () => {
    it('deve adicionar mensagem ao histórico', () => {
      const session = createSession();
      
      const message = addMessage(session, 'user', 'Olá!');
      
      expect(message.id).toBeDefined();
      expect(message.role).toBe('user');
      expect(message.content).toBe('Olá!');
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(session.messageHistory).toHaveLength(1);
      expect(session.messageHistory[0]).toBe(message);
    });

    it('deve manter ordem das mensagens', () => {
      const session = createSession();
      
      addMessage(session, 'user', 'Primeira');
      addMessage(session, 'assistant', 'Segunda');
      addMessage(session, 'user', 'Terceira');
      
      expect(session.messageHistory).toHaveLength(3);
      expect(session.messageHistory[0].content).toBe('Primeira');
      expect(session.messageHistory[1].content).toBe('Segunda');
      expect(session.messageHistory[2].content).toBe('Terceira');
    });

    it('deve incluir metadata quando fornecido', () => {
      const session = createSession();
      
      const message = addMessage(session, 'assistant', 'Resposta', {
        tokensUsed: 150,
        model: 'gemini-3-pro',
      });
      
      expect(message.metadata).toEqual({
        tokensUsed: 150,
        model: 'gemini-3-pro',
      });
    });
  });

  describe('createExecutionContext', () => {
    it('deve criar contexto de execução a partir do contexto do agente', () => {
      const user: UserContext = {
        userId: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['admin'],
        googleAccessToken: 'ya29.xxx',
      };

      const organization: OrganizationContext = {
        organizationId: 1,
        branchId: 2,
        organizationName: 'Test Org',
        branchName: 'Test Branch',
        timezone: 'America/Sao_Paulo',
        taxRegime: 'lucro_real',
      };

      const session = createSession();

      const agentContext: AgentContext = {
        user,
        organization,
        session,
      };

      const execContext = createExecutionContext(agentContext);

      expect(execContext.userId).toBe('user-123');
      expect(execContext.organizationId).toBe(1);
      expect(execContext.branchId).toBe(2);
      expect(execContext.sessionId).toBe(session.sessionId);
      expect(execContext.googleAccessToken).toBe('ya29.xxx');
    });
  });
});
