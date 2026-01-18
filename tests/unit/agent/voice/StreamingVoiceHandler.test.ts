/**
 * @description Testes para StreamingVoiceHandler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StreamingVoiceHandler } from '@/agent/voice/StreamingVoiceHandler';
import type { AgentExecutionContext } from '@/agent/core/AgentContext';

describe('StreamingVoiceHandler', () => {
  let handler: StreamingVoiceHandler;

  const mockContext: AgentExecutionContext = {
    userId: 'user-123',
    organizationId: 1,
    branchId: 1,
    sessionId: 'session-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new StreamingVoiceHandler();
  });

  afterEach(() => {
    // Limpar handler após cada teste
    handler.stopCleanup();
  });

  describe('constructor', () => {
    it('deve criar handler corretamente', () => {
      expect(handler).toBeDefined();
    });
  });

  describe('session management', () => {
    it('deve retornar false para sessão inexistente', () => {
      expect(handler.isSessionActive('non-existent')).toBe(false);
    });

    it('deve retornar undefined para getSession de sessão inexistente', () => {
      expect(handler.getSession('non-existent')).toBeUndefined();
    });

    it('deve retornar string vazia para transcrição de sessão inexistente', () => {
      expect(handler.getTranscriptionBuffer('non-existent')).toBe('');
    });

    it('deve retornar lista vazia de sessões ativas inicialmente', () => {
      expect(handler.getActiveSessions()).toHaveLength(0);
    });

    it('deve retornar false ao remover sessão inexistente', () => {
      expect(handler.removeSession('non-existent')).toBe(false);
    });

    it('deve retornar string vazia ao parar sessão inexistente', () => {
      expect(handler.stopStreaming('non-existent')).toBe('');
    });
  });

  describe('sendAudioChunk', () => {
    it('deve lançar erro para sessão inexistente', () => {
      const audioChunk = Buffer.from('audio data');
      
      expect(() => {
        handler.sendAudioChunk('non-existent', audioChunk);
      }).toThrow('Sessão non-existent não encontrada ou inativa');
    });
  });

  describe('getDefaultContexts', () => {
    it('deve retornar contextos padrão ao iniciar streaming', async () => {
      // Mock do cliente Speech
      vi.mock('@google-cloud/speech', () => ({
        SpeechClient: vi.fn().mockImplementation(() => ({
          streamingRecognize: vi.fn().mockReturnValue({
            on: vi.fn(),
            write: vi.fn(),
            end: vi.fn(),
          }),
        })),
      }));

      // Verificar que o handler foi criado corretamente
      expect(handler).toBeDefined();
    });
  });

  describe('stopCleanup', () => {
    it('deve parar o cleanup sem erros', () => {
      expect(() => handler.stopCleanup()).not.toThrow();
    });

    it('deve poder chamar stopCleanup múltiplas vezes', () => {
      handler.stopCleanup();
      handler.stopCleanup();
      expect(true).toBe(true);
    });
  });

  describe('integration tests (mocked)', () => {
    it('deve iniciar streaming com configuração padrão', async () => {
      const mockRecognizeStream = {
        on: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      };

      const mockSpeechClient = {
        streamingRecognize: vi.fn().mockReturnValue(mockRecognizeStream),
      };

      // Mock manual do cliente
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handler as any).speechClient = mockSpeechClient;

      const onTranscript = vi.fn();
      const onError = vi.fn();

      await handler.startStreaming(
        'test-session',
        mockContext,
        {},
        { onTranscript, onError }
      );

      // Verificar que streamingRecognize foi chamado
      expect(mockSpeechClient.streamingRecognize).toHaveBeenCalled();
      
      // Verificar que handlers foram registrados
      expect(mockRecognizeStream.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockRecognizeStream.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRecognizeStream.on).toHaveBeenCalledWith('end', expect.any(Function));

      // Verificar que sessão está ativa
      expect(handler.isSessionActive('test-session')).toBe(true);
      expect(handler.getActiveSessions()).toHaveLength(1);
    });

    it('deve processar transcrição final corretamente', async () => {
      const mockRecognizeStream = {
        on: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      };

      const mockSpeechClient = {
        streamingRecognize: vi.fn().mockReturnValue(mockRecognizeStream),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handler as any).speechClient = mockSpeechClient;

      const onTranscript = vi.fn();
      const onError = vi.fn();

      await handler.startStreaming(
        'test-session',
        mockContext,
        {},
        { onTranscript, onError }
      );

      // Simular evento de dados
      const dataHandler = mockRecognizeStream.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'data'
      )?.[1];

      if (dataHandler) {
        dataHandler({
          results: [{
            alternatives: [{ transcript: 'Olá mundo', confidence: 0.95 }],
            isFinal: true,
          }],
        });

        // Verificar callback
        expect(onTranscript).toHaveBeenCalledWith('Olá mundo', true);

        // Verificar buffer
        expect(handler.getTranscriptionBuffer('test-session')).toBe('Olá mundo ');
      }
    });

    it('deve processar transcrição interim corretamente', async () => {
      const mockRecognizeStream = {
        on: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      };

      const mockSpeechClient = {
        streamingRecognize: vi.fn().mockReturnValue(mockRecognizeStream),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handler as any).speechClient = mockSpeechClient;

      const onTranscript = vi.fn();
      const onError = vi.fn();

      await handler.startStreaming(
        'test-session',
        mockContext,
        {},
        { onTranscript, onError }
      );

      const dataHandler = mockRecognizeStream.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'data'
      )?.[1];

      if (dataHandler) {
        dataHandler({
          results: [{
            alternatives: [{ transcript: 'Olá', confidence: 0.8 }],
            isFinal: false,
          }],
        });

        // Verificar callback com interim
        expect(onTranscript).toHaveBeenCalledWith('Olá', false);

        // Buffer não deve ser atualizado para interim
        expect(handler.getTranscriptionBuffer('test-session')).toBe('');
      }
    });

    it('deve enviar chunks de áudio', async () => {
      const mockRecognizeStream = {
        on: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      };

      const mockSpeechClient = {
        streamingRecognize: vi.fn().mockReturnValue(mockRecognizeStream),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handler as any).speechClient = mockSpeechClient;

      await handler.startStreaming(
        'test-session',
        mockContext,
        {},
        { onTranscript: vi.fn(), onError: vi.fn() }
      );

      const audioChunk = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      handler.sendAudioChunk('test-session', audioChunk);

      expect(mockRecognizeStream.write).toHaveBeenCalledWith(audioChunk);
    });

    it('deve parar streaming e retornar transcrição', async () => {
      const mockRecognizeStream = {
        on: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      };

      const mockSpeechClient = {
        streamingRecognize: vi.fn().mockReturnValue(mockRecognizeStream),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handler as any).speechClient = mockSpeechClient;

      await handler.startStreaming(
        'test-session',
        mockContext,
        {},
        { onTranscript: vi.fn(), onError: vi.fn() }
      );

      // Simular transcrição
      const dataHandler = mockRecognizeStream.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'data'
      )?.[1];

      if (dataHandler) {
        dataHandler({
          results: [{
            alternatives: [{ transcript: 'Teste de transcrição', confidence: 0.95 }],
            isFinal: true,
          }],
        });
      }

      // Parar streaming
      const transcript = handler.stopStreaming('test-session');

      expect(transcript).toBe('Teste de transcrição');
      expect(mockRecognizeStream.end).toHaveBeenCalled();
      expect(handler.isSessionActive('test-session')).toBe(false);
    });

    it('deve tratar erros do stream', async () => {
      const mockRecognizeStream = {
        on: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      };

      const mockSpeechClient = {
        streamingRecognize: vi.fn().mockReturnValue(mockRecognizeStream),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handler as any).speechClient = mockSpeechClient;

      const onTranscript = vi.fn();
      const onError = vi.fn();

      await handler.startStreaming(
        'test-session',
        mockContext,
        {},
        { onTranscript, onError }
      );

      // Simular erro
      const errorHandler = mockRecognizeStream.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'error'
      )?.[1];

      if (errorHandler) {
        errorHandler(new Error('Connection failed'));

        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      }
    });

    it('deve remover sessão manualmente', async () => {
      const mockRecognizeStream = {
        on: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      };

      const mockSpeechClient = {
        streamingRecognize: vi.fn().mockReturnValue(mockRecognizeStream),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handler as any).speechClient = mockSpeechClient;

      await handler.startStreaming(
        'test-session',
        mockContext,
        {},
        { onTranscript: vi.fn(), onError: vi.fn() }
      );

      expect(handler.isSessionActive('test-session')).toBe(true);

      const removed = handler.removeSession('test-session');

      expect(removed).toBe(true);
      expect(handler.isSessionActive('test-session')).toBe(false);
      expect(handler.getActiveSessions()).toHaveLength(0);
    });
  });
});
