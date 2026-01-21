'use client';

/**
 * VoiceChat - Componente de chat por voz com agentes.
 *
 * Funcionalidades:
 * - Gravação de áudio via MediaRecorder
 * - Envio para API de processamento
 * - Reprodução de resposta em áudio
 * - Exibição de transcrição e resposta textual
 *
 * @module components/agent/VoiceChat
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Loader2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceResponse {
  success: boolean;
  transcribed_text: string;
  transcription_confidence: number;
  agent_response: string;
  agent_used: string | null;
  audio_response: string | null;
  audio_format: string;
  error: string | null;
}

interface VoiceChatProps {
  /** Callback quando uma transcrição é recebida */
  onTranscription?: (text: string) => void;
  /** Callback quando uma resposta é recebida */
  onResponse?: (response: string, agent: string | null) => void;
  /** Se deve reproduzir áudio automaticamente */
  autoPlayAudio?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

export function VoiceChat({
  onTranscription,
  onResponse,
  autoPlayAudio = true,
  className,
}: VoiceChatProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [response, setResponse] = useState('');
  const [agentUsed, setAgentUsed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playAudio = useCallback((base64Audio: string) => {
    try {
      const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`);
      audioRef.current = audio;

      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);

      audio.play().catch((err) => {
        console.error('Erro ao reproduzir áudio:', err);
        setIsPlaying(false);
      });
    } catch (err) {
      console.error('Erro ao criar áudio:', err);
    }
  }, []);

  const processAudio = useCallback(async (blob: Blob) => {
    setIsProcessing(true);
    setTranscription('');
    setResponse('');
    setAgentUsed(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('respondWithAudio', String(!isMuted));

      const res = await fetch('/api/agents/voice/chat', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao processar áudio');
      }

      const data: VoiceResponse = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido');
      }

      // Atualizar estado
      setTranscription(data.transcribed_text);
      setResponse(data.agent_response);
      setAgentUsed(data.agent_used);

      // Callbacks
      onTranscription?.(data.transcribed_text);
      onResponse?.(data.agent_response, data.agent_used);

      // Reproduzir áudio
      if (data.audio_response && autoPlayAudio && !isMuted) {
        playAudio(data.audio_response);
      }
    } catch (err) {
      console.error('Erro ao processar:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar áudio');
    } finally {
      setIsProcessing(false);
    }
  }, [isMuted, onTranscription, onResponse, autoPlayAudio, playAudio]);

  const startRecording = useCallback(async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });

      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(blob);

        // Parar stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      setError('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  }, [processAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (isPlaying) {
      stopAudio();
    }
    setIsMuted((prev) => !prev);
  }, [isPlaying, stopAudio]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Chat por Voz
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            title={isMuted ? 'Ativar áudio' : 'Desativar áudio'}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botão de gravação */}
        <div className="flex justify-center">
          <Button
            size="lg"
            variant={isRecording ? 'destructive' : 'default'}
            className={cn(
              'rounded-full w-20 h-20 transition-all',
              isRecording && 'animate-pulse'
            )}
            onClick={toggleRecording}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
        </div>

        {/* Status */}
        <p className="text-center text-sm text-muted-foreground">
          {isProcessing
            ? 'Processando...'
            : isRecording
              ? 'Gravando... Clique para parar'
              : isPlaying
                ? 'Reproduzindo resposta...'
                : 'Clique para falar'}
        </p>

        {/* Erro */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Transcrição */}
        {transcription && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Você disse:</p>
            <p className="text-sm">{transcription}</p>
          </div>
        )}

        {/* Resposta */}
        {response && (
          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Resposta:</p>
              {agentUsed && (
                <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">
                  {agentUsed}
                </span>
              )}
            </div>
            <p className="text-sm">{response}</p>
          </div>
        )}

        {/* Indicador de reprodução */}
        {isPlaying && (
          <div className="flex items-center justify-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1 h-4 bg-primary rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={stopAudio}>
              Parar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VoiceChat;
