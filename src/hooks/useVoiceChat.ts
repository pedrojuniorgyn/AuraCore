/**
 * Hook para chat por voz com agentes IA
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  VoiceState,
  VoiceMessage,
  UseVoiceChatOptions,
  UseVoiceChatReturn,
} from '@/types/voice';

const AGENTS_API_URL = process.env.NEXT_PUBLIC_AGENTS_API_URL || 'http://localhost:8000';

/**
 * Hook para chat por voz com agentes IA
 */
export function useVoiceChat(options: UseVoiceChatOptions = {}): UseVoiceChatReturn {
  const {
    agentType = 'strategic',
    context = {},
    config = {},
    onTranscription,
    onResponse,
    onError,
  } = options;

  const [state, setState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [lastTranscription, setLastTranscription] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Verificar suporte do browser
  const isSupported = typeof window !== 'undefined' && 
    'mediaDevices' in navigator && 
    'getUserMedia' in navigator.mediaDevices;

  // Estados derivados
  const isListening = state === 'listening';
  const isProcessing = state === 'processing';
  const isSpeaking = state === 'speaking';

  /**
   * Solicitar permissão de microfone
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      return true;
    } catch {
      setHasPermission(false);
      return false;
    }
  }, []);

  /**
   * Iniciar gravação
   */
  const startListening = useCallback(async () => {
    if (!isSupported) {
      const err = new Error('Voice not supported in this browser');
      setError(err);
      onError?.(err);
      return;
    }

    try {
      // Solicitar permissão se necessário
      if (hasPermission === null) {
        const granted = await requestPermission();
        if (!granted) {
          const err = new Error('Microphone permission denied');
          setError(err);
          onError?.(err);
          return;
        }
      }

      // Obter stream de áudio
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });
      streamRef.current = stream;

      // Configurar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Processar áudio gravado
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start(100); // Chunks de 100ms
      setState('listening');
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      setError(error);
      onError?.(error);
      setState('error');
    }
  }, [isSupported, hasPermission, requestPermission, onError]);

  /**
   * Parar gravação
   */
  const stopListening = useCallback(async () => {
    if (mediaRecorderRef.current && state === 'listening') {
      mediaRecorderRef.current.stop();
      
      // Parar stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setState('processing');
    }
  }, [state]);

  /**
   * Toggle gravação
   */
  const toggleListening = useCallback(async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  /**
   * Processar áudio gravado - Pipeline completo STT → Agent → TTS
   */
  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      setState('processing');

      // Converter áudio para base64
      const audioBase64 = await blobToBase64(audioBlob);

      // Chamar endpoint /process do backend Python (pipeline completo)
      const response = await fetch(`${AGENTS_API_URL}/api/voice/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_base64: audioBase64,
          encoding: 'WEBM_OPUS',
          context: {
            user_id: 'user-1', // TODO: Pegar do session
            org_id: 1,
            branch_id: 1,
            session_id: globalThis.crypto.randomUUID(),
          },
          respond_with_audio: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Voice processing failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Voice processing failed');
      }

      // Adicionar mensagem do usuário
      const userMessage: VoiceMessage = {
        id: `voice-${Date.now()}-user`,
        role: 'user',
        text: data.transcribed_text,
        timestamp: new Date(),
        isVoice: true,
      };
      setMessages(prev => [...prev, userMessage]);
      setLastTranscription(data.transcribed_text);
      onTranscription?.(data.transcribed_text);
      onResponse?.(data.agent_response);

      // Se tem áudio de resposta, reproduzir
      if (data.audio_response) {
        setState('speaking');

        // Converter base64 para blob
        const audioBuffer = base64ToArrayBuffer(data.audio_response);
        const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Adicionar mensagem do assistente
        const assistantMessage: VoiceMessage = {
          id: `voice-${Date.now()}-assistant`,
          role: 'assistant',
          text: data.agent_response,
          audioUrl,
          timestamp: new Date(),
          isVoice: true,
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Reproduzir áudio
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setState('idle');
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setState('idle');
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      } else {
        // Sem áudio, apenas texto
        const assistantMessage: VoiceMessage = {
          id: `voice-${Date.now()}-assistant`,
          role: 'assistant',
          text: data.agent_response,
          timestamp: new Date(),
          isVoice: false,
        };
        setMessages(prev => [...prev, assistantMessage]);
        setState('idle');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Processing failed');
      setError(error);
      onError?.(error);
      setState('error');
      
      // Voltar para idle após erro
      setTimeout(() => setState('idle'), 2000);
    }
  }, [agentType, context, config, onTranscription, onResponse, onError]);

  /**
   * Parar reprodução de áudio
   */
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setState('idle');
  }, []);

  /**
   * Limpar mensagens
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastTranscription(null);
    setError(null);
  }, []);

  /**
   * Cleanup ao desmontar
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return {
    state,
    isListening,
    isProcessing,
    isSpeaking,
    messages,
    lastTranscription,
    error,
    startListening,
    stopListening,
    toggleListening,
    stopSpeaking,
    clearMessages,
    isSupported,
    hasPermission,
  };
}

/**
 * Converte Blob para base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remover prefixo "data:audio/webm;base64,"
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converte base64 para ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
