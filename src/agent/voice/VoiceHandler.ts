/**
 * @module agent/voice/VoiceHandler
 * @description Handler de voz para o Agente AuraCore
 * 
 * Integra Speech-to-Text (Chirp 2) e Text-to-Speech do Google Cloud.
 */

import { Result } from '@/shared/domain';
import { agentLogger } from '../observability';
import type {
  SpeechToTextConfig,
  TextToSpeechConfig,
  VoiceTranscriptionResult,
  VoiceSynthesisResult,
  VoiceSession,
  VoiceSessionStatus,
  TranscriptionWord,
  SpeechContext,
} from './types';
import {
  FISCAL_SPEECH_CONTEXT,
  LOGISTICS_SPEECH_CONTEXT,
} from './types';

/**
 * Configuração do VoiceHandler
 */
export interface VoiceHandlerConfig {
  /** Timeout para operações em ms */
  timeoutMs?: number;
  /** Idioma padrão */
  defaultLanguage?: 'pt-BR' | 'en-US' | 'es-ES';
  /** Voz padrão para TTS */
  defaultVoiceName?: string;
  /** Taxa de fala padrão */
  defaultSpeakingRate?: number;
}

/**
 * Mensagem de sessão de voz
 */
export interface VoiceMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

/**
 * Sessão de voz gerenciada
 */
export interface ManagedVoiceSession {
  id: string;
  userId: string;
  organizationId: number;
  branchId: number;
  status: VoiceSessionStatus;
  messages: VoiceMessage[];
  startedAt: Date;
  lastActivityAt: Date;
  endedAt?: Date;
  isActive: boolean;
}

/**
 * Resultado de processamento de turno
 */
export interface TurnResult {
  transcription: VoiceTranscriptionResult;
  responseText: string;
  responseAudio?: Buffer;
}

/**
 * Handler de voz do Agente AuraCore
 * 
 * @example
 * ```typescript
 * const voiceHandler = new VoiceHandler();
 * 
 * // Transcrever áudio
 * const result = await voiceHandler.transcribe(audioBuffer);
 * 
 * // Sintetizar voz
 * const audio = await voiceHandler.synthesize('Olá, como posso ajudar?');
 * ```
 */
export class VoiceHandler {
  private readonly config: Required<VoiceHandlerConfig>;
  private sessions: Map<string, ManagedVoiceSession> = new Map();
  private speechClient: unknown = null;
  private ttsClient: unknown = null;

  constructor(config: VoiceHandlerConfig = {}) {
    this.config = {
      timeoutMs: config.timeoutMs ?? 30000,
      defaultLanguage: config.defaultLanguage ?? 'pt-BR',
      defaultVoiceName: config.defaultVoiceName ?? 'pt-BR-Wavenet-A',
      defaultSpeakingRate: config.defaultSpeakingRate ?? 1.0,
    };
  }

  /**
   * Inicializa os clientes Google Cloud (lazy loading)
   */
  private async initializeClients(): Promise<void> {
    if (!this.speechClient) {
      const { SpeechClient } = await import('@google-cloud/speech');
      this.speechClient = new SpeechClient();
    }
    if (!this.ttsClient) {
      const { TextToSpeechClient } = await import('@google-cloud/text-to-speech');
      this.ttsClient = new TextToSpeechClient();
    }
  }

  /**
   * Transcreve áudio para texto usando Google Speech-to-Text (Chirp 2)
   */
  async transcribe(
    audioBuffer: Buffer,
    config?: Partial<SpeechToTextConfig>
  ): Promise<Result<VoiceTranscriptionResult, string>> {
    const timer = agentLogger.startTimer();

    try {
      await this.initializeClients();

      agentLogger.info('voice', 'VoiceHandler.transcribe.start', {
        audioSize: audioBuffer.length,
        language: config?.language ?? this.config.defaultLanguage,
      });

      // Configurar contextos de fala
      const speechContexts: Array<{ phrases: string[]; boost?: number }> = [];
      if (config?.speechContexts) {
        speechContexts.push(...config.speechContexts.map(ctx => ({
          phrases: ctx.phrases,
          boost: ctx.boost,
        })));
      } else {
        // Usar contextos padrão
        speechContexts.push({
          phrases: FISCAL_SPEECH_CONTEXT.phrases,
          boost: FISCAL_SPEECH_CONTEXT.boost,
        });
        speechContexts.push({
          phrases: LOGISTICS_SPEECH_CONTEXT.phrases,
          boost: LOGISTICS_SPEECH_CONTEXT.boost,
        });
      }

      const request = {
        audio: { content: audioBuffer.toString('base64') },
        config: {
          encoding: 'LINEAR16' as const,
          sampleRateHertz: 16000,
          languageCode: config?.language ?? this.config.defaultLanguage,
          model: config?.model ?? 'chirp_2',
          enableAutomaticPunctuation: config?.enableAutoPunctuation ?? true,
          enableWordTimeOffsets: true,
          speechContexts: speechContexts.length > 0 ? speechContexts : undefined,
          maxAlternatives: config?.maxAlternatives ?? 1,
          profanityFilter: config?.profanityFilter ?? false,
        },
      };

      const speechClient = this.speechClient as {
        recognize: (request: unknown) => Promise<Array<{
          results?: Array<{
            alternatives?: Array<{
              transcript?: string;
              confidence?: number;
              words?: Array<{
                word?: string;
                startTime?: { seconds?: string | number; nanos?: number };
                endTime?: { seconds?: string | number; nanos?: number };
                confidence?: number;
              }>;
            }>;
          }>;
        }>>;
      };

      const [response] = await speechClient.recognize(request);

      const result = response.results?.[0];
      const alternative = result?.alternatives?.[0];

      const words: TranscriptionWord[] = (alternative?.words ?? []).map(w => ({
        word: w.word ?? '',
        startTime: Number(w.startTime?.seconds ?? 0) + (w.startTime?.nanos ?? 0) / 1e9,
        endTime: Number(w.endTime?.seconds ?? 0) + (w.endTime?.nanos ?? 0) / 1e9,
        confidence: w.confidence ?? 0,
      }));

      const transcriptionResult: VoiceTranscriptionResult = {
        transcript: alternative?.transcript ?? '',
        confidence: alternative?.confidence ?? 0,
        words: words.length > 0 ? words : undefined,
        detectedLanguage: config?.language ?? this.config.defaultLanguage,
      };

      agentLogger.info('voice', 'VoiceHandler.transcribe.success', {
        transcript: transcriptionResult.transcript.substring(0, 100),
        confidence: transcriptionResult.confidence,
        wordCount: words.length,
        durationMs: timer(),
      });

      return Result.ok(transcriptionResult);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      agentLogger.error('voice', 'VoiceHandler.transcribe.error', {
        error: errorMessage,
        durationMs: timer(),
      });

      return Result.fail(`Erro na transcrição: ${errorMessage}`);
    }
  }

  /**
   * Sintetiza texto para áudio usando Google Text-to-Speech
   */
  async synthesize(
    text: string,
    config?: Partial<TextToSpeechConfig>
  ): Promise<Result<Buffer, string>> {
    const timer = agentLogger.startTimer();

    try {
      await this.initializeClients();

      agentLogger.info('voice', 'VoiceHandler.synthesize.start', {
        textLength: text.length,
        voiceName: config?.voice?.name ?? this.config.defaultVoiceName,
      });

      const request = {
        input: { text },
        voice: {
          languageCode: config?.language ?? this.config.defaultLanguage,
          name: config?.voice?.name ?? this.config.defaultVoiceName,
          ssmlGender: config?.voice?.gender ?? 'FEMALE',
        },
        audioConfig: {
          audioEncoding: 'MP3' as const,
          speakingRate: config?.speakingRate ?? this.config.defaultSpeakingRate,
          pitch: config?.pitch ?? 0,
          volumeGainDb: config?.volumeGainDb ?? 0,
        },
      };

      const ttsClient = this.ttsClient as {
        synthesizeSpeech: (request: unknown) => Promise<Array<{
          audioContent?: Uint8Array | string;
        }>>;
      };

      const [response] = await ttsClient.synthesizeSpeech(request);

      if (!response.audioContent) {
        return Result.fail('Nenhum áudio gerado');
      }

      const audioBuffer = Buffer.from(response.audioContent as Uint8Array);

      agentLogger.info('voice', 'VoiceHandler.synthesize.success', {
        audioSize: audioBuffer.length,
        durationMs: timer(),
      });

      return Result.ok(audioBuffer);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      agentLogger.error('voice', 'VoiceHandler.synthesize.error', {
        error: errorMessage,
        durationMs: timer(),
      });

      return Result.fail(`Erro na síntese: ${errorMessage}`);
    }
  }

  /**
   * Cria uma sessão de conversa por voz
   */
  createSession(
    userId: string,
    organizationId: number,
    branchId: number
  ): ManagedVoiceSession {
    const sessionId = `voice_${userId}_${Date.now()}`;
    const now = new Date();

    const session: ManagedVoiceSession = {
      id: sessionId,
      userId,
      organizationId,
      branchId,
      status: 'idle',
      messages: [],
      startedAt: now,
      lastActivityAt: now,
      isActive: true,
    };

    this.sessions.set(sessionId, session);

    agentLogger.info('voice', 'VoiceHandler.createSession', {
      sessionId,
      userId,
      organizationId,
      branchId,
    });

    return session;
  }

  /**
   * Obtém sessão por ID
   */
  getSession(sessionId: string): ManagedVoiceSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Atualiza status da sessão
   */
  updateSessionStatus(sessionId: string, status: VoiceSessionStatus): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.lastActivityAt = new Date();
    }
  }

  /**
   * Adiciona mensagem à sessão
   */
  addMessageToSession(sessionId: string, message: VoiceMessage): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      session.lastActivityAt = new Date();
    }
  }

  /**
   * Processa um turno de conversa por voz
   * 
   * @param sessionId - ID da sessão
   * @param audioInput - Buffer de áudio da entrada do usuário
   * @param processText - Função para processar o texto transcrito (ex: AuraAgent.chat)
   */
  async processTurn(
    sessionId: string,
    audioInput: Buffer,
    processText: (text: string) => Promise<string>
  ): Promise<Result<TurnResult, string>> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return Result.fail('Sessão não encontrada ou inativa');
    }

    const timer = agentLogger.startTimer();

    try {
      // 1. Atualizar status
      this.updateSessionStatus(sessionId, 'listening');

      // 2. Transcrever entrada
      const transcriptionResult = await this.transcribe(audioInput);
      if (Result.isFail(transcriptionResult)) {
        this.updateSessionStatus(sessionId, 'error');
        return Result.fail(transcriptionResult.error);
      }

      const transcription = transcriptionResult.value;

      // 3. Adicionar mensagem do usuário
      this.addMessageToSession(sessionId, {
        role: 'user',
        content: transcription.transcript,
        timestamp: new Date(),
      });

      // 4. Atualizar status para processando
      this.updateSessionStatus(sessionId, 'processing');

      // 5. Processar com agente
      const responseText = await processText(transcription.transcript);

      // 6. Atualizar status para sintetizando
      this.updateSessionStatus(sessionId, 'speaking');

      // 7. Sintetizar resposta
      const synthesisResult = await this.synthesize(responseText);
      const responseAudio = Result.isOk(synthesisResult) ? synthesisResult.value : undefined;

      // 8. Adicionar resposta à sessão
      this.addMessageToSession(sessionId, {
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      });

      // 9. Voltar ao idle
      this.updateSessionStatus(sessionId, 'idle');

      agentLogger.info('voice', 'VoiceHandler.processTurn.success', {
        sessionId,
        userText: transcription.transcript.substring(0, 50),
        responseLength: responseText.length,
        durationMs: timer(),
      });

      return Result.ok({
        transcription,
        responseText,
        responseAudio,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateSessionStatus(sessionId, 'error');

      agentLogger.error('voice', 'VoiceHandler.processTurn.error', {
        sessionId,
        error: errorMessage,
        durationMs: timer(),
      });

      return Result.fail(`Erro no turno: ${errorMessage}`);
    }
  }

  /**
   * Encerra sessão
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.endedAt = new Date();
      session.status = 'idle';

      agentLogger.info('voice', 'VoiceHandler.endSession', {
        sessionId,
        messageCount: session.messages.length,
        durationMs: session.endedAt.getTime() - session.startedAt.getTime(),
      });
    }
  }

  /**
   * Lista sessões ativas
   */
  getActiveSessions(): ManagedVoiceSession[] {
    return Array.from(this.sessions.values()).filter(s => s.isActive);
  }

  /**
   * Remove sessões antigas (mais de 1 hora inativas)
   */
  cleanupSessions(): number {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let removed = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (session.lastActivityAt.getTime() < oneHourAgo) {
        this.sessions.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      agentLogger.info('voice', 'VoiceHandler.cleanupSessions', {
        removedCount: removed,
        remainingCount: this.sessions.size,
      });
    }

    return removed;
  }

  /**
   * Retorna frases de contexto fiscal para melhor reconhecimento
   */
  getFiscalContextPhrases(): SpeechContext {
    return FISCAL_SPEECH_CONTEXT;
  }

  /**
   * Retorna frases de contexto logístico para melhor reconhecimento
   */
  getLogisticsContextPhrases(): SpeechContext {
    return LOGISTICS_SPEECH_CONTEXT;
  }
}
