/**
 * Voice Resource
 * @module @auracore/sdk/resources/voice
 */

import type {
  TranscribeRequest,
  TranscribeResponse,
  SynthesizeRequest,
  SynthesizeResponse,
} from '../types';

type RequestFn = <T>(method: string, path: string, data?: unknown) => Promise<T>;

export class VoiceResource {
  constructor(private readonly request: RequestFn) {}

  /**
   * Transcribe audio to text
   *
   * @example
   * ```typescript
   * // Using base64 audio
   * const result = await client.voice.transcribe(audioBase64, {
   *   language: 'pt-BR',
   * });
   * console.log(result.text);
   * ```
   */
  async transcribe(request: TranscribeRequest): Promise<TranscribeResponse>;
  async transcribe(
    audio: string,
    options?: Partial<Omit<TranscribeRequest, 'audio'>>
  ): Promise<TranscribeResponse>;
  async transcribe(
    audioOrRequest: string | TranscribeRequest,
    options?: Partial<Omit<TranscribeRequest, 'audio'>>
  ): Promise<TranscribeResponse> {
    const request: TranscribeRequest =
      typeof audioOrRequest === 'string'
        ? { audio: audioOrRequest, ...options }
        : audioOrRequest;

    return this.request<TranscribeResponse>('POST', '/v1/voice/transcribe', request);
  }

  /**
   * Transcribe audio file (Browser only)
   *
   * @example
   * ```typescript
   * const file = document.getElementById('audio-input').files[0];
   * const result = await client.voice.transcribeFile(file);
   * console.log(result.text);
   * ```
   */
  async transcribeFile(
    file: File | Blob,
    options?: Partial<Omit<TranscribeRequest, 'audio'>>
  ): Promise<TranscribeResponse> {
    const base64 = await this.fileToBase64(file);
    return this.transcribe({
      audio: base64,
      format: this.getFormat(file),
      ...options,
    });
  }

  /**
   * Synthesize text to speech
   *
   * @example
   * ```typescript
   * const result = await client.voice.synthesize('Olá, como posso ajudar?', {
   *   voice: 'pt-BR-Standard-A',
   * });
   * // result.audio is base64 encoded audio
   * ```
   */
  async synthesize(request: SynthesizeRequest): Promise<SynthesizeResponse>;
  async synthesize(
    text: string,
    options?: Partial<Omit<SynthesizeRequest, 'text'>>
  ): Promise<SynthesizeResponse>;
  async synthesize(
    textOrRequest: string | SynthesizeRequest,
    options?: Partial<Omit<SynthesizeRequest, 'text'>>
  ): Promise<SynthesizeResponse> {
    const request: SynthesizeRequest =
      typeof textOrRequest === 'string'
        ? { text: textOrRequest, ...options }
        : textOrRequest;

    return this.request<SynthesizeResponse>('POST', '/v1/voice/synthesize', request);
  }

  /**
   * Synthesize and get audio blob (Browser only)
   *
   * @example
   * ```typescript
   * const blob = await client.voice.synthesizeToBlob('Olá!');
   * const audioUrl = URL.createObjectURL(blob);
   * const audio = new Audio(audioUrl);
   * audio.play();
   * ```
   */
  async synthesizeToBlob(
    text: string,
    options?: Partial<Omit<SynthesizeRequest, 'text'>>
  ): Promise<Blob> {
    const response = await this.synthesize(text, options);
    const binaryString = atob(response.audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: `audio/${response.format}` });
  }

  private async fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (): void => {
        const result = reader.result as string;
        resolve(result.split(',')[1] ?? result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private getFormat(file: File | Blob): TranscribeRequest['format'] {
    const type = file.type || '';
    if (type.includes('wav')) return 'wav';
    if (type.includes('mp3')) return 'mp3';
    if (type.includes('ogg')) return 'ogg';
    if (type.includes('webm')) return 'webm';
    return 'wav';
  }
}
