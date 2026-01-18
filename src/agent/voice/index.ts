/**
 * @module agent/voice
 * @description Módulo de voz do Agente AuraCore
 * 
 * Integra:
 * - Google Speech-to-Text (Chirp 2) para transcrição
 * - Google Text-to-Speech para síntese de voz
 * - Gerenciamento de sessões de voz
 */

// Types
export * from './types';

// Handler
export {
  VoiceHandler,
  type VoiceHandlerConfig,
  type ManagedVoiceSession,
  type VoiceMessage,
  type TurnResult,
} from './VoiceHandler';
