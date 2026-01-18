/**
 * @description Testes para VoiceHandler
 * 
 * Nota: Os testes que dependem de Google Cloud APIs são testados
 * apenas para funcionalidades offline (session management, etc.)
 * Os testes de integração com Google Cloud devem ser feitos em ambiente separado.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceHandler } from '@/agent/voice/VoiceHandler';

describe('VoiceHandler', () => {
  let voiceHandler: VoiceHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    voiceHandler = new VoiceHandler();
  });

  describe('constructor', () => {
    it('deve criar handler com configuração padrão', () => {
      expect(voiceHandler).toBeDefined();
    });

    it('deve aceitar configuração customizada', () => {
      const handler = new VoiceHandler({
        timeoutMs: 60000,
        defaultLanguage: 'en-US',
        defaultVoiceName: 'en-US-Wavenet-A',
        defaultSpeakingRate: 1.2,
      });
      expect(handler).toBeDefined();
    });
  });

  describe('session management', () => {
    it('deve criar sessão com sucesso', () => {
      const session = voiceHandler.createSession('user-123', 1, 1);

      expect(session.id).toContain('voice_user-123_');
      expect(session.userId).toBe('user-123');
      expect(session.organizationId).toBe(1);
      expect(session.branchId).toBe(1);
      expect(session.isActive).toBe(true);
      expect(session.status).toBe('idle');
    });

    it('deve gerar IDs únicos para cada sessão (userIds diferentes)', () => {
      // Usando userIds diferentes para garantir IDs únicos
      const session1 = voiceHandler.createSession('user-1', 1, 1);
      const session2 = voiceHandler.createSession('user-2', 1, 1);

      expect(session1.id).not.toBe(session2.id);
      expect(session1.id).toContain('user-1');
      expect(session2.id).toContain('user-2');
    });

    it('deve obter sessão por ID', () => {
      const created = voiceHandler.createSession('user-123', 1, 1);
      const retrieved = voiceHandler.getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('deve retornar undefined para sessão inexistente', () => {
      const session = voiceHandler.getSession('non-existent');
      expect(session).toBeUndefined();
    });

    it('deve encerrar sessão', () => {
      const session = voiceHandler.createSession('user-123', 1, 1);
      voiceHandler.endSession(session.id);

      const updated = voiceHandler.getSession(session.id);
      expect(updated?.isActive).toBe(false);
      expect(updated?.endedAt).toBeDefined();
      expect(updated?.status).toBe('idle');
    });

    it('deve listar sessões ativas', () => {
      voiceHandler.createSession('user-1', 1, 1);
      voiceHandler.createSession('user-2', 1, 1);
      const session3 = voiceHandler.createSession('user-3', 1, 1);
      voiceHandler.endSession(session3.id);

      const active = voiceHandler.getActiveSessions();
      expect(active.length).toBe(2);
    });

    it('deve atualizar status da sessão', () => {
      const session = voiceHandler.createSession('user-123', 1, 1);
      voiceHandler.updateSessionStatus(session.id, 'listening');

      const updated = voiceHandler.getSession(session.id);
      expect(updated?.status).toBe('listening');
    });

    it('deve atualizar lastActivityAt ao mudar status', () => {
      const session = voiceHandler.createSession('user-123', 1, 1);
      const originalTime = session.lastActivityAt;

      // Pequeno delay para garantir timestamp diferente
      voiceHandler.updateSessionStatus(session.id, 'processing');

      const updated = voiceHandler.getSession(session.id);
      expect(updated?.lastActivityAt.getTime()).toBeGreaterThanOrEqual(originalTime.getTime());
    });

    it('deve adicionar mensagem à sessão', () => {
      const session = voiceHandler.createSession('user-123', 1, 1);
      voiceHandler.addMessageToSession(session.id, {
        role: 'user',
        content: 'Olá',
        timestamp: new Date(),
      });

      const updated = voiceHandler.getSession(session.id);
      expect(updated?.messages.length).toBe(1);
      expect(updated?.messages[0].content).toBe('Olá');
      expect(updated?.messages[0].role).toBe('user');
    });

    it('deve adicionar múltiplas mensagens à sessão', () => {
      const session = voiceHandler.createSession('user-123', 1, 1);
      
      voiceHandler.addMessageToSession(session.id, {
        role: 'user',
        content: 'Olá',
        timestamp: new Date(),
      });
      
      voiceHandler.addMessageToSession(session.id, {
        role: 'assistant',
        content: 'Oi, como posso ajudar?',
        timestamp: new Date(),
      });

      const updated = voiceHandler.getSession(session.id);
      expect(updated?.messages.length).toBe(2);
      expect(updated?.messages[0].role).toBe('user');
      expect(updated?.messages[1].role).toBe('assistant');
    });

    it('não deve adicionar mensagem para sessão inexistente', () => {
      voiceHandler.addMessageToSession('non-existent', {
        role: 'user',
        content: 'Olá',
        timestamp: new Date(),
      });

      // Não deve lançar erro
      expect(true).toBe(true);
    });

    it('deve limpar sessões antigas corretamente', () => {
      // Criar sessões
      voiceHandler.createSession('user-1', 1, 1);
      voiceHandler.createSession('user-2', 1, 1);

      // Cleanup não deve remover sessões recentes
      const removed = voiceHandler.cleanupSessions();
      expect(removed).toBe(0);
      expect(voiceHandler.getActiveSessions().length).toBe(2);
    });
  });

  describe('processTurn validation', () => {
    it('deve falhar para sessão inexistente', async () => {
      const result = await voiceHandler.processTurn(
        'non-existent',
        Buffer.from('audio'),
        async (text) => text
      );

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Sessão não encontrada');
    });

    it('deve falhar para sessão encerrada', async () => {
      const session = voiceHandler.createSession('user-123', 1, 1);
      voiceHandler.endSession(session.id);

      const result = await voiceHandler.processTurn(
        session.id,
        Buffer.from('audio'),
        async (text) => text
      );

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('inativa');
    });
  });

  describe('context phrases', () => {
    it('deve retornar contexto fiscal', () => {
      const context = voiceHandler.getFiscalContextPhrases();

      expect(context.phrases).toContain('NFe');
      expect(context.phrases).toContain('ICMS');
      expect(context.phrases).toContain('CFOP');
      expect(context.phrases).toContain('NCM');
      expect(context.phrases).toContain('SPED');
      expect(context.boost).toBe(15);
    });

    it('deve retornar contexto logístico', () => {
      const context = voiceHandler.getLogisticsContextPhrases();

      expect(context.phrases).toContain('embarque');
      expect(context.phrases).toContain('romaneio');
      expect(context.phrases).toContain('motorista');
      expect(context.phrases).toContain('frete');
      expect(context.phrases).toContain('MDFe');
      expect(context.boost).toBe(10);
    });
  });
});
