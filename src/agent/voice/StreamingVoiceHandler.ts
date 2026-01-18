/**
 * @module agent/voice/StreamingVoiceHandler
 * @description Handler de streaming de voz para o Agente AuraCore
 * 
 * Suporta transcrição em tempo real usando Google Speech-to-Text (Chirp 2).
 */

import { agentLogger } from '../observability';
import type { AgentExecutionContext } from '../core/AgentContext';
import { FISCAL_SPEECH_CONTEXT, LOGISTICS_SPEECH_CONTEXT } from './types';

/**
 * Configuração de streaming
 */
export interface StreamingConfig {
  /** Taxa de amostragem em Hz */
  sampleRateHertz: number;
  /** Código do idioma */
  languageCode: string;
  /** Retornar resultados intermediários */
  interimResults: boolean;
  /** Habilitar pontuação automática */
  enableAutomaticPunctuation: boolean;
  /** Modelo a usar */
  model: string;
  /** Contextos de fala para boost */
  speechContexts?: string[];
}

/**
 * Sessão de streaming de voz
 */
export interface StreamingSession {
  /** ID da sessão */
  id: string;
  /** Contexto de execução */
  context: AgentExecutionContext;
  /** Stream de reconhecimento (tipo interno do Google) */
  recognizeStream: NodeJS.WritableStream | null;
  /** Se sessão está ativa */
  isActive: boolean;
  /** Data de início */
  startedAt: Date;
  /** Última atividade */
  lastActivityAt: Date;
  /** Buffer de transcrição acumulada */
  transcriptionBuffer: string;
  /** Callback para transcrições */
  onTranscript: (transcript: string, isFinal: boolean) => void;
  /** Callback para erros */
  onError: (error: Error) => void;
}

/**
 * Callbacks para streaming
 */
export interface StreamingCallbacks {
  /** Chamado quando há transcrição */
  onTranscript: (transcript: string, isFinal: boolean) => void;
  /** Chamado quando há erro */
  onError: (error: Error) => void;
}

/**
 * Handler de streaming de voz para transcrição em tempo real
 * 
 * @example
 * ```typescript
 * const handler = new StreamingVoiceHandler();
 * 
 * await handler.startStreaming(sessionId, context, {}, {
 *   onTranscript: (text, isFinal) => console.log(text),
 *   onError: (error) => console.error(error),
 * });
 * 
 * // Enviar chunks de áudio
 * handler.sendAudioChunk(sessionId, audioChunk);
 * 
 * // Finalizar
 * const transcript = handler.stopStreaming(sessionId);
 * ```
 */
export class StreamingVoiceHandler {
  private speechClient: unknown = null;
  private sessions: Map<string, StreamingSession> = new Map();
  private readonly sessionTimeout = 5 * 60 * 1000; // 5 minutos
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startSessionCleanup();
  }

  /**
   * Inicializa o cliente Google Cloud Speech (lazy loading)
   */
  private async initializeClient(): Promise<void> {
    if (!this.speechClient) {
      const { SpeechClient } = await import('@google-cloud/speech');
      this.speechClient = new SpeechClient();
    }
  }

  /**
   * Inicia uma sessão de streaming de voz
   */
  async startStreaming(
    sessionId: string,
    context: AgentExecutionContext,
    config: Partial<StreamingConfig>,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    await this.initializeClient();

    const streamConfig: StreamingConfig = {
      sampleRateHertz: config.sampleRateHertz ?? 16000,
      languageCode: config.languageCode ?? 'pt-BR',
      interimResults: config.interimResults ?? true,
      enableAutomaticPunctuation: config.enableAutomaticPunctuation ?? true,
      model: config.model ?? 'chirp_2',
      speechContexts: config.speechContexts ?? this.getDefaultContexts(),
    };

    // Tipo para o cliente Speech
    interface SpeechClientType {
      streamingRecognize: (options: {
        config: {
          encoding: string;
          sampleRateHertz: number;
          languageCode: string;
          enableAutomaticPunctuation: boolean;
          model: string;
          speechContexts?: Array<{ phrases: string[]; boost: number }>;
        };
        interimResults: boolean;
      }) => NodeJS.WritableStream & {
        on: (event: string, callback: (data: StreamingResponse | Error) => void) => void;
      };
    }

    interface StreamingResponse {
      results?: Array<{
        alternatives?: Array<{
          transcript?: string;
          confidence?: number;
        }>;
        isFinal?: boolean;
      }>;
    }

    const client = this.speechClient as SpeechClientType;

    const recognizeStream = client.streamingRecognize({
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: streamConfig.sampleRateHertz,
        languageCode: streamConfig.languageCode,
        enableAutomaticPunctuation: streamConfig.enableAutomaticPunctuation,
        model: streamConfig.model,
        speechContexts: streamConfig.speechContexts
          ? [{ phrases: streamConfig.speechContexts, boost: 20 }]
          : undefined,
      },
      interimResults: streamConfig.interimResults,
    });

    const session: StreamingSession = {
      id: sessionId,
      context,
      recognizeStream,
      isActive: true,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      transcriptionBuffer: '',
      onTranscript: callbacks.onTranscript,
      onError: callbacks.onError,
    };

    // Configurar handlers do stream
    recognizeStream.on('data', (response: StreamingResponse) => {
      session.lastActivityAt = new Date();

      const result = response.results?.[0];
      if (result) {
        const transcript = result.alternatives?.[0]?.transcript ?? '';
        const isFinal = result.isFinal ?? false;

        if (isFinal) {
          session.transcriptionBuffer += transcript + ' ';

          agentLogger.info('voice', 'StreamingVoiceHandler.transcript_final', {
            sessionId,
            transcript: transcript.substring(0, 100),
            userId: context.userId,
            organizationId: context.organizationId,
          });
        }

        callbacks.onTranscript(transcript, isFinal);
      }
    });

    recognizeStream.on('error', (error: Error) => {
      agentLogger.error('voice', 'StreamingVoiceHandler.streaming_error', {
        sessionId,
        error: error.message,
        userId: context.userId,
      });

      callbacks.onError(error);
      this.stopStreaming(sessionId);
    });

    recognizeStream.on('end', () => {
      agentLogger.info('voice', 'StreamingVoiceHandler.streaming_ended', {
        sessionId,
        userId: context.userId,
      });

      session.isActive = false;
    });

    this.sessions.set(sessionId, session);

    agentLogger.info('voice', 'StreamingVoiceHandler.streaming_started', {
      sessionId,
      config: {
        sampleRateHertz: streamConfig.sampleRateHertz,
        languageCode: streamConfig.languageCode,
        model: streamConfig.model,
      },
      userId: context.userId,
      organizationId: context.organizationId,
    });
  }

  /**
   * Envia chunk de áudio para o stream
   */
  sendAudioChunk(sessionId: string, audioChunk: Buffer): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive || !session.recognizeStream) {
      throw new Error(`Sessão ${sessionId} não encontrada ou inativa`);
    }

    session.lastActivityAt = new Date();
    session.recognizeStream.write(audioChunk);
  }

  /**
   * Para o streaming e retorna a transcrição completa
   */
  stopStreaming(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return '';
    }

    if (session.recognizeStream) {
      session.recognizeStream.end();
    }

    session.isActive = false;
    const finalTranscript = session.transcriptionBuffer.trim();

    agentLogger.info('voice', 'StreamingVoiceHandler.streaming_stopped', {
      sessionId,
      durationMs: Date.now() - session.startedAt.getTime(),
      transcriptLength: finalTranscript.length,
      userId: session.context.userId,
    });

    return finalTranscript;
  }

  /**
   * Obtém transcrição acumulada até o momento
   */
  getTranscriptionBuffer(sessionId: string): string {
    return this.sessions.get(sessionId)?.transcriptionBuffer ?? '';
  }

  /**
   * Verifica se sessão está ativa
   */
  isSessionActive(sessionId: string): boolean {
    return this.sessions.get(sessionId)?.isActive ?? false;
  }

  /**
   * Obtém sessão por ID
   */
  getSession(sessionId: string): StreamingSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Lista todas as sessões ativas
   */
  getActiveSessions(): StreamingSession[] {
    return Array.from(this.sessions.values()).filter(s => s.isActive);
  }

  /**
   * Contextos padrão para reconhecimento fiscal/logístico
   */
  private getDefaultContexts(): string[] {
    return [
      ...FISCAL_SPEECH_CONTEXT.phrases,
      ...LOGISTICS_SPEECH_CONTEXT.phrases,
      // Termos financeiros adicionais
      'boleto', 'fatura', 'duplicata',
      'conciliação', 'extrato', 'lançamento',
      'contas a pagar', 'contas a receber',
    ];
  }

  /**
   * Limpeza de sessões inativas
   */
  private startSessionCleanup(): void {
    // Limpar interval anterior se existir
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let removedCount = 0;

      for (const [sessionId, session] of this.sessions) {
        if (now - session.lastActivityAt.getTime() > this.sessionTimeout) {
          this.stopStreaming(sessionId);
          this.sessions.delete(sessionId);
          removedCount++;

          agentLogger.info('voice', 'StreamingVoiceHandler.session_cleanup', {
            sessionId,
            reason: 'timeout',
          });
        }
      }

      if (removedCount > 0) {
        agentLogger.info('voice', 'StreamingVoiceHandler.cleanup_complete', {
          removedCount,
          remainingCount: this.sessions.size,
        });
      }
    }, 60000); // Verificar a cada minuto
  }

  /**
   * Para o cleanup (para testes)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Remove sessão manualmente
   */
  removeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.stopStreaming(sessionId);
      this.sessions.delete(sessionId);
      return true;
    }
    return false;
  }
}

/**
 * Instância singleton do StreamingVoiceHandler
 */
export const streamingVoiceHandler = new StreamingVoiceHandler();
