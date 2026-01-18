/**
 * @description Cliente para serviços Google Cloud (Gemini, Document AI, Speech)
 * 
 * Este cliente abstrai o acesso aos serviços de IA do Google Cloud:
 * - Gemini (Vertex AI): LLM para processamento de linguagem natural
 * - Document AI: OCR e extração de dados de documentos
 * - Speech-to-Text / Text-to-Speech: Conversão de voz
 */

import type { 
  GeminiConfig, 
  DocumentAIConfig, 
  SpeechConfig 
} from '../../core/AgentConfig';
import type {
  GeminiResponse,
  GeminiContent,
  GenerationOptions,
  ProcessedDocument,
  DocumentEntity,
  TranscriptionResult,
  SynthesisResult,
} from './types';
import { Result } from '@/shared/domain';

/**
 * Cliente Google Cloud para serviços de IA
 * 
 * @example
 * ```typescript
 * const client = new GoogleCloudClient(config);
 * 
 * // Gerar texto com Gemini
 * const response = await client.generateText('Qual o status da NFe 123?');
 * 
 * // Processar documento (NFe, CTe, etc)
 * const doc = await client.processDocument(pdfBuffer, 'application/pdf');
 * ```
 */
export class GoogleCloudClient {
  private readonly geminiConfig: GeminiConfig;
  private readonly documentAIConfig: DocumentAIConfig;
  private readonly speechConfig?: SpeechConfig;
  
  // Clientes lazy-loaded
  private vertexAI: unknown = null;
  private documentAIClient: unknown = null;
  private speechClient: unknown = null;
  private ttsClient: unknown = null;

  constructor(
    geminiConfig: GeminiConfig,
    documentAIConfig: DocumentAIConfig,
    speechConfig?: SpeechConfig
  ) {
    this.geminiConfig = geminiConfig;
    this.documentAIConfig = documentAIConfig;
    this.speechConfig = speechConfig;
  }

  // ============================================================================
  // GEMINI / VERTEX AI
  // ============================================================================

  /**
   * Inicializa o cliente Vertex AI (lazy loading)
   */
  private async getVertexAI(): Promise<unknown> {
    if (!this.vertexAI) {
      // @google-cloud/vertexai será importado dinamicamente
      // para evitar erros se o pacote não estiver instalado
      try {
        const { VertexAI } = await import('@google-cloud/vertexai');
        this.vertexAI = new VertexAI({
          project: this.geminiConfig.projectId,
          location: this.geminiConfig.location,
        });
      } catch {
        throw new Error(
          'Pacote @google-cloud/vertexai não instalado. Execute: npm install @google-cloud/vertexai'
        );
      }
    }
    return this.vertexAI;
  }

  /**
   * Gera texto usando Gemini
   * 
   * @param prompt - Prompt para o modelo
   * @param options - Opções de geração
   * @param useFastModel - Usar modelo rápido para tarefas simples
   */
  async generateText(
    prompt: string,
    options?: GenerationOptions,
    useFastModel = false
  ): Promise<Result<GeminiResponse, string>> {
    try {
      const vertexAI = await this.getVertexAI() as {
        getGenerativeModel: (config: {
          model: string;
          generationConfig: {
            maxOutputTokens: number;
            temperature: number;
            topP?: number;
            topK?: number;
            stopSequences?: string[];
          };
        }) => {
          generateContent: (prompt: string) => Promise<{
            response: {
              text: () => string;
              usageMetadata?: {
                promptTokenCount: number;
                candidatesTokenCount: number;
                totalTokenCount: number;
              };
            };
          }>;
        };
      };
      
      const model = vertexAI.getGenerativeModel({
        model: useFastModel ? this.geminiConfig.fastModel : this.geminiConfig.model,
        generationConfig: {
          maxOutputTokens: options?.maxOutputTokens ?? this.geminiConfig.maxOutputTokens,
          temperature: options?.temperature ?? this.geminiConfig.temperature,
          topP: options?.topP,
          topK: options?.topK,
          stopSequences: options?.stopSequences,
        },
      });

      const result = await model.generateContent(prompt);
      const response = result.response;

      return Result.ok({
        text: response.text(),
        finishReason: 'STOP',
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
          candidatesTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao gerar texto com Gemini: ${message}`);
    }
  }

  /**
   * Gera texto com histórico de conversa (multi-turn)
   */
  async generateChatResponse(
    history: GeminiContent[],
    newMessage: string,
    options?: GenerationOptions
  ): Promise<Result<GeminiResponse, string>> {
    try {
      const vertexAI = await this.getVertexAI() as {
        getGenerativeModel: (config: {
          model: string;
          generationConfig: {
            maxOutputTokens: number;
            temperature: number;
          };
        }) => {
          startChat: (config: { history: GeminiContent[] }) => {
            sendMessage: (message: string) => Promise<{
              response: {
                text: () => string;
                usageMetadata?: {
                  promptTokenCount: number;
                  candidatesTokenCount: number;
                  totalTokenCount: number;
                };
              };
            }>;
          };
        };
      };
      
      const model = vertexAI.getGenerativeModel({
        model: this.geminiConfig.model,
        generationConfig: {
          maxOutputTokens: options?.maxOutputTokens ?? this.geminiConfig.maxOutputTokens,
          temperature: options?.temperature ?? this.geminiConfig.temperature,
        },
      });

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(newMessage);
      const response = result.response;

      return Result.ok({
        text: response.text(),
        finishReason: 'STOP',
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
          candidatesTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao gerar resposta de chat: ${message}`);
    }
  }

  // ============================================================================
  // DOCUMENT AI
  // ============================================================================

  /**
   * Inicializa o cliente Document AI (lazy loading)
   */
  private async getDocumentAIClient(): Promise<unknown> {
    if (!this.documentAIClient) {
      try {
        const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai');
        this.documentAIClient = new DocumentProcessorServiceClient();
      } catch {
        throw new Error(
          'Pacote @google-cloud/documentai não instalado. Execute: npm install @google-cloud/documentai'
        );
      }
    }
    return this.documentAIClient;
  }

  /**
   * Processa documento usando Document AI
   * 
   * @param content - Conteúdo do documento (Buffer ou base64)
   * @param mimeType - Tipo MIME do documento
   * @param processorType - Tipo de processador ('invoice' ou 'ocr')
   */
  async processDocument(
    content: Buffer | string,
    mimeType: string,
    processorType: 'invoice' | 'ocr' = 'invoice'
  ): Promise<Result<ProcessedDocument, string>> {
    try {
      const client = await this.getDocumentAIClient() as {
        processDocument: (request: {
          name: string;
          rawDocument: {
            content: string;
            mimeType: string;
          };
        }) => Promise<[{
          document?: {
            text?: string;
            entities?: Array<{
              type?: string;
              mentionText?: string;
              confidence?: number;
              properties?: Array<{
                type?: string;
                mentionText?: string;
                confidence?: number;
              }>;
            }>;
            pages?: Array<{
              pageNumber?: number;
              dimension?: { width?: number; height?: number };
            }>;
          };
        }]>;
      };
      
      const processorId = processorType === 'invoice' 
        ? this.documentAIConfig.invoiceProcessorId
        : this.documentAIConfig.ocrProcessorId;
      
      if (!processorId) {
        return Result.fail(`Processador ${processorType} não configurado`);
      }

      const contentBase64 = Buffer.isBuffer(content) 
        ? content.toString('base64')
        : content;

      const name = `projects/${this.geminiConfig.projectId}/locations/${this.documentAIConfig.location}/processors/${processorId}`;

      const [result] = await client.processDocument({
        name,
        rawDocument: {
          content: contentBase64,
          mimeType,
        },
      });

      const document = result.document;
      if (!document) {
        return Result.fail('Documento não processado');
      }

      const entities: DocumentEntity[] = (document.entities ?? []).map(e => ({
        type: e.type ?? '',
        value: e.mentionText ?? '',
        confidence: e.confidence ?? 0,
        properties: e.properties?.map(p => ({
          type: p.type ?? '',
          value: p.mentionText ?? '',
          confidence: p.confidence ?? 0,
        })),
      }));

      return Result.ok({
        text: document.text ?? '',
        entities,
        pages: (document.pages ?? []).map((p, i) => ({
          pageNumber: p.pageNumber ?? i + 1,
          dimension: {
            width: p.dimension?.width ?? 0,
            height: p.dimension?.height ?? 0,
          },
          blocks: [], // Simplificado para MVP
        })),
        mimeType,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao processar documento: ${message}`);
    }
  }

  /**
   * Extrai dados de NFe (Nota Fiscal Eletrônica)
   */
  async extractNFeData(pdfContent: Buffer): Promise<Result<NFeExtractedData, string>> {
    const docResult = await this.processDocument(pdfContent, 'application/pdf', 'invoice');
    
    if (Result.isFail(docResult)) {
      return Result.fail(docResult.error);
    }

    const doc = docResult.value;
    const findEntity = (type: string): string | undefined => {
      return doc.entities.find(e => e.type === type)?.value;
    };

    return Result.ok({
      chaveAcesso: findEntity('invoice_id') ?? '',
      numero: findEntity('invoice_number') ?? '',
      serie: findEntity('invoice_series') ?? '',
      emitente: {
        cnpj: findEntity('supplier_tax_id') ?? '',
        razaoSocial: findEntity('supplier_name') ?? '',
      },
      destinatario: {
        cnpj: findEntity('receiver_tax_id') ?? '',
        razaoSocial: findEntity('receiver_name') ?? '',
      },
      valores: {
        total: parseFloat(findEntity('total_amount') ?? '0'),
        baseIcms: parseFloat(findEntity('icms_base') ?? '0'),
        icms: parseFloat(findEntity('icms_amount') ?? '0'),
      },
      dataEmissao: findEntity('invoice_date') ?? '',
    });
  }

  // ============================================================================
  // SPEECH-TO-TEXT / TEXT-TO-SPEECH
  // ============================================================================

  /**
   * Transcreve áudio para texto (Speech-to-Text)
   */
  async transcribeAudio(
    audioContent: Buffer | string,
    mimeType = 'audio/webm'
  ): Promise<Result<TranscriptionResult, string>> {
    if (!this.speechConfig) {
      return Result.fail('Configuração de Speech não fornecida');
    }

    try {
      if (!this.speechClient) {
        const speech = await import('@google-cloud/speech');
        this.speechClient = new speech.SpeechClient();
      }

      const client = this.speechClient as {
        recognize: (request: {
          audio: { content: string };
          config: {
            encoding: string;
            sampleRateHertz: number;
            languageCode: string;
            model: string;
            enableWordTimeOffsets: boolean;
          };
        }) => Promise<[{
          results?: Array<{
            alternatives?: Array<{
              transcript?: string;
              confidence?: number;
              words?: Array<{
                word?: string;
                startTime?: { seconds?: string; nanos?: number };
                endTime?: { seconds?: string; nanos?: number };
              }>;
            }>;
          }>;
        }]>;
      };

      const contentBase64 = Buffer.isBuffer(audioContent)
        ? audioContent.toString('base64')
        : audioContent;

      const [response] = await client.recognize({
        audio: { content: contentBase64 },
        config: {
          encoding: mimeType.includes('webm') ? 'WEBM_OPUS' : 'LINEAR16',
          sampleRateHertz: this.speechConfig.sampleRateHertz,
          languageCode: this.speechConfig.languageCode,
          model: this.speechConfig.sttModel,
          enableWordTimeOffsets: true,
        },
      });

      const result = response.results?.[0]?.alternatives?.[0];
      if (!result) {
        return Result.fail('Nenhuma transcrição encontrada');
      }

      return Result.ok({
        transcript: result.transcript ?? '',
        confidence: result.confidence ?? 0,
        words: result.words?.map(w => ({
          word: w.word ?? '',
          startTime: parseFloat(w.startTime?.seconds ?? '0'),
          endTime: parseFloat(w.endTime?.seconds ?? '0'),
          confidence: 0,
        })),
        languageCode: this.speechConfig.languageCode,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao transcrever áudio: ${message}`);
    }
  }

  /**
   * Sintetiza texto para áudio (Text-to-Speech)
   */
  async synthesizeSpeech(
    text: string,
    voiceName?: string
  ): Promise<Result<SynthesisResult, string>> {
    if (!this.speechConfig) {
      return Result.fail('Configuração de Speech não fornecida');
    }

    try {
      if (!this.ttsClient) {
        const tts = await import('@google-cloud/text-to-speech');
        this.ttsClient = new tts.TextToSpeechClient();
      }

      const client = this.ttsClient as {
        synthesizeSpeech: (request: {
          input: { text: string };
          voice: { languageCode: string; name?: string };
          audioConfig: { audioEncoding: string; speakingRate: number };
        }) => Promise<[{
          audioContent?: Uint8Array | string;
        }]>;
      };

      const [response] = await client.synthesizeSpeech({
        input: { text },
        voice: {
          languageCode: this.speechConfig.languageCode,
          name: voiceName ?? `${this.speechConfig.languageCode}-Wavenet-A`,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
        },
      });

      const audioContent = response.audioContent;
      if (!audioContent) {
        return Result.fail('Nenhum áudio gerado');
      }

      const base64 = typeof audioContent === 'string'
        ? audioContent
        : Buffer.from(audioContent).toString('base64');

      return Result.ok({
        audioContent: base64,
        mimeType: 'audio/mp3',
        durationSeconds: 0, // Calculado pelo cliente
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao sintetizar voz: ${message}`);
    }
  }
}

// ============================================================================
// TIPOS ESPECÍFICOS PARA EXTRAÇÃO
// ============================================================================

/**
 * Dados extraídos de NFe
 */
export interface NFeExtractedData {
  chaveAcesso: string;
  numero: string;
  serie: string;
  emitente: {
    cnpj: string;
    razaoSocial: string;
  };
  destinatario: {
    cnpj: string;
    razaoSocial: string;
  };
  valores: {
    total: number;
    baseIcms: number;
    icms: number;
  };
  dataEmissao: string;
}
