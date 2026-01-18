/**
 * @description Classe principal do Agente AuraCore
 * 
 * O AuraAgent é o ponto de entrada para todas as interações com o assistente de IA.
 * Ele orquestra as integrações com Google Cloud, Google Workspace e o ERP AuraCore.
 * 
 * @example
 * ```typescript
 * const agent = await AuraAgent.create({
 *   userId: 'user-123',
 *   organizationId: 1,
 *   branchId: 1,
 *   googleAccessToken: 'ya29...',
 * });
 * 
 * const response = await agent.chat('Importar a NFe do email de hoje');
 * console.log(response.text);
 * ```
 */

import type { 
  AgentConfig, 
  GeminiConfig, 
  DocumentAIConfig, 
  SpeechConfig, 
  WorkspaceConfig 
} from './AgentConfig';
import { createDefaultConfig } from './AgentConfig';
import type { 
  AgentContext, 
  AgentExecutionContext,
  UserContext,
  OrganizationContext,
  ChatMessage,
} from './AgentContext';
import { createSession, addMessage, createExecutionContext } from './AgentContext';
import { GoogleCloudClient } from '../integrations/google/GoogleCloudClient';
import { GoogleWorkspaceClient } from '../integrations/google/GoogleWorkspaceClient';
import type { GeminiContent, GeminiResponse } from '../integrations/google/types';
import { Result } from '@/shared/domain';

/**
 * Opções para criar o agente
 */
export interface CreateAgentOptions {
  /** ID do usuário */
  userId: string;
  /** Nome do usuário */
  userName?: string;
  /** Email do usuário */
  userEmail?: string;
  /** Roles do usuário */
  userRoles?: string[];
  /** ID da organização */
  organizationId: number;
  /** ID da filial */
  branchId: number;
  /** Nome da organização (opcional) */
  organizationName?: string;
  /** Nome da filial (opcional) */
  branchName?: string;
  /** Token de acesso Google (opcional) */
  googleAccessToken?: string;
  /** Refresh token Google (opcional) */
  googleRefreshToken?: string;
  /** Configuração customizada (opcional) */
  config?: Partial<AgentConfig>;
}

/**
 * Resposta do chat do agente
 */
export interface AgentChatResponse {
  /** Texto da resposta */
  text: string;
  /** ID da mensagem */
  messageId: string;
  /** Metadados da resposta */
  metadata: {
    /** Tokens usados */
    tokensUsed: number;
    /** Tempo de processamento em ms */
    processingTimeMs: number;
    /** Tools executados */
    toolsExecuted?: string[];
  };
}

/**
 * Sistema de prompts do agente
 */
const SYSTEM_PROMPTS = {
  base: `Você é o Assistente AuraCore, um agente de IA especializado em ajudar usuários de ERP logístico brasileiro.

Suas capacidades incluem:
- Fiscal: Importar NFe, consultar SPED, calcular impostos
- Financeiro: Conciliar extratos bancários, gerar relatórios
- TMS: Rastrear embarques, criar listas de coleta
- Workspace: Buscar emails, criar eventos, atualizar planilhas

Contexto Brasil:
- Legislação fiscal brasileira (ICMS, PIS, COFINS, IPI)
- SPED Fiscal, EFD-Contribuições, ECD
- CTe, NFe, MDFe, NFS-e
- Reforma Tributária 2026 (IBS, CBS, IS)

Diretrizes:
1. Responda sempre em português brasileiro
2. Seja conciso mas completo
3. Quando não souber, pergunte
4. Para ações críticas, confirme antes de executar
5. Forneça contexto sobre leis e regulamentações quando relevante`,

  fiscal: `Como especialista fiscal, você pode:
- Importar NFe de emails ou Drive
- Validar chaves de acesso
- Calcular impostos para operações
- Consultar registros SPED
- Verificar conformidade fiscal`,

  financial: `Como especialista financeiro, você pode:
- Conciliar extratos bancários
- Gerar DRE, Balanço, Fluxo de Caixa
- Analisar contas a pagar/receber
- Exportar relatórios para Google Sheets`,
};

/**
 * Classe principal do Agente AuraCore
 */
export class AuraAgent {
  private readonly config: AgentConfig;
  private readonly context: AgentContext;
  private readonly googleCloud: GoogleCloudClient;
  private readonly googleWorkspace: GoogleWorkspaceClient | null;
  
  private constructor(
    config: AgentConfig,
    context: AgentContext,
    googleCloud: GoogleCloudClient,
    googleWorkspace: GoogleWorkspaceClient | null
  ) {
    this.config = config;
    this.context = context;
    this.googleCloud = googleCloud;
    this.googleWorkspace = googleWorkspace;
  }

  /**
   * Cria uma nova instância do agente
   */
  static async create(options: CreateAgentOptions): Promise<AuraAgent> {
    // Mesclar config padrão com customizações
    const defaultConfig = createDefaultConfig();
    const config: AgentConfig = {
      ...defaultConfig,
      ...options.config,
      gemini: { ...defaultConfig.gemini, ...options.config?.gemini },
      documentAI: { ...defaultConfig.documentAI, ...options.config?.documentAI },
      workspace: { ...defaultConfig.workspace, ...options.config?.workspace },
    };

    // Criar contexto do usuário
    const userContext: UserContext = {
      userId: options.userId,
      name: options.userName ?? 'Usuário',
      email: options.userEmail ?? '',
      roles: options.userRoles ?? [],
      googleAccessToken: options.googleAccessToken,
      googleRefreshToken: options.googleRefreshToken,
    };

    // Criar contexto da organização
    const orgContext: OrganizationContext = {
      organizationId: options.organizationId,
      branchId: options.branchId,
      organizationName: options.organizationName ?? 'Organização',
      branchName: options.branchName ?? 'Filial',
      timezone: 'America/Sao_Paulo',
      taxRegime: 'lucro_real',
    };

    // Criar sessão
    const session = createSession();

    // Adicionar mensagem de sistema
    addMessage(session, 'system', SYSTEM_PROMPTS.base);

    const context: AgentContext = {
      user: userContext,
      organization: orgContext,
      session,
    };

    // Criar clientes Google
    const googleCloud = new GoogleCloudClient(
      config.gemini,
      config.documentAI,
      config.speech
    );

    const googleWorkspace = options.googleAccessToken
      ? new GoogleWorkspaceClient(config.workspace, options.googleAccessToken)
      : null;

    return new AuraAgent(config, context, googleCloud, googleWorkspace);
  }

  // ============================================================================
  // PROPRIEDADES PÚBLICAS
  // ============================================================================

  /**
   * Obtém o contexto de execução para use cases
   */
  get executionContext(): AgentExecutionContext {
    return createExecutionContext(this.context);
  }

  /**
   * Obtém o histórico de mensagens
   */
  get messageHistory(): ChatMessage[] {
    return [...this.context.session.messageHistory];
  }

  /**
   * Obtém o ID da sessão
   */
  get sessionId(): string {
    return this.context.session.sessionId;
  }

  /**
   * Verifica se Google Workspace está disponível
   */
  get hasWorkspaceAccess(): boolean {
    return this.googleWorkspace !== null;
  }

  // ============================================================================
  // MÉTODOS PRINCIPAIS
  // ============================================================================

  /**
   * Envia mensagem para o agente e obtém resposta
   */
  async chat(message: string): Promise<Result<AgentChatResponse, string>> {
    const startTime = Date.now();

    try {
      // Adicionar mensagem do usuário ao histórico
      const userMessage = addMessage(this.context.session, 'user', message);

      // Converter histórico para formato Gemini
      const history = this.convertHistoryToGemini();

      // Gerar resposta
      const responseResult = await this.googleCloud.generateChatResponse(
        history.slice(0, -1), // Histórico sem a última mensagem
        message
      );

      if (responseResult.isFailure) {
        return Result.fail(responseResult.error);
      }

      const response = responseResult.value;

      // Adicionar resposta do assistente ao histórico
      const assistantMessage = addMessage(
        this.context.session, 
        'assistant', 
        response.text,
        { tokensUsed: response.usage.totalTokens }
      );

      const processingTimeMs = Date.now() - startTime;

      return Result.ok({
        text: response.text,
        messageId: assistantMessage.id,
        metadata: {
          tokensUsed: response.usage.totalTokens,
          processingTimeMs,
          toolsExecuted: [],
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao processar mensagem: ${errorMessage}`);
    }
  }

  /**
   * Processa documento (NFe, CTe, etc) e retorna dados extraídos
   */
  async processDocument(
    content: Buffer,
    mimeType: string,
    documentType: 'nfe' | 'cte' | 'generic' = 'generic'
  ): Promise<Result<Record<string, unknown>, string>> {
    if (documentType === 'nfe') {
      const result = await this.googleCloud.extractNFeData(content);
      if (result.isFailure) {
        return Result.fail(result.error);
      }
      return Result.ok(result.value as unknown as Record<string, unknown>);
    }

    const result = await this.googleCloud.processDocument(content, mimeType);
    if (result.isFailure) {
      return Result.fail(result.error);
    }
    return Result.ok(result.value as unknown as Record<string, unknown>);
  }

  /**
   * Busca emails relacionados a documentos fiscais
   */
  async searchFiscalEmails(
    query?: string,
    maxResults = 10
  ): Promise<Result<Array<{ id: string; from: string; subject: string; date: Date }>, string>> {
    if (!this.googleWorkspace) {
      return Result.fail('Google Workspace não configurado. Faça login com Google.');
    }

    // Query padrão para emails fiscais
    const fiscalQuery = query ?? 'has:attachment (filename:xml OR filename:pdf) (nfe OR cte OR danfe)';
    
    const result = await this.googleWorkspace.searchEmails(fiscalQuery, maxResults);
    if (result.isFailure) {
      return Result.fail(result.error);
    }

    return Result.ok(result.value.map(email => ({
      id: email.id,
      from: email.from,
      subject: email.subject,
      date: email.date,
    })));
  }

  /**
   * Transcreve áudio para texto
   */
  async transcribeAudio(
    audioContent: Buffer,
    mimeType = 'audio/webm'
  ): Promise<Result<string, string>> {
    const result = await this.googleCloud.transcribeAudio(audioContent, mimeType);
    if (result.isFailure) {
      return Result.fail(result.error);
    }
    return Result.ok(result.value.transcript);
  }

  /**
   * Sintetiza texto para áudio
   */
  async synthesizeSpeech(text: string): Promise<Result<string, string>> {
    const result = await this.googleCloud.synthesizeSpeech(text);
    if (result.isFailure) {
      return Result.fail(result.error);
    }
    return Result.ok(result.value.audioContent);
  }

  // ============================================================================
  // MÉTODOS DE WORKSPACE
  // ============================================================================

  /**
   * Cria evento no calendário
   */
  async createCalendarEvent(
    summary: string,
    start: Date,
    end: Date,
    options?: { description?: string; location?: string; attendees?: string[] }
  ): Promise<Result<{ id: string; link: string }, string>> {
    if (!this.googleWorkspace) {
      return Result.fail('Google Workspace não configurado');
    }

    const result = await this.googleWorkspace.createCalendarEvent({
      summary,
      start,
      end,
      ...options,
    });

    if (result.isFailure) {
      return Result.fail(result.error);
    }

    return Result.ok({
      id: result.value.id,
      link: result.value.htmlLink,
    });
  }

  /**
   * Atualiza dados em planilha Google Sheets
   */
  async updateSheet(
    spreadsheetId: string,
    range: string,
    values: string[][],
    mode: 'update' | 'append' = 'update'
  ): Promise<Result<{ updatedCells: number }, string>> {
    if (!this.googleWorkspace) {
      return Result.fail('Google Workspace não configurado');
    }

    const result = await this.googleWorkspace.updateSheet(spreadsheetId, range, values, mode);

    if (result.isFailure) {
      return Result.fail(result.error);
    }

    return Result.ok({
      updatedCells: result.value.updatedCells,
    });
  }

  // ============================================================================
  // MÉTODOS INTERNOS
  // ============================================================================

  /**
   * Converte histórico de mensagens para formato Gemini
   */
  private convertHistoryToGemini(): GeminiContent[] {
    return this.context.session.messageHistory
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
  }

  /**
   * Limpa histórico da sessão (mantém mensagem de sistema)
   */
  clearHistory(): void {
    const systemMessage = this.context.session.messageHistory.find(m => m.role === 'system');
    this.context.session.messageHistory = systemMessage ? [systemMessage] : [];
  }

  /**
   * Atualiza token de acesso Google
   */
  updateGoogleToken(accessToken: string): void {
    this.context.user.googleAccessToken = accessToken;
    if (this.googleWorkspace) {
      this.googleWorkspace.setAccessToken(accessToken);
    }
  }
}
