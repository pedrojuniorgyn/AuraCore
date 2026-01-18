/**
 * @module agent/core/VoiceEnabledAgent
 * @description Agente AuraCore com capacidades de voz integradas
 * 
 * Usa composição com o AuraAgent para adicionar funcionalidades de:
 * - Processamento de mensagens de voz (transcrição + agente + síntese)
 * - Streaming de voz em tempo real
 * - Conversas por voz completas
 */

import { AuraAgent, type CreateAgentOptions, type AgentChatResponse } from './AuraAgent';
import type { AgentExecutionContext } from './AgentContext';
import { VoiceHandler } from '../voice/VoiceHandler';
import { StreamingVoiceHandler } from '../voice/StreamingVoiceHandler';
import { agentLogger } from '../observability';
import { Result } from '@/shared/domain';

/**
 * Opções para processamento de mensagem de voz
 */
export interface VoiceConversationOptions {
  /** Usar streaming para transcrição */
  useStreaming?: boolean;
  /** Sintetizar resposta automaticamente */
  autoRespond?: boolean;
  /** Nome da voz para síntese */
  voiceName?: string;
  /** Taxa de fala */
  speakingRate?: number;
}

/**
 * Resultado de processamento de mensagem de voz
 */
export interface VoiceConversationResult {
  /** Transcrição da fala do usuário */
  userTranscript: string;
  /** Resposta textual do agente */
  agentResponse: string;
  /** Áudio da resposta (se autoRespond) */
  audioResponse?: Buffer;
  /** Tools usadas na resposta */
  toolsUsed: string[];
  /** Tempo total de processamento em ms */
  duration: number;
}

/**
 * Agente AuraCore com capacidades de voz
 * 
 * Usa composição com AuraAgent para evitar problemas com construtor privado.
 * 
 * @example
 * ```typescript
 * const agent = await VoiceEnabledAgent.createWithVoice({
 *   userId: 'user-123',
 *   organizationId: 1,
 *   branchId: 1,
 * });
 * 
 * // Processar mensagem de voz
 * const result = await agent.processVoiceMessage(audioBuffer, {
 *   autoRespond: true,
 * });
 * 
 * console.log(result.value.userTranscript);
 * console.log(result.value.agentResponse);
 * ```
 */
export class VoiceEnabledAgent {
  private readonly agent: AuraAgent;
  private readonly voiceHandler: VoiceHandler;
  private readonly streamingHandler: StreamingVoiceHandler;

  private constructor(
    agent: AuraAgent,
    voiceHandler: VoiceHandler,
    streamingHandler: StreamingVoiceHandler
  ) {
    this.agent = agent;
    this.voiceHandler = voiceHandler;
    this.streamingHandler = streamingHandler;
  }

  /**
   * Cria uma nova instância do agente com voz
   */
  static async createWithVoice(options: CreateAgentOptions): Promise<VoiceEnabledAgent> {
    const agent = await AuraAgent.create(options);
    const voiceHandler = new VoiceHandler();
    const streamingHandler = new StreamingVoiceHandler();

    return new VoiceEnabledAgent(agent, voiceHandler, streamingHandler);
  }

  // ============================================================================
  // DELEGAÇÃO PARA AURAAGENT
  // ============================================================================

  /**
   * Obtém o contexto de execução
   */
  get executionContext(): AgentExecutionContext {
    return this.agent.executionContext;
  }

  /**
   * ID da sessão
   */
  get sessionId(): string {
    return this.agent.sessionId;
  }

  /**
   * Verifica se tem acesso ao Workspace
   */
  get hasWorkspaceAccess(): boolean {
    return this.agent.hasWorkspaceAccess;
  }

  /**
   * Envia mensagem de chat
   */
  async chat(message: string): Promise<Result<AgentChatResponse, string>> {
    return this.agent.chat(message);
  }

  // ============================================================================
  // MÉTODOS DE VOZ
  // ============================================================================

  /**
   * Processa uma mensagem de voz completa (não-streaming)
   * 
   * Fluxo: Áudio → Transcrição → Agente → Síntese (opcional)
   */
  async processVoiceMessage(
    audioBuffer: Buffer,
    options: VoiceConversationOptions = {}
  ): Promise<Result<VoiceConversationResult, string>> {
    const startTime = Date.now();
    const timer = agentLogger.startTimer();

    agentLogger.info('agent', 'VoiceEnabledAgent.processVoiceMessage.start', {
      audioSize: audioBuffer.length,
      autoRespond: options.autoRespond !== false,
      userId: this.executionContext.userId,
      organizationId: this.executionContext.organizationId,
    });

    try {
      // 1. Transcrever áudio
      const transcriptionResult = await this.voiceHandler.transcribe(audioBuffer);
      if (Result.isFail(transcriptionResult)) {
        return Result.fail(`Falha na transcrição: ${transcriptionResult.error}`);
      }

      const userTranscript = transcriptionResult.value.transcript;
      if (!userTranscript.trim()) {
        return Result.fail('Áudio não contém fala reconhecível');
      }

      agentLogger.info('agent', 'VoiceEnabledAgent.transcribed', {
        transcript: userTranscript.substring(0, 100),
        confidence: transcriptionResult.value.confidence,
        userId: this.executionContext.userId,
      });

      // 2. Processar com o agente
      const chatResult = await this.agent.chat(userTranscript);
      if (Result.isFail(chatResult)) {
        return Result.fail(`Falha no processamento: ${chatResult.error}`);
      }

      const agentResponse = chatResult.value.text;
      const toolsUsed = chatResult.value.metadata.toolsExecuted ?? [];

      // 3. Sintetizar resposta (se autoRespond)
      let audioResponse: Buffer | undefined;
      if (options.autoRespond !== false) {
        const synthesisResult = await this.voiceHandler.synthesize(agentResponse, {
          voice: options.voiceName ? {
            name: options.voiceName,
            gender: 'FEMALE',
            type: 'WAVENET',
          } : undefined,
          speakingRate: options.speakingRate,
        });

        if (Result.isOk(synthesisResult)) {
          audioResponse = synthesisResult.value;
        } else {
          // Log erro de síntese mas não falha a operação
          agentLogger.warn('agent', 'VoiceEnabledAgent.synthesis_failed', {
            error: synthesisResult.error,
            userId: this.executionContext.userId,
          });
        }
      }

      const duration = Date.now() - startTime;

      agentLogger.info('agent', 'VoiceEnabledAgent.processVoiceMessage.complete', {
        duration,
        durationMs: timer(),
        transcriptLength: userTranscript.length,
        responseLength: agentResponse.length,
        hasAudio: !!audioResponse,
        toolsUsed,
        userId: this.executionContext.userId,
        organizationId: this.executionContext.organizationId,
      });

      return Result.ok({
        userTranscript,
        agentResponse,
        audioResponse,
        toolsUsed,
        duration,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      agentLogger.error('agent', 'VoiceEnabledAgent.processVoiceMessage.error', {
        error: errorMessage,
        durationMs: timer(),
        userId: this.executionContext.userId,
      });

      return Result.fail(errorMessage);
    }
  }

  /**
   * Inicia conversa por voz com streaming
   * 
   * @param sessionId - ID da sessão de streaming
   * @param callbacks - Callbacks para eventos de streaming
   */
  async startVoiceConversation(
    sessionId: string,
    callbacks: {
      onInterimTranscript: (text: string) => void;
      onError: (error: string) => void;
    }
  ): Promise<void> {
    agentLogger.info('agent', 'VoiceEnabledAgent.startVoiceConversation', {
      sessionId,
      userId: this.executionContext.userId,
      organizationId: this.executionContext.organizationId,
    });

    await this.streamingHandler.startStreaming(
      sessionId,
      this.executionContext,
      {},
      {
        onTranscript: (transcript, isFinal) => {
          if (!isFinal) {
            callbacks.onInterimTranscript(transcript);
          }
        },
        onError: (error) => {
          callbacks.onError(error.message);
        },
      }
    );
  }

  /**
   * Envia chunk de áudio para a conversa de streaming
   */
  sendVoiceChunk(sessionId: string, audioChunk: Buffer): void {
    this.streamingHandler.sendAudioChunk(sessionId, audioChunk);
  }

  /**
   * Finaliza conversa por voz e obtém resposta do agente
   * 
   * @param sessionId - ID da sessão de streaming
   * @param options - Opções de processamento
   */
  async endVoiceConversation(
    sessionId: string,
    options: VoiceConversationOptions = {}
  ): Promise<Result<VoiceConversationResult, string>> {
    const startTime = Date.now();
    const timer = agentLogger.startTimer();

    // Parar streaming e obter transcrição
    const userTranscript = this.streamingHandler.stopStreaming(sessionId);

    if (!userTranscript.trim()) {
      return Result.fail('Nenhuma fala detectada');
    }

    agentLogger.info('agent', 'VoiceEnabledAgent.endVoiceConversation', {
      sessionId,
      transcriptLength: userTranscript.length,
      userId: this.executionContext.userId,
    });

    try {
      // Processar com agente
      const chatResult = await this.agent.chat(userTranscript);
      if (Result.isFail(chatResult)) {
        return Result.fail(chatResult.error);
      }

      const agentResponse = chatResult.value.text;
      const toolsUsed = chatResult.value.metadata.toolsExecuted ?? [];

      // Sintetizar resposta
      let audioResponse: Buffer | undefined;
      if (options.autoRespond !== false) {
        const synthesisResult = await this.voiceHandler.synthesize(agentResponse, {
          voice: options.voiceName ? {
            name: options.voiceName,
            gender: 'FEMALE',
            type: 'WAVENET',
          } : undefined,
          speakingRate: options.speakingRate,
        });

        if (Result.isOk(synthesisResult)) {
          audioResponse = synthesisResult.value;
        }
      }

      const duration = Date.now() - startTime;

      agentLogger.info('agent', 'VoiceEnabledAgent.endVoiceConversation.complete', {
        sessionId,
        duration,
        durationMs: timer(),
        hasAudio: !!audioResponse,
        userId: this.executionContext.userId,
      });

      return Result.ok({
        userTranscript,
        agentResponse,
        audioResponse,
        toolsUsed,
        duration,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      agentLogger.error('agent', 'VoiceEnabledAgent.endVoiceConversation.error', {
        sessionId,
        error: errorMessage,
        durationMs: timer(),
        userId: this.executionContext.userId,
      });

      return Result.fail(errorMessage);
    }
  }

  /**
   * Verifica se há conversa de voz ativa
   */
  isVoiceConversationActive(sessionId: string): boolean {
    return this.streamingHandler.isSessionActive(sessionId);
  }

  /**
   * Obtém transcrição parcial de conversa de streaming
   */
  getPartialTranscript(sessionId: string): string {
    return this.streamingHandler.getTranscriptionBuffer(sessionId);
  }

  /**
   * Sintetiza texto para áudio diretamente
   */
  async synthesizeResponse(
    text: string,
    options: Pick<VoiceConversationOptions, 'voiceName' | 'speakingRate'> = {}
  ): Promise<Result<Buffer, string>> {
    return this.voiceHandler.synthesize(text, {
      voice: options.voiceName ? {
        name: options.voiceName,
        gender: 'FEMALE',
        type: 'WAVENET',
      } : undefined,
      speakingRate: options.speakingRate,
    });
  }

  /**
   * Transcreve áudio diretamente
   */
  async transcribeAudio(audioBuffer: Buffer): Promise<Result<string, string>> {
    const result = await this.voiceHandler.transcribe(audioBuffer);
    if (Result.isFail(result)) {
      return Result.fail(result.error);
    }
    return Result.ok(result.value.transcript);
  }
}
